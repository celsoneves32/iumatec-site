"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/hooks/useUser";

export default function AccountButton() {
  const { user, loading } = useUser();

  if (loading) return null;

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">{user.email}</span>
      <button
        onClick={handleLogout}
        className="text-sm text-red-600 hover:underline"
      >
        Logout
      </button>
    </div>
  );
}
