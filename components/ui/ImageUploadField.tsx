"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  MAX_UPLOAD_BYTES,
  compressProductImage,
} from "@/lib/image/compress-image";

export interface ImageUploadResult {
  ok: true;
  key: string;
}

export type ImageUploadResponse =
  | ImageUploadResult
  | { ok: false; error: string };

interface ImageUploadFieldProps {
  label?: string;
  /** URL preview yang sedang ditampilkan. */
  value?: string;
  onChange: (value: { key: string; previewUrl: string } | null) => void;
  upload: (file: File) => Promise<ImageUploadResponse>;
  disabled?: boolean;
  hint?: string;
}

export function ImageUploadField({
  label = "Foto",
  value,
  onChange,
  upload,
  disabled = false,
  hint = "JPG, PNG, atau WEBP. Otomatis dikompres ke WebP 800px.",
}: ImageUploadFieldProps) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [value]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  function replacePreviewUrl(url: string | null) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = url;
  }

  async function handleFile(file: File) {
    setUploading(true);

    try {
      const compressed = await compressProductImage(file);

      if (compressed.size > MAX_UPLOAD_BYTES) {
        throw new Error("Ukuran foto masih di atas 1 MB setelah dikompres.");
      }

      const result = await upload(compressed);
      if (!result.ok) throw new Error(result.error);

      const previewUrl = URL.createObjectURL(compressed);
      replacePreviewUrl(previewUrl);
      setFailed(false);
      onChange({ key: result.key, previewUrl });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Foto gagal diunggah.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    replacePreviewUrl(null);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-label font-semibold text-ink-soft">{label}</span>
      <div className="flex items-start gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-canvas text-meta text-ink-muted">
          {value && !failed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Preview foto"
              className="h-20 w-20 object-cover"
              onError={() => setFailed(true)}
            />
          ) : (
            "Belum ada"
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
            >
              {uploading ? "Mengunggah…" : value ? "Ganti foto" : "Pilih foto"}
            </Button>
            {value ? (
              <Button
                variant="dangerOutline"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || uploading}
              >
                Hapus foto
              </Button>
            ) : null}
          </div>
          <p className="m-0 text-meta text-ink-muted">{hint}</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label={`Pilih ${label.toLowerCase()}`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
