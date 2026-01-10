// app/account/orders/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import OrdersClient from "./OrdersClient";

export type OrderRow = {
  id: string;

  user_id: string;

  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;

  status?: string | null;
  payment_status?: string | null;
  mode?: string | null;

  customer_email?: string | null;

  amount_total?: number | null; // cents
  currency?: string | null;     // "chf"

  shipping_cost?: number | null;       // cents
  shipping_name?: string | null;
  shipping_address?: any;              // json

  created_at: string;
};

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);

  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    redirect("/login?from=/account/orders");
  }

  // Busca orders com Service Role (server-side), filtrando por user_id.
  // Isto funciona mesmo que RLS ainda não esteja perfeito.
  const supabaseAdmin = getSupabaseAdmin();

  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id,user_id,stripe_session_id,stripe_payment_intent_id,status,payment_status,mode,customer_email,amount_total,currency,shipping_cost,shipping_name,shipping_address,created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const safeOrders = (!error && orders ? (orders as OrderRow[]) : []) ?? [];

  // Email vindo do NextAuth
  const userEmail = session?.user?.email ?? null;

  return <OrdersClient orders={safeOrders} userEmail={userEmail} />;
}
