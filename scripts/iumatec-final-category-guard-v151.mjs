import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/*
 IUMATEC FINAL CATEGORY GUARD V1.5.1 — DRY RUN ONLY
 =================================================
 Foco:
   - Computer > Laptops
   - Peripherie > Monitore
   - Mobile > Smartphones

 Objetivo:
   - retirar acessórios, desktops/AIO/mini-PCs de Laptops;
   - retirar acessórios/não-monitores de Monitore;
   - retirar acessórios e robôs aspiradores de Smartphones;
   - gerar SAFE + REVIEW;
   - NÃO altera Supabase.

 IMPORTANTE:
   - altera apenas propostas de category/subcategory no relatório;
   - o APPLY será feito num segundo script, só depois de validar este DRY RUN.
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

/* ======================================================================== */
/* LAPTOPS                                                                  */
/* ======================================================================== */

const LAPTOP_ACCESSORY = [
  /\bbatter(?:y|ies|ie|ien)\b/,
  /\bakku\b/,
  /\brolling\s+tote\b/,
  /\btrolley\b/,
  /\blaptop\s+(?:bag|tasche|koffer|case|sleeve)\b/,
  /\bnotebook\s+(?:bag|tasche|koffer|case|sleeve)\b/,
  /\bopenroad\b.*\b(?:laptop|notebook)\b/,
  /\btraveller\b/,
  /\broller\b.*\b(?:14|15|16|17)(?:\.3)?\b/,
  /\bcharging\s+cart\b/,
  /\blaptop\s+shelf\b/,
  /\bnotebook\s+shelf\b/,
  /\blaptop\s+stand\b/,
  /\bnotebook\s+stand\b/,
  /\bvideobar\b.*\blaptop\b/,
  /\bnotebook\s+batter/,
  /\blaptop\s+batter/,
  /\bvistaport\b.*\bbatter/,
  /\bdicota\b.*\b(?:traveller|roller|tasche|koffer)\b/,
  /\bsamsonite\b.*\b(?:openroad|rolling|laptop|notebook)\b/,
  /\bkensington\b.*\b(?:contour|koffer|laptop|notebook)\b/,
  /\bneomounts\b.*\b(?:laptop|notebook|shelf|stand)\b/,
];

const MINI_PC = [
  /\bmini[\s-]?pc\b/,
  /\bnuc\b/,
  /\bpicoworx\b/,
  /\bpro\s+micro\b/,
  /\bpro\s+mini\b/,
  /\bz2\s+mini\b/,
  /\btiny\b.*\b(?:n\d+|core|ryzen|intel)\b/,
  /\bthinkcentre\b.*\b(?:tiny|nano)\b/,
];

const DESKTOP_PC = [
  /\bdesktop\b/,
  /\btower\b/,
  /\bsff\b/,
  /\ball[\s-]?in[\s-]?one\b/,
  /\baio\b/,
  /\bideacentre\b/,
  /\bprodesk\b/,
  /\belitedesk\b/,
  /\boptiplex\b/,
  /\bmedion\s+multiworx\b/,
  /\bmedion\s+signium\b/,
  /\berazer\s+(?:recon|bandit|hunter|mechanic)\b/,
  /\bcaptiva\s+(?:pc|advanced gaming|highend gaming)\b/,
  /\bthinkcentre\b/,
  /\bworkstation\s+tower\b/,
];

const LAPTOP_REVIEW = [
  /\byale\b.*\b(?:safe|tresor)\b.*\blaptop\b/,
  /\byale\b.*\blaptop\b.*\b(?:safe|tresor)\b/,
];

function classifyLaptop(p) {
  const t = textOf(p);

  if (hit(t, LAPTOP_REVIEW)) {
    return result(
      "REVIEW",
      p.category,
      p.subcategory,
      "security_furniture",
      "laptop-word-but-product-is-safe"
    );
  }

  if (hit(t, LAPTOP_ACCESSORY)) {
    return result(
      "SAFE",
      "Computer",
      "Computer-Zubehör",
      "computer_accessory",
      "laptop-accessory"
    );
  }

  if (hit(t, MINI_PC)) {
    return result(
      "SAFE",
      "Computer",
      "Mini-PCs",
      "mini_pc",
      "mini-pc-family"
    );
  }

  if (hit(t, DESKTOP_PC)) {
    return result(
      "SAFE",
      "Computer",
      "Desktop-PCs",
      "desktop_pc",
      "desktop-aio-family"
    );
  }

  return result("KEEP", p.category, p.subcategory, "laptop_or_unknown", "keep");
}

