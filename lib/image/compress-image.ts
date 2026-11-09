export const MAX_UPLOAD_BYTES = 1024 * 1024;

const MAX_DIMENSION = 800;
const WEBP_QUALITY = 0.8;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Kecilkan sisi terpanjang ke 800px lalu kompres ke WebP. */
export async function compressProductImage(file: File): Promise<File> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Foto harus berupa JPG, PNG, atau WEBP.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Foto tidak bisa dibaca. Coba file lain.");
  }

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Foto gagal diproses di browser ini.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
  });

  if (!blob) throw new Error("Foto gagal dikompres.");

  return new File([blob], "foto.webp", { type: "image/webp" });
}
