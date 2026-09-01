import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
dotenv.config({ path: path.join(ROOT, ".env.local") });
dotenv.config({ path: path.join(ROOT, ".env") });

const OUT_DIR = path.join(ROOT, "integrations", "alltron", "out");
const MAIN_CSV = path.join(OUT_DIR, "icecat-iumatec-storefront.csv");
const AUDIT_JSON = path.join(OUT_DIR, "icecat-iumatec-storefront-audit.json");
const MAX_UPLOAD_BYTES = Math.floor(9.5 * 1024 * 1024); // margem abaixo dos 10 MB do Icecat
const PAGE_SIZE = 1000;

const SUPABASE_URL = String(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
).trim();
const SUPABASE_KEY = String(
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
).trim();

function fail(message) {
  console.error(`\nERRO: ${message}`);
  process.exit(1);
}

if (!SUPABASE_URL) fail("Falta SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL no .env.local/.env");
if (!SUPABASE_KEY) fail("Falta SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY no .env.local/.env");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function text(value) {
  return String(value ?? "").trim();
}

function csvCell(value) {
  const s = text(value).replace(/\r?\n/g, " ");
  return /[",;\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvLine(values) {
  return values.map(csvCell).join(",") + "\r\n";
}

function productUrl(slug) {
  const clean = text(slug);
  return clean ? `https://iumatec.ch/produkte/${encodeURIComponent(clean)}` : "";
}

async function fetchCurrentStorefront() {
  const rows = [];
  let offset = 0;

  console.log("A ler produtos atuais da IUMATEC no Supabase...");

  while (true) {
    let query = supabase
      .from("products")
      .select([
        "ean",
        "brand",
        "internal_number",
        "sku",
        "title",
        "slug",
        "image",
        "price",
        "merchandise_id",
        "shopify_sync_status",
      ].join(","))
      .not("merchandise_id", "is", null)
      .gt("price", 0)
      .or("shopify_sync_status.is.null,shopify_sync_status.neq.unmatched_shopify")
      .order("sku", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;
    if (error) fail(`Supabase recusou a leitura: ${error.message}`);

    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    process.stdout.write(`\rLidos: ${rows.length.toLocaleString("pt-PT")}`);

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  process.stdout.write("\n");
  return rows;
}

function normalizeAndFilter(rows) {
  const stats = {
    readFromSupabase: rows.length,
    excludedMissingSlug: 0,
    excludedMissingImage: 0,
    excludedMissingIdentifier: 0,
    duplicateSku: 0,
  };

  const seen = new Set();
  const kept = [];

  for (const row of rows) {
    const sku = text(row.sku);
    const slug = text(row.slug);
    const image = text(row.image);
    const gtin = text(row.ean).replace(/\s+/g, "");
    const brand = text(row.brand);
    const mpn = text(row.internal_number);

    // A loja atual apresenta apenas produtos com rota/imagem válida.
    if (!slug) {
      stats.excludedMissingSlug++;
      continue;
    }
    if (!image) {
      stats.excludedMissingImage++;
      continue;
    }

    // Icecat consegue casar por GTIN ou Brand + Brand Product Code (MPN).
    if (!gtin && !(brand && mpn)) {
      stats.excludedMissingIdentifier++;
      continue;
    }

    const dedupeKey = sku || `${gtin}|${brand}|${mpn}|${slug}`;
    if (seen.has(dedupeKey)) {
      stats.duplicateSku++;
      continue;
    }
    seen.add(dedupeKey);

    kept.push({
      gtin,
      brand,
      mpn,
      sku,
      title: text(row.title),
      url: productUrl(slug),
    });
  }

  return { kept, stats };
}

function writeCsv(products) {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Cabeçalhos pensados para o mapeamento automático do Icecat.
  const header = csvLine([
    "GTIN",
    "Brand",
    "Brand Product Code",
    "SKU",
    "Product Name",
    "Product URL",
  ]);
  const lines = products.map((p) => csvLine([
    p.gtin,
    p.brand,
    p.mpn,
    p.sku,
    p.title,
    p.url,
  ]));

  const bom = "\uFEFF";
  fs.writeFileSync(MAIN_CSV, bom + header + lines.join(""), "utf8");
  const mainBytes = fs.statSync(MAIN_CSV).size;

  // Limpar partes antigas.
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (/^icecat-iumatec-storefront-part-\d+\.csv$/i.test(file)) {
      fs.rmSync(path.join(OUT_DIR, file), { force: true });
    }
  }

  const parts = [];
  if (mainBytes > MAX_UPLOAD_BYTES) {
    let partLines = [];
    let partBytes = Buffer.byteLength(bom + header, "utf8");
    let partNo = 1;

    const flush = () => {
      if (!partLines.length) return;
      const filename = `icecat-iumatec-storefront-part-${String(partNo).padStart(2, "0")}.csv`;
      const filepath = path.join(OUT_DIR, filename);
      fs.writeFileSync(filepath, bom + header + partLines.join(""), "utf8");
      parts.push({
        file: filepath,
        rows: partLines.length,
        bytes: fs.statSync(filepath).size,
      });
      partNo++;
      partLines = [];
      partBytes = Buffer.byteLength(bom + header, "utf8");
    };

    for (const line of lines) {
      const bytes = Buffer.byteLength(line, "utf8");
      if (partLines.length && partBytes + bytes > MAX_UPLOAD_BYTES) flush();
      partLines.push(line);
      partBytes += bytes;
    }
    flush();
  }

  return { mainBytes, parts };
}

const rows = await fetchCurrentStorefront();
const { kept, stats } = normalizeAndFilter(rows);
const { mainBytes, parts } = writeCsv(kept);

const coverageReady = kept.filter((p) => p.gtin || (p.brand && p.mpn)).length;
const gtinCount = kept.filter((p) => p.gtin).length;
const brandMpnCount = kept.filter((p) => p.brand && p.mpn).length;

const audit = {
  generatedAt: new Date().toISOString(),
  ...stats,
  exported: kept.length,
  withGtin: gtinCount,
  withBrandAndMpn: brandMpnCount,
  coverageReady,
  mainCsv: MAIN_CSV,
  mainBytes,
  maxDirectUploadBytes: MAX_UPLOAD_BYTES,
  directUploadFits: mainBytes <= MAX_UPLOAD_BYTES,
  parts,
};

fs.writeFileSync(AUDIT_JSON, JSON.stringify(audit, null, 2), "utf8");

console.log("\n========== IUMATEC -> ICECAT STOREFRONT ==========");
console.log(`Lidos do Supabase: ${stats.readFromSupabase.toLocaleString("pt-PT")}`);
console.log(`Exportados: ${kept.length.toLocaleString("pt-PT")}`);
console.log(`Com GTIN/EAN: ${gtinCount.toLocaleString("pt-PT")}`);
console.log(`Com Brand + MPN: ${brandMpnCount.toLocaleString("pt-PT")}`);
console.log(`Prontos para matching: ${coverageReady.toLocaleString("pt-PT")}`);
console.log(`Sem slug excluídos: ${stats.excludedMissingSlug.toLocaleString("pt-PT")}`);
console.log(`Sem imagem excluídos: ${stats.excludedMissingImage.toLocaleString("pt-PT")}`);
console.log(`Sem GTIN nem Brand+MPN: ${stats.excludedMissingIdentifier.toLocaleString("pt-PT")}`);
console.log(`CSV principal: ${MAIN_CSV}`);
console.log(`Tamanho: ${(mainBytes / 1024 / 1024).toFixed(2)} MB`);

if (parts.length) {
  console.log(`\nO CSV ultrapassa 9.5 MB. Foram criadas ${parts.length} partes para upload direto no Icecat:`);
  for (const part of parts) {
    console.log(`- ${path.basename(part.file)} | ${part.rows.toLocaleString("pt-PT")} produtos | ${(part.bytes / 1024 / 1024).toFixed(2)} MB`);
  }
} else {
  console.log("\nOK: cabe num único upload direto no Icecat (< 9.5 MB). Use o CSV principal.");
}

console.log(`Audit: ${AUDIT_JSON}`);
console.log("===================================================\n");
