import approvedDeals from "@/config/blackNovemberApprovedDeals.json";

type Deal = {
  sku: string;
  merchandiseId: string;
  salePrice: number;
  previousPrice: number;
  startsAt: string;
  endsAt: string;
  verifiedAt: string;
  approved: boolean;
  priceHistoryVerified: boolean;
  marginVerified: boolean;
  shopifyCheckoutVerified: boolean;
};

export type ActiveBlackNovemberDeal = {
  previousPrice: number;
  percent: number;
};

function cents(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? Math.round(number * 100)
    : 0;
}

/**
 * Presentation-only safety gate. Does not change prices or talk to Shopify.
 * The sell price on the card must ALREADY match the approved Shopify price.
 * Approvals expire after 24h because the Alltron price feed changes daily.
 */
export function getActiveBlackNovemberDeal(product: {
  sku?: string;
  merchandiseId?: string | null;
  price: number;
}): ActiveBlackNovemberDeal | null {
  const sku = String(product.sku || "").trim();
  const merchandiseId = String(product.merchandiseId || "").trim();
  if (!sku || !merchandiseId) return null;

  const now = Date.now();
  const saleCents = cents(product.price);
  if (!saleCents) return null;

  const deals: Deal[] = (approvedDeals.deals || []) as Deal[];
  for (const deal of deals) {
    if (deal.sku !== sku || deal.merchandiseId !== merchandiseId) continue;
    if (
      deal.approved !== true ||
      deal.priceHistoryVerified !== true ||
      deal.marginVerified !== true ||
      deal.shopifyCheckoutVerified !== true
    ) continue;

    const start = Date.parse(deal.startsAt);
    const end = Date.parse(deal.endsAt);
    const verified = Date.parse(deal.verifiedAt);
    if (
      !Number.isFinite(start) || !Number.isFinite(end) ||
      !Number.isFinite(verified) ||
      now < start || now >= end ||
      verified > now || now - verified > 24 * 60 * 60 * 1000
    ) continue;

    const approvedSaleCents = cents(deal.salePrice);
    const previousCents = cents(deal.previousPrice);
    if (
      saleCents !== approvedSaleCents ||
      previousCents <= saleCents
    ) continue;

    const percent = Math.round((100 * (previousCents - saleCents)) / previousCents);
    if (percent < 1 || percent > 90) continue;
    return { previousPrice: previousCents / 100, percent };
  }

  return null;
}
