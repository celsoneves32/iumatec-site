// components/FavoriteButton.tsx
"use client";

import { useFavorites } from "@/context/FavoritesContext";

type FavoriteButtonProps = {
  id: string;        // ID ou handle do produto
  title?: string;
  image?: string;
};

export default function FavoriteButton({ id }: FavoriteButtonProps) {
  const { isFavorite, toggle } = useFavorites();

  const active = isFavorite(id);

  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-label={
        active
          ? "Aus Favoriten entfernen"
          : "Zu Favoriten hinzufügen"
      }
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs transition-colors ${
        active
          ? "border-red-500 text-red-600 bg-red-50"
          : "border-neutral-200 text-neutral-500 bg-white hover:border-red-400 hover:text-red-600"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-4 w-4"
      >
        <path
          d="M12.1 5.05 12 5l-.1.05C10.14 6.18 8.5 7.2 7.3 8.4 6.06 9.66 5.25 11.1 5.25 12.75 5.25 15.7 7.55 18 10.5 18c.9 0 1.8-.24 2.6-.7.8.46 1.7.7 2.6.7 2.95 0 5.25-2.3 5.25-5.25 0-1.65-.81-3.09-2.05-4.35-1.2-1.2-2.84-2.22-4.8-3.35Z"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
    </button>
  );
}
