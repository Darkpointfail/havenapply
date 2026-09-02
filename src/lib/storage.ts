import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "@/lib/env";

export type StoredObject = {
  key: string;
  contentType: string;
  sizeBytes: number;
};

function createClient() {
  const env = getEnv();
  return new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE ?? env.STORAGE_DRIVER === "minio",
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    },
  });
}

let client: S3Client | null = null;

function s3() {
  if (!client) client = createClient();
  return client;
}

export const storage = {
  async putObject(input: {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
  }): Promise<StoredObject> {
    const env = getEnv();
    await s3().send(
      new PutObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return {
      key: input.key,
      contentType: input.contentType,
      sizeBytes: input.body.byteLength,
    };
  },

  async getSignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const env = getEnv();
    return getSignedUrl(
      s3(),
      new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  },

  async deleteObject(key: string): Promise<void> {
    const env = getEnv();
    await s3().send(
      new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }),
    );
  },
};
