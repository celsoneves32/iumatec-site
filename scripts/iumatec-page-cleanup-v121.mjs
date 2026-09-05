import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/*
 IUMATEC PAGE CLEANUP V1.2.1 — DRY RUN ONLY
 ======================================
 Foco exclusivo nas três páginas ainda visivelmente contaminadas.
 V1.2 corrige falsos positivos observados no V1.1:
 - Mobile > Smartphones
 - Mobile > Tablets
 - Computer > Laptops

 NÃO altera Supabase.
 NÃO mexe em preço, stock, imagens ou outros campos.
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

const clean = (v) => String(v ?? "").trim();

const norm = (v) =>
  clean(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const any = (t, rules) => rules.some((r) => r.test(t));

function textOf(p) {
  return norm(`${p.title || ""} ${p.brand || ""}`);
}

function result(status, category, subcategory, type, reason) {
  return { status, category, subcategory, type, reason };
}

/* -------------------------------------------------------------------------- */
/* SMARTPHONES                                                                */
/* -------------------------------------------------------------------------- */

const PHONE_ACCESSORY = [
  /\betui\b/,
  /\bcase\b/,
  /\bcover\b/,
  /\bfolio\b/,
  /\bhulle\b/,
  /\bsleeve\b/,
  /\bbumper\b/,
  /\bschutzglas\b/,
  /\bpanzerglas\b/,
  /\bschutzfolie\b/,
  /\bprivacy\b/,
  /\bfilter\b/,
  /\bhalter\b/,
  /\bhalterung\b/,
  /\bholder\b/,
  /\bmount\b/,
  /\bgimbal\b/,
  /\btripod\b/,
  /\btelepod\b/,
  /\bgriptight\b/,
  /\bstativ\b/,
  /\bcage\b/,
  /\bvideo\s+kit\b/,
  /\bvlog\b/,
  /\bcreator(?:s)?\b/,
  /\badapter\b/,
  /\badapt\.?\s*kit\b/,
  /\bautoradio\b/,
  /\bpowerbank\b/,
  /\bcharger\b/,
  /\bladegerat\b/,
  /\bkabel\b/,
  /\bcable\b/,
  /\blens\b/,
  /\blinse\b/,
  /\bstabilizer\b/,
  /\bselfie\b/,
  /\bheat\s*it\b/,
];


const PHOTO_VIDEO_GEAR = [
  /\bcamcorder\b/,
  /\baction\s+camera\b/,
  /\baction\s+cameras\b/,
  /\bgorillapod\b/,
  /\bcreator\s+kit\b/,
  /\btravel\s+scope\b/,
  /\btelescope\b/,
  /\btelephoto\s+linse\b/,
  /\bweitwinkel\s+linse\b/,
  /\blitechaser\b/,
];

const LIGHTING_GEAR = [
  /\bringlicht\b/,
  /\bring\s+light\b/,
  /\bled\s+light\b/,
];

const AUDIO_GEAR = [
  /\bautoradio\b/,
  /\bcar\s+stereo\b/,
];

const SMARTPHONE_REVIEW = [
  /\bheat\s*it\b/,
];

function smartphoneRule(p) {
  const t = textOf(p);
  const brand = norm(p.brand);

  // Itens que só estavam em Smartphones porque mencionam compatibilidade móvel,
  // mas pertencem claramente a outra família técnica.
  if (any(t, SMARTPHONE_REVIEW)) {
    return result(
      "REVIEW",
      p.category,
      p.subcategory,
      "out_of_scope_review",
      "smartphone-compatible-non-mobile-product"
    );
  }

  if (any(t, AUDIO_GEAR)) {
    return result(
      "SAFE",
      "Peripherie",
      "Audio",
      "audio_device",
      "smartphone-page-audio-device"
    );
  }

  if (any(t, LIGHTING_GEAR)) {
    return result(
      "SAFE",
      "Peripherie",
      "Sound & Light",
      "lighting_accessory",
      "smartphone-page-lighting"
    );
  }

  // Foto/Video genérico: não empurrar tudo para Mobile Zubehör.
  if (
    any(t, PHOTO_VIDEO_GEAR) &&
    !/\bsmartphone\b|\biphone\b|\bphone\b/.test(t)
  ) {
    return result(
      "SAFE",
      "Peripherie",
      "Foto & Video",
      "photo_video_accessory",
      "camera-photo-video-gear"
    );
  }

  // Acessórios especificamente destinados a smartphone/iPhone continuam em Mobile Zubehör.
  if (any(t, PHONE_ACCESSORY)) {
    // Se o título fala explicitamente de Action Camera/Camcorder, prioriza Foto & Video.
    if (/\baction\s+camera\b|\bcamcorder\b/.test(t)) {
      return result(
        "SAFE",
        "Peripherie",
        "Foto & Video",
        "photo_video_accessory",
        "camera-specific-accessory"
      );
    }

    return result(
      "SAFE",
      "Mobile",
      "Mobile Zubehör",
      "mobile_accessory",
      "smartphone-accessory-keyword"
    );
  }

  if (
    (brand === "uag" && /\bmonarch\b/.test(t)) ||
    (brand === "smallrig" && /\biphone\b|\bsmartphone\b/.test(t)) ||
    (brand === "joby" && /\bsmartphone\b/.test(t)) ||
    (brand === "celestron" && /\bsmartphone\b/.test(t))
  ) {
    return result(
      "SAFE",
      "Mobile",
      "Mobile Zubehör",
      "mobile_accessory",
      "known-accessory-family"
    );
  }

  if (
    /\bleder\b|\bleather\b/.test(t) &&
    /\biphone\b/.test(t) &&
    !/\bapple\b/.test(brand)
  ) {
    return result(
      "SAFE",
      "Mobile",
      "Mobile Zubehör",
      "mobile_accessory",
      "leather-iphone-accessory"
    );
  }

  return result("KEEP", p.category, p.subcategory, "unknown", "no-safe-smartphone-rule");
}

