import { Hono } from "hono";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { requireAuth } from "@/middleware/auth";
import { uploadBuffer } from "@/services/r2";

const uploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  base64: z.string().min(1),
  folder: z.string().optional(),
});

export const uploadRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>().post("/", requireAuth, async (c) => {
  try {
    const data = uploadSchema.parse(await c.req.json());
    const result = await uploadBuffer({
      buffer: Buffer.from(data.base64, "base64"),
      contentType: data.contentType,
      folder: data.folder,
      key: data.folder
        ? `${data.folder.replace(/\/$/, "")}/${data.filename}`
        : data.filename,
    });

    return c.json(result, 201);
  } catch (error) {
    return errorResponse(c, error);
  }
});
