import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/*
 IUMATEC Catalog Classifier V3 — CONSERVATIVE / TITLE-FIRST / DRY RUN ONLY
 =========================================================================
 Objetivo:
 - limpar as páginas principais sem "adivinhar" agressivamente;
 - evitar acessórios em Smartphones/Tablets/Laptops;
 - evitar aparelhos aleatórios classificados por palavras de características;
 - nunca alterar preço, stock, imagens ou qualquer campo.

 IMPORTANTE: ESTE SCRIPT NÃO TEM APPLY.
*/

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Faltam SUPABASE_URL e/ou SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
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
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const hit = (t, regs) => regs.some((r) => r.test(t));

function titleText(p) {
  return n(`${p.title || ""} ${p.brand || ""}`);
}

function brandText(p) {
  return n(p.brand);
}

function csvEscape(v) {
  return `"${String(v ?? "").replaceAll('"', '""')}"`;
}

function out(type, category, subcategory, confidence, reason) {
  return { type, category, subcategory, confidence, reason };
}

const ACCESSORY = [
  /\bcase\b/, /\bcover\b/, /\bbackcover\b/, /\bbooklet\b/, /\bfolio\b/,
  /\bbumper\b/, /\bshell\b/, /\bsleeve\b/, /\btasche\b/, /\bbag\b/,
  /\bbackpack\b/, /\bruck(sack)?\b/,
  /\bpanzerglas\b/, /\bschutzglas\b/, /\btempered\s+glass\b/,
  /\bschutzfolie\b/, /\bdisplayfolie\b/, /\bscreen\s+protector\b/,
  /\bprivacy\b/, /\bprivacy\s+filter\b/, /\bfilter\b/,
  /\banti[- ]?glare\b/, /\bantimicrobial\b/,
  /\bpf\s*(?:2|4)[- ]?way\b/, /\b2[- ]?way\b/, /\b4[- ]?way\b/,
  /\bmagnetic\b/, /\bmagnetisch\b/, /\bself[- ]?adhesive\b/,
  /\bselbstklebend\b/, /\babnehmbar\b/,
  /\bhalterung\b/, /\bhalter\b/, /\bholder\b/, /\bmount\b/,
  /\bwandhalterung\b/, /\bbracket\b/, /\bclamp\b/, /\bklemme\b/,
  /\bstander\b/, /\bstandfuss\b/, /\bstativ\b/, /\bmonitorarm\b/,
  /\bcage\b/, /\bstrap\b/, /\bschultergurt\b/,
  /\bkabel\b/, /\bcable\b/, /\badapter\b/, /\bkonverter\b/,
  /\bcharger\b/, /\bladegerat\b/, /\bladestation\b/, /\bladepad\b/,
  /\bpowerbank\b/,
  /\bdock\b/, /\bdockingstation\b/, /\bdocking\s+station\b/, /\bhub\b/,
  /\bkeyboard\b/, /\btastatur\b/, /\bcombo\s+touch\b/,
  /\bmouse\b/, /\bmaus\b/, /\bstylus\b/, /\bpencil\b/,
  /\bwebcam\s+abdeckung\b/, /\bkameraabdeckung\b/,
  /\bcooler\b/, /\bkuhler\b/, /\blufter\b/,
  /\bersatzakku\b/, /\breplacement\s+battery\b/,
  /\breinigung\b/, /\bcleaning\b/,
  /\btablethalter\b/, /\btablet\s+halter\b/, /\btablet\s+stand\b/
];

const PHONE_BRANDS = [
  "apple","samsung","google","xiaomi","motorola","nokia","honor",
  "oneplus","nothing","fairphone","oppo","vivo","sony","hmd"
];
const TABLET_BRANDS = [
  "apple","samsung","microsoft","lenovo","xiaomi","huawei","honor",
  "onyx","remarkable","tcl","acer","amazon"
];
const COMPUTER_BRANDS = [
  "hp","hp inc.","lenovo","dell","asus","acer","apple","microsoft","msi",
  "medion","gigabyte","captiva","fujitsu","dynabook","shuttle","intel",
  "zotac","asrock","minisforum"
];

const brandIn = (p, list) => list.some((b) => brandText(p) === n(b) || brandText(p).startsWith(n(b) + " "));

const ROBOT_VAC = [
  /\brobotersauger\b/, /\bsaugroboter\b/, /\brobot\s+vacuum\b/,
  /\broborock\b/, /\bdreame\s+.*robot\b/
];

