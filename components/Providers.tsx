"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/context/CartContext"; // ✅ certo

export default function Providers({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
