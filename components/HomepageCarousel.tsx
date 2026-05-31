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
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 z-10 hidden h-12 w-12 -translate-x-5 -translate-y-1/2 rounded-full border border-neutral-200 bg-white text-2xl font-black shadow-xl transition hover:scale-105 hover:bg-neutral-50 xl:flex xl:items-center xl:justify-center"
        aria-label="Zurück"
      >
        ‹
      </button>

      <div
        ref={ref}
        className="-mx-4 flex gap-6 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 z-10 hidden h-12 w-12 translate-x-5 -translate-y-1/2 rounded-full border border-neutral-200 bg-white text-2xl font-black shadow-xl transition hover:scale-105 hover:bg-neutral-50 xl:flex xl:items-center xl:justify-center"
        aria-label="Weiter"
      >
        ›
      </button>
    </div>
  );
}