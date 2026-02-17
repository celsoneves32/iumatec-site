"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/hooks/useUser";

export default function AccountButton() {
  const { user, loading } = useUser();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <button className="rounded-lg border px-3 py-2 text-sm opacity-70">
        ...
      </button>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
      >
        Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
      >
        Konto
      </Link>
      <button
        onClick={handleLogout}
        className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
      >
        Logout
      </button>
    </div>
  );
}
