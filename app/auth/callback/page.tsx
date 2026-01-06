"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Supabase processa o token no hash automaticamente no client
    // Só precisamos redirecionar
    (async () => {
      await supabase.auth.getSession();
      router.replace("/account"); // ou /login com “confirmado com sucesso”
    })();
  }, [router]);

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-xl font-semibold">Konto wird bestätigt…</h1>
      <p className="text-sm text-neutral-600 mt-2">Bitte kurz warten.</p>
    </main>
  );
}
