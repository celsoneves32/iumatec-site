// app/account/orders/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import OrdersClient from "./OrdersClient";

export type OrderRow = {
  id: string;

  // compatibilidade: Stripe (antigo)
  stripe_session_id?: string | null;

  // compatibilidade: Shopify (novo)
  shopify_order_id?: string | null;

  customer_email?: string | null;

  total_amount?: number | null;
  currency?: string | null;

  // compatibilidade: antigo e novo
  items?: any;
  line_items?: any;

  created_at: string;
};

export default async function OrdersPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?from=/account/orders");

  // Busca orders server-side (RLS vai garantir “só as tuas”, se já criaste policy)
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  // Se der erro (por exemplo tabela ainda não existe / RLS), não quebramos a página
  const safeOrders = (!error && orders ? (orders as OrderRow[]) : []) ?? [];

  return <OrdersClient orders={safeOrders} userEmail={user.email ?? null} />;
}
