"use server";

import { getAuthorizedSession } from "@/lib/auth/session";
import { isR2Configured, uploadR2Object } from "@/lib/r2";
import type { ProductPhotoUploadResult } from "@/features/produk/types";

const MAX_PHOTO_BYTES = 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const NO_ACCESS = "Anda tidak punya akses mengubah produk.";

export async function uploadProductPhotoAction(
  formData: FormData,
): Promise<ProductPhotoUploadResult> {
  const session = await getAuthorizedSession("canManageProducts");
  if (!session) return { ok: false, error: NO_ACCESS };

  if (!isR2Configured()) {
    return { ok: false, error: "Upload foto belum dikonfigurasi" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "File foto tidak ditemukan." };
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Foto harus berupa JPG, PNG, atau WEBP." };
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return {
      ok: false,
      error: "Ukuran foto maksimal 1 MB setelah dikompres.",
    };
  }

  const productId = String(formData.get("productId") ?? "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const key = `products/${productId || "new"}-${random}.webp`;

  try {
    await uploadR2Object(
      key,
      Buffer.from(await file.arrayBuffer()),
      "image/webp",
    );
    return { ok: true, key };
  } catch (error) {
    console.error("[produk] Upload foto gagal", error);
    return {
      ok: false,
      error:
        error instanceof Error && error.message
          ? error.message
          : "Foto gagal diunggah. Coba lagi.",
    };
  }
}
