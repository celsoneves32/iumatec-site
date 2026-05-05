import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type ProductReview = {
  productSlug: string;
  name: string;
  rating: number;
  text: string;
  verified: boolean;
  date: string;
};

export async function getProductReviews(
  productSlug: string
): Promise<ProductReview[]> {
  const { data, error } = await supabaseAdmin
    .from("product_reviews")
    .select("product_slug,name,rating,text,verified,created_at")
    .eq("product_slug", productSlug)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getProductReviews error:", error);
    return [];
  }

  return (data || []).map((review) => ({
    productSlug: review.product_slug,
    name: review.name,
    rating: review.rating,
    text: review.text,
    verified: Boolean(review.verified),
    date: String(review.created_at || "").split("T")[0],
  }));
}