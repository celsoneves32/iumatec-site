"use client";

import { useState } from "react";

type ProductGalleryProps = {
  title: string;
  images: string[];
};

export default function ProductGallery({ title, images }: ProductGalleryProps) {
  const cleanImages = Array.from(
    new Set(images.filter((img) => typeof img === "string" && img.trim()))
  );

  const [activeImage, setActiveImage] = useState(cleanImages[0] || "");

  if (cleanImages.length === 0) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-3xl border bg-neutral-50 p-6 text-neutral-400">
        Kein Bild
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex min-h-[520px] items-center justify-center rounded-3xl border bg-neutral-50 p-6">
        <img
          src={activeImage}
          alt={title}
          className="max-h-[520px] max-w-full object-contain"
        />
      </div>

      {cleanImages.length > 1 ? (
        <div className="grid grid-cols-5 gap-3">
          {cleanImages.map((image) => (
            <button
              key={image}
              type="button"
              onClick={() => setActiveImage(image)}
              className={`flex h-24 items-center justify-center rounded-2xl border bg-white p-2 transition ${
                activeImage === image
                  ? "border-red-600 ring-2 ring-red-100"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <img
                src={image}
                alt={title}
                className="max-h-full max-w-full object-contain"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}