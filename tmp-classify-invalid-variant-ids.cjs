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

const text = v => String(v ?? "").trim();
const validGid = v =>
  /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(text(v));

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
      throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    }

    const batch = await res.json();
    rows.push(...batch);

    if (batch.length < PAGE) break;
  }

  return rows;
}

(async () => {
  console.log("");
  console.log("================================================");
  console.log(" CLASSIFICAR OS 16 IDs INVALIDOS");
  console.log("================================================");
  console.log("READ ONLY - NADA SERA ALTERADO");
  console.log("");

  const rows = await loadAll();

  const invalid = rows.filter(
    r => !validGid(r.shopify_variant_id)
  );

  const bySku = new Map();
  const byEan = new Map();

  for (const r of rows) {
    const sku = text(r.sku).toUpperCase();
    const ean = text(r.ean);

    if (sku) {
      if (!bySku.has(sku)) bySku.set(sku, []);
      bySku.get(sku).push(r);
    }

    if (ean) {
      if (!byEan.has(ean)) byEan.set(ean, []);
      byEan.get(ean).push(r);
    }
  }

  const groups = new Map();

  for (const r of invalid) {
    const sku = text(r.sku).toUpperCase();
    const ean = text(r.ean);
    const key = `${sku}|${ean}`;

    if (!groups.has(key)) {
      groups.set(key, {
        sku,
        ean,
        invalidRows: 0
      });
    }

    groups.get(key).invalidRows++;
  }

  const result = [];

  for (const g of groups.values()) {
    const candidates = [
      ...(g.sku ? bySku.get(g.sku) || [] : []),
      ...(g.ean ? byEan.get(g.ean) || [] : [])
    ];

    const unique = [...new Set(candidates)];

    const valid = unique.filter(
      r => validGid(r.shopify_variant_id)
    );

    const variantIds = [
      ...new Set(
        valid
          .map(r => text(r.shopify_variant_id))
          .filter(Boolean)
      )
    ];

    const merchandiseIds = [
      ...new Set(
        valid
          .map(r => text(r.merchandise_id))
          .filter(Boolean)
      )
    ];

    let status;

    if (variantIds.length) {
      status = "TEM_LINHA_VALIDA";
    } else if (g.invalidRows > 1) {
      status = "DUPLICADO_SEM_LINK";
    } else {
      status = "UNICO_SEM_LINK";
    }

    result.push({
      sku: g.sku,
      ean: g.ean,
      invalidRows: g.invalidRows,
      validTwinCount: valid.length,
      validVariantIds: variantIds.join(" | "),
      validMerchandiseIds: merchandiseIds.join(" | "),
      status
    });
  }

  const counts = {
    totalInvalidRows: invalid.length,
    uniqueProducts: result.length,
    withValidTwin: result.filter(x => x.status === "TEM_LINHA_VALIDA").length,
    duplicateUnlinked: result.filter(x => x.status === "DUPLICADO_SEM_LINK").length,
    uniqueUnlinked: result.filter(x => x.status === "UNICO_SEM_LINK").length
  };

  console.log("Supabase total       :", rows.length);
  console.log("Linhas invalidas     :", counts.totalInvalidRows);
  console.log("Produtos unicos      :", counts.uniqueProducts);
  console.log("Com linha valida     :", counts.withValidTwin);
  console.log("Duplicados sem link  :", counts.duplicateUnlinked);
  console.log("Unicos sem link      :", counts.uniqueUnlinked);
  console.log("");

  console.table(result);

  const out = path.join(
    ROOT,
    "integrations",
    "alltron",
    "out",
    "shopify-price-reconcile",
    "invalid-variant-classification.json"
  );

  fs.writeFileSync(out, JSON.stringify({ counts, result }, null, 2), "utf8");

  console.log("");
  console.log("Relatorio:", out);
  console.log("");
  console.log("NADA FOI ALTERADO.");
})().catch(err => {
  console.error(err);
  process.exit(1);
});
