// components/FavoriteButton.tsx
"use client";

import Link from "next/link";

function HeartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 6.5A5 5 0 0 0 12 6.3a5 5 0 0 0-8.8 3.4c0 3.2 2.8 5.4 6.5 8.3l1.2.9c.6.5 1.6.5 2.2 0l1.2-.9c3.7-2.9 6.5-5.1 6.5-8.3a5 5 0 0 0-0.9-3.3Z" />
    </svg>
  );
}

export default function FavoriteButton() {
  // 👉 no futuro podes ligar isto a um contexto de favoritos
  const count = 0; // por enquanto sempre 0

  return (
    <Link
      href="/favoriten"
      className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-100 transition"
    >
      <HeartIcon className="h-5 w-5" />
      <span className="hidden sm:inline">Favoriten</span>
      {count > 0 && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-red-600 text-white text-[11px] font-bold px-1.5">
          {count}
        </span>
      )}
    </Link>
  );
}
