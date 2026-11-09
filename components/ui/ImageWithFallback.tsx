"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

/** Foto dengan placeholder teks bila kosong atau gagal dimuat. */
export function ImageWithFallback({
  src,
  alt,
  className,
  fallbackLabel = "Foto",
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "flex h-full w-full items-center justify-center bg-line text-meta font-semibold text-ink-muted",
          className,
        )}
      >
        {fallbackLabel}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("h-full w-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
