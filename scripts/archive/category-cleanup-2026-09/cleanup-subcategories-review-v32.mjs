import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(".env.local"), override: false });
dotenv.config({ path: path.resolve(".env"), override: false });

const APPLY = process.argv.includes("--apply");
const CONFIRM = String(
  process.argv.find((x) => x.startsWith("--confirm="))?.split("=")[1] || ""
).toUpperCase();

if (APPLY && CONFIRM !== "IUMATEC-REVIEW-V32") {
  throw new Error(
    "APPLY bloqueado. Use: --apply --confirm=IUMATEC-REVIEW-V32"
  );
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Supabase URL/key nao encontrados em .env.local/.env.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const OUT = path.resolve("integrations", "alltron", "out");
fs.mkdirSync(OUT, { recursive: true });

function txt(v) {
  return String(v ?? "").trim();
}

function norm(v) {
  return txt(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[™®©]/g, " ")
    .replace(/[_/\\|()[\]{}:,;+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function any(t, terms) {
  return terms.some((term) => t.includes(term));
}

function esc(v) {
  return `"${String(v ?? "").replaceAll('"', '""')}"`;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') quoted = true;
      else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
  }

  out.push(cur);
  return out;
}

function readCsv(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const vals = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = vals[i] ?? "";
    });
    return row;
  });
}

function move(row, cat, sub, reason) {
  if (txt(row.old_category) === cat && txt(row.old_subcategory) === sub) {
    return null;
  }

  return {
    status: "CHANGE",
    new_category: cat,
    new_subcategory: sub,
    reason,
    confidence: "HIGH",
  };
}

function keep(row, reason) {
  return {
    status: "KEEP",
    new_category: txt(row.old_category),
    new_subcategory: txt(row.old_subcategory),
    reason,
    confidence: "HIGH",
  };
}

/* =========================================================
   SAFER RULES
   ========================================================= */

// Tablet accessories MUST be evaluated before tablet-device rules.
const TABLET_ACCESSORY = [
  "magic keyboard folio",
  "smart keyboard folio",
  "smart folio",
  "keyboard folio",
  "folio for ipad",
  "folio fur ipad",
  "folio ipad",
  "ipad case",
  "ipad cover",
  "ipad hulle",
  "ipad huelle",
  "ipad hülle",
  "ipad sleeve",
  "ipad tasche",
  "ipad stand",
  "ipad halter",
  "ipad halterung",
  "ipad holder",
  "ipad dock",
  "ipad adapter",
  "ipad keyboard",
  "tablet holder",
  "tablet halter",
  "tablethalter",
  "tablet stand",
  "tabletstander",
  "tablet stander",
  "tablet mount",
  "tablet case",
  "tablet cover",
  "tablet sleeve",
  "tablet tasche",
  "surface pro filter",
  "surface filter",
  "2way surface",
  "2-way surface",
  "4way surface",
  "4-way surface",
  "filter for surface pro",
  "filter fur surface pro",
  "filter für surface pro",
  "surface pro side-mounted",
  "surface pro side mounted",
  "surface pro magnetic",
  "ipad pro magnetic",
  "ipad pro landscape",
  "ipad pro 11 magnetic",
  "ipad pro 13 magnetic",
];

const TABLET_DEVICE = [
  "apple ipad ",
  "ipad mini",
  "ipad air",
  "ipad pro ",
  "samsung galaxy tab",
  "samsung tab ",
  "galaxy tab ",
  "lenovo tab ",
  "xiaomi pad ",
  "redmi pad ",
  "matepad ",
];

const COMPUTER_ACCESSORY = [
  "notebooktasche",
  "laptoptasche",
  "laptop tasche",
  "notebook tasche",
  "topload",
  "top load",
  "rolling tote",
  "rolling case",
  "roller ",
  "backpack",
  "rucksack",
  "sleeve",
  "briefcase",
  "guardit",
  "dicota secret",
  "dicota eco multi",
  "dicota multi roller",
  "clicksafe",
  "security slot",
  "kensington lock",
  "cable lock",
  "notebook lock",
  "laptop lock",
  "touchpad",
  "rear expansion slot",
  "akku ",
  "battery ",
  "batteries ",
  "ac-adapter",
  "ac adapter",
  "netzteil",
  "power adapter",
];