const PHONE_MODEL = [
  /\biphone\s+(?:se|air|1[1-9]|[6-9])(?:\b|[\s+-])/,
  /\bgalaxy\s+(?:s|z|a|m)\s*\d{1,3}\b/,
  /\bgalaxy\s+xcover\b/,
  /\bgoogle\s+pixel\s+\d/, /\bpixel\s+\d/,
  /\bfairphone\s*\d+/, /\bnothing\s+phone\b/,
  /\boneplus\s+\d/, /\bredmi\s+(?:note\s*)?\d/,
  /\bpoco\s+[cfmx]\d/i, /\bmotorola\s+(?:edge|razr)\b/,
  /\bmoto\s+[gex]\d/i, /\bhonor\s+(?:magic|\d)/,
  /\bnokia\s+[a-z]?\d/i
];

const TABLET_MODEL = [
  /\bipad\s+(?:air|pro|mini|\d)/,
  /\bgalaxy\s+tab\s+[a-z]\d/i,
  /\blenovo\s+tab\b/, /\bxiaomi\s+pad\b/, /\bmatepad\b/,
  /\bsurface\s+(?:pro|go)\b/,
  /\be-ink\s+tablet\b/
];

const LAPTOP_MODEL = [
  /\blaptop\b/, /\bnotebook\b/, /\bmacbook\b/, /\bchromebook\b/,
  /\bthinkpad\b/, /\bideapad\b/, /\belitebook\b/, /\bprobook\b/,
  /\bzbook\b/, /\blatitude\b/, /\binspiron\b/, /\bvostro\b/,
  /\bvivobook\b/, /\bzenbook\b/, /\bexpertbook\b/,
  /\btravelmate\b/, /\baspire\b/, /\bswift\b/, /\bspectre\b/,
  /\blegion\b/, /\bomnibook\b/, /\bsurface\s+laptop\b/
];

const MINI_PC = [/\bmini[- ]?pc\b/, /\bnuc\b/, /\bmini[- ]?system\b/, /\btiny\s+pc\b/];
const DESKTOP_PC = [
  /\bdesktop[- ]?pc\b/, /\bgaming\s+pc\b/, /\ball[- ]in[- ]one\b/,
  /\boptiplex\b/, /\bprodesk\b/, /\belitedesk\b/, /\btower\s+pc\b/
];

const HEADSET = [/\bheadset\b/, /\bkopfhorer\b/, /\bheadphone\b/];
const KEYBOARD_STRONG = [
  /\bgaming\s+tastatur\b/, /\bgaming\s+keyboard\b/,
  /\bbluetooth\s+tastatur\b/, /\bbluetooth\s+keyboard\b/,
  /\busb[- ]?tastatur\b/, /\busb[- ]?keyboard\b/,
  /\bmechanische\s+tastatur\b/, /\bmechanical\s+keyboard\b/,
  /\bwireless\s+keyboard\b/, /\bkabellose\s+tastatur\b/
];
const KEYBOARD_FALSE = [
  /\blabelmanager\b/, /\bletratag\b/, /\bbeschriftungsgerat\b/,
  /\bdisplay\b.*\btastatur\b/
];
const MOUSE = [/\bgaming\s+mouse\b/, /\bwireless\s+mouse\b/, /\bbluetooth\s+mouse\b/, /\bmaus\b/];
const WEBCAM = [/\bwebcam\b/, /\bweb\s+camera\b/];
const WEBCAM_BLOCK = [/\babdeckung\b/, /\bcover\b/, /\bprivacy\b/];
const DOCK = [/\bdockingstation\b/, /\bdocking\s+station\b/, /\busb[- ]?c\s+dock\b/];

