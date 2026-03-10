import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { extractMenuFromSource } from "@/services/claude";

const previewExtractSchema = z
  .object({
    sourceText: z.string().optional(),
    fileName: z.string().optional(),
    contentType: z.string().optional(),
    base64: z.string().optional(),
  })
  .refine((data) => Boolean(data.sourceText?.trim() || data.base64), {
    message: "Provide menu text or upload a menu file to preview.",
  });

export const previewRoute = new Hono().post("/extract", async (c) => {
  try {
    const data = previewExtractSchema.parse(await c.req.json());
    const draft = await extractMenuFromSource(data);

    if (!draft.sections.length) {
      throw new ApiError("We couldn't detect any menu sections to preview.", 422);
    }

    return c.json(draft);
  } catch (error) {
    return errorResponse(c, error);
  }
});
