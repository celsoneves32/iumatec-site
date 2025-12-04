"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  name?: string | null;
};

export default function AccountButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center rounded-full border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-50"
      >
        Login
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center rounded-full border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-50"
      >
        Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard"
        className="inline-flex items-center rounded-full border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-50"
      >
        Mein Konto
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex items-center rounded-full border border-red-500 text-red-600 px-4 py-1.5 text-sm hover:bg-red-50"
      >
        Logout
      </button>
    </div>
  );
}
