import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/*
 IUMATEC RESIDUAL CLEANUP V1.3 — DRY RUN ONLY
 ============================================
 Foco apenas nos resíduos visíveis depois do APPLY V1.2.2:
 - Mobile > Smartphones
 - Mobile > Tablets
 - Computer > Laptops

 NÃO altera Supabase.
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
const n = (v) =>
  s(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();

const hit = (t, regs) => regs.some((r) => r.test(t));

function textOf(p) {
  return n(`${p.title || ""} ${p.brand || ""}`);
}

function result(status, category, subcategory, type, reason) {
  return { status, category, subcategory, type, reason };
}

/* ------------------------------ SMARTPHONES ------------------------------ */

const SMARTPHONE_RESIDUAL_ACCESSORY = [
  /\blitechaser\b/,
  /\bback\s*plate\b/,
  /\bheat\s*it\b/,
];

function smartphoneRule(p) {
  const t = textOf(p);

  if (hit(t, SMARTPHONE_RESIDUAL_ACCESSORY)) {
    return result(
      "SAFE",
      "Mobile",
      "Mobile Zubehör",
      "mobile_accessory",
      "residual-smartphone-accessory"
    );
  }

  return result("KEEP", p.category, p.subcategory, "unknown", "no-residual-rule");
}

/* -------------------------------- TABLETS -------------------------------- */

const TABLET_RESIDUAL_ACCESSORY = [
  /\btabblethalter\b/,
  /\btablethalter\b/,
  /\btablethalterung\b/,
  /\btablet\s*halter\b/,
  /\btablet\s*holder\b/,
];

const NON_IT_TABLET = [
  /\bjesmonite\b/,
  /\bbastelset\b/,
  /\bserviertablett\b/,
  /\breinigungstabletten\b/,
  /\breinigungstablette\b/,
];

function tabletRule(p) {
  const t = textOf(p);

  if (hit(t, NON_IT_TABLET)) {
    return result(
      "REVIEW",
      p.category,
      p.subcategory,
      "non_it_product",
      "non-it-product-still-on-tablets"
    );
  }

  if (hit(t, TABLET_RESIDUAL_ACCESSORY)) {
    return result(
      "SAFE",
      "Mobile",
      "Mobile Zubehör",
      "tablet_accessory",
      "residual-tablet-holder"
    );
  }

  return result("KEEP", p.category, p.subcategory, "unknown", "no-residual-rule");
}

/* -------------------------------- LAPTOPS -------------------------------- */

const MINI_PC_PATTERNS = [
  /\bv100q\s+tiny\b/,
  /\bpro\s+max\s+micro\b/,
  /\bpro\s+micro\b/,
  /\bz2\s+mini\b/,
  /\belitedesk\b.*\bmini\b/,
  /\bprodesk\b.*\bmini\b/,
  /\bthinkcentre\b.*\b(?:tiny|nano)\b/,
  /\bneo\s+\d+q\b/,
];

const DESKTOP_PATTERNS = [
  /\baspire\s+xc-\d+/,
  /\baspire\s+tc-\d+/,
  /\belite\s+sff\b/,
  /\bpro\s+max\s+sff\b/,
  /\bpro\s+max\s+tw\b/,
  /\bz1\s+tower\b/,
  /\bz2\s+tower\b/,
  /\belitestudio\b/,
  /\blegion\s+t5\b/,
  /\byoga\s+aio\b/,
  /\bpm640ka\b/,
  /\bpm670ka\b/,
  /\bd901mdr\b/,
  /\bd501ser\b/,
  /\ball[- ]in[- ]one\b/,
];

