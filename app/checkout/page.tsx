// app/checkout/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?from=/checkout");
  }

  return <CheckoutClient />;
}