const MONITOR_ACCESSORY = [
  /\bprivacy\b/, /\bfilter\b/, /\bhalterung\b/, /\bmount\b/,
  /\bmonitorarm\b/, /\bmonitor\s+arm\b/, /\bwandhalterung\b/,
  /\bstand\b/, /\bstativ\b/, /\bbracket\b/
];
const MONITOR_STRONG = [
  /\bgaming\s+monitor\b/, /\blcd\s+monitor\b/, /\btft\s+monitor\b/,
  /\bcurved\s+monitor\b/, /\bdesktop\s+monitor\b/,
  /\bmonitor\s+\d{2}(?:[.,]\d)?[\" ]/
];

const GPU = [
  /\bgrafikkarte\b/, /\bgraphics\s+card\b/,
  /\bgeforce\s+(?:rtx|gtx)\s*\d{3,4}\b/,
  /\bradeon\s+rx\s*\d{3,4}\b/
];
const MOTHERBOARD = [/\bmainboard\b/, /\bmotherboard\b/];
const RAM = [
  /\b(?:rdimm|udimm|sodimm|so-dimm|dimm)\b.*\b(?:8|16|32|64|128)\s*gb\b/,
  /\b(?:8|16|32|64|128)\s*gb\b.*\b(?:rdimm|udimm|sodimm|so-dimm|dimm)\b/,
  /\barbeitsspeicher\b/, /\bmemory\s+kit\b/
];
const CPU = [
  /\bprozessor\b/, /\bprocessor\b/,
  /\bryzen\s+[3579]\s+\d{4,5}\b/,
  /\bintel\s+core\s+(?:ultra\s+)?[3579]\s+\d{3,5}\b/
];

const NETWORK_ADAPTER = [
  /\bpatchkabel\b/, /\bnetzwerkkabel\b/, /\blan\s+kabel\b/,
  /\bethernet\s+cable\b/, /\brj45\b.*\bkabel\b/,
  /\busb[- ]?lan\b/, /\blan\s+adapter\b/
];
const ROUTER = [/\brouter\b/, /\bfritz!?box\b/];
const SWITCH = [
  /\bnetwork\s+switch\b/, /\bnetzwerk[- ]?switch\b/,
  /\bmanaged\s+switch\b/, /\bunmanaged\s+switch\b/, /\bpoe\s+switch\b/
];

const STORAGE = [
  /\b(?:m\.?2\s+)?nvme\s+ssd\b/,
  /\b(?:sata\s+)?ssd\s+\d+\s*(?:gb|tb)\b/,
  /\bhdd\s+\d+\s*(?:gb|tb)\b/,
  /\bfestplatte\s+\d+\s*(?:gb|tb)\b/,
  /\bexternal\s+ssd\b/, /\bexterne\s+ssd\b/, /\bportable\s+ssd\b/,
  /\bnas\s+(?:system|server|gehaeuse)\b/
];

const PRINTER_CONSUMABLE = [
  /\btoner\b/, /\btintenpatrone\b/, /\bink\s+cartridge\b/,
  /\btonerpatrone\b/, /\bdrum\s+unit\b/, /\btrommeleinheit\b/
];
const PRINTER_DEVICE = [
  /\bdrucker\b/, /\blaserjet\b/, /\bofficejet\b/, /\becotank\b/,
  /\bmultifunktionsdrucker\b/, /\bmultifunction\s+printer\b/
];
const PHOTO_SCANNER_BLOCK = [
  /\bfilm\s+scanner\b/, /\bfilmscanner\b/, /\bdiascanner\b/, /\bphoto\s+scanner\b/
];

function classify(p) {
  const t = titleText(p);
  const oldC = s(p.category);
  const oldS = s(p.subcategory);

  if (hit(t, ROBOT_VAC)) {
    return out("robot_vacuum", "Smart Home", "Gebäudetechnik", 0.999, "robot-vacuum");
  }

  if (hit(t, ACCESSORY)) {
    if (hit(t, DOCK)) {
      return out("docking_station", "Peripherie", "Dockingstationen", 0.999, "accessory-docking");
    }

    if (/\bmonitor\b/.test(t) && hit(t, MONITOR_ACCESSORY)) {
      return out("monitor_accessory", "Peripherie", "Zubehör", 0.999, "monitor-accessory");
    }

    if (/\biphone\b|\bgalaxy\b|\bpixel\b|\bredmi\b|\bpoco\b|\boneplus\b|\bfairphone\b|\bnothing\s+phone\b|\bmoto\b|\bmotorola\b/.test(t)) {
      return out("mobile_accessory", "Mobile", "Mobile Zubehör", 0.999, "phone-accessory");
    }

    if (/\bipad\b|\bgalaxy\s+tab\b|\blenovo\s+tab\b|\bxiaomi\s+pad\b|\bmatepad\b|\bsurface\s+(?:pro|go)\b|\btablet\b/.test(t)) {
      return out("mobile_accessory", "Mobile", "Mobile Zubehör", 0.999, "tablet-accessory");
    }

    if (hit(t, LAPTOP_MODEL) || /\blaptop\b|\bnotebook\b|\bmacbook\b/.test(t)) {
      return out("computer_accessory", "Computer", "Computer-Zubehör", 0.999, "laptop-accessory");
    }
  }

  if (brandIn(p, PHONE_BRANDS) && hit(t, PHONE_MODEL) && !hit(t, ACCESSORY)) {
    return out("smartphone_device", "Mobile", "Smartphones", 0.999, "phone-brand-model");
  }

  if (brandIn(p, TABLET_BRANDS) && hit(t, TABLET_MODEL) && !hit(t, ACCESSORY)) {
    return out("tablet_device", "Mobile", "Tablets", 0.999, "tablet-brand-model");
  }

  if (brandIn(p, COMPUTER_BRANDS) && hit(t, MINI_PC) && !hit(t, ACCESSORY)) {
    return out("mini_pc_device", "Computer", "Mini-PCs", 0.999, "mini-pc-brand-model");
  }

  if (brandIn(p, COMPUTER_BRANDS) && hit(t, LAPTOP_MODEL) && !hit(t, ACCESSORY)) {
    return out("laptop_device", "Computer", "Laptops", 0.999, "laptop-brand-model");
  }

  if (brandIn(p, COMPUTER_BRANDS) && hit(t, DESKTOP_PC) && !hit(t, ACCESSORY)) {
    return out("desktop_pc", "Computer", "Desktop-PCs", 0.999, "desktop-brand-model");
  }

  if (hit(t, GPU)) return out("graphics_card", "PC-Komponenten", "Grafikkarten", 0.999, "graphics-card");
  if (hit(t, MOTHERBOARD)) return out("motherboard", "PC-Komponenten", "Mainboards", 0.999, "motherboard");

  if (hit(t, RAM) && !hit(t, LAPTOP_MODEL) && !hit(t, DESKTOP_PC) && !hit(t, MINI_PC)) {
    return out("ram_module", "PC-Komponenten", "RAM", 0.998, "ram-module");
  }

  if (oldC === "PC-Komponenten" && hit(t, CPU)) {
    return out("processor", "PC-Komponenten", "Prozessoren", 0.997, "processor");
  }

  if (hit(t, HEADSET)) return out("headset", "Peripherie", "Headsets", 0.999, "headset");

  if (hit(t, KEYBOARD_STRONG) && !hit(t, KEYBOARD_FALSE)) {
    return out("keyboard", "Peripherie", "Tastaturen", 0.998, "keyboard-strong");
  }

  if (hit(t, MOUSE)) return out("mouse", "Peripherie", "Mäuse", 0.998, "mouse");

  if (hit(t, WEBCAM) && !hit(t, WEBCAM_BLOCK)) {
    return out("webcam", "Peripherie", "Webcams", 0.998, "webcam");
  }

  if (hit(t, DOCK)) return out("docking_station", "Peripherie", "Dockingstationen", 0.999, "docking");

  if (hit(t, MONITOR_STRONG) && !hit(t, MONITOR_ACCESSORY)) {
    return out("monitor_device", "Peripherie", "Monitore", 0.998, "monitor-strong");
  }

  if (hit(t, NETWORK_ADAPTER)) return out("network_cable_adapter", "Netzwerk", "Kabel & Adapter", 0.999, "network-adapter");
  if (hit(t, ROUTER)) return out("router", "Netzwerk", "Netzwerk", 0.998, "router");
  if (hit(t, SWITCH)) return out("network_switch", "Netzwerk", "Netzwerk", 0.998, "network-switch");

  if (hit(t, STORAGE) && !hit(t, LAPTOP_MODEL) && !hit(t, DESKTOP_PC) && !hit(t, MINI_PC) && !hit(t, TABLET_MODEL) && !hit(t, PHONE_MODEL)) {
    return out("storage_device", "Datenspeicher", "Storage", 0.997, "storage-strong");
  }

  if (hit(t, PRINTER_CONSUMABLE)) {
    return out("printer_consumable", "Office & Business", "Drucker & Scanner", 0.997, "printer-consumable");
  }

  if (hit(t, PRINTER_DEVICE) && !hit(t, PHOTO_SCANNER_BLOCK)) {
    return out("printer_scanner", "Office & Business", "Drucker & Scanner", 0.997, "printer-device");
  }

  return out("unclassified", oldC || "Unsortiert", oldS || "Sonstiges", 0, "no-strong-rule");
}

function expectedType(c, sub) {
  const k = `${s(c)}|||${s(sub)}`;
  const map = {
    "Mobile|||Smartphones": "smartphone_device",
    "Mobile|||Tablets": "tablet_device",
    "Computer|||Laptops": "laptop_device",
    "Computer|||Desktop-PCs": "desktop_pc",
    "Computer|||Mini-PCs": "mini_pc_device",
    "Peripherie|||Monitore": "monitor_device",
    "PC-Komponenten|||Grafikkarten": "graphics_card"
  };
  return map[k] || null;
}

async function loadAll() {
  const all = [];
  const limit = 1000;
  let lastSku = null;

  while (true) {
    let q = supabase
      .from("products")
      .select("sku,title,brand,category,subcategory,price,in_stock,stock_qty")
      .order("sku", { ascending: true })
      .limit(limit);

    if (lastSku) q = q.gt("sku", lastSku);

    const { data, error } = await q;
    if (error) throw new Error(`Supabase: ${error.message}`);

    const batch = data || [];
    all.push(...batch);
    if (batch.length) lastSku = batch[batch.length - 1].sku;

    console.log(`SKUs únicos lidos: ${all.length}${lastSku ? ` | cursor: ${lastSku}` : ""}`);
    if (batch.length < limit) break;
  }
  return all;
}

function writeCsv(file, rows) {
  if (!rows.length) {
    fs.writeFileSync(file, "", "utf8");
    return;
  }
  const h = Object.keys(rows[0]);
  const body = [h.join(","), ...rows.map((r) => h.map((k) => csvEscape(r[k])).join(","))].join("\n");
  fs.writeFileSync(file, body, "utf8");
}

function groups(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const products = await loadAll();
const seen = new Set();
const rows = [];

for (const p of products) {
  const sku = s(p.sku);
  if (!sku || seen.has(sku)) continue;
  seen.add(sku);

  const c = classify(p);
  const oldCategory = s(p.category);
  const oldSubcategory = s(p.subcategory);
  const changed = oldCategory !== c.category || oldSubcategory !== c.subcategory;

  let status = "KEEP";
  if (c.type !== "unclassified") {
    if (!changed) status = "CLEAN";
    else if (c.confidence >= 0.997) status = "SAFE_CHANGE";
    else status = "REVIEW";
  }

  const exp = expectedType(oldCategory, oldSubcategory);
  let pageRisk = "NO";
  if (exp) {
    if (c.type === "unclassified") pageRisk = "UNKNOWN";
    else if (c.type !== exp) pageRisk = "YES";
  }

  rows.push({
    sku,
    title: s(p.title),
    brand: s(p.brand),
    old_category: oldCategory,
    old_subcategory: oldSubcategory,
    proposed_category: c.category,
    proposed_subcategory: c.subcategory,
    product_type: c.type,
    confidence: c.confidence.toFixed(3),
    reason: c.reason,
    status,
    page_risk: pageRisk
  });
}

const safe = rows.filter((r) => r.status === "SAFE_CHANGE");
const review = rows.filter((r) => r.status === "REVIEW");
const clean = rows.filter((r) => r.status === "CLEAN");
const keep = rows.filter((r) => r.status === "KEEP");
const riskYes = rows.filter((r) => r.page_risk === "YES");
const riskUnknown = rows.filter((r) => r.page_risk === "UNKNOWN");

const devicePages = new Set([
  "Mobile|||Smartphones",
  "Mobile|||Tablets",
  "Computer|||Laptops",
  "Computer|||Desktop-PCs",
  "Computer|||Mini-PCs"
]);

const suspiciousAccessoryIntoDevice = safe.filter((r) => {
  const target = `${r.proposed_category}|||${r.proposed_subcategory}`;
  return devicePages.has(target) && hit(n(r.title), ACCESSORY);
});

const suspiciousRobotIntoMobile = rows.filter((r) => {
  const target = `${r.proposed_category}|||${r.proposed_subcategory}`;
  return (target === "Mobile|||Smartphones" || target === "Mobile|||Tablets") && hit(n(r.title), ROBOT_VAC);
});

const suspiciousLabelKeyboard = safe.filter(
  (r) => r.proposed_subcategory === "Tastaturen" && hit(n(r.title), KEYBOARD_FALSE)
);

const guardTotal = suspiciousAccessoryIntoDevice.length + suspiciousRobotIntoMobile.length + suspiciousLabelKeyboard.length;

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const allPath = path.join(OUT, `catalog-classifier-v3-all-${stamp}.csv`);
const safePath = path.join(OUT, `catalog-classifier-v3-safe-changes-${stamp}.csv`);
const riskPath = path.join(OUT, `catalog-classifier-v3-page-risk-${stamp}.csv`);
const guardPath = path.join(OUT, `catalog-classifier-v3-guard-failures-${stamp}.csv`);
const summaryPath = path.join(OUT, `catalog-classifier-v3-summary-${stamp}.txt`);

writeCsv(allPath, rows);
writeCsv(safePath, safe);
writeCsv(riskPath, [...riskYes, ...riskUnknown]);
writeCsv(guardPath, [...suspiciousAccessoryIntoDevice, ...suspiciousRobotIntoMobile, ...suspiciousLabelKeyboard]);

const transitions = groups(safe, (r) => `${r.old_category} > ${r.old_subcategory} => ${r.proposed_category} > ${r.proposed_subcategory}`);
const risks = groups([...riskYes, ...riskUnknown], (r) => `${r.old_category} > ${r.old_subcategory} | ${r.page_risk}`);

const L = [];
L.push("========== IUMATEC CATALOG CLASSIFIER V3 ==========");
L.push("MODO: DRY RUN — NENHUM produto foi alterado.");
L.push("");
L.push(`SKUs únicos analisados: ${rows.length}`);
L.push(`Classificados e já corretos: ${clean.length}`);
L.push(`Mudanças seguras propostas: ${safe.length}`);
L.push(`Revisão manual: ${review.length}`);
L.push(`Sem regra forte / manter: ${keep.length}`);
L.push(`Contaminações certas em páginas principais: ${riskYes.length}`);
L.push(`Casos UNKNOWN nas páginas principais: ${riskUnknown.length}`);
L.push("");
L.push("=== GUARDAS CRÍTICAS ===");
L.push(`Acessórios propostos para páginas de dispositivos: ${suspiciousAccessoryIntoDevice.length}`);
L.push(`Robôs propostos para Mobile: ${suspiciousRobotIntoMobile.length}`);
L.push(`LabelManager/semelhantes propostos como Tastaturen: ${suspiciousLabelKeyboard.length}`);
L.push(`TOTAL GUARD FAILURES: ${guardTotal}`);
L.push("");
L.push("=== TOP MUDANÇAS SEGURAS ===");
for (const [k, count] of transitions.slice(0, 35)) L.push(`${String(count).padStart(6)} | ${k}`);
L.push("");
L.push("=== RISCO NAS PÁGINAS PRINCIPAIS ===");
for (const [k, count] of risks.slice(0, 35)) L.push(`${String(count).padStart(6)} | ${k}`);
L.push("");
L.push("=== AMOSTRA: MUDANÇAS SEGURAS ===");
for (const r of safe.slice(0, 50)) {
  L.push(`${r.sku} | ${r.title}\n  ${r.old_category} > ${r.old_subcategory} => ${r.proposed_category} > ${r.proposed_subcategory} [${r.product_type} | ${r.confidence} | ${r.reason}]`);
}
L.push("");
L.push("=== AMOSTRA: RISCO DE PÁGINA ===");
for (const r of [...riskYes, ...riskUnknown].slice(0, 50)) {
  L.push(`${r.sku} | ${r.title}\n  atual: ${r.old_category} > ${r.old_subcategory} | detectado: ${r.product_type} | risco=${r.page_risk}`);
}
L.push("");
L.push("Relatórios:");
L.push(allPath);
L.push(safePath);
L.push(riskPath);
L.push(guardPath);
L.push("");
if (guardTotal === 0) {
  L.push("GUARDAS CRÍTICAS: OK.");
  L.push("Ainda NÃO existe APPLY. Envie este resumo para validação antes de criar o APPLY protegido.");
} else {
  L.push("GUARDAS CRÍTICAS: FALHARAM.");
  L.push("NÃO criar APPLY enquanto TOTAL GUARD FAILURES for diferente de 0.");
}

fs.writeFileSync(summaryPath, L.join("\n"), "utf8");
console.log("");
console.log(L.join("\n"));
console.log("");
console.log(`Resumo: ${summaryPath}`);
console.log("DRY RUN V3 concluído. NENHUM produto foi alterado.");
