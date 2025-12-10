// components/SessionProviderWrapper.tsx
"use client";

import type { ReactNode } from "react";

export default function SessionProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  // Já não usamos NextAuth; este wrapper só devolve os children
  return <>{children}</>;
}
