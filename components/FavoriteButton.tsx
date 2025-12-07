// components/FavoriteButton.tsx
"use client";

import { useFavorites } from "@/context/FavoritesContext";

type FavoriteButtonProps = {
  id: string;
  title: string;
  price?: number;
  image?: string;
};

export default function FavoriteButton({
  id,
  title,
  price,
  image,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();

  const active = isFavorite(id);

  const handleClick = () => {
    toggleFavorite({ id, title, price, image });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-red-500 bg-red-50 text-red-600"
          : "border-neutral-300 bg-white text-neutral-700 hover:border-red-400 hover:text-red-600"
      }`}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center">
        {active ? (
          // coração cheio
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M12 20s-5.2-3.2-8-6.4C2.3 12.7 2 11.9 2 11A4 4 0 0 1 6 7c1.3 0 2.6.7 3.4 1.8L12 10.7l2.6-1.9A4 4 0 0 1 18 7a4 4 0 0 1 4 4c0 .9-.3 1.7-2 2.6-2.8 3.2-8 6.4-8 6.4Z"
              fill="currentColor"
            />
          </svg>
        ) : (
          // coração outline
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M12 20s-5.2-3.2-8-6.4C2.3 12.7 2 11.9 2 11A4 4 0 0 1 6 7c1.3 0 2.6.7 3.4 1.8L12 10.7l2.6-1.9A4 4 0 0 1 18 7a4 4 0 0 1 4 4c0 .9-.3 1.7-2 2.6-2.8 3.2-8 6.4-8 6.4Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span>{active ? "In Favoriten" : "Zu Favoriten"}</span>
    </button>
  );
}
