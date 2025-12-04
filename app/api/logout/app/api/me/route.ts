// app/api/me/route.ts
import { supabase } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);

  if (!userId) {
    return new Response(JSON.stringify({ user: null }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: user, error } = await supabase
    .from("User")
    .select("id, email, name")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return new Response(JSON.stringify({ user: null }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
