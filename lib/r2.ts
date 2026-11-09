import "server-only";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

const ABSOLUTE_URL_PATTERN = /^(?:https?:|data:|blob:)/i;

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getR2Config(): R2Config | null {
  const accountId = readEnv("R2_ACCOUNT_ID");
  const accessKeyId = readEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("R2_SECRET_ACCESS_KEY");
  const bucket = readEnv("R2_BUCKET");
  const publicUrl = readEnv("R2_PUBLIC_URL").replace(/\/+$/, "");

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !publicUrl
  ) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

let cachedClient: S3Client | null = null;
let cachedClientKey = "";

function getR2Client(config: R2Config): S3Client {
  const signature = `${config.accountId}:${config.accessKeyId}`;

  if (!cachedClient || cachedClientKey !== signature) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    cachedClientKey = signature;
  }

  return cachedClient;
}

/** Nilai image_url hanya key R2; URL penuh dirakit di sini. */
export function resolveProductImageUrl(
  value: string | null | undefined,
): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (ABSOLUTE_URL_PATTERN.test(raw)) return raw;

  const config = getR2Config();
  if (!config?.publicUrl) return undefined;

  return `${config.publicUrl}/${raw.replace(/^\/+/, "")}`;
}

/** URL lama atau data URL tidak pernah dihapus dari R2. */
export function toR2ObjectKey(
  value: string | null | undefined,
): string | null {
  const raw = value?.trim();
  if (!raw || ABSOLUTE_URL_PATTERN.test(raw)) return null;
  return raw.replace(/^\/+/, "");
}

export async function uploadR2Object(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  const config = getR2Config();
  if (!config) throw new Error("Upload foto belum dikonfigurasi");

  await getR2Client(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

/** Best-effort: kegagalan hapus tidak boleh menggagalkan aksi utama. */
export async function deleteR2ObjectBestEffort(
  value: string | null | undefined,
): Promise<void> {
  const key = toR2ObjectKey(value);
  const config = getR2Config();
  if (!key || !config) return;

  try {
    await getR2Client(config).send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
    );
  } catch (error) {
    console.error(`[r2] Gagal menghapus object ${key}`, error);
  }
}
