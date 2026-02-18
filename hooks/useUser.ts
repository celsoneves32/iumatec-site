"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1) sessão inicial
    supabase.auth.getSession().then((res: any) => {
      if (!mounted) return;
      setUser(res?.data?.session?.user ?? null);
      setLoading(false);
    });

    // 2) updates de auth
    const { data: sub }: any = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return { user, loading };
}