const DOCK = [
  "dockingstation",
  "docking station",
  "usb-c dock",
  "usb c dock",
  "thunderbolt dock",
  "mini-dock",
  "mini dock",
  "travel hub",
  "usb-c travel hub",
  "usb c travel hub",
  "multiport dock",
  "multi port dock",
];

const KEYBOARD = [
  "keyboard",
  "tastatur",
  "usb-c kb",
  "usb c kb",
];

const MINI_PC = [
  "mac mini",
  "mini pc",
  "mini-pc",
  "minipc",
  "intel nuc",
  "nuc ",
  " nuc",
  "elitedesk mini",
  "prodesk mini",
  "optiplex micro",
  "tiny pc",
  "micro pc",
  "shuttle mini",
  "mini-system",
  "mini system",
];

const DESKTOP_PC = [
  "gaming pc",
  "desktop pc",
  "desktop-pc",
  "tower pc",
  "tower-pc",
  "workstation",
  "captiva pc",
  "joule performance gaming pc",
  "all-in-one pc",
  "all in one pc",
];

const LAPTOP_DEVICE = [
  "notebook",
  "laptop",
  "macbook",
  "omnibook",
  "thinkpad",
  "elitebook",
  "probook",
  "zbook",
  "latitude",
  "vivobook",
  "zenbook",
  "ideapad",
  "chromebook",
  "pavilion",
  "travelmate",
  "expertbook",
  "surface laptop",
  "legion ",
  "hp 250",
  "hp 255",
  "hp omen",
  "omen ",
  "erazer deputy",
  "medion signium",
  "proart ",
  "zbook ",
];

const PHONE_ACCESSORY = [
  "case",
  "cover",
  "hulle",
  "huelle",
  "schutzglas",
  "panzerglas",
  "screen protector",
  "schutzfolie",
  "magsafe",
  "handykette",
  "phone strap",
  "halterung",
  "holder",
  "mount",
  "charger",
  "ladegerat",
  "ladegeraet",
  "ladekabel",
  "powerbank",
  "wallet",
  "backcover",
  "back cover",
  "thin case",
  "protective",
  "styleshell",
  "style shell",
  "bumper",
];

const PHONE_DEVICE = [
  "smartphone",
  "iphone ",
  "galaxy s",
  "galaxy a",
  "galaxy z",
  "galaxy xcover",
  "google pixel",
  "pixel 8",
  "pixel 9",
  "redmi note",
  "xiaomi ",
  "oneplus",
  "nothing phone",
  "fairphone",
  "motorola",
  "moto g",
  "moto edge",
  "nokia",
  "honor ",
  "oppo ",
  "realme",
  "doro ",
  "emporia",
  "crosscall",
  "hmd ",
  "sony xperia",
  "xperia ",
];

const SMART_HOME_BUILDING = [
  "raumthermostat",
  "thermostat",
  "smart thermostat",
  "smart lock",
  "turschloss",
  "rollladen",
  "jalousie",
  "aktor",
  "actuator",
  "relais",
  "relay",
];

const SMART_HOME_ENERGY = [
  "energie meter",
  "energy meter",
  "energiemesser",
  "strommesser",
  "power meter",
  "stromwandler",
  "current transformer",
  "victron energy",
  "smart plug",
  "steckdose",
  "wechselrichter",
  "inverter",
  "power station",
];

const SMART_HOME_SECURITY = [
  "video doorbell",
  "videoturklingel",
  "doorbell",
  "security camera",
  "uberwachungskamera",
  "ip kamera",
  "ip camera",
  "alarmanlage",
  "alarm system",
];

