import PgBoss from "pg-boss";
import { buildMenuItemImageSummary, syncMenuItemImageSummary } from "@/lib/menu-item-images";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { generateDishImage } from "@/services/google-image";
import { uploadBuffer } from "@/services/r2";

export const MENU_IMAGE_JOB = "menu-image-generation";

let boss: PgBoss | null = null;
let queueReady: Promise<void> | null = null;

export async function getBoss() {
  if (boss) {
    return boss;
  }

  boss = new PgBoss({
    connectionString: env.DATABASE_URL,
  });

  await boss.start();
  return boss;
}

async function ensureMenuImageQueue() {
  if (!queueReady) {
    queueReady = getBoss()
      .then((queue) => queue.createQueue(MENU_IMAGE_JOB))
      .catch((error) => {
        queueReady = null;
        throw error;
      });
  }

  await queueReady;
}

export async function enqueueMenuItemImage(options: {
  menuItemId: string;
  imageId: string;
  priority?: number;
}) {
  await ensureMenuImageQueue();
  const queue = await getBoss();
  const jobId = await queue.send(
    MENU_IMAGE_JOB,
    {
      menuItemId: options.menuItemId,
      imageId: options.imageId,
    },
    {
      priority: options.priority,
    }
  );

  if (!jobId) {
    throw new Error(`Failed to enqueue pg-boss job for ${MENU_IMAGE_JOB}`);
  }

  return jobId;
}

export async function processMenuImageJob(data: { menuItemId: string; imageId: string }) {
  const image = await prisma.menuItemImage.findUnique({
    where: { id: data.imageId },
    include: {
      menuItem: {
        include: {
          restaurant: true,
          section: true,
          images: {
            orderBy: { slot: "asc" },
          },
        },
      },
    },
  });

  if (!image || image.menuItemId !== data.menuItemId) {
    return;
  }

  await prisma.menuItemImage.update({
    where: { id: image.id },
    data: { imageStatus: "generating" },
  });
  await prisma.$transaction((tx) => syncMenuItemImageSummary(tx, image.menuItemId));

  try {
    const generated = await generateDishImage({
      name: image.menuItem.name,
      description: image.menuItem.description,
      cuisineType: image.menuItem.restaurant.cuisineType,
      sectionName: image.menuItem.section.name,
      restaurantName: image.menuItem.restaurant.name,
      promptModifier: image.promptModifier,
    });

    const upload = await uploadBuffer({
      buffer: generated.buffer,
      contentType: generated.contentType,
      folder: `restaurants/${image.menuItem.restaurantId}/menu-items`,
      key: `restaurants/${image.menuItem.restaurantId}/menu-items/${image.menuItemId}-${image.slot + 1}.${generated.extension}`,
    });

    await prisma.$transaction(async (tx) => {
      await tx.menuItemImage.update({
        where: { id: image.id },
        data: {
          imageUrl: upload.url,
          imageStatus: "generated",
        },
      });

      await syncMenuItemImageSummary(tx, image.menuItemId);
    });
  } catch (error) {
    console.error("Menu image job failed", error);
    await prisma.$transaction(async (tx) => {
      await tx.menuItemImage.update({
        where: { id: image.id },
        data: {
          imageStatus: "failed",
        },
      });

      const item = await tx.menuItem.findUnique({
        where: { id: image.menuItemId },
        select: {
          id: true,
          imageUrl: true,
          imageStatus: true,
          images: {
            select: {
              id: true,
              slot: true,
              imageUrl: true,
              imageStatus: true,
              promptModifier: true,
              isPrimary: true,
            },
          },
        },
      });

      if (item) {
        const summary = buildMenuItemImageSummary(item);
        await tx.menuItem.update({
          where: { id: item.id },
          data: summary,
        });
      }
    });
  }
}
