import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "@/lib/env";
import { contentDisposition } from "@/lib/document-files";

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
let bucketReady = false;

function s3() {
  if (!client) client = createClient();
  return client;
}

/** Test helper — reset memoized S3 client after env changes. */
export function resetStorageClient() {
  client = null;
  bucketReady = false;
}

export async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const env = getEnv();
  try {
    await s3().send(new HeadBucketCommand({ Bucket: env.STORAGE_BUCKET }));
  } catch {
    try {
      await s3().send(new CreateBucketCommand({ Bucket: env.STORAGE_BUCKET }));
    } catch {
      // Race with parallel creates — ignore if bucket now exists.
    }
  }
  bucketReady = true;
}

export const storage = {
  async putObject(input: {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
  }): Promise<StoredObject> {
    const env = getEnv();
    await ensureBucket();
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

  /**
   * Short-lived signed GET URL. Files never sit on the app server disk.
   * Content-Disposition is baked into the signature for safe download/preview.
   */
  async getSignedDownloadUrl(input: {
    key: string;
    fileName: string;
    contentType: string;
    disposition?: "inline" | "attachment";
    expiresInSeconds?: number;
  }): Promise<string> {
    const env = getEnv();
    const expiresIn =
      input.expiresInSeconds ?? env.DOCUMENT_SIGNED_URL_TTL_SECONDS ?? 60;
    return getSignedUrl(
      s3(),
      new GetObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: input.key,
        ResponseContentType: input.contentType,
        ResponseContentDisposition: contentDisposition(
          input.fileName,
          input.disposition ?? "attachment",
        ),
      }),
      { expiresIn },
    );
  },

  async deleteObject(key: string): Promise<void> {
    const env = getEnv();
    await s3().send(
      new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }),
    );
  },
};
