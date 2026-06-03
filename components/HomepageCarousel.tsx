"use client";

import { useRef } from "react";

type Props = {
  children: React.ReactNode;
};

export default function HomepageCarousel({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    ref.current?.scrollBy({
      left: direction === "right" ? 980 : -980,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative max-w-full overflow-hidden">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 rounded-full border border-neutral-200 bg-white text-2xl font-black shadow-xl transition hover:scale-105 hover:bg-neutral-50 xl:flex xl:items-center xl:justify-center"
        aria-label="Zurück"
      >
        ‹
      </button>

      <div
        ref={ref}
        className="flex max-w-full gap-6 overflow-x-auto scroll-smooth px-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 rounded-full border border-neutral-200 bg-white text-2xl font-black shadow-xl transition hover:scale-105 hover:bg-neutral-50 xl:flex xl:items-center xl:justify-center"
        aria-label="Weiter"
      >
        ›
      </button>
    </div>
  );
}