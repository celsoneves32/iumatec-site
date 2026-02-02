// app/account/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Mein Konto</h1>

      <div className="mt-4 rounded-lg border p-4">
        <p className="text-sm text-gray-500">Eingeloggt als:</p>
        <p className="mt-1 font-medium">{user.email}</p>
        <p className="mt-2 text-xs text-gray-500">User ID: {user.id}</p>
      </div>
    </main>
  );
}
