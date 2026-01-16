// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  // ✅ usa a mesma URL do client público (deve ser https://xxxx.supabase.co)
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url.startsWith("https://")) {
    throw new Error(
      "SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL inválida. Tem de começar por https://"
    );
  }

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não está definida.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
