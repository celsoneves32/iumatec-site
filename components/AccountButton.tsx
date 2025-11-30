"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AccountButton() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const loginHref = `/login?from=${encodeURIComponent(pathname ?? "/")}`;

  // ❌ Não logado → mostrar botão Login
  if (!user) {
    return (
      <Link
        href={loginHref}
        className="text-sm font-medium px-3 py-1.5 rounded-full border border-neutral-200 hover:bg-neutral-100"
      >
        Login
      </Link>
    );
  }

  // ✅ Logado → “Mein Konto” + Logout
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard"
        className="hidden sm:inline-flex text-sm font-medium px-3 py-1.5 rounded-full border border-neutral-200 hover:bg-neutral-100"
      >
        Mein Konto
      </Link>

      <button
        type="button"
        onClick={logout}
        className="text-xs text-neutral-500 hover:text-neutral-800 underline"
      >
        Logout
      </button>
    </div>
  );
}
