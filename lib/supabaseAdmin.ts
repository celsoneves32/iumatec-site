// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não estão definidas nas env vars."
    );
  }

  return createClient(url, serviceKey);
}
