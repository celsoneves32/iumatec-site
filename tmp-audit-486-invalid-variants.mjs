import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const TECH_PATH = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-tech-catalog.json"
);

const OUT_DIR = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile"
);

const OUTPUT_JSON = path.join(
  OUT_DIR,
  "invalid-486-variant-audit.json"
);

const OUTPUT_CSV = path.join(
  OUT_DIR,
  "invalid-486-variant-audit.csv"
);

function text(value) {
  return value === null || value === undefined
    ? ""
    : String(value).trim();
}

function normalizeSku(value) {
  return text(value).toUpperCase();
}

function extractLitm(catalogKey) {
  const value = text(catalogKey);

  const match = value.match(/^litm\s*:\s*(.+)$/i);

  return match
    ? text(match[1])
    : "";
}

function normalizeVariantId(value) {
  const valueText = text(value);

  if (!valueText) {
    return "";
  }

  const match = valueText.match(/(\d+)$/);

  return match
    ? match[1]
    : "";
}

function validVariantId(product) {
  const merchandiseId =
    normalizeVariantId(product?.merchandise_id);

  const shopifyVariantId =
    normalizeVariantId(product?.shopify_variant_id);

  return Boolean(
    merchandiseId ||
    shopifyVariantId
  );
}

function csvValue(value) {
  const s = text(value);

  return `"${s.replaceAll('"', '""')}"`;
}

function saveCsv(rows, filePath) {

  const columns = [
    "classification",
    "catalogKey",
    "litm",
    "supabaseSku",
    "supabaseEan",
    "supabasePrice",
    "merchandiseId",
    "shopifyVariantId",
    "alltronRows",
    "exactSkuRows",
    "currentSku",
    "currentEan",
    "currentTitle",
    "alltronPrice",
    "ecpr",
    "inpr",
    "stock",
    "allSkusForLitm"
  ];

  const lines = [
    columns.join(",")
  ];

  for (const row of rows) {

    lines.push(
      columns
        .map(column => csvValue(row[column]))
        .join(",")
    );
  }

  fs.writeFileSync(
    filePath,
    lines.join("\n"),
    "utf8"
  );
}

function supabaseConfig() {

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url) {
    throw new Error(
      "SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL nao encontrada."
    );
  }

  if (!key) {
    throw new Error(
      "SUPABASE KEY nao encontrada."
    );
  }

  return {
    url: url.replace(/\/+$/, ""),
    key
  };
}

