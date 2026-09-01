import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
dotenv.config({ path: path.join(ROOT, ".env.local") });
dotenv.config({ path: path.join(ROOT, ".env"), override: false });

function argValue(name, fallback = "") {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
    return process.argv[i + 1];
  }
  return fallback;
}

const APPLY = process.argv.includes("--apply");
const PCF_ARG = argValue("--pcf", "");
const MAX_IMAGES = Math.max(2, Number(argValue("--max-images", "8")) || 8);
const LIMIT = Math.max(0, Number(argValue("--limit", "0")) || 0);
const BATCH_SIZE = 100;

if (!PCF_ARG) {
  console.error('Falta --pcf "CAMINHO_DO_PCF.csv"');
  process.exit(1);
}

const PCF_PATH = path.resolve(ROOT, PCF_ARG);
if (!fs.existsSync(PCF_PATH)) {
  console.error(`PCF não encontrado: ${PCF_PATH}`);
  process.exit(1);
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("Falta SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

if (!SUPABASE_KEY) {
  console.error("Falta SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function text(value) {
  return String(value ?? "").trim();
}

function unique(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const v = text(value);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function arrayValue(value) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  const raw = text(value);
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(text).filter(Boolean);
    } catch {}
  }
  return [];
}

function splitGallery(value) {
  return unique(text(value).split("|"));
}

function icecatImages(row) {
  const gallery = splitGallery(row.ProductGallery);
  const highPic = text(row.HighPic);
  return unique([...gallery, highPic]);
}

function isAuthorized(row) {
  const error = text(row.ErrorMessage);
  const quality = text(row.Quality).toUpperCase();
  return !error && (quality === "ICECAT" || Boolean(text(row.HighPic)));
}

function currentImages(product) {
  return unique([
    text(product.image),
    ...arrayValue(product.images),
  ]);
}

function mergeImages(product, icecat) {
  const current = currentImages(product);

  // O primeiro Icecat é normalmente a imagem principal/HighPic.
  // Mantemos a imagem Alltron como principal e usamos as restantes como extras.
  const extras = current.length > 0 && icecat.length > 1
    ? icecat.slice(1)
    : icecat;

  return unique([...current, ...extras]).slice(0, MAX_IMAGES);
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath, rows) {
  const headers = [
    "sku",
    "icecat_product",
    "icecat_images",
    "current_images",
    "result_images",
    "added_images",
    "status",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  fs.writeFileSync(filePath, "\uFEFF" + lines.join("\n"), "utf8");
}

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function fetchProductsBySku(skus) {
  const found = new Map();

  for (const group of chunks(skus, BATCH_SIZE)) {
    const { data, error } = await supabase
      .from("products")
      .select("sku,image,images")
      .in("sku", group);

    if (error) {
      throw new Error(`Supabase select falhou: ${error.message}`);
    }

    for (const row of data || []) {
      found.set(text(row.sku), row);
    }
  }

  return found;
}

async function applyUpdate(sku, images) {
  const { error } = await supabase
    .from("products")
    .update({ images })
    .eq("sku", sku);

  if (error) {
    throw new Error(`${sku}: ${error.message}`);
  }
}

async function main() {
  const raw = fs.readFileSync(PCF_PATH, "utf8");
  const rows = parse(raw, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  const authorized = rows
    .filter(isAuthorized)
    .map((row) => ({
      row,
      sku: text(row["Your product ID"]),
      images: icecatImages(row),
    }))
    .filter((item) => item.sku && item.images.length >= 2);

  const selected = LIMIT ? authorized.slice(0, LIMIT) : authorized;
  const skus = unique(selected.map((item) => item.sku));

  console.log("");
  console.log("========== IUMATEC ICECAT ENRICHMENT ==========");
  console.log(`PCF: ${PCF_PATH}`);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN (0 alterações)"}`);
  console.log(`Linhas PCF: ${rows.length}`);
  console.log(`Autorizadas com 2+ imagens Icecat: ${authorized.length}`);
  console.log(`Selecionadas: ${selected.length}`);
  console.log(`Máximo de imagens por produto: ${MAX_IMAGES}`);
  console.log("");

  const products = await fetchProductsBySku(skus);

  const report = [];
  let missing = 0;
  let wouldChange = 0;
  let noGain = 0;
  let applied = 0;
  let errors = 0;

  for (const item of selected) {
    const product = products.get(item.sku);

    if (!product) {
      missing++;
      report.push({
        sku: item.sku,
        icecat_product: text(item.row.ProductTitle),
        icecat_images: item.images.length,
        current_images: 0,
        result_images: 0,
        added_images: 0,
        status: "not-found-in-supabase",
      });
      continue;
    }

    const before = currentImages(product);
    const after = mergeImages(product, item.images);
    const added = Math.max(0, after.length - before.length);

    if (added <= 0) {
      noGain++;
      report.push({
        sku: item.sku,
        icecat_product: text(item.row.ProductTitle),
        icecat_images: item.images.length,
        current_images: before.length,
        result_images: after.length,
        added_images: 0,
        status: "no-gain",
      });
      continue;
    }

    wouldChange++;

    if (APPLY) {
      try {
        await applyUpdate(item.sku, after);
        applied++;
      } catch (error) {
        errors++;
        report.push({
          sku: item.sku,
          icecat_product: text(item.row.ProductTitle),
          icecat_images: item.images.length,
          current_images: before.length,
          result_images: before.length,
          added_images: 0,
          status: `error: ${error?.message || error}`,
        });
        continue;
      }
    }

    report.push({
      sku: item.sku,
      icecat_product: text(item.row.ProductTitle),
      icecat_images: item.images.length,
      current_images: before.length,
      result_images: after.length,
      added_images: added,
      status: APPLY ? "applied" : "would-update",
    });
  }

  const outDir = path.join(ROOT, "integrations", "alltron", "out");
  fs.mkdirSync(outDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(outDir, `icecat-enrichment-preview-${stamp}.json`);
  const csvPath = path.join(outDir, `icecat-enrichment-preview-${stamp}.csv`);

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? "apply" : "dry-run",
    pcf: PCF_PATH,
    pcfRows: rows.length,
    authorizedWith2PlusImages: authorized.length,
    selected: selected.length,
    foundInSupabase: selected.length - missing,
    missingInSupabase: missing,
    wouldChange,
    noGain,
    applied,
    errors,
    maxImages: MAX_IMAGES,
  };

  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ summary, products: report }, null, 2),
    "utf8",
  );
  writeCsv(csvPath, report);

  console.log("Resumo:");
  console.log(JSON.stringify(summary, null, 2));
  console.log("");
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV:  ${csvPath}`);
  console.log("===============================================");
  console.log("");

  if (!APPLY) {
    console.log("Nenhuma alteração foi feita.");
    console.log("Depois de rever o relatório, pode testar 10 produtos com:");
    console.log(
      `node .\\scripts\\enrich-icecat-images-supabase.mjs --pcf "${PCF_ARG}" --apply --limit 10`,
    );
  }
}

main().catch((error) => {
  console.error("\nERRO:", error?.stack || error);
  process.exit(1);
});
