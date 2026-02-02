// lib/supabaseServer.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url.startsWith("https://")) {
    throw new Error("SUPABASE_URL inválida (tem de começar com https://)");
  }

  if (!anonKey) {
    throw new Error("SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY em falta");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {
        // Em Server Components, não setamos cookies aqui.
        // O login/logout deve acontecer em Route Handlers ou Client.
      },
      remove() {
        // idem
      },
    },
  });
}
