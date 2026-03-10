import PgBoss from "pg-boss";
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

export async function enqueueMenuItemImage(menuItemId: string) {
  await ensureMenuImageQueue();
  const queue = await getBoss();
  const jobId = await queue.send(MENU_IMAGE_JOB, { menuItemId });

  if (!jobId) {
    throw new Error(`Failed to enqueue pg-boss job for ${MENU_IMAGE_JOB}`);
  }

  return jobId;
}

export async function processMenuImageJob(data: { menuItemId: string }) {
  const item = await prisma.menuItem.findUnique({
    where: {
      id: data.menuItemId,
    },
    include: {
      restaurant: true,
      section: true,
    },
  });

  if (!item) {
    return;
  }

  await prisma.menuItem.update({
    where: { id: item.id },
    data: { imageStatus: "generating" },
  });

  try {
    const generated = await generateDishImage({
      name: item.name,
      description: item.description,
      cuisineType: item.restaurant.cuisineType,
      sectionName: item.section.name,
      restaurantName: item.restaurant.name,
    });

    const upload = await uploadBuffer({
      buffer: generated.buffer,
      contentType: generated.contentType,
      folder: `restaurants/${item.restaurantId}/menu-items`,
      key: `restaurants/${item.restaurantId}/menu-items/${item.id}.${generated.extension}`,
    });

    await prisma.menuItem.update({
      where: { id: item.id },
      data: {
        imageUrl: upload.url,
        imageStatus: "generated",
      },
    });
  } catch (error) {
    console.error("Menu image job failed", error);
    await prisma.menuItem.update({
      where: { id: item.id },
      data: {
        imageStatus: "failed",
      },
    });
  }
}