/* -------------------------------------------------------------------------- */
/* TABLETS                                                                    */
/* -------------------------------------------------------------------------- */

// V1.1: inclui compostos alemães como Tablethalter/Tablethalterung.
const TABLET_ACCESSORY = [
  /\bpen\b/,
  /\bstylus\b/,
  /\bpencil\b/,
  /\bcase\b/,
  /\bcover\b/,
  /\bfolio\b/,
  /\bhulle\b/,
  /\brisskov\b/,
  /\bhalter\b/,
  /\bhalterung\b/,
  /\btablethalter\b/,
  /\btablethalterung\b/,
  /\btabletstand\b/,
  /\btabletstander\b/,
  /\bholder\b/,
  /\bmount\b/,
  /\bstand\b/,
  /\bstander\b/,
  /\bpage\s+turner\b/,
  /\bkeyboard\b/,
  /\btastatur\b/,
  /\badapter\b/,
  /\bdock\b/,
  /\bprivacy\b/,
  /\bfilter\b/,
  /\bglass\b/,
  /\bschutz\b/,
  /\bcage\b/,
  /\bsleeve\b/,
  /\btasche\b/,
  /\bbag\b/,
  /\bkabel\b/,
  /\bcable\b/,
  /\bcharger\b/,
  /\bladegerat\b/,
];

const TABLET_MANUAL = [
  /\bbastelset\b/,
  /\bschale\b/,
  /\bjesmonite\b/,
  /\bserviertablett\b/,
  /\breinigungstabletten\b/,
];


const GRAPHICS_TABLET = [
  /\bgrafiktablet\b/,
  /\bgraphics\s+tablet\b/,
  /\bdrawing\s+tablet\b/,
  /\bpen\s+display\b/,
  /\bgrafikdisplay\b/,
  /\bartist\s+pro\b/,
];

function tabletRule(p) {
  const t = textOf(p);

  if (any(t, TABLET_MANUAL)) {
    return result(
      "REVIEW",
      p.category,
      p.subcategory,
      "out_of_scope_review",
      "non-it-product-on-tablet-page"
    );
  }

  // XP-Pen / Grafiktablet são periféricos de criação, não acessórios de tablet móvel.
  if (any(t, GRAPHICS_TABLET)) {
    return result(
      "SAFE",
      "Peripherie",
      "Zubehör",
      "graphics_tablet",
      "graphics-tablet-peripheral"
    );
  }

  if (any(t, TABLET_ACCESSORY)) {
    return result(
      "SAFE",
      "Mobile",
      "Mobile Zubehör",
      "tablet_accessory",
      "tablet-accessory-keyword"
    );
  }

  return result("KEEP", p.category, p.subcategory, "unknown", "no-safe-tablet-rule");
}

/* -------------------------------------------------------------------------- */
/* LAPTOPS                                                                    */
/* -------------------------------------------------------------------------- */

const LAPTOP_KEYBOARD = [
  /\bmagic\s+keyboard\b/,
  /\bkeyboard\b/,
  /\btastatur\b/,
];

const LAPTOP_ACCESSORY = [
  /\bwwan\b.*\bmodul\b/,
  /\bwwan\b.*\bmodule\b/,
  /\b5g\b.*\bmodul\b/,
  /\blte\b.*\bmodul\b/,
];

const MINI_PC = [
  /\bexpertcenter\s+pn\d+/,
  /\bpro\s+micro\b/,
  /\bthinkcentre\b.*\b(?:tiny|nano)\b/,
  /\btc\s+neo\s+\d+q\b/,
  /\bneo\s+\d+q\b/,
  /\belitedesk\b.*\bmini\b/,
  /\bprodesk\b.*\bmini\b/,
  /\bmini[- ]?pc\b/,
  /\bnuc\b/,
];

