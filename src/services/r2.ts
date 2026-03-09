import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";

let client: S3Client | null = null;

function getClient() {
  if (client) {
    return client;
  }

  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new ApiError("R2 credentials are not configured", 503);
  }

  client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return client;
}

export function buildObjectUrl(key: string) {
  return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

export async function uploadBuffer(options: {
  buffer: Buffer;
  contentType: string;
  key?: string;
  folder?: string;
}) {
  const key =
    options.key ??
    [options.folder?.replace(/^\/+|\/+$/g, ""), `${randomUUID()}`]
      .filter(Boolean)
      .join("/");

  await getClient().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: options.buffer,
      ContentType: options.contentType,
    })
  );

  return {
    key,
    url: buildObjectUrl(key),
  };
}
