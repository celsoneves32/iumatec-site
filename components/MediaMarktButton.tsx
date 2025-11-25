"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type MediaMarktButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
};

export default function MediaMarktButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  children,
  className = "",
  ...props
}: MediaMarktButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-full font-semibold transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap";

  const sizeClass =
    size === "sm" ? "text-xs px-3 py-1.5" : "text-sm px-5 py-2.5";

  const widthClass = fullWidth ? "w-full" : "";

  let variantClass = "";
  switch (variant) {
    case "primary":
      // CTA vermelho estilo MediaMarkt
      variantClass =
        "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800";
      break;
    case "secondary":
      // Borda vermelha, fundo branco
      variantClass =
        "border border-red-600 text-red-700 bg-white hover:bg-red-50";
      break;
    case "ghost":
      // Só texto com hover de fundo leve
      variantClass =
        "text-red-700 hover:bg-red-50";
      break;
    case "danger":
      variantClass =
        "bg-red-700 text-white hover:bg-red-800";
      break;
  }

  return (
    <button
      {...props}
      className={`${base} ${sizeClass} ${widthClass} ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}