async function fetchSupabaseProducts() {

  const {
    url,
    key
  } = supabaseConfig();

  const PAGE_SIZE = 1000;

  const select = [
    "catalog_key",
    "sku",
    "ean",
    "price",
    "merchandise_id",
    "shopify_variant_id"
  ].join(",");

  const rows = [];

  for (
    let from = 0;
    ;
    from += PAGE_SIZE
  ) {

    const to =
      from + PAGE_SIZE - 1;

    const endpoint =
      `${url}/rest/v1/products` +
      `?select=${encodeURIComponent(select)}` +
      `&order=catalog_key.asc`;

    const response =
      await fetch(
        endpoint,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            Range: `${from}-${to}`,
            Prefer: "count=exact"
          },
          signal:
            AbortSignal.timeout(60000)
        }
      );

    if (!response.ok) {

      const body =
        await response.text();

      throw new Error(
        `Supabase ${response.status}: ${body.slice(0, 1000)}`
      );
    }

    const batch =
      await response.json();

    rows.push(...batch);

    console.log(
      `Supabase lidos: ${rows.length}`
    );

    if (batch.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

console.log("");
console.log(
  "===== AUDITORIA 486 INVALID VARIANT IDS ====="
);
console.log("");

if (!fs.existsSync(TECH_PATH)) {
  throw new Error(
    `Tech catalog nao encontrado: ${TECH_PATH}`
  );
}

fs.mkdirSync(
  OUT_DIR,
  {
    recursive: true
  }
);

console.log(
  "A carregar catalogo Alltron..."
);

const tech =
  JSON.parse(
    fs.readFileSync(
      TECH_PATH,
      "utf8"
    )
  );

if (!Array.isArray(tech)) {
  throw new Error(
    "iumatec-tech-catalog.json nao contem um array."
  );
}

console.log(
  `Alltron tech rows: ${tech.length}`
);

console.log("");
console.log(
  "A carregar Supabase..."
);

const products =
  await fetchSupabaseProducts();

console.log("");
console.log(
  `Supabase total: ${products.length}`
);

const invalid =
  products.filter(
    product =>
      !validVariantId(product)
  );

console.log(
  `Sem Variant ID valido: ${invalid.length}`
);

if (invalid.length !== 486) {

  console.log("");
  console.log(
    "ATENCAO: quantidade diferente de 486."
  );
  console.log(
    "A auditoria vai continuar sem alterar nada."
  );
}

console.log("");
console.log(
  "A indexar Alltron por LITM..."
);

const byLitm =
  new Map();

for (const row of tech) {

  const litm =
    text(row?.litm);

  if (!litm) {
    continue;
  }

  const existing =
    byLitm.get(litm) || [];

  existing.push(row);

  byLitm.set(
    litm,
    existing
  );
}

console.log(
  `LITMs Alltron indexados: ${byLitm.size}`
);

console.log("");
console.log(
  "A classificar os produtos..."
);

const audit = [];

for (const product of invalid) {

  const catalogKey =
    text(product.catalog_key);

  const litm =
    extractLitm(catalogKey);

  const supabaseSku =
    text(product.sku);

  const supabaseEan =
    text(product.ean);

  const rows =
    litm
      ? (byLitm.get(litm) || [])
      : [];

  const exactSkuRows =
    rows.filter(
      row =>
        normalizeSku(row?.sku) ===
        normalizeSku(supabaseSku)
    );

  let best = null;
  let classification = "";

  if (!litm) {

    classification =
      "NO_LITM";

  }
  else if (rows.length === 0) {

    classification =
      "ABSENT_FROM_CURRENT_ALLTRON";

  }
  else if (exactSkuRows.length === 1) {

    best =
      exactSkuRows[0];

    classification =
      "PRESENT_EXACT_SKU_NO_VARIANT_ID";

  }
  else if (exactSkuRows.length > 1) {

    best =
      exactSkuRows[0];

    classification =
      "PRESENT_EXACT_SKU_AMBIGUOUS";

  }
  else if (rows.length === 1) {

    best =
      rows[0];

    classification =
      "PRESENT_LITM_SKU_CHANGED_NO_VARIANT_ID";

  }
  else {

    best =
      rows[0];

    classification =
      "PRESENT_LITM_AMBIGUOUS_NO_VARIANT_ID";
  }

  audit.push({
    classification,
    catalogKey,
    litm,
    supabaseSku,
    supabaseEan,
    supabasePrice:
      product.price ?? "",
    merchandiseId:
      text(product.merchandise_id),
    shopifyVariantId:
      text(product.shopify_variant_id),
    alltronRows:
      rows.length,
    exactSkuRows:
      exactSkuRows.length,
    currentSku:
      best ? text(best.sku) : "",
    currentEan:
      best ? text(best.ean) : "",
    currentTitle:
      best
        ? text(
            best.fullTitle ||
            best.title
          )
        : "",
    alltronPrice:
      best ? best.price ?? "" : "",
    ecpr:
      best ? best.ecpr ?? "" : "",
    inpr:
      best ? best.inpr ?? "" : "",
    stock:
      best ? best.stock ?? "" : "",
    allSkusForLitm:
      rows
        .map(row => text(row.sku))
        .filter(Boolean)
        .join(" | ")
  });
}

fs.writeFileSync(
  OUTPUT_JSON,
  JSON.stringify(
    audit,
    null,
    2
  ),
  "utf8"
);

saveCsv(
  audit,
  OUTPUT_CSV
);

const counts =
  new Map();

for (const row of audit) {

  counts.set(
    row.classification,
    (counts.get(row.classification) || 0) + 1
  );
}

console.log("");
console.log(
  "============================================="
);
console.log(
  "===== RESULTADO FINAL 486 ==================="
);
console.log(
  "============================================="
);
console.log("");

console.log(
  `Supabase total                         : ${products.length}`
);

console.log(
  `Sem Variant ID valido                  : ${invalid.length}`
);

console.log("");

const classifications = [
  "PRESENT_EXACT_SKU_NO_VARIANT_ID",
  "PRESENT_LITM_SKU_CHANGED_NO_VARIANT_ID",
  "PRESENT_EXACT_SKU_AMBIGUOUS",
  "PRESENT_LITM_AMBIGUOUS_NO_VARIANT_ID",
  "ABSENT_FROM_CURRENT_ALLTRON",
  "NO_LITM"
];

for (const name of classifications) {

  console.log(
    `${name.padEnd(39)}: ${counts.get(name) || 0}`
  );
}

const totalClassified =
  [...counts.values()]
    .reduce(
      (sum, value) =>
        sum + value,
      0
    );

console.log("");
console.log(
  `TOTAL CLASSIFICADO                     : ${totalClassified}`
);

console.log("");

if (
  totalClassified === invalid.length
) {

  console.log(
    "CONTAGEM FECHA 100%."
  );

}
else {

  console.log(
    "ERRO: CONTAGEM NAO FECHA."
  );
}

console.log("");
console.log(
  "===== AMOSTRA PRESENTES EXACT SKU ====="
);

console.table(
  audit
    .filter(
      row =>
        row.classification ===
        "PRESENT_EXACT_SKU_NO_VARIANT_ID"
    )
    .slice(0, 15)
    .map(
      row => ({
        litm:
          row.litm,
        supabaseSku:
          row.supabaseSku,
        currentSku:
          row.currentSku,
        price:
          row.alltronPrice,
        stock:
          row.stock
      })
    )
);

console.log("");
console.log(
  "===== AMOSTRA SKU ALTERADO ====="
);

console.table(
  audit
    .filter(
      row =>
        row.classification ===
        "PRESENT_LITM_SKU_CHANGED_NO_VARIANT_ID"
    )
    .slice(0, 15)
    .map(
      row => ({
        litm:
          row.litm,
        oldSku:
          row.supabaseSku,
        currentSku:
          row.currentSku,
        price:
          row.alltronPrice,
        stock:
          row.stock
      })
    )
);

console.log("");
console.log(
  "===== AMOSTRA AUSENTES ALLTRON ====="
);

console.table(
  audit
    .filter(
      row =>
        row.classification ===
        "ABSENT_FROM_CURRENT_ALLTRON"
    )
    .slice(0, 15)
    .map(
      row => ({
        litm:
          row.litm,
        sku:
          row.supabaseSku,
        price:
          row.supabasePrice
      })
    )
);

console.log("");
console.log(
  `JSON: ${OUTPUT_JSON}`
);
console.log(
  `CSV : ${OUTPUT_CSV}`
);

console.log("");
console.log(
  "NADA FOI ALTERADO."
);
console.log(
  "NAO EXECUTAR --apply AINDA."
);
