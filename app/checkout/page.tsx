// app/checkout/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return redirect("/login?from=/checkout");
  }

  return <CheckoutClient />;
}
