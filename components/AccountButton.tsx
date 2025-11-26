"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

type UserState = "loading" | "loggedIn" | "loggedOut";

export default function AccountButton() {
  const [state, setState] = useState<UserState>("loading");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? "loggedIn" : "loggedOut");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? "loggedIn" : "loggedOut");
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Link
      href="/account"
      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
      aria-label="Mein Konto"
    >
      {/* ícone simples de user */}
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-white text-xs">
        <span>👤</span>
      </span>
      <span>
        {state === "loading"
          ? "Konto"
          : state === "loggedIn"
          ? "Mein Konto"
          : "Login"}
      </span>
    </Link>
  );
}
