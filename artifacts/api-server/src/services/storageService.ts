import { Storage } from "@google-cloud/storage";
import { logger } from "../lib/logger.js";

const bucketId = process.env["DEFAULT_OBJECT_STORAGE_BUCKET_ID"];
const privateDir = process.env["PRIVATE_OBJECT_DIR"] || "uploads";

let storage: Storage | null = null;
let bucket: ReturnType<Storage["bucket"]> | null = null;

function getStorage() {
  if (!storage) {
    storage = new Storage();
  }
  return storage;
}

function getBucket() {
  if (!bucketId) {
    throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID environment variable is not set");
  }
  if (!bucket) {
    bucket = getStorage().bucket(bucketId);
  }
  return bucket;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
}

export async function generatePresignedUploadUrl(
  filename: string,
  contentType: string
): Promise<PresignedUrlResult> {
  const ext = filename.split(".").pop() || "jpg";
  const objectKey = `${privateDir}/campaign-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const b = getBucket();
  const file = b.file(objectKey);

  const [signedUrl] = await file.generateSignedPostPolicyV4({
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    conditions: [
      ["content-length-range", 0, 10 * 1024 * 1024], // max 10MB
    ],
    fields: {
      "content-type": contentType,
    },
  });

  // For the upload URL, use a signed PUT URL
  const [putUrl] = await file.getSignedUrl({
    action: "write",
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  });

  const publicUrl = `https://storage.googleapis.com/${bucketId}/${objectKey}`;

  logger.info({ objectKey, contentType }, "Generated presigned upload URL");

  return {
    uploadUrl: putUrl,
    publicUrl,
    objectKey,
  };
}
