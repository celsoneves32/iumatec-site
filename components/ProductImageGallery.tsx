"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Props = {
  title: string;
  images: string[];
};

export default function ProductImageGallery({ title, images }: Props) {
  const cleanedImages = useMemo(() => {
    const list = images.filter(Boolean);
    return [...new Set(list)];
  }, [images]);

  const [selected, setSelected] = useState(0);

  const currentImage = cleanedImages[selected] || cleanedImages[0] || null;

  return (
    <div className="space-y-4">
      <div className="relative flex h-[460px] items-center justify-center overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50 p-8">
        {currentImage ? (
          <Image
            src={currentImage}
            alt={title}
            fill
            className="object-contain p-8 mix-blend-multiply"
            sizes="(max-width: 1024px) 100vw, 50vw"
            unoptimized
          />
        ) : (
          <div className="text-neutral-400">Kein Bild</div>
        )}
      </div>

      {cleanedImages.length > 1 ? (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {cleanedImages.slice(0, 10).map((image, index) => (
            <button
              key={`${image}-${index}`}
              onClick={() => setSelected(index)}
              className={`relative h-24 overflow-hidden rounded-2xl border bg-white ${
                selected === index
                  ? "border-neutral-900"
                  : "border-neutral-200"
              }`}
              type="button"
            >
              <Image
                src={image}
                alt={`${title} ${index + 1}`}
                fill
                className="object-contain p-2 mix-blend-multiply"
                sizes="120px"
                unoptimized
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}