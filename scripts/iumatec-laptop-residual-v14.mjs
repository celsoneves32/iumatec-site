import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/*
 IUMATEC LAPTOP RESIDUAL V1.4 — DRY RUN ONLY
 ===========================================
 Foco APENAS em Computer > Laptops, depois do APPLY V1.3.

 Objetivo:
 - retirar desktops/AIO/mini-PCs ainda classificados como Laptops;
 - retirar baterias, malas, trolley/carrinhos, suportes e outros acessórios;
 - mandar casos não-IT/duvidosos para REVIEW;
 - NÃO altera Supabase.
*/

const URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!URL || !KEY) {
  throw new Error("Faltam SUPABASE_URL e/ou SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY.");
}

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const OUT = path.resolve("integrations", "alltron", "out");
fs.mkdirSync(OUT, { recursive: true });

const s = (v) => String(v ?? "").trim();
const norm = (v) =>
  s(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();

const hit = (t, regs) => regs.some((r) => r.test(t));

function textOf(p) {
  return norm(`${p.brand || ""} ${p.title || ""}`);
}

function result(status, category, subcategory, type, reason) {
  return { status, category, subcategory, type, reason };
}

/* ------------------------------- ACCESSORIES ------------------------------ */

const BATTERY_PATTERNS = [
  /\bbatteries?\b/,
  /\bbatterie\b/,
  /\bnotebook\s+batteries?\b/,
  /\blaptop\s+batteries?\b/,
];

const BAG_CASE_PATTERNS = [
  /\brolling\s+tote\b/,
  /\blaptop\s+koffer\b/,
  /\bnotebook\s+koffer\b/,
  /\blaptop\s+tasche\b/,
  /\bnotebook\s+tasche\b/,
  /\bopenroad\b.*\blaptop\b/,
  /\btraveller\b/,
  /\broller\b.*\b(?:14|15|16|17)(?:\.3)?\b/,
];

const STAND_CART_PATTERNS = [
  /\bcharging\s+cart\b/,
  /\blaptop\s+shelf\b/,
  /\bnotebook\s+shelf\b/,
  /\blaptop\s+stand\b/,
  /\bnotebook\s+stand\b/,
  /\bvideobar\b.*\blaptop\b/,
];

const ACCESSORY_BRAND_CONTEXT = [
  /\bvistaport\b.*\b(?:battery|batteries|batterie)\b/,
  /\bsamsonite\b.*\b(?:rolling|openroad|laptop|notebook)\b/,
  /\bdicota\b.*\b(?:roller|traveller|laptop|notebook)\b/,
  /\bkensington\b.*\b(?:contour|koffer|laptop|notebook)\b/,
  /\bneomounts\b.*\b(?:laptop|notebook|shelf|stand)\b/,
];

/* ------------------------------- MINI PCs -------------------------------- */

const MINI_PC_PATTERNS = [
  /\bmedion\s+picoworx\b/,
  /\bpicoworx\s+t\d+\b/,
];

/* ------------------------------ DESKTOP PCs ------------------------------- */

const DESKTOP_PC_PATTERNS = [
  /\bideacentre\s+aio\b/,
  /\bmedion\s+multiworx\b/,
  /\bmedion\s+signium\b.*\baio\b/,
  /\berazer\s+recon\s+e30\b/,
  /\berazer\s+recon\s+p40\b/,
  /\berazer\s+bandit\s+p20\b/,
  /\berazer\s+hunter\s+x30\b/,
  /\berazer\s+mechanic\s+x20\b/,
  /\bcaptiva\s+pc\s+(?:advanced|highend)\s+gaming\b/,
  /\bcaptiva\s+pc\b/,
];

/* ------------------------------- REVIEW ---------------------------------- */

const REVIEW_PATTERNS = [
  /\byale\b.*\b(?:safe|tresor)\b.*\blaptop\b/,
  /\byale\b.*\blaptop\b.*\b(?:safe|tresor)\b/,
];

function classifyLaptop(p) {
  const t = textOf(p);

  if (hit(t, REVIEW_PATTERNS)) {
    return result(
      "REVIEW",
      p.category,
      p.subcategory,
      "non_it_or_security_furniture",
      "laptop-word-but-product-is-safe"
    );
  }

  if (
    hit(t, BATTERY_PATTERNS) ||
    hit(t, BAG_CASE_PATTERNS) ||
    hit(t, STAND_CART_PATTERNS) ||
    hit(t, ACCESSORY_BRAND_CONTEXT)
  ) {
    return result(
      "SAFE",
      "Computer",
      "Computer-Zubehör",
      "computer_accessory",
      "residual-laptop-accessory"
    );
  }

  if (hit(t, MINI_PC_PATTERNS)) {
    return result(
      "SAFE",
      "Computer",
      "Mini-PCs",
      "mini_pc",
      "residual-mini-pc-family"
    );
  }

  if (hit(t, DESKTOP_PC_PATTERNS)) {
    return result(
      "SAFE",
      "Computer",
      "Desktop-PCs",
      "desktop_pc",
      "residual-desktop-family"
    );
  }

  return result("KEEP", p.category, p.subcategory, "unknown", "no-residual-rule");
}

/* ---------------------------- REGRESSION TESTS ---------------------------- */

function runTests() {
  const tests = [
    ["IdeaCentre AIO", {brand:"Lenovo",title:"IdeaCentre AIO 24IRH9, Core Ultra 5 210H 23.8 FHD"}, "Desktop-PCs"],
    ["IdeaCentre AIO 27", {brand:"Lenovo",title:"IdeaCentre AIO 27IRH9, Core Ultra 7 240H 27 FHD"}, "Desktop-PCs"],
    ["Medion Multiworx", {brand:"Medion",title:"Medion Multiworx, Core i5-14400"}, "Desktop-PCs"],
    ["Medion Signium AIO", {brand:"Medion",title:"Medion Signium 27 S1 AIO, Core Ultra 5"}, "Desktop-PCs"],
    ["Erazer Recon E30", {brand:"Erazer",title:"Erazer Recon E30, Intel i5-12400F"}, "Desktop-PCs"],
    ["Erazer Recon P40", {brand:"Erazer",title:"Erazer Recon P40, Intel i5-14400"}, "Desktop-PCs"],
    ["Erazer Bandit P20", {brand:"Erazer",title:"Erazer Bandit P20, Core Ultra 7 265"}, "Desktop-PCs"],
    ["Erazer Hunter X30", {brand:"Erazer",title:"Erazer Hunter X30, Core Ultra 7 265K"}, "Desktop-PCs"],
    ["Captiva PC", {brand:"Captiva",title:"Captiva PC Advanced Gaming I93-180 i7 14700F"}, "Desktop-PCs"],
    ["PicoWorx", {brand:"Medion",title:"Medion Picoworx T80, Ultra 5 226V 16GB"}, "Mini-PCs"],
    ["Vistaport Battery", {brand:"Vistaport",title:"Vistaport Notebook Batteries für Lenovo Thinkpad T490s"}, "Computer-Zubehör"],
    ["Samsonite bag", {brand:"Samsonite",title:"Samsonite Openroad 2.0 Laptop 15.6 EXP schwarz"}, "Computer-Zubehör"],
    ["Dicota roller", {brand:"DICOTA",title:"DICOTA Eco Multi Roller SCALE 14-15.6"}, "Computer-Zubehör"],
    ["Kensington Koffer", {brand:"Kensington",title:"Kensington Contour 2.0 Laptop Koffer 15.6"}, "Computer-Zubehör"],
    ["Neomounts shelf", {brand:"Neomounts",title:"Neomounts Videobar and laptop shelf kit 43-110"}, "Computer-Zubehör"],
    ["Acer charging cart", {brand:"Acer",title:"Acer Charging Cart 24 Slots universal / für Notebooks bis 15.6"}, "Computer-Zubehör"],

    ["ThinkPad stays", {brand:"Lenovo",title:"Lenovo ThinkPad P16s G4, AI 5 Pro340, W11-P 16 WUXGA"}, "Laptops"],
    ["Erazer Deputy laptop stays", {brand:"Erazer",title:"Erazer Deputy 15 P1, Intel Core 7 250H 15.6 FHD"}, "Laptops"],
    ["Captiva Ultimate laptop stays", {brand:"Captiva",title:"Captiva Ultimate Gaming I98-344CH RTX5090 16 WQXGA"}, "Laptops"],
    ["MacBook stays", {brand:"Apple",title:"14 MacBook Pro M4 16GB 512GB"}, "Laptops"],
  ];

  const failures = [];

  for (const [name, sample, expected] of tests) {
    const p = { ...sample, category:"Computer", subcategory:"Laptops" };
    const r = classifyLaptop(p);

    if (r.subcategory !== expected) {
      failures.push(`${name}: got ${r.category} > ${r.subcategory}, expected ${expected}`);
    }
  }

  if (failures.length) {
    throw new Error("REGRESSION TESTS FAILED:\n" + failures.join("\n"));
  }

  console.log(`REGRESSION TESTS: ${tests.length}/${tests.length} OK`);
}

runTests();

/* ------------------------------- LOAD DATA -------------------------------- */

async function loadLaptops() {
  const rows = [];
  const pageSize = 1000;
  let lastSku = null;

  while (true) {
    let q = supabase
      .from("products")
      .select("sku,title,brand,category,subcategory,price,in_stock,stock_qty")
      .eq("category", "Computer")
      .eq("subcategory", "Laptops")
      .order("sku", { ascending: true })
      .limit(pageSize);

    if (lastSku) q = q.gt("sku", lastSku);

    const { data, error } = await q;
    if (error) throw new Error(`Computer > Laptops: ${error.message}`);

    const batch = data || [];
    rows.push(...batch);

    if (batch.length) lastSku = batch[batch.length - 1].sku;
    if (batch.length < pageSize) break;
  }

  return rows;
}

const laptops = await loadLaptops();

const safe = [];
const review = [];

for (const p of laptops) {
  const r = classifyLaptop(p);

  const row = {
    sku: s(p.sku),
    title: s(p.title),
    brand: s(p.brand),
    old_category: s(p.category),
    old_subcategory: s(p.subcategory),
    proposed_category: r.category,
    proposed_subcategory: r.subcategory,
    product_type: r.type,
    reason: r.reason,
    status: r.status,
  };

  if (r.status === "SAFE") safe.push(row);
  if (r.status === "REVIEW") review.push(row);
}

function esc(v) {
  return `"${String(v ?? "").replaceAll('"', '""')}"`;
}

function writeCsv(file, rows) {
  if (!rows.length) {
    fs.writeFileSync(file, "", "utf8");
    return;
  }

  const headers = Object.keys(rows[0]);

  fs.writeFileSync(
    file,
    [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
    ].join("\n"),
    "utf8"
  );
}

function grouped(rows, fn) {
  const map = new Map();
  for (const r of rows) {
    const k = fn(r);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const safePath = path.join(OUT, `laptop-residual-v14-safe-${stamp}.csv`);
const reviewPath = path.join(OUT, `laptop-residual-v14-review-${stamp}.csv`);

writeCsv(safePath, safe);
writeCsv(reviewPath, review);

console.log("");
console.log("========== IUMATEC LAPTOP RESIDUAL V1.4 ==========");
console.log("MODO: DRY RUN — NENHUM produto foi alterado.");
console.log(`Laptops analisados: ${laptops.length}`);
console.log(`Mudanças SAFE propostas: ${safe.length}`);
console.log(`REVIEW: ${review.length}`);

console.log("");
console.log("=== TRANSIÇÕES SAFE ===");
for (const [k, count] of grouped(
  safe,
  (r) => `${r.old_category} > ${r.old_subcategory} => ${r.proposed_category} > ${r.proposed_subcategory}`
)) {
  console.log(`${String(count).padStart(5)} | ${k}`);
}

console.log("");
console.log("=== AMOSTRA SAFE ===");
for (const r of safe.slice(0, 160)) {
  console.log(
    `${r.sku} | ${r.title}\n` +
    `  ${r.old_category} > ${r.old_subcategory} => ${r.proposed_category} > ${r.proposed_subcategory} [${r.reason}]`
  );
}

if (review.length) {
  console.log("");
  console.log("=== REVIEW ===");
  for (const r of review.slice(0, 80)) {
    console.log(`${r.sku} | ${r.title} [${r.reason}]`);
  }
}

console.log("");
console.log(`SAFE CSV: ${safePath}`);
console.log(`REVIEW CSV: ${reviewPath}`);
console.log("DRY RUN concluído. NENHUM produto foi alterado.");
