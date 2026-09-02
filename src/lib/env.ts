import { z } from "zod";

const boolish = z
  .union([z.boolean(), z.string()])
  .transform((v) => v === true || v === "true" || v === "1")
  .optional();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.string().url(),
    AUTH_SECRET: z.string().min(16),
    AUTH_TRUST_HOST: boolish,
    DATABASE_URL: z.string().min(1),
    DEFAULT_LOCALE: z.enum(["fr", "en"]).default("fr"),

    STORAGE_DRIVER: z.enum(["minio", "s3"]).default("minio"),
    STORAGE_ENDPOINT: z.string().url().optional(),
    STORAGE_REGION: z.string().default("us-east-1"),
    STORAGE_BUCKET: z.string().min(1),
    STORAGE_ACCESS_KEY_ID: z.string().min(1),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
    STORAGE_FORCE_PATH_STYLE: boolish,

    /** Max upload size in bytes (default 10 MiB). */
    DOCUMENT_MAX_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
    /** Comma-separated allowlist; magic bytes still validated. */
    DOCUMENT_ALLOWED_MIME: z.string().optional(),
    /** Signed download URL TTL in seconds (short-lived). */
    DOCUMENT_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(60),
    /** Days before soft-deleted objects may be hard-purged. */
    DOCUMENT_PURGE_DELAY_DAYS: z.coerce.number().int().positive().default(30),
    /** Optional ClamAV clamd host. Absent → explicit dev passthrough (not a real scan). */
    CLAMAV_HOST: z.string().optional(),
    CLAMAV_PORT: z.coerce.number().int().positive().optional(),

    EMAIL_DRIVER: z.enum(["smtp", "resend"]).default("smtp"),
    EMAIL_FROM: z.string().min(3),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_SECURE: boolish,
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.STORAGE_DRIVER === "minio" && !data.STORAGE_ENDPOINT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["STORAGE_ENDPOINT"],
        message: "STORAGE_ENDPOINT is required when STORAGE_DRIVER=minio",
      });
    }
    if (data.EMAIL_DRIVER === "smtp") {
      if (!data.SMTP_HOST) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMTP_HOST"],
          message: "SMTP_HOST is required when EMAIL_DRIVER=smtp",
        });
      }
      if (!data.SMTP_PORT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMTP_PORT"],
          message: "SMTP_PORT is required when EMAIL_DRIVER=smtp",
        });
      }
    }
    if (data.EMAIL_DRIVER === "resend" && !data.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required when EMAIL_DRIVER=resend",
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(runtimeEnv: NodeJS.ProcessEnv = process.env): AppEnv {
  if (cached && runtimeEnv === process.env) return cached;
  const parsed = envSchema.safeParse(runtimeEnv);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  if (runtimeEnv === process.env) cached = parsed.data;
  return parsed.data;
}

/** Test helper — clears memoized env. */
export function resetEnvCache() {
  cached = null;
}

export { envSchema };
