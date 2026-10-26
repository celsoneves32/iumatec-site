import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const productSlug = String(body.productSlug || "").trim();
    const token = String(body.token || "").trim();
    const name = String(body.name || "").trim();
    const text = String(body.text || "").trim();
    const rating = Number(body.rating || 0);

    if (!productSlug) {
      return NextResponse.json(
        { ok: false, error: "Produkt fehlt." },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Für eine verifizierte Bewertung brauchst du den Link aus der E-Mail.",
        },
        { status: 403 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Name fehlt." },
        { status: 400 }
      );
    }

    if (!text || text.length < 5) {
      return NextResponse.json(
        { ok: false, error: "Bewertung ist zu kurz." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { ok: false, error: "Bewertung muss zwischen 1 und 5 sein." },
        { status: 400 }
      );
    }

    const { data: request, error: requestError } = await supabaseAdmin
      .from("review_requests")
      .select("*")
      .eq("token", token)
      .eq("product_slug", productSlug)
      .is("used_at", null)
      .single();

    if (requestError || !request) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Dieser Bewertungslink ist ungültig oder wurde bereits verwendet.",
        },
        { status: 403 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("product_reviews")
      .insert({
        product_slug: productSlug,
        name,
        rating,
        text,
        verified: true,
        order_id: request.order_id,
        email: request.email,
      });

    if (insertError) {
      console.error("insert review error:", insertError);
      return NextResponse.json(
        { ok: false, error: "Bewertung konnte nicht gespeichert werden." },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("review_requests")
      .update({ used_at: new Date().toISOString() })
      .eq("id", request.id);

    if (updateError) {
      console.error("update review request error:", updateError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/review error:", error);

    return NextResponse.json(
      { ok: false, error: "Bewertung konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}