/* ======================================================================== */
/* MONITORS                                                                 */
/* ======================================================================== */

const MONITOR_ACCESSORY = [
  /\bacryl[\s-]?display\b/,
  /\bacryl\b.*\blego\b/,
  /\blego\b.*\b(?:acryl|display)\b/,
  /\bdisplay\s+case\b/,
  /\bvitrine\b/,
  /\bprivacy\s+filter\b/,
  /\bsichtschutzfilter\b/,
  /\bblickschutzfilter\b/,
  /\bmagnetischer\s+filter\b/,
  /\bmagnetic\s+filter\b/,
  /\bscreen\s+filter\b/,
  /\bmonitor\s+(?:arm|halter|halterung|stand|shelf)\b/,
  /\bmonitorhalter\b/,
  /\bmonitorhalterung\b/,
];

function classifyMonitor(p) {
  const t = textOf(p);

  if (hit(t, MONITOR_ACCESSORY)) {
    return result(
      "SAFE",
      "Peripherie",
      "Zubehör",
      "monitor_accessory_or_non_monitor",
      "monitor-page-non-monitor"
    );
  }

  return result("KEEP", p.category, p.subcategory, "monitor_or_unknown", "keep");
}

/* ======================================================================== */
/* SMARTPHONES                                                              */
/* ======================================================================== */

const ROBOT_VACUUM = [
  /\brobotersauger\b/,
  /\bsaugroboter\b/,
  /\brobot\s+vacuum\b/,
  /\bstaubsaugerroboter\b/,
  /\broborock\b/,
];

const PHONE_ACCESSORY = [
  // Strong accessory brands/families that can omit the word "case" in the title.
  /\buag\b.*\b(?:iphone|galaxy|pixel|smartphone)\b/,
  /\bnomad\b.*\b(?:iphone|galaxy|pixel|smartphone)\b/,
  /\bpolarpro\b.*\b(?:iphone|smartphone)\b/,
  /\bsmallrig\b.*\b(?:iphone|smartphone)\b/,
  /\bsirui\b.*\b(?:iphone|smartphone)\b/,
  /\bjoby\b.*\b(?:iphone|smartphone)\b/,
  /\bheat\s+it\b.*\b(?:iphone|lightning|smartphone)\b/,

  // Generic accessory words.
  /\b(?:iphone|smartphone|galaxy|pixel)\b.*\b(?:case|cover|hulle|huelle|folio|bumper|etui|shell|skin)\b/,
  /\b(?:case|cover|hulle|huelle|folio|bumper|etui|shell|skin)\b.*\b(?:iphone|smartphone|galaxy|pixel)\b/,
  /\bsmartphone\s+(?:gimbal|tripod|halter|halterung|mount|video\s+kit|vlog\s+tripod|creator\s+kit)\b/,
  /\b(?:gimbal|tripod|halter|halterung|mount|video\s+kit|vlog\s+tripod|creator\s+kit)\b.*\bsmartphone\b/,
  /\bautoradio\b.*\bsmartphone\b/,
  /\bsmartphone\b.*\bautoradio\b/,
  /\b(?:screen|second)\s+glass\b/,
  /\bschutzglas\b/,
  /\bpanzer(?:glass|glas)\b/,
  /\bback\s+plate\b.*\biphone\b/,
  /\bkickstand\b.*\b(?:iphone|smartphone)\b/,
  /\bmagsafe\b.*\b(?:iphone|smartphone)\b/,
];

function classifySmartphone(p) {
  const t = textOf(p);

  if (hit(t, ROBOT_VACUUM)) {
    return result(
      "SAFE",
      "Smart Home",
      "Gebäudetechnik",
      "robot_vacuum",
      "smart-home-cleaning-device"
    );
  }

  if (hit(t, PHONE_ACCESSORY)) {
    return result(
      "SAFE",
      "Mobile",
      "Mobile Zubehör",
      "mobile_accessory",
      "smartphone-accessory"
    );
  }

  return result("KEEP", p.category, p.subcategory, "smartphone_or_unknown", "keep");
}

/* ======================================================================== */
/* REGRESSION TESTS                                                         */
/* ======================================================================== */

