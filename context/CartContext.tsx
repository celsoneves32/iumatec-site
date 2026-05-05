"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type CartItem = {
  lineId: string;
  merchandiseId: string;
  productHandle: string;
  title: string;
  variantTitle: string;
  imageUrl: string | null;
  imageAlt: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  currencyCode: string;
};

type CartState = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  subtotal: string;
  total: string;
  currencyCode: string;
  items: CartItem[];
};

type CartToast = {
  type: "success" | "error";
  message: string;
};

type AddItemInput = {
  merchandiseId?: string | null;
  productHandle?: string | null;
  quantity?: number;
  imageUrl?: string | null;
};

type CartContextValue = {
  cartId: string | null;
  items: CartItem[];
  loading: boolean;
  totalQuantity: number;
  subtotal: number;
  total: number;
  currencyCode: string;
  checkoutUrl: string | null;
  isDrawerOpen: boolean;
  toast: CartToast | null;
  ensureCart: () => Promise<string | null>;
  addItem: (input: AddItemInput) => Promise<boolean>;
  updateQuantity: (lineId: string, quantity: number) => Promise<boolean>;
  removeItem: (lineId: string) => Promise<boolean>;
  refreshCart: () => Promise<void>;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearToast: () => void;
  resetCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "iumatec_cart_id";

function parseAmount(value: string) {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function getMessageFromJson(json: any, fallback: string) {
  if (!json) return fallback;

  if (typeof json.message === "string" && json.message.trim()) return json.message;

  if (Array.isArray(json.userErrors) && json.userErrors.length > 0) {
    const first = json.userErrors[0];
    if (typeof first?.message === "string" && first.message.trim()) return first.message;
  }

  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const first = json.errors[0];
    if (typeof first?.message === "string" && first.message.trim()) return first.message;
  }

  if (typeof json.error === "string" && json.error.trim()) return json.error;

  return fallback;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState<CartToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((nextToast: CartToast) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    setToast(nextToast);

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

  const saveCartId = useCallback((value: string | null) => {
    setCartId(value);

    if (typeof window === "undefined") return;

    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const resetCart = useCallback(() => {
    clearToast();
    setCart(null);
    saveCartId(null);
    setIsDrawerOpen(false);
    showToast({
      type: "success",
      message: "Warenkorb wurde zurückgesetzt.",
    });
  }, [clearToast, saveCartId, showToast]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const createCart = useCallback(async (): Promise<string | null> => {
    setLoading(true);

    try {
      const res = await fetch("/api/cart/create", {
        method: "POST",
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok || !json?.cart?.id) {
        showToast({
          type: "error",
          message: getMessageFromJson(json, "Warenkorb konnte nicht erstellt werden."),
        });
        return null;
      }

      saveCartId(json.cart.id);
      setCart(json.cart);
      return json.cart.id;
    } catch (error) {
      console.error("createCart error:", error);
      showToast({
        type: "error",
        message: "Warenkorb konnte nicht erstellt werden.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [saveCartId, showToast]);

  const refreshCart = useCallback(async () => {
    if (!cartId) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/cart/get?cartId=${encodeURIComponent(cartId)}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok || !json?.cart) {
        console.error("refreshCart failed:", json);
        saveCartId(null);
        setCart(null);
        setIsDrawerOpen(false);
        return;
      }

      setCart(json.cart);
    } catch (error) {
      console.error("refreshCart error:", error);
    } finally {
      setLoading(false);
    }
  }, [cartId, saveCartId]);

  const ensureCart = useCallback(async (): Promise<string | null> => {
    if (cartId) return cartId;
    return createCart();
  }, [cartId, createCart]);

  const addItem = useCallback(
    async (input: AddItemInput): Promise<boolean> => {
      const ensuredCartId = await ensureCart();
      if (!ensuredCartId) return false;

      const merchandiseId = input.merchandiseId?.trim() || null;
      const productHandle = input.productHandle?.trim() || null;
      const quantity = Math.max(1, Number(input.quantity || 1));
      const imageUrl = input.imageUrl?.trim() || null;

      if (!merchandiseId && !productHandle) {
        showToast({
          type: "error",
          message: "Produkt kann aktuell nicht bestellt werden.",
        });
        return false;
      }

      setLoading(true);

      try {
        const res = await fetch("/api/cart/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cartId: ensuredCartId,
            merchandiseId,
            productHandle,
            quantity,
            imageUrl,
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok || !json?.cart) {
          showToast({
            type: "error",
            message: getMessageFromJson(
              json,
              "Produkt konnte nicht zum Warenkorb hinzugefügt werden."
            ),
          });
          return false;
        }

        setCart(json.cart);
        setIsDrawerOpen(true);
        showToast({
          type: "success",
          message: "Produkt wurde zum Warenkorb hinzugefügt.",
        });

        return true;
      } catch (error) {
        console.error("addItem error:", error);
        showToast({
          type: "error",
          message: "Produkt konnte nicht zum Warenkorb hinzugefügt werden.",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [ensureCart, showToast]
  );

  const removeItem = useCallback(
    async (lineId: string): Promise<boolean> => {
      if (!cartId) return false;

      setLoading(true);

      try {
        const res = await fetch("/api/cart/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartId, lineId }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok || !json?.cart) {
          showToast({
            type: "error",
            message: getMessageFromJson(json, "Produkt konnte nicht entfernt werden."),
          });
          return false;
        }

        setCart(json.cart);
        return true;
      } catch (error) {
        console.error("removeItem error:", error);
        showToast({
          type: "error",
          message: "Produkt konnte nicht entfernt werden.",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [cartId, showToast]
  );

  const updateQuantity = useCallback(
    async (lineId: string, quantity: number): Promise<boolean> => {
      if (!cartId) return false;

      if (quantity <= 0) return removeItem(lineId);

      setLoading(true);

      try {
        const res = await fetch("/api/cart/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartId, lineId, quantity }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok || !json?.cart) {
          showToast({
            type: "error",
            message: getMessageFromJson(json, "Menge konnte nicht aktualisiert werden."),
          });
          return false;
        }

        setCart(json.cart);
        return true;
      } catch (error) {
        console.error("updateQuantity error:", error);
        showToast({
          type: "error",
          message: "Menge konnte nicht aktualisiert werden.",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [cartId, removeItem, showToast]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setCartId(stored);
  }, []);

  useEffect(() => {
    if (!cartId) return;
    void refreshCart();
  }, [cartId, refreshCart]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cartId,
      items: cart?.items ?? [],
      loading,
      totalQuantity: cart?.totalQuantity ?? 0,
      subtotal: parseAmount(cart?.subtotal ?? "0"),
      total: parseAmount(cart?.total ?? "0"),
      currencyCode: cart?.currencyCode ?? "CHF",
      checkoutUrl: cart?.checkoutUrl ?? null,
      isDrawerOpen,
      toast,
      ensureCart,
      addItem,
      updateQuantity,
      removeItem,
      refreshCart,
      openDrawer,
      closeDrawer,
      clearToast,
      resetCart,
    }),
    [
      cart,
      cartId,
      loading,
      isDrawerOpen,
      toast,
      ensureCart,
      addItem,
      updateQuantity,
      removeItem,
      refreshCart,
      openDrawer,
      closeDrawer,
      clearToast,
      resetCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}