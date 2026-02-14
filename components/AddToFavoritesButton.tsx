"use client";

import { useFavorites } from "@/context/FavoritesContext";

export default function AddToFavoritesButton({
  productId,
  className = "",
}: {
  productId: string;
  className?: string;
}) {
  const { has, toggle } = useFavorites();
  const active = has(productId);

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
        active ? "border-black bg-black text-white" : "border-neutral-200 hover:bg-neutral-50",
        className,
      ].join(" ")}
      title={active ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
    >
      <span aria-hidden>{active ? "♥" : "♡"}</span>
      {active ? "Favorit" : "Merken"}
    </button>
  );
}
