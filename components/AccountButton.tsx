"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AccountButton() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const loginHref = `/login?from=${encodeURIComponent(pathname ?? "/")}`;

  const btnClass =
    "px-4 py-2 rounded-xl border border-neutral-300 text-sm font-semibold hover:bg-neutral-100 transition";

  if (!user) {
    return (
      <Link href={loginHref} className={btnClass}>
        Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/dashboard" className={btnClass}>
        Mein Konto
      </Link>

      <button type="button" onClick={logout} className={btnClass}>
        Logout
      </button>
    </div>
  );
}
