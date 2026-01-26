// app/account/orders/types.ts
export type OrderRow = {
  id: string;
  user_id: string | null;
  stripe_session_id: string | null;
  customer_email: string | null;
  total_amount: number | null;
  currency: string | null;
  items: any;
  created_at: string;
};