const DESKTOP_PC = [
  /\bpro\s+tower\b/,
  /\bpro\s+slim\b/,
  /\belitedesk\b.*\bsff\b/,
  /\belitedesk\b.*\btower\b/,
  /\bprodesk\b.*\bsff\b/,
  /\bprodesk\b.*\btower\b/,
  /\baspire\s+aio\b/,
  /\bpro\s+\d+\s+aio\b/,
  /\ball[- ]in[- ]one\b/,
  /\bd501ser\b/,
  /\baltos\b.*\bthin\s+client\b/,
];

function laptopRule(p) {
  const t = textOf(p);

  if (any(t, LAPTOP_ACCESSORY)) {
    return result(
      "SAFE",
      "Computer",
      "Computer-Zubehör",
      "computer_accessory",
      "laptop-accessory-module"
    );
  }

  if (any(t, LAPTOP_KEYBOARD)) {
    return result(
      "SAFE",
      "Peripherie",
      "Tastaturen",
      "keyboard",
      "keyboard-on-laptop-page"
    );
  }

  if (any(t, MINI_PC)) {
    return result(
      "SAFE",
      "Computer",
      "Mini-PCs",
      "mini_pc_device",
      "mini-pc-family"
    );
  }

  if (any(t, DESKTOP_PC)) {
    return result(
      "SAFE",
      "Computer",
      "Desktop-PCs",
      "desktop_pc",
      "desktop-family"
    );
  }

  return result("KEEP", p.category, p.subcategory, "unknown", "no-safe-laptop-rule");
}

/* -------------------------------------------------------------------------- */
/* REGRESSION TESTS                                                           */
/* -------------------------------------------------------------------------- */

function runTests() {
  const tests = [
    [
      "Nomad Etui",
      smartphoneRule,
      { title: "Nomad Etui Modern, Braun, Horween Leder fürs Apple iPhone 16 Pro", brand: "Nomad", category: "Mobile", subcategory: "Smartphones" },
      "Mobile Zubehör"
    ],
    [
      "SmallRig video kit",
      smartphoneRule,
      { title: "SmallRig x Brandon Li Mobile Video Kit for iPhone 15 Pro Max", brand: "SmallRig", category: "Mobile", subcategory: "Smartphones" },
      "Mobile Zubehör"
    ],
    [
      "Real phone stays",
      smartphoneRule,
      { title: "Apple iPhone 17 weiss 256GB", brand: "Apple", category: "Mobile", subcategory: "Smartphones" },
      "Smartphones"
    ],
    [
      "Pioneer autoradio to audio",
      smartphoneRule,
      { title: "Pioneer Smartphone Autoradio SPH-20DAB", brand: "Pioneer", category: "Mobile", subcategory: "Smartphones" },
      "Audio"
    ],
    [
      "Action camera tripod to photo video",
      smartphoneRule,
      { title: "SmallRig Selfie Tripod for Action Cameras", brand: "SmallRig", category: "Mobile", subcategory: "Smartphones" },
      "Foto & Video"
    ],
    [
      "Heat it goes review",
      smartphoneRule,
      { title: "heat it Pro Lightning kompatibel iPhone 6s bis 14", brand: "heat it", category: "Mobile", subcategory: "Smartphones" },
      "Smartphones"
    ],
    [
      "Tablet pen",
      tabletRule,
      { title: "Lenovo Tab Pen Pro zu Yoga Tab Plus", brand: "Lenovo", category: "Mobile", subcategory: "Tablets" },
      "Mobile Zubehör"
    ],
    [
      "Tablet holder",
      tabletRule,
      { title: "Durable Tablethalter Rise Tablet Grössen bis 13 Zoll", brand: "Durable", category: "Mobile", subcategory: "Tablets" },
      "Mobile Zubehör"
    ],
    [
      "Tablet holder compound",
      tabletRule,
      { title: "Durable Tablethalterung Tisch für Tablet 7-13 Zoll", brand: "Durable", category: "Mobile", subcategory: "Tablets" },
      "Mobile Zubehör"
    ],
    [
      "Real tablet stays",
      tabletRule,
      { title: "Samsung Galaxy Tab S10 lite WiFi 128GB", brand: "Samsung", category: "Mobile", subcategory: "Tablets" },
      "Tablets"
    ],
    [
      "XP-Pen graphics tablet to peripheral",
      tabletRule,
      { title: "XP-Pen Grafiktablet Artist Pro 22 (Gen2)", brand: "XP-Pen", category: "Mobile", subcategory: "Tablets" },
      "Zubehör"
    ],
    [
      "WWAN module",
      laptopRule,
      { title: "Lenovo ThinkPad WWAN Modul Quectel RM520N-G", brand: "Lenovo", category: "Computer", subcategory: "Laptops" },
      "Computer-Zubehör"
    ],
    [
      "ExpertCenter PN",
      laptopRule,
      { title: "ASUS ExpertCenter PN43-SN100AD Fanless Win11 Pro", brand: "ASUS", category: "Computer", subcategory: "Laptops" },
      "Mini-PCs"
    ],
    [
      "Dell Pro Micro",
      laptopRule,
      { title: "Dell Pro Micro, TPM, i5-14500T 16GB 512GB SSD", brand: "Dell", category: "Computer", subcategory: "Laptops" },
      "Mini-PCs"
    ],
    [
      "Dell Pro Slim",
      laptopRule,
      { title: "Dell Pro Slim Essential, i7-14700 16GB, 512GB SSD", brand: "Dell", category: "Computer", subcategory: "Laptops" },
      "Desktop-PCs"
    ],
    [
      "Real laptop stays",
      laptopRule,
      { title: 'HP ProBook 440 G11 U5 125U 16GB 512GB 14" WUXGA', brand: "HP Inc.", category: "Computer", subcategory: "Laptops" },
      "Laptops"
    ],
  ];

  const failures = [];

  for (const [name, fn, p, expectedSub] of tests) {
    const r = fn(p);
    if (r.subcategory !== expectedSub) {
      failures.push(`${name}: got ${r.category} > ${r.subcategory}, expected ${expectedSub}`);
    }
  }

  if (failures.length) {
    throw new Error("REGRESSION TESTS FAILED:\n" + failures.join("\n"));
  }

  console.log(`REGRESSION TESTS: ${tests.length}/${tests.length} OK`);
}

