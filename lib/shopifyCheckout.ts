export async function createCheckout(items: {
  sku: string;
  quantity: number;
}[]) {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

  if (!domain) {
    throw new Error("Missing SHOPIFY DOMAIN");
  }

  const lines = items
    .map((item) => `${item.sku}:${item.quantity}`)
    .join(",");

  return `https://${domain}/cart/${lines}`;
}