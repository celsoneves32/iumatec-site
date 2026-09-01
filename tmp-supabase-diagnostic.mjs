const url =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const key =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL encontrada:", Boolean(url));
console.log("KEY encontrada:", Boolean(key));

if (!url || !key) {
  console.error("FALTAM VARIAVEIS SUPABASE");
  process.exit(2);
}

const endpoint =
  `${url.replace(/\/$/, "")}/rest/v1/products?select=catalog_key,sku,price,merchandise_id,shopify_variant_id&limit=3`;

const response = await fetch(endpoint, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: "count=exact"
  }
});

console.log("HTTP status:", response.status);
console.log("Content-Range:", response.headers.get("content-range"));

const text = await response.text();

console.log("Resposta primeiros 1000 chars:");
console.log(text.slice(0, 1000));

if (!response.ok) {
  process.exit(3);
}
