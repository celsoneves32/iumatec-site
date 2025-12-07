// context/FavoritesContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type FavoritesContextValue = {
  ids: string[];                 // IDs / handles dos produtos favoritos
  toggle: (id: string) => void;  // adiciona/remove favorito
  isFavorite: (id: string) => boolean;
  clear: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "iumatec_favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  // Carregar do localStorage no cliente
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setIds(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Guardar no localStorage sempre que mudar
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // ignore
    }
  }, [ids]);

  const toggle = (id: string) => {
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const isFavorite = (id: string) => ids.includes(id);

  const clear = () => setIds([]);

  const value: FavoritesContextValue = {
    ids,
    toggle,
    isFavorite,
    clear,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
