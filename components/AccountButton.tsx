// components/AccountButton.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c0-3 3-5 7-5s7 2 7 5" />
    </svg>
  );
}

function LogoutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
      <polyline points="15 17 20 12 15 7" />
      <line x1="20" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function AccountButton() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const loginHref = `/login?from=${encodeURIComponent(pathname ?? "/")}`;

  // Não logado → um botão com ícone + "Login"
  if (!user) {
    return (
      <Link
        href={loginHref}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-100 transition"
      >
        <UserIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Login</span>
      </Link>
    );
  }

  // Logado → ícone Konto + ícone Logout
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-100 transition"
      >
        <UserIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Mein Konto</span>
      </Link>

      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-100 transition"
      >
        <LogoutIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  );
}
