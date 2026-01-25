// app/checkout/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?from=/checkout");
  }

  return <CheckoutClient />;
}
