"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

type Props = {
  children: React.ReactNode;
};

export default function HomepageCarousel({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    const el = ref.current;
    if (!el) return;

    const amount = Math.max(el.clientWidth * 0.82, 280);

    el.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  }

  return (
    <div className="group/carousel relative max-w-full">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute -left-2 top-[43%] z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-[0_10px_28px_rgba(15,23,42,.13)] transition hover:scale-105 hover:border-neutral-300 hover:bg-neutral-950 hover:text-white lg:flex"
        aria-label="Zurück"
      >
        <ChevronLeft size={20} strokeWidth={2.4} />
      </button>

      <div
        ref={ref}
        className="flex max-w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-0.5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute -right-2 top-[43%] z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-[0_10px_28px_rgba(15,23,42,.13)] transition hover:scale-105 hover:border-neutral-300 hover:bg-neutral-950 hover:text-white lg:flex"
        aria-label="Weiter"
      >
        <ChevronRight size={20} strokeWidth={2.4} />
      </button>
    </div>
  );
}
