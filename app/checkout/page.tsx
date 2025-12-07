// app/checkout/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
  const session = await getServerSession(authOptions);

  // Nur eingeloggte Nutzer dürfen zur Kasse
  if (!session) {
    redirect(`/login?from=/checkout`);
  }

  return <CheckoutClient />;
}
