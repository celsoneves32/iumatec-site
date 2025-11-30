// components/AddToFavoritesButton.tsx
"use client";

import { useFavorites } from "@/context/FavoritesContext";

type Props = {
  productId: string;
};

function HeartIconFilled(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
      fill="currentColor"
    >
      <path d="M20.8 6.5A5 5 0 0 0 12 6.3a5 5 0 0 0-8.8 3.4c0 3.2 2.8 5.4 6.5 8.3l1.2.9c.6.5 1.6.5 2.2 0l1.2-.9c3.7-2.9 6.5-5.1 6.5-8.3a5 5 0 0 0-0.9-3.3Z" />
    </svg>
  );
}

function HeartIconOutline(props: React.SVGProps<SVGSVGElement>) {
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

export default function AddToFavoritesButton({ productId }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(productId);

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? "bg-red-50 text-red-600 border border-red-200"
          : "bg-neutral-100 text-neutral-700 border border-transparent hover:bg-neutral-200"
      }`}
    >
      {active ? (
        <HeartIconFilled className="h-4 w-4" />
      ) : (
        <HeartIconOutline className="h-4 w-4" />
      )}
      <span>{active ? "In Favoriten" : "Merken"}</span>
    </button>
  );
}
