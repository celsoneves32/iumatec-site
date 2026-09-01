import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(".env.local"), override: false });
dotenv.config({ path: path.resolve(".env"), override: false });

const APPLY = process.argv.includes("--apply");

function argValue(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}

const MAX_PASSES = Math.max(2, Math.min(25, Number(argValue("--max-passes", "12")) || 12));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Supabase URL/key nao encontrados. Verifique .env.local/.env " +
    "(SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY)."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const OUT = path.resolve("integrations", "alltron", "out");
fs.mkdirSync(OUT, { recursive: true });

function txt(v) { return String(v ?? "").trim(); }
function norm(v) {
  return txt(v).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function containsAny(text, words) { return words.some((w) => text.includes(w)); }
function stateKey(category, subcategory) { return `${txt(category)}\u0000${txt(subcategory)}`; }
function stateLabel(category, subcategory) {
  return `${txt(category) || "Unsortiert"} > ${txt(subcategory) || "Sonstiges"}`;
}
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

const FINAL_PAIRS = new Set([
  stateKey("Computer", "Laptops"),
  stateKey("Computer", "Desktop-PCs"),
  stateKey("Computer", "Mini-PCs"),
  stateKey("Computer", "Computer-Zubeh\u00f6r"),
  stateKey("PC-Komponenten", "Komponenten"),
  stateKey("PC-Komponenten", "Kabel & Adapter"),
  stateKey("PC-Komponenten", "Gaming-Komponenten"),
  stateKey("Peripherie", "Monitore"),
  stateKey("Peripherie", "Tastaturen"),
  stateKey("Peripherie", "M\u00e4use"),
  stateKey("Peripherie", "Headsets"),
  stateKey("Peripherie", "Webcams"),
  stateKey("Peripherie", "Dockingstationen"),
  stateKey("Peripherie", "Gaming-Zubeh\u00f6r"),
  stateKey("Peripherie", "Zubeh\u00f6r"),
  stateKey("Peripherie", "Foto & Video"),
  stateKey("Peripherie", "Audio"),
  stateKey("Peripherie", "Kabel & Adapter"),
  stateKey("Peripherie", "Sound & Light"),
  stateKey("Netzwerk", "Kabel & Adapter"),
  stateKey("Netzwerk", "Netzwerk"),
  stateKey("Netzwerk", "Server"),
  stateKey("Netzwerk", "IT-Sicherheit"),
  stateKey("Mobile", "Smartphones"),
  stateKey("Mobile", "Tablets"),
  stateKey("Mobile", "Mobile Zubeh\u00f6r"),
  stateKey("Office & Business", "Software"),
  stateKey("Office & Business", "Drucker & Scanner"),
  stateKey("Office & Business", "Professional AV"),
  stateKey("Office & Business", "Projektoren"),
  stateKey("Office & Business", "Professional Audio"),
  stateKey("Office & Business", "Telefonie"),
  stateKey("Office & Business", "Conferencing & Collaboration"),
  stateKey("Office & Business", "Telefonsysteme"),
  stateKey("Datenspeicher", "Storage"),
  stateKey("Smart Home", "Beleuchtung"),
  stateKey("Smart Home", "Geb\u00e4udetechnik"),
  stateKey("Smart Home", "Energie & Strom"),
  stateKey("Smart Home", "Sicherheit"),
  stateKey("Smart Home", "Sicherheit & \u00dcberwachung"),
  stateKey("Smart Home", "TV & Home Cinema"),
]);

function classifyPeripheral(title) {
  const t = norm(title);
  if (containsAny(t, ["monitor", "display", "bildschirm"])) return ["Peripherie", "Monitore"];
  if (containsAny(t, ["tastatur", "keyboard"])) return ["Peripherie", "Tastaturen"];
  if (containsAny(t, ["maus", "mouse"])) return ["Peripherie", "M\u00e4use"];
  if (containsAny(t, ["headset", "kopfhorer", "kopfh\u00f6rer"])) return ["Peripherie", "Headsets"];
  if (containsAny(t, ["webcam", "web camera"])) return ["Peripherie", "Webcams"];
  if (containsAny(t, ["dock", "dockingstation", "docking station"])) return ["Peripherie", "Dockingstationen"];
  if (containsAny(t, ["drucker", "printer", "scanner"])) return ["Office & Business", "Drucker & Scanner"];
  if (containsAny(t, ["gamepad", "controller", "joystick", "gaming chair", "gaming-stuhl", "gaming stuhl"]))
    return ["Peripherie", "Gaming-Zubeh\u00f6r"];
  return ["Peripherie", "Zubeh\u00f6r"];
}

function classifyGaming(title) {
  const t = norm(title);
  if (containsAny(t, [
    "grafikkarte", "graphics card", "geforce", "radeon", "gpu",
    "prozessor", "processor", "cpu", "mainboard", "motherboard",
    "ram", "ddr4", "ddr5", "netzteil", "power supply", "psu",
    "kuhler", "k\u00fchler", "cooler"
  ])) return ["PC-Komponenten", "Gaming-Komponenten"];
  return classifyPeripheral(title);
}

function classifyComputerMixed(title) {
  const t = norm(title);
  if (containsAny(t, ["notebook", "laptop", "macbook"])) return ["Computer", "Laptops"];
  if (containsAny(t, ["tablet", "ipad"])) return ["Mobile", "Tablets"];
  if (containsAny(t, ["mini pc", "mini-pc", "nuc"])) return ["Computer", "Mini-PCs"];
  if (containsAny(t, ["desktop", "workstation", "tower pc"])) return ["Computer", "Desktop-PCs"];
  return ["Computer", "Computer-Zubeh\u00f6r"];
}

function classifyMobileTelephony(title) {
  const t = norm(title);
  if (containsAny(t, ["iphone", "smartphone", "galaxy", "pixel", "handy"])) return ["Mobile", "Smartphones"];
  if (containsAny(t, ["tablet", "ipad"])) return ["Mobile", "Tablets"];
  return ["Mobile", "Mobile Zubeh\u00f6r"];
}


const SKU_OVERRIDES = new Map([
  ["NWKB WW PI C6 S/FTP 00.25M 27", ["Netzwerk", "Kabel & Adapter"]],
  ["NWKB WW GB C6 S/FTP 05M 27", ["Netzwerk", "Kabel & Adapter"]],
  ["HDZ RS IB-1232CL-U3", ["Datenspeicher", "Storage"]],
  ["SCHN DE USB-C/RS-232 MT 2M", ["Peripherie", "Kabel & Adapter"]],
  ["BEL STT SOL-026-41", ["Smart Home", "Beleuchtung"]],
  ["SMA KH BD DT990 EDITION", ["Peripherie", "Audio"]],
  ["ZTOFL KY TK-8545K", ["Office & Business", "Drucker & Scanner"]],
  ["KAS IB-LAN100-C3", ["Netzwerk", "Kabel & Adapter"]],
  ["TKMDI BE AIRTAG DRAHTSCHL WHT", ["Mobile", "Mobile Zubehör"]],
  ["SEC MOB CM-GUARD CM4000", ["Smart Home", "Sicherheit"]],
  ["SMA GT MAX 173180", ["Peripherie", "Sound & Light"]],
]);

const LEGACY_CATEGORIES = new Set([
  "Computing & Software",
  "Gebäude- & Elektrotechnik",
  "Netzwerk & Server",
  "Pro AV & Multimedia",
  "Telco & UCC",
]);

function priorityTitleTarget(title) {
  const t = norm(title);

  if (containsAny(t, ["toner", "tonerkartusche", "toner cartridge"]))
    return ["Office & Business", "Drucker & Scanner"];

  if (containsAny(t, ["patchkabel", "netzwerkkabel", "ethernet cable"]))
    return ["Netzwerk", "Kabel & Adapter"];

  if (
    containsAny(t, ["rs-232", "rs232"]) &&
    containsAny(t, ["usb", "usb-c", "type-c", "adapter"])
  )
    return ["Peripherie", "Kabel & Adapter"];

  if (containsAny(t, [
    "hdd dock", "hdd-dock", "dock/klon", "hdd klon",
    "sata hdd", "hdd docking"
  ]))
    return ["Datenspeicher", "Storage"];

  if (
    containsAny(t, ["rj45", "gigabit lan"]) &&
    containsAny(t, ["usb", "usb-c", "type-c"])
  )
    return ["Netzwerk", "Kabel & Adapter"];

  if (containsAny(t, [
    "alarmeingang", "alarmmelder", "mobiler melder",
    "cm-guard", "cm4000"
  ]))
    return ["Smart Home", "Sicherheit"];

  return null;
}

function mapProduct(p) {
  const c = txt(p.category);
  const s = txt(p.subcategory);
  const title = txt(p.title);
  // 1) Exceções exatas já auditadas.
  // Se o SKU já estiver exatamente no destino do override, bloqueamos o estado
  // como final. Isto torna o script idempotente e evita repetir
  // "sku-override -> sku-override" em passagens internas sucessivas.
  const exactOverride = SKU_OVERRIDES.get(txt(p.sku));
  if (exactOverride) {
    const [overrideCategory, overrideSubcategory] = exactOverride;

    if (c === overrideCategory && s === overrideSubcategory) {
      return [c, s, "final-lock"];
    }

    return [overrideCategory, overrideSubcategory, "sku-override"];
  }

  // 2) REGRA DE ESTABILIDADE.
  // Um par já final não volta a ser reclassificado por título.
  if (FINAL_PAIRS.has(stateKey(c, s))) {
    return [c, s, "final-lock"];
  }

  // 3) Regras fortes por título só migram categorias antigas.
  if (LEGACY_CATEGORIES.has(c)) {
    const priority = priorityTitleTarget(title);
    if (priority) {
      return [priority[0], priority[1], "priority-title-legacy"];
    }
  }

  if (c === "Computer" && s === "Laptops") return ["Computer", "Laptops", "direct"];
  if (c === "Computer" && s === "Desktop-PCs") return ["Computer", "Desktop-PCs", "direct"];
  if (c === "Computer" && s === "Mini PCs") return ["Computer", "Mini-PCs", "direct"];

  if (c === "Computing & Software" && s === "Peripherie") {
    const [nc, ns] = classifyPeripheral(title); return [nc, ns, "title-rule"];
  }
  if (c === "Computing & Software" && s === "PC-Komponenten") return ["PC-Komponenten", "Komponenten", "direct"];
  if (c === "Computing & Software" && s === "PC-Kabel & -Adapter") return ["PC-Komponenten", "Kabel & Adapter", "direct"];
  if (c === "Computing & Software" && s === "Gaming") {
    const [nc, ns] = classifyGaming(title); return [nc, ns, "title-rule"];
  }
  if (c === "Computing & Software" && s === "PC, Notebooks & Tablets") {
    const [nc, ns] = classifyComputerMixed(title); return [nc, ns, "title-rule"];
  }
  if (c === "Computing & Software" && s === "Software") return ["Office & Business", "Software", "direct"];

  if (c === "Geb\u00e4ude- & Elektrotechnik" && s === "Beleuchtung") return ["Smart Home", "Beleuchtung", "direct"];
  if (c === "Geb\u00e4ude- & Elektrotechnik" && s === "Geb\u00e4udetechnik") return ["Smart Home", "Geb\u00e4udetechnik", "direct"];
  if (c === "Geb\u00e4ude- & Elektrotechnik" && s === "Energie & Stromverteilung") return ["Smart Home", "Energie & Strom", "direct"];
  if (c === "Geb\u00e4ude- & Elektrotechnik" && s === "Sicherheit") return ["Smart Home", "Sicherheit", "direct"];

  if (c === "Mobile" && s === "Smartphones") return ["Mobile", "Smartphones", "direct"];
  if (c === "Mobile" && s === "Tablets") return ["Mobile", "Tablets", "direct"];

  if (c === "Netzwerk & Server" && s === "Netzwerkkabel/-adapter") return ["Netzwerk", "Kabel & Adapter", "direct"];
  if (c === "Netzwerk & Server" && s === "Netzwerk") return ["Netzwerk", "Netzwerk", "direct"];
  if (c === "Netzwerk & Server" && s === "Sicherheit & \u00dcberwachung") return ["Smart Home", "Sicherheit & \u00dcberwachung", "direct"];
  if (c === "Netzwerk & Server" && s === "Server") return ["Netzwerk", "Server", "direct"];
  if (c === "Netzwerk & Server" && s === "IT Sicherheit") return ["Netzwerk", "IT-Sicherheit", "direct"];
  if (c === "Netzwerk & Server" && s === "Storage") return ["Datenspeicher", "Storage", "direct"];

  if (c === "Peripherie" && s === "Monitors") return ["Peripherie", "Monitore", "direct"];

  if (c === "Pro AV & Multimedia" && s === "Foto- & Videografie") return ["Peripherie", "Foto & Video", "direct"];
  if (c === "Pro AV & Multimedia" && s === "Audio") return ["Peripherie", "Audio", "direct"];
  if (c === "Pro AV & Multimedia" && s === "Kabel & Adapter") return ["Peripherie", "Kabel & Adapter", "direct"];
  if (c === "Pro AV & Multimedia" && s === "Sound & Light") return ["Peripherie", "Sound & Light", "direct"];
  if (c === "Pro AV & Multimedia" && s === "Professional AV") return ["Office & Business", "Professional AV", "direct"];
  if (c === "Pro AV & Multimedia" && s === "TV & Home Cinema") return ["Smart Home", "TV & Home Cinema", "direct"];
  if (c === "Pro AV & Multimedia" && s === "Projektion") return ["Office & Business", "Projektoren", "direct"];
  if (c === "Pro AV & Multimedia" && s === "Professional Audio") return ["Office & Business", "Professional Audio", "direct"];

  if (c === "Telco & UCC" && s === "Mobiltelefonie") {
    const [nc, ns] = classifyMobileTelephony(title); return [nc, ns, "title-rule"];
  }
  if (c === "Telco & UCC" && s === "Headsets") return ["Peripherie", "Headsets", "direct"];
  if (c === "Telco & UCC" && s === "Telefonie") return ["Office & Business", "Telefonie", "direct"];
  if (c === "Telco & UCC" && s === "Conferencing & Collaboration") return ["Office & Business", "Conferencing & Collaboration", "direct"];
  if (c === "Telco & UCC" && s === "Telefonsysteme") return ["Office & Business", "Telefonsysteme", "direct"];

  return [c || "Unsortiert", s || "Sonstiges", "unchanged"];
}

function resolveFinalCategory(product) {
  const startCategory = txt(product.category) || "Unsortiert";
  const startSubcategory = txt(product.subcategory) || "Sonstiges";
  let category = startCategory;
  let subcategory = startSubcategory;
  let transitions = 0;
  const visited = new Set([stateKey(category, subcategory)]);
  const pathTaken = [stateLabel(category, subcategory)];
  const reasons = [];

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    const [nextCategoryRaw, nextSubcategoryRaw, reasonRaw] = mapProduct({ ...product, category, subcategory });
    const nextCategory = txt(nextCategoryRaw) || "Unsortiert";
    const nextSubcategory = txt(nextSubcategoryRaw) || "Sonstiges";
    const reason = txt(reasonRaw) || "unchanged";
    const same = category === nextCategory && subcategory === nextSubcategory;

    if (same) {
      if (reason !== "unchanged") reasons.push(reason);
      const allowed = FINAL_PAIRS.has(stateKey(category, subcategory));
      if (!allowed) {
        return {
          newCategory: startCategory,
          newSubcategory: startSubcategory,
          candidateCategory: category,
          candidateSubcategory: subcategory,
          reason: `blocked:outside-final-structure${reasons.length ? ` | ${reasons.join(" -> ")}` : ""}`,
          passes: transitions,
          blocked: true,
          blockReason: "outside-final-structure",
          path: pathTaken.join(" => "),
        };
      }
      return {
        newCategory: category,
        newSubcategory: subcategory,
        candidateCategory: category,
        candidateSubcategory: subcategory,
        reason: reasons.length ? reasons.join(" -> ") : "unchanged",
        passes: transitions,
        blocked: false,
        blockReason: "",
        path: pathTaken.join(" => "),
      };
    }

    transitions++;
    reasons.push(reason);
    const nextKey = stateKey(nextCategory, nextSubcategory);
    pathTaken.push(stateLabel(nextCategory, nextSubcategory));

    if (visited.has(nextKey)) {
      return {
        newCategory: startCategory,
        newSubcategory: startSubcategory,
        candidateCategory: nextCategory,
        candidateSubcategory: nextSubcategory,
        reason: `blocked:cycle | ${reasons.join(" -> ")}`,
        passes: transitions,
        blocked: true,
        blockReason: "cycle",
        path: pathTaken.join(" => "),
      };
    }

    visited.add(nextKey);
    category = nextCategory;
    subcategory = nextSubcategory;
  }

  return {
    newCategory: startCategory,
    newSubcategory: startSubcategory,
    candidateCategory: category,
    candidateSubcategory: subcategory,
    reason: `blocked:max-passes(${MAX_PASSES})${reasons.length ? ` | ${reasons.join(" -> ")}` : ""}`,
    passes: transitions,
    blocked: true,
    blockReason: "max-passes",
    path: pathTaken.join(" => "),
  };
}

