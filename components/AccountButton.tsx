// components/AccountButton.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function AccountButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  const userName =
    (session?.user?.name as string | undefined) ||
    (session?.user?.email as string | undefined) ||
    "Mein Konto";

  // Não logado → botão simples que leva ao /login
  if (status === "unauthenticated" || !session) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:border-red-500 hover:text-red-600"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
          >
            <path
              d="M12 12a3.3 3.3 0 1 0-3.3-3.3A3.3 3.3 0 0 0 12 12Zm0 1.8c-3 0-5.5 1.4-5.5 3.2A1 1 0 0 0 7.5 19h9a1 1 0 0 0 1-1c0-1.8-2.5-3.2-5.5-3.2Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span>Anmelden</span>
      </Link>
    );
  }

  // Logado → pequeno menu conta
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:border-red-500 hover:text-red-600"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
          >
            <path
              d="M12 12a3.3 3.3 0 1 0-3.3-3.3A3.3 3.3 0 0 0 12 12Zm0 1.8c-3 0-5.5 1.4-5.5 3.2A1 1 0 0 0 7.5 19h9a1 1 0 0 0 1-1c0-1.8-2.5-3.2-5.5-3.2Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className="max-w-[120px] truncate">{userName}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`h-3 w-3 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="M7 9.5 12 14.5 17 9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-neutral-200 bg-white shadow-lg text-xs py-1 z-20">
          <Link
            href="/konto"
            className="flex w-full items-center px-3 py-2 hover:bg-neutral-50"
          >
            Meine Daten
          </Link>
          <Link
            href="/bestellungen"
            className="flex w-full items-center px-3 py-2 hover:bg-neutral-50"
          >
            Bestellungen
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center px-3 py-2 text-red-600 hover:bg-red-50"
          >
            Abmelden
          </button>
        </div>
      )}
    </div>
  );
}