const FOTO_VIDEO = [
  "gimbal",
  "smartphone gimbal",
  "isteady",
  "stabilizer",
  "stabilisator",
  "camera backpack",
  "kamerarucksack",
  "camera bag",
  "fototasche",
  "photo bag",
];


function isPrivacyFilter(t) {
  return any(t, [
    "privacy filter",
    "blickschutz",
    "screen pf",
    "bright screen pf",
    "pf 2way",
    "pf 2-way",
    "pf 4way",
    "pf 4-way",
    "secret 2-way",
    "secret 4-way",
    "filter 2-way",
    "filter 4-way",
  ]);
}

function hasTabletContext(t) {
  return any(t, [
    "ipad",
    "tablet",
    "galaxy tab",
    "lenovo tab",
    "surface pro",
    "surface go",
    "surface book",
    "matepad",
    "xiaomi pad",
    "redmi pad",
  ]);
}

function displayInches(title) {
  const raw = txt(title).toLowerCase().replace(",", ".");
  const matches = [
    ...raw.matchAll(/(\d{2}(?:\.\d+)?)\s*(?:\"|zoll|inch)/g),
  ];

  if (!matches.length) return null;

  const nums = matches
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n));

  return nums.length ? Math.max(...nums) : null;
}

function classify(row) {
  const t = norm(row.title);
  const oldCat = txt(row.old_category);
  const oldSub = txt(row.old_subcategory);

  if (oldCat === "Computer" && oldSub === "Laptops") {
    // Privacy filters need their own routing BEFORE tablet-device keywords.
    // Tablet/Surface/iPad filters -> Mobile Zubehör.
    // Large universal monitor filters -> Peripherie > Zubehör.
    // Laptop-sized filters -> Computer-Zubehör.
    if (isPrivacyFilter(t)) {
      if (hasTabletContext(t)) {
        return move(
          row,
          "Mobile",
          "Mobile Zubehör",
          "v32:tablet-privacy-accessory"
        );
      }

      const inches = displayInches(row.title);

      if ((inches !== null && inches >= 19) || t.includes("universal")) {
        return move(
          row,
          "Peripherie",
          "Zubehör",
          "v32:monitor-privacy-accessory"
        );
      }

      return move(
        row,
        "Computer",
        "Computer-Zubehör",
        "v32:laptop-privacy-accessory"
      );
    }

    // 1) Strong accessories first.
    if (any(t, TABLET_ACCESSORY)) {
      return move(row, "Mobile", "Mobile Zubehör", "v32:tablet-accessory");
    }

    if (any(t, DOCK)) {
      return move(row, "Peripherie", "Dockingstationen", "v32:dockingstation");
    }

    if (any(t, KEYBOARD)) {
      return move(row, "Peripherie", "Tastaturen", "v32:keyboard");
    }

    if (any(t, COMPUTER_ACCESSORY)) {
      return move(row, "Computer", "Computer-Zubehör", "v32:computer-accessory");
    }

    // 2) Actual device classes.
    if (any(t, TABLET_DEVICE)) {
      return move(row, "Mobile", "Tablets", "v32:tablet-device");
    }

    if (any(t, MINI_PC)) {
      return move(row, "Computer", "Mini-PCs", "v32:mini-pc");
    }

    if (any(t, DESKTOP_PC)) {
      return move(row, "Computer", "Desktop-PCs", "v32:desktop-pc");
    }

    if (any(t, LAPTOP_DEVICE)) {
      return keep(row, "v32:true-laptop");
    }
  }

  if (oldCat === "Mobile") {
    if (any(t, PHONE_ACCESSORY) || any(t, TABLET_ACCESSORY)) {
      return move(row, "Mobile", "Mobile Zubehör", "v32:mobile-accessory");
    }

    if (any(t, SMART_HOME_BUILDING)) {
      return move(row, "Smart Home", "Gebäudetechnik", "v32:smart-home-building");
    }

    if (any(t, SMART_HOME_ENERGY)) {
      return move(row, "Smart Home", "Energie & Strom", "v32:smart-home-energy");
    }

    if (any(t, SMART_HOME_SECURITY)) {
      return move(
        row,
        "Smart Home",
        "Sicherheit & Überwachung",
        "v32:smart-home-security"
      );
    }

    if (any(t, FOTO_VIDEO)) {
      return move(row, "Peripherie", "Foto & Video", "v32:foto-video");
    }

    if (any(t, TABLET_DEVICE)) {
      if (oldSub === "Tablets") return keep(row, "v32:true-tablet");
      return move(row, "Mobile", "Tablets", "v32:tablet-device");
    }

    if (any(t, PHONE_DEVICE)) {
      if (oldSub === "Smartphones") return keep(row, "v32:true-phone");
      return move(row, "Mobile", "Smartphones", "v32:phone-device");
    }

    if (any(t, LAPTOP_DEVICE)) {
      return move(row, "Computer", "Laptops", "v32:laptop-device");
    }
  }

  return null;
}

