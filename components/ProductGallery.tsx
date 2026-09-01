"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ProductGalleryProps = {
  title: string;
  images?: string[];
};

export default function ProductGallery({
  title,
  images = [],
}: ProductGalleryProps) {
  const validImages = useMemo(() => {
    return Array.from(
      new Set(
        images
          .map((image) => image?.trim())
          .filter(
            (image): image is string =>
              Boolean(image) &&
              (image.startsWith("http://") ||
                image.startsWith("https://") ||
                image.startsWith("/")),
          ),
      ),
    );
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const activeImage = validImages[activeIndex];

  useEffect(() => {
    if (activeIndex >= validImages.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, validImages.length]);

  useEffect(() => {
    if (!isZoomOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsZoomOpen(false);
      }

      if (event.key === "ArrowLeft") {
        showPreviousImage();
      }

      if (event.key === "ArrowRight") {
        showNextImage();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isZoomOpen, activeIndex, validImages.length]);

  function showPreviousImage() {
    if (validImages.length <= 1) {
      return;
    }

    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? validImages.length - 1 : currentIndex - 1,
    );
  }

  function showNextImage() {
    if (validImages.length <= 1) {
      return;
    }

    setActiveIndex((currentIndex) =>
      currentIndex === validImages.length - 1 ? 0 : currentIndex + 1,
    );
  }

  if (!activeImage) {
    return (
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="flex min-h-[420px] items-center justify-center bg-neutral-50 px-6 text-center sm:min-h-[520px]">
          <div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="mx-auto h-14 w-14 text-neutral-300"
            >
              <path
                d="M4 5.75A1.75 1.75 0 0 1 5.75 4h12.5A1.75 1.75 0 0 1 20 5.75v12.5A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25V5.75Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="m5 17 4.25-4.25a1 1 0 0 1 1.4-.02L13 15l1.35-1.35a1 1 0 0 1 1.4 0L19 17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
            </svg>

            <p className="mt-4 text-sm font-medium text-neutral-500">
              Kein Produktbild verfügbar
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="relative min-h-[420px] sm:min-h-[520px] lg:min-h-[620px]">
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              aria-label="Produktbild vergrössern"
              className="group absolute inset-0 z-10 cursor-zoom-in"
            >
              <span className="sr-only">Produktbild vergrössern</span>
            </button>

            <Image
              src={activeImage}
              alt={`${title} – Produktbild ${activeIndex + 1}`}
              fill
              priority={activeIndex === 0}
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-contain p-6 transition-transform duration-300 sm:p-10 lg:p-12"
            />

            <div className="absolute right-4 top-4 z-20">
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                aria-label="Bild vergrössern"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-sm backdrop-blur transition hover:border-neutral-300 hover:bg-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="h-5 w-5"
                >
                  <path
                    d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11 8v6M8 11h6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {validImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPreviousImage}
                  aria-label="Vorheriges Bild"
                  className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-white sm:left-5"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path
                      d="m15 18-6-6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={showNextImage}
                  aria-label="Nächstes Bild"
                  className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-white sm:right-5"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path
                      d="m9 18 6-6-6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            )}

            {validImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-neutral-900/75 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                {activeIndex + 1} / {validImages.length}
              </div>
            )}
          </div>
        </div>

        {validImages.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {validImages.map((image, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Produktbild ${index + 1} anzeigen`}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition sm:h-24 sm:w-24 ${
                    isActive
                      ? "border-neutral-900"
                      : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${title} – Vorschaubild ${index + 1}`}
                    fill
                          sizes="96px"
                    className="object-contain p-2"
                  />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {isZoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Produktbild vergrössert"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            aria-label="Vergrösserung schliessen"
            className="absolute right-4 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg transition hover:bg-neutral-100"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-6 w-6"
            >
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div
            className="relative h-[85vh] w-full max-w-7xl overflow-hidden rounded-2xl bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={activeImage}
              alt={`${title} – Vergrössertes Produktbild`}
              fill
              sizes="100vw"
              className="object-contain p-4 sm:p-8"
              priority
            />

            {validImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPreviousImage}
                  aria-label="Vorheriges Bild"
                  className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg transition hover:bg-neutral-100 sm:left-6"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="h-6 w-6"
                  >
                    <path
                      d="m15 18-6-6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={showNextImage}
                  aria-label="Nächstes Bild"
                  className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg transition hover:bg-neutral-100 sm:right-6"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="h-6 w-6"
                  >
                    <path
                      d="m9 18 6-6-6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-neutral-900/80 px-4 py-2 text-sm font-medium text-white">
                  {activeIndex + 1} / {validImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
