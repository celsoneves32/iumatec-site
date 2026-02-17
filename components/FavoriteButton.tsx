"use client";

import { useMemo } from "react";
import { useFavorites } from "@/context/FavoritesContext";

type FavoriteButtonProps = {
  id: string;
  className?: string;
};

export default function FavoriteButton({ id, className }: FavoriteButtonProps) {
  // O teu hook está tipado como FavoritesState (sem isFavorite),
  // então tratamos como "state" e fazemos fallback para vários formatos.
  const fav: any = useFavorites();

  const active = useMemo(() => {
    // Se existir função isFavorite (alguns projetos têm)
    if (typeof fav?.isFavorite === "function") return !!fav.isFavorite(id);

    // Se existir array favorites / ids / items
    const arr =
      (Array.isArray(fav?.favorites) && fav.favorites) ||
      (Array.isArray(fav?.ids) && fav.ids) ||
      (Array.isArray(fav?.items) && fav.items) ||
      [];

    return arr.includes(id);
  }, [fav, id]);

  function onToggle() {
    // função toggle / toggleFavorite
    if (typeof fav?.toggle === "function") return fav.toggle(id);
    if (typeof fav?.toggleFavorite === "function") return fav.toggleFavorite(id);

    // padrão reducer: dispatch({ type: 'TOGGLE', id })
    if (typeof fav?.dispatch === "function") return fav.dispatch({ type: "TOGGLE", id });

    // fallback: se houver setFavorites e favorites array
    if (typeof fav?.setFavorites === "function" && Array.isArray(fav?.favorites)) {
      const next = active ? fav.favorites.filter((x: string) => x !== id) : [...fav.favorites, id];
      return fav.setFavorites(next);
    }
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50",
        active ? "border-black" : "border-neutral-300",
        className ?? "",
      ].join(" ")}
      aria-pressed={active}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
    >
      <span className="mr-2">{active ? "♥" : "♡"}</span>
      {active ? "Favorit" : "Favorisieren"}
    </button>
  );
}
