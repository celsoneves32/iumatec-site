const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const URL = String(
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).replace(/\/+$/, "");

const KEY = String(
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ""
).trim();

if (!URL) throw new Error("SUPABASE_URL em falta.");
if (!KEY) throw new Error("SUPABASE key em falta.");

const PAGE = 1000;

async function loadAll() {
  const rows = [];

  for (let offset = 0; ; offset += PAGE) {
    const endpoint =
      `${URL}/rest/v1/products` +
      `?select=sku,ean,merchandise_id,shopify_variant_id` +
      `&limit=${PAGE}&offset=${offset}`;

    const res = await fetch(endpoint, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`
      }
    });

    if (!res.ok) {
      throw new Error(
        `Supabase ${res.status}: ${await res.text()}`
      );
    }

    const batch = await res.json();
    rows.push(...batch);

    if (rows.length % 5000 < PAGE) {
      console.log(`Lidos: ${rows.length}`);
    }

    if (batch.length < PAGE) break;
  }

  return rows;
}

function validVariantGid(value) {
  return /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(
    String(value || "").trim()
  );
}

(async () => {
  console.log("");
  console.log("==============================================");
  console.log(" AUDITORIA DOS SHOPIFY VARIANT IDs");
  console.log("==============================================");
  console.log("");
  console.log("READ ONLY - NADA SERA ALTERADO");
  console.log("");

  const rows = await loadAll();

  const invalid = rows
    .filter(r => !validVariantGid(r.shopify_variant_id))
    .map(r => ({
      sku: r.sku || "",
      ean: r.ean || "",
      merchandise_id: r.merchandise_id || "",
      shopify_variant_id: r.shopify_variant_id || ""
    }));

  console.log("");
  console.log("==============================================");
  console.log(" RESULTADO");
  console.log("==============================================");
  console.log("Supabase total :", rows.length);
  console.log("IDs invalidos  :", invalid.length);
  console.log("");

  console.table(invalid);

  const outDir = path.join(
    ROOT,
    "integrations",
    "alltron",
    "out",
    "shopify-price-reconcile"
  );

  fs.mkdirSync(outDir, { recursive: true });

  const out = path.join(
    outDir,
    "invalid-shopify-variant-ids.json"
  );

  fs.writeFileSync(
    out,
    JSON.stringify(invalid, null, 2),
    "utf8"
  );

  console.log("");
  console.log("Relatorio:");
  console.log(out);
  console.log("");
  console.log("NADA FOI ALTERADO.");
})();