runTests();

/* -------------------------------------------------------------------------- */
/* LOAD CURRENT PRODUCTS                                                      */
/* -------------------------------------------------------------------------- */

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

const proposals = [];
const reviews = [];

function evaluate(list, fn) {
  for (const p of list) {
    const r = fn(p);

    const row = {
      sku: clean(p.sku),
      title: clean(p.title),
      brand: clean(p.brand),
      old_category: clean(p.category),
      old_subcategory: clean(p.subcategory),
      proposed_category: r.category,
      proposed_subcategory: r.subcategory,
      product_type: r.type,
      reason: r.reason,
      status: r.status,
    };

    if (r.status === "SAFE") proposals.push(row);
    if (r.status === "REVIEW") reviews.push(row);
  }
}

evaluate(smartphones, smartphoneRule);
evaluate(tablets, tabletRule);
evaluate(laptops, laptopRule);

function csvEscape(v) {
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
      ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
    ].join("\n"),
    "utf8"
  );
}

function grouped(rows, fn) {
  const map = new Map();
  for (const r of rows) {
    const key = fn(r);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const safePath = path.join(OUT, `page-cleanup-v121-safe-${stamp}.csv`);
const reviewPath = path.join(OUT, `page-cleanup-v121-review-${stamp}.csv`);

writeCsv(safePath, proposals);
writeCsv(reviewPath, reviews);

console.log("");
console.log("========== IUMATEC PAGE CLEANUP V1.2.1 ==========");
console.log("MODO: DRY RUN — NENHUM produto foi alterado.");
console.log("");
console.log(`Smartphones analisados: ${smartphones.length}`);
console.log(`Tablets analisados: ${tablets.length}`);
console.log(`Laptops analisados: ${laptops.length}`);
console.log(`Mudanças SAFE propostas: ${proposals.length}`);
console.log(`REVIEW manual: ${reviews.length}`);

console.log("");
console.log("=== TRANSIÇÕES SAFE ===");
for (const [k, count] of grouped(
  proposals,
  (r) => `${r.old_category} > ${r.old_subcategory} => ${r.proposed_category} > ${r.proposed_subcategory}`
)) {
  console.log(`${String(count).padStart(5)} | ${k}`);
}

console.log("");
console.log("=== AMOSTRA SAFE ===");
for (const r of proposals.slice(0, 100)) {
  console.log(
    `${r.sku} | ${r.title}\n` +
    `  ${r.old_category} > ${r.old_subcategory} => ` +
    `${r.proposed_category} > ${r.proposed_subcategory} ` +
    `[${r.product_type} | ${r.reason}]`
  );
}

if (reviews.length) {
  console.log("");
  console.log("=== REVIEW MANUAL ===");
  for (const r of reviews.slice(0, 50)) {
    console.log(`${r.sku} | ${r.title} [${r.reason}]`);
  }
}

console.log("");
console.log(`SAFE CSV: ${safePath}`);
console.log(`REVIEW CSV: ${reviewPath}`);
console.log("");
console.log("DRY RUN concluído. NENHUM produto foi alterado.");
