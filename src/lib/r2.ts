import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireEnv } from "@/lib/env";

function client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

export async function createUploadUrl(key: string, contentType: string) {
  const expiresIn = Number(process.env.R2_UPLOAD_TTL_SECONDS || 900);
  return getSignedUrl(client(), new PutObjectCommand({
    Bucket: requireEnv("R2_BUCKET"),
    Key: key,
    ContentType: contentType,
  }), { expiresIn });
}

export async function inspectObject(key: string) {
  return client().send(new HeadObjectCommand({ Bucket: requireEnv("R2_BUCKET"), Key: key }));
}

export async function createDownloadUrl(key: string) {
  return getSignedUrl(client(), new GetObjectCommand({
    Bucket: requireEnv("R2_BUCKET"),
    Key: key,
    ResponseContentDisposition: "inline",
  }), { expiresIn: 300 });
}

export async function downloadObjectToFile(key: string, filePath: string) {
  const response = await client().send(new GetObjectCommand({ Bucket: requireEnv("R2_BUCKET"), Key: key }));
  if (!response.Body) throw new Error("R2 returned an empty object.");
  await pipeline(response.Body as NodeJS.ReadableStream, createWriteStream(filePath));
}

export async function uploadObject(key: string, body: Uint8Array | Buffer, contentType: string) {
  await client().send(new PutObjectCommand({ Bucket: requireEnv("R2_BUCKET"), Key: key, Body: body, ContentType: contentType }));
}

export async function uploadFile(key: string, filePath: string, contentType: string) {
  await client().send(new PutObjectCommand({ Bucket: requireEnv("R2_BUCKET"), Key: key, Body: createReadStream(filePath), ContentType: contentType }));
}

export async function deleteObject(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: requireEnv("R2_BUCKET"), Key: key }));
}
