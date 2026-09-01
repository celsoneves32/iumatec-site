const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL nao encontrada.");
}

if (!SUPABASE_KEY) {
  throw new Error("SUPABASE KEY nao encontrada.");
}

const litms = ["1848712","1849402","1955306","1955343","2033170"];

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: Bearer ${SUPABASE_KEY},
    "Content-Type": "application/json",
    ...extra,
  };
}

const output = [];

for (const litm of litms) {

  const catalogKey = litm: + litm;

  const url =
    SUPABASE_URL +
    "/rest/v1/products" +
    "?select=catalog_key,sku,ean,price,merchandise_id,shopify_variant_id,title,stock" +
    "&catalog_key=eq." +
    encodeURIComponent(catalogKey);

  const response = await fetch(url, {
    headers: headers(),
  });

  if (!response.ok) {
    throw new Error(
      "Supabase " +
      response.status +
      ": " +
      (await response.text())
    );
  }

  const rows = await response.json();

  output.push({
    litm,
    count: rows.length,
    rows,
  });
}

console.log(JSON.stringify(output, null, 2));