async function getAllProducts() {
  const all = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    let data = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const result = await supabase
          .from("products")
          .select("sku,title,brand,category,subcategory")
          .range(from, to);
        if (!result.error) {
          data = result.data || [];
          lastError = null;
          break;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error;
      }
      if (attempt < 4) await sleep(500 * attempt);
    }

    if (lastError) throw lastError;
    all.push(...(data || []));
    console.log(`Lidos: ${all.length}`);
    if (!data || data.length < pageSize) break;
  }

  return all;
}

async function updateCategoryWithRetry(row) {
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const { error } = await supabase
        .from("products")
        .update({
          category: row.new_category,
          subcategory: row.new_subcategory,
        })
        .eq("sku", row.sku);
      if (!error) return null;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 4) await sleep(400 * attempt);
  }
  return lastError;
}

function csvEscape(v) {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

const products = await getAllProducts();
const results = [];

for (const p of products) {
  const resolved = resolveFinalCategory(p);
  const isChanged = !resolved.blocked && (
    txt(p.category) !== resolved.newCategory ||
    txt(p.subcategory) !== resolved.newSubcategory
  );

  results.push({
    sku: p.sku,
    title: p.title,
    brand: p.brand,
    old_category: p.category,
    old_subcategory: p.subcategory,
    new_category: resolved.newCategory,
    new_subcategory: resolved.newSubcategory,
    candidate_category: resolved.candidateCategory,
    candidate_subcategory: resolved.candidateSubcategory,
    passes: resolved.passes,
    reason: resolved.reason,
    blocked: resolved.blocked ? "YES" : "NO",
    block_reason: resolved.blockReason,
    changed: isChanged ? "YES" : "NO",
    path: resolved.path,
  });
}

// O UPDATE usa .eq("sku", ...). Portanto cada SKU é tratado como unidade.
// Se o mesmo SKU tiver destinos diferentes, bloqueamos esse SKU em vez de oscilar.
const bySku = new Map();
for (const r of results) {
  const sku = txt(r.sku);
  if (!bySku.has(sku)) bySku.set(sku, []);
  bySku.get(sku).push(r);
}

let duplicateSkuCount = 0;
let duplicateRows = 0;

for (const [sku, rows] of bySku) {
  if (rows.length <= 1) continue;

  duplicateSkuCount++;
  duplicateRows += rows.length;

  const hasBlocked = rows.some((r) => r.blocked === "YES");
  const targets = new Set(
    rows
      .filter((r) => r.blocked === "NO")
      .map((r) => stateKey(r.new_category, r.new_subcategory))
  );

  if (hasBlocked || targets.size > 1) {
    const targetLabels = [...targets].map((k) => {
      const [c, s] = k.split("\u0000");
      return stateLabel(c, s);
    });

    for (const r of rows) {
      r.blocked = "YES";
      r.changed = "NO";
      r.block_reason = "duplicate-sku-conflicting-target";
      r.reason =
        `blocked:duplicate-sku-conflicting-target | targets=${targetLabels.join(" || ")}`;
    }
  }
}

let changed = 0;
let unchanged = 0;
let blocked = 0;
let errors = 0;
let applied = 0;
const distribution = new Map();
const blockReasons = new Map();

for (const r of results) {
  if (r.blocked === "YES") {
    blocked++;
    blockReasons.set(
      r.block_reason,
      (blockReasons.get(r.block_reason) || 0) + 1
    );
  } else if (r.changed === "YES") {
    changed++;
  } else {
    unchanged++;
  }

  const finalCategory =
    r.blocked === "YES"
      ? (txt(r.old_category) || "Unsortiert")
      : r.new_category;

  const finalSubcategory =
    r.blocked === "YES"
      ? (txt(r.old_subcategory) || "Sonstiges")
      : r.new_subcategory;

  const key = stateKey(finalCategory, finalSubcategory);
  distribution.set(key, (distribution.get(key) || 0) + 1);
}

// Uma única atualização por SKU.
const updateBySku = new Map();
for (const r of results) {
  if (r.changed !== "YES" || r.blocked !== "NO") continue;
  const sku = txt(r.sku);
  if (!updateBySku.has(sku)) updateBySku.set(sku, r);
}

console.log("");
console.log("========== IUMATEC CATEGORY REORGANIZATION - FIXED POINT ==========");
console.log(`Produtos/linhas analisados: ${products.length}`);
console.log(`SKUs unicos: ${bySku.size}`);
console.log(`SKUs duplicados: ${duplicateSkuCount} | Linhas desses SKUs: ${duplicateRows}`);
console.log(`Linhas a alterar: ${changed}`);
console.log(`SKUs a atualizar: ${updateBySku.size}`);
console.log(`Sem alteracao: ${unchanged}`);
console.log(`Bloqueados: ${blocked}`);
console.log(`Max passagens internas: ${MAX_PASSES}`);
console.log(`Modo: ${APPLY ? "APPLY" : "DRY RUN"}`);
console.log("");

if (blocked > 0) {
  console.log("BLOQUEIOS:");
  for (const [reason, count] of [...blockReasons.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(count).padStart(6)} | ${reason}`);
  }
  console.log("");
}

console.log("NOVA DISTRIBUICAO FINAL:");
console.log("");
const sortedDistribution = [...distribution.entries()]
  .map(([key, count]) => {
    const [category, subcategory] = key.split("\u0000");
    return { category, subcategory, count };
  })
  .sort((a, b) => a.category.localeCompare(b.category) || b.count - a.count);

for (const r of sortedDistribution) {
  console.log(`${String(r.count).padStart(6)} | ${r.category} > ${r.subcategory}`);
}

if (APPLY) {
  console.log("");
  console.log("A atualizar SOMENTE category + subcategory...");

  if (blocked > 0) {
    console.log(
      `ATENCAO: ${blocked} linha(s) bloqueada(s) NAO serao alteradas.`
    );
  }

  const toUpdate = [...updateBySku.values()];

  for (let i = 0; i < toUpdate.length; i++) {
    const r = toUpdate[i];
    const error = await updateCategoryWithRetry(r);

    if (error) {
      errors++;
      console.error(`ERRO ${r.sku}: ${error?.message || String(error)}`);
    } else {
      applied++;
    }

    if ((i + 1) % 250 === 0 || i + 1 === toUpdate.length) {
      console.log(
        `SKUs processados ${i + 1}/${toUpdate.length} | OK ${applied} | Erros ${errors}`
      );
    }
  }
}

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const csvPath = path.join(
  OUT,
  `category-reorganization-fixed-${APPLY ? "apply" : "dry-run"}-${stamp}.csv`
);

const headers = [
  "sku", "title", "brand", "old_category", "old_subcategory",
  "new_category", "new_subcategory", "candidate_category",
  "candidate_subcategory", "passes", "reason", "blocked",
  "block_reason", "changed", "path"
];

const csv = [
  headers.join(","),
  ...results.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
].join("\n");

fs.writeFileSync(csvPath, csv, "utf8");

console.log("");
console.log("===============================================================");
console.log(`Linhas com alteracao prevista: ${changed}`);
console.log(`SKUs com alteracao prevista: ${updateBySku.size}`);
console.log(`Linhas bloqueadas: ${blocked}`);
console.log(`SKUs aplicados: ${applied}`);
console.log(`Erros APPLY: ${errors}`);
console.log(`Relatorio: ${csvPath}`);

if (!APPLY) {
  console.log("");
  console.log("DRY RUN concluido. NENHUM produto foi alterado.");
  console.log("O CSV ja mostra a categoria FINAL apos todas as passagens internas.");
  console.log("");
  console.log("Se Bloqueados = 0 e o resultado estiver correto, executar:");
  console.log("node .\\scripts\\reorganize-supabase-categories.mjs --apply");
} else {
  console.log("");
  console.log("APPLY concluido.");
  console.log("Somente category/subcategory foram atualizados.");
  console.log("Preco, stock, imagens e restantes campos NAO foram alterados.");
  console.log("");
  console.log("Agora execute um DRY RUN. O objetivo e:");
  console.log("SKUs com alteracao prevista: 0 | Linhas bloqueadas: 0 | Erros APPLY: 0");
}