function runTests() {
  const tests = [
    ["Laptop battery", classifyLaptop, {brand:"Vistaport",title:"Vistaport Notebook Batteries für Lenovo Thinkpad T490s",category:"Computer",subcategory:"Laptops"}, "Computer-Zubehör"],
    ["Laptop AIO", classifyLaptop, {brand:"Lenovo",title:"IdeaCentre AIO 27IRH9, Core Ultra 7 240H 27 FHD",category:"Computer",subcategory:"Laptops"}, "Desktop-PCs"],
    ["Laptop tower", classifyLaptop, {brand:"HP",title:"HP Z1 Tower G1i U7 265 32GB 1TB",category:"Computer",subcategory:"Laptops"}, "Desktop-PCs"],
    ["Laptop mini", classifyLaptop, {brand:"HP",title:"HP Z2 Mini G1i U7 265K 64GB 1TB",category:"Computer",subcategory:"Laptops"}, "Mini-PCs"],
    ["Real laptop", classifyLaptop, {brand:"Lenovo",title:"Lenovo ThinkPad T14 G6 Ultra 7 258V 14 WUXGA",category:"Computer",subcategory:"Laptops"}, "Laptops"],

    ["LEGO acrylic display", classifyMonitor, {brand:"iDisplayit",title:"Acryl-Display LEGO 71043 HP Hogwarts mit schwarzem Boden",category:"Peripherie",subcategory:"Monitore"}, "Zubehör"],
    ["Real monitor", classifyMonitor, {brand:"Samsung",title:"Samsung Odyssey G5 32 QHD IPS 180Hz Monitor",category:"Peripherie",subcategory:"Monitore"}, "Monitore"],

    ["Robot vacuum", classifySmartphone, {brand:"Xiaomi",title:"Xiaomi Robotersauger S20+ Schwarz",category:"Mobile",subcategory:"Smartphones"}, "Gebäudetechnik"],
    ["Phone case", classifySmartphone, {brand:"UAG",title:"UAG Monarch Pro kevlar black iPhone 16 Pro",category:"Mobile",subcategory:"Smartphones"}, "Mobile Zubehör"],
    ["Phone accessory no case word", classifySmartphone, {brand:"Nomad",title:"Nomad Etui Modern Braun Horween Leder fürs Apple iPhone 16 Pro",category:"Mobile",subcategory:"Smartphones"}, "Mobile Zubehör"],
    ["Real phone", classifySmartphone, {brand:"Samsung",title:"Samsung Galaxy A56 5G 128GB DS",category:"Mobile",subcategory:"Smartphones"}, "Smartphones"],
  ];

  const failures = [];
  for (const [name, fn, sample, expected] of tests) {
    const r = fn(sample);
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

/* ======================================================================== */
/* LOAD DATA                                                                */
/* ======================================================================== */

async function loadPair(category, subcategory) {
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

  return rows;
}

const groups = [
  {
    category: "Computer",
    subcategory: "Laptops",
    classify: classifyLaptop,
  },
  {
    category: "Peripherie",
    subcategory: "Monitore",
    classify: classifyMonitor,
  },
  {
    category: "Mobile",
    subcategory: "Smartphones",
    classify: classifySmartphone,
  },
];

const safe = [];
const review = [];
const analysed = [];

for (const group of groups) {
  const rows = await loadPair(group.category, group.subcategory);
  analysed.push({
    category: group.category,
    subcategory: group.subcategory,
    count: rows.length,
  });

  for (const p of rows) {
    const r = group.classify(p);

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
const safePath = path.join(OUT, `final-category-guard-v151-safe-${stamp}.csv`);
const reviewPath = path.join(OUT, `final-category-guard-v151-review-${stamp}.csv`);

writeCsv(safePath, safe);
writeCsv(reviewPath, review);

console.log("");
console.log("========== IUMATEC FINAL CATEGORY GUARD V1.5.1 ==========");
console.log("MODO: DRY RUN — NENHUM produto foi alterado.");
console.log("");

for (const a of analysed) {
  console.log(`${a.category} > ${a.subcategory}: ${a.count} analisados`);
}

console.log("");
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
for (const r of safe.slice(0, 220)) {
  console.log(
    `${r.sku} | ${r.title}\n` +
    `  ${r.old_category} > ${r.old_subcategory} => ${r.proposed_category} > ${r.proposed_subcategory} [${r.reason}]`
  );
}

if (review.length) {
  console.log("");
  console.log("=== REVIEW ===");
  for (const r of review.slice(0, 100)) {
    console.log(`${r.sku} | ${r.title} [${r.reason}]`);
  }
}

console.log("");
console.log(`SAFE CSV: ${safePath}`);
console.log(`REVIEW CSV: ${reviewPath}`);
console.log("");
console.log("DRY RUN concluído. NENHUM produto foi alterado.");
