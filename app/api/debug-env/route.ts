import { NextResponse } from "next/server";

export async function GET() {
  const rawKey = process.env.STRIPE_SECRET_KEY;
  const trimmed = rawKey?.trim();

  return NextResponse.json({
    hasStripeSecretKey: !!rawKey,
    hasTrimmedStripeKey: !!trimmed,
    stripeKeyLength: rawKey ? rawKey.length : 0,
    // NÃO devolvemos a chave – só info geral
  });
}
