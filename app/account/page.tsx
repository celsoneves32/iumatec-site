// app/account/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export default async function AccountPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?next=/account");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Mein Konto</h1>
      <p className="text-neutral-600">
        Eingeloggt als: <span className="font-medium">{session.user.email}</span>
      </p>

      {/* TODO: perfil + orders */}
    </main>
  );
}
