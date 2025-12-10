// components/AccountButton.tsx
"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/hooks/useUser";

export default function AccountButton() {
  const { user, loading } = useUser();

  if (loading) {
    return null;
  }

  // Não autenticado → link para login
  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium hover:text-red-600"
      >
        Anmelden
      </Link>
    );
  }

  // Autenticado → mostra e-mail + botão logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs md:text-sm text-neutral-800">
        {user.email}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        className="text-xs md:text-sm text-red-600 hover:underline"
      >
        Logout
      </button>
    </div>
  );
}