function laptopRule(p) {
  const t = textOf(p);

  if (hit(t, MINI_PC_PATTERNS)) {
    return result(
      "SAFE",
      "Computer",
      "Mini-PCs",
      "mini_pc_device",
      "residual-mini-pc-family"
    );
  }

  if (hit(t, DESKTOP_PATTERNS)) {
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
    ["PolarPro LiteChaser", smartphoneRule, {title:"PolarPro LiteChaser 16 - EXO Back Plate iPhone 16 Pro MAX",brand:"PolarPro",category:"Mobile",subcategory:"Smartphones"}, "Mobile Zubehör"],
    ["heat it", smartphoneRule, {title:"heat it Pro - Lightning kompatibel: iPhone 6s bis 14",brand:"heat it",category:"Mobile",subcategory:"Smartphones"}, "Mobile Zubehör"],
    ["Nokia phone stays", smartphoneRule, {title:"Nokia 3210 4G black DS",brand:"Nokia",category:"Mobile",subcategory:"Smartphones"}, "Smartphones"],

    ["Tabblethalter typo", tabletRule, {title:"Durable Tabblethalter Rise Tablet Grössen bis 13 Zoll",brand:"Durable",category:"Mobile",subcategory:"Tablets"}, "Mobile Zubehör"],
    ["Jesmonite review", tabletRule, {title:"Jesmonite Bastelset Schale/Tablet 10x10cm",brand:"Jesmonite",category:"Mobile",subcategory:"Tablets"}, "Tablets"],
    ["Samsung tablet stays", tabletRule, {title:"Samsung Galaxy Tab S10 lite WiFi 128GB",brand:"Samsung",category:"Mobile",subcategory:"Tablets"}, "Tablets"],

    ["Lenovo V100q Tiny", laptopRule, {title:"Lenovo V100q Tiny, Intel N100 8GB, 256GB SSD, W11-Pro",brand:"Lenovo",category:"Computer",subcategory:"Laptops"}, "Mini-PCs"],
    ["Dell Pro Max Micro", laptopRule, {title:"Dell Pro Max Micro, U7-265 16GB, 1TB SSD",brand:"Dell",category:"Computer",subcategory:"Laptops"}, "Mini-PCs"],
    ["HP Z2 Mini", laptopRule, {title:"HP Z2 Mini G1i U7 265K 64GB,1TB",brand:"HP Inc.",category:"Computer",subcategory:"Laptops"}, "Mini-PCs"],

    ["Acer Aspire XC", laptopRule, {title:"Acer Aspire XC-1860, Ultra 7 265, W11H 16GB",brand:"Acer",category:"Computer",subcategory:"Laptops"}, "Desktop-PCs"],
    ["HP Elite SFF", laptopRule, {title:"HP Elite SFF 805 G9 R5 8600G 16GB",brand:"HP Inc.",category:"Computer",subcategory:"Laptops"}, "Desktop-PCs"],
    ["Dell Pro Max TW", laptopRule, {title:"Dell Pro Max TW T2, U7-265 32GB, 1TB SSD",brand:"Dell",category:"Computer",subcategory:"Laptops"}, "Desktop-PCs"],
    ["HP Z2 Tower", laptopRule, {title:"HP Z2 Tower G1i U7 265K 64GB,1TB",brand:"HP Inc.",category:"Computer",subcategory:"Laptops"}, "Desktop-PCs"],
    ["Lenovo Legion T5", laptopRule, {title:"Lenovo Legion T5 30IAS10, UltraCore 7 265KF",brand:"Lenovo",category:"Computer",subcategory:"Laptops"}, "Desktop-PCs"],
    ["Lenovo Yoga AIO", laptopRule, {title:"Lenovo Yoga AIO 32ILL10, Core Ultra 7",brand:"Lenovo",category:"Computer",subcategory:"Laptops"}, "Desktop-PCs"],
    ["ASUS PM670KA", laptopRule, {title:"ASUS PM670KA-BPE031X, Ryzen AI 7 350, W11-P 27 FHD",brand:"ASUS",category:"Computer",subcategory:"Laptops"}, "Desktop-PCs"],
    ["Real ThinkPad stays", laptopRule, {title:"Lenovo ThinkPad T14 G6, Ultra 7 258V, W11-P 14 WUXGA",brand:"Lenovo",category:"Computer",subcategory:"Laptops"}, "Laptops"],
  ];

  const failures = [];

  for (const [name, fn, p, expected] of tests) {
    const r = fn(p);
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

/* ------------------------------ LOAD CURRENT ------------------------------ */

async function loadPage(category, subcategory) {
  const rows = [];
  const pageSize = 1000;
  let lastSku = null;

  while (true) {
    let q = supabase
      .from("products")
      .select("sku,title,brand,category,subcategory,price,in_stock,stock_qty")
      .eq("category", category)
      .eq("subcategory", subcategory)
      .order("sku", { ascending: true })
      .limit(pageSize);

    if (lastSku) q = q.gt("sku", lastSku);

    const { data, error } = await q;
    if (error) throw new Error(`${category} > ${subcategory}: ${error.message}`);

    const batch = data || [];
    rows.push(...batch);

    if (batch.length) lastSku = batch[batch.length - 1].sku;
    if (batch.length < pageSize) break;
  }

  console.log(`${category} > ${subcategory}: ${rows.length} produtos lidos`);
  return rows;
}

const smartphones = await loadPage("Mobile", "Smartphones");
const tablets = await loadPage("Mobile", "Tablets");
const laptops = await loadPage("Computer", "Laptops");

const safe = [];
const review = [];

function evalRows(list, fn) {
  for (const p of list) {
    const r = fn(p);
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
}

evalRows(smartphones, smartphoneRule);
evalRows(tablets, tabletRule);
evalRows(laptops, laptopRule);

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
const safePath = path.join(OUT, `residual-cleanup-v13-safe-${stamp}.csv`);
const reviewPath = path.join(OUT, `residual-cleanup-v13-review-${stamp}.csv`);

writeCsv(safePath, safe);
writeCsv(reviewPath, review);

console.log("");
console.log("========== IUMATEC RESIDUAL CLEANUP V1.3 ==========");
console.log("MODO: DRY RUN — NENHUM produto foi alterado.");
console.log(`Smartphones analisados: ${smartphones.length}`);
console.log(`Tablets analisados: ${tablets.length}`);
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
for (const r of safe.slice(0, 120)) {
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