/* =========================================================
   Read latest V2 dry-run REVIEW set.
   ========================================================= */

const latestV2 = fs
  .readdirSync(OUT)
  .filter((name) => /^subcategory-sanity-v2-dry-run-.*\.csv$/i.test(name))
  .map((name) => ({
    name,
    full: path.join(OUT, name),
    mtime: fs.statSync(path.join(OUT, name)).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime)[0];

if (!latestV2) {
  throw new Error("Nenhum DRY RUN V2 encontrado.");
}

const rows = readCsv(latestV2.full).filter(
  (row) => txt(row.status).toUpperCase() === "REVIEW"
);

const changes = [];
const keeps = [];
const unresolved = [];

for (const row of rows) {
  const result = classify(row);

  if (!result) {
    unresolved.push(row);
    continue;
  }

  const outRow = {
    sku: txt(row.sku),
    title: txt(row.title),
    brand: txt(row.brand),
    old_category: txt(row.old_category),
    old_subcategory: txt(row.old_subcategory),
    new_category: result.new_category,
    new_subcategory: result.new_subcategory,
    reason: result.reason,
    confidence: result.confidence,
    status: result.status,
    blocked: "NO",
    block_reason: "",
  };

  if (result.status === "CHANGE") changes.push(outRow);
  else keeps.push(outRow);
}

// Conflict safety.
const bySku = new Map();

for (const row of changes) {
  if (!bySku.has(row.sku)) bySku.set(row.sku, []);
  bySku.get(row.sku).push(row);
}

for (const skuRows of bySku.values()) {
  const targets = new Set(
    skuRows.map((r) => `${r.new_category}|${r.new_subcategory}`)
  );

  if (targets.size > 1) {
    for (const row of skuRows) {
      row.status = "BLOCKED";
      row.blocked = "YES";
      row.block_reason = "same-sku-conflicting-targets";
    }
  }
}

const safe = changes.filter(
  (r) => r.status === "CHANGE" && r.blocked === "NO"
);

const blocked = changes.filter((r) => r.blocked === "YES");

const unique = new Map();

for (const row of safe) {
  if (!unique.has(row.sku)) unique.set(row.sku, row);
}

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const mode = APPLY ? "apply" : "dry-run";

const report = path.join(
  OUT,
  `subcategory-review-v32-${mode}-${stamp}.csv`
);

const unresolvedReport = path.join(
  OUT,
  `subcategory-review-v32-unresolved-${stamp}.csv`
);

const headers = [
  "sku","title","brand","old_category","old_subcategory",
  "new_category","new_subcategory","reason","confidence",
  "status","blocked","block_reason"
];

fs.writeFileSync(
  report,
  [
    headers.join(","),
    ...[...changes, ...keeps].map((row) =>
      headers.map((h) => esc(row[h])).join(",")
    ),
  ].join("\n"),
  "utf8"
);

const unresolvedHeaders = [
  "sku","title","brand","old_category","old_subcategory","reason"
];

fs.writeFileSync(
  unresolvedReport,
  [
    unresolvedHeaders.join(","),
    ...unresolved.map((row) =>
      unresolvedHeaders.map((h) => esc(row[h])).join(",")
    ),
  ].join("\n"),
  "utf8"
);

const transitions = new Map();

for (const row of safe) {
  const label =
    `${row.old_category} > ${row.old_subcategory}` +
    ` => ${row.new_category} > ${row.new_subcategory}` +
    ` [${row.reason}]`;

  transitions.set(label, (transitions.get(label) || 0) + 1);
}

console.log("");
console.log("========== IUMATEC REVIEW CLEANUP V3.2 ==========");
console.log(`Fonte: ${path.basename(latestV2.full)}`);
console.log(`REVIEW recebidos da V2: ${rows.length}`);
console.log(`Mudancas V3.2 seguras: ${safe.length}`);
console.log(`SKUs unicos a atualizar: ${unique.size}`);
console.log(`KEEP: ${keeps.length}`);
console.log(`Unresolved: ${unresolved.length}`);
console.log(`Bloqueados: ${blocked.length}`);
console.log(`Modo: ${APPLY ? "APPLY" : "DRY RUN"}`);

console.log("");
console.log("TOP TRANSICOES V3.2:");

for (const [label, count] of [...transitions.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 40)) {
  console.log(`${String(count).padStart(6)} | ${label}`);
}

console.log("");
console.log("AMOSTRA V3.2:");

for (const row of safe.slice(0, 50)) {
  console.log(
    `${row.sku} | ${row.title}\n` +
    `  ${row.old_category} > ${row.old_subcategory}` +
    ` => ${row.new_category} > ${row.new_subcategory}` +
    ` [${row.reason}]`
  );
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateRow(row) {
  let last = null;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await supabase
        .from("products")
        .update({
          category: row.new_category,
          subcategory: row.new_subcategory,
        })
        .eq("sku", row.sku);

      if (!res.error) return null;
      last = res.error;
    } catch (e) {
      last = e;
    }

    if (attempt < 4) await sleep(400 * attempt);
  }

  return last;
}

let applied = 0;
let errors = 0;

if (APPLY) {
  console.log("");
  console.log("A atualizar SOMENTE category + subcategory...");

  const list = [...unique.values()];

  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const error = await updateRow(row);

    if (error) {
      errors++;
      console.error(`ERRO ${row.sku}: ${error?.message || String(error)}`);
    } else {
      applied++;
    }

    if ((i + 1) % 200 === 0 || i + 1 === list.length) {
      console.log(
        `SKUs ${i + 1}/${list.length} | OK ${applied} | Erros ${errors}`
      );
    }
  }
}

console.log("");
console.log("=================================================");
console.log(`Mudancas V3.2 seguras: ${safe.length}`);
console.log(`SKUs unicos a atualizar: ${unique.size}`);
console.log(`KEEP: ${keeps.length}`);
console.log(`Unresolved: ${unresolved.length}`);
console.log(`Bloqueados: ${blocked.length}`);
console.log(`SKUs aplicados: ${applied}`);
console.log(`Erros APPLY: ${errors}`);
console.log(`Relatorio: ${report}`);
console.log(`Unresolved CSV: ${unresolvedReport}`);

if (!APPLY) {
  console.log("");
  console.log("DRY RUN V3.2 concluido. NENHUM produto foi alterado.");
  console.log("IMPORTANTE: reveja a amostra antes de APPLY.");
  console.log("");
  console.log("APPLY apenas depois de aprovado:");
  console.log(
    "node .\\scripts\\cleanup-subcategories-review-v32.mjs " +
    "--apply --confirm=IUMATEC-REVIEW-V32"
  );
} else {
  console.log("");
  console.log("APPLY V3.2 concluido.");
  console.log("Somente category/subcategory foram alterados.");
  console.log("Preco, stock, imagens e restantes campos NAO foram alterados.");
}
