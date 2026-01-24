// app/checkout/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    redirect("/login?from=/checkout");
  }

  return <CheckoutClient />;
}
