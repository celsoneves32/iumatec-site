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

if (APPLY && CONFIRM !== "IUMATEC-SANITY-V21") {
  throw new Error(
    "APPLY bloqueado. Use: --apply --confirm=IUMATEC-SANITY-V21"
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
  throw new Error("Supabase URL/key nao encontrados.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const OUT = path.resolve("integrations", "alltron", "out");
fs.mkdirSync(OUT, { recursive: true });

const FINAL = {
  Computer: new Set(["Laptops", "Desktop-PCs", "Mini-PCs", "Computer-Zubehör"]),
  "PC-Komponenten": new Set(["Komponenten", "Kabel & Adapter", "Gaming-Komponenten"]),
  Peripherie: new Set([
    "Zubehör",
    "Foto & Video",
    "Audio",
    "Kabel & Adapter",
    "Sound & Light",
    "Monitore",
    "Headsets",
    "Mäuse",
    "Gaming-Zubehör",
    "Tastaturen",
    "Webcams",
    "Dockingstationen",
  ]),
  Netzwerk: new Set(["Kabel & Adapter", "Netzwerk", "Server", "IT-Sicherheit"]),
  Mobile: new Set(["Smartphones", "Tablets", "Mobile Zubehör"]),
  "Office & Business": new Set([
    "Professional AV",
    "Projektoren",
    "Software",
    "Drucker & Scanner",
    "Telefonie",
    "Conferencing & Collaboration",
    "Professional Audio",
    "Telefonsysteme",
  ]),
  Datenspeicher: new Set(["Storage"]),
  "Smart Home": new Set([
    "Beleuchtung",
    "Gebäudetechnik",
    "Energie & Strom",
    "Sicherheit & Überwachung",
    "TV & Home Cinema",
    "Sicherheit",
  ]),
};

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
  return terms.some((x) => t.includes(x));
}

function same(p, cat, sub) {
  return txt(p.category) === cat && txt(p.subcategory) === sub;
}

function move(p, cat, sub, reason) {
  if (same(p, cat, sub)) return null;
  return {
    status: "CHANGE",
    newCategory: cat,
    newSubcategory: sub,
    reason,
    confidence: "HIGH",
  };
}

function review(reason) {
  return {
    status: "REVIEW",
    newCategory: "",
    newSubcategory: "",
    reason,
    confidence: "REVIEW",
  };
}

/* =========================================================
   MOBILE
   ========================================================= */

const MOBILE_ACCESSORY = [
  "case","cover","hulle","huelle","schutz","schutzglas","panzerglas",
  "tempered glass","screen protector","displayfolie","schutzfolie","folie",
  "bumper","flip cover","book cover","sleeve","tasche","pouch","magsafe",
  "handykette","phone strap","strap","lanyard","halterung","holder","mount",
  "autohalterung","car holder","stand","stativ","ladestation","charging station",
  "ladegerat","ladegeraet","charger","charging","ladekabel","powerbank",
  "battery pack","wallet","kartenhalter","card holder","stylus","eingabestift",
  "airpods","earbuds","kopfhorer","headphone","sim adapter","reparatur",
  "ersatzteil","replacement","display assembly","screen replacement",
  "back cover","protective","popgrip","ring holder","handyband"
];

// Important: these terms protect tablet/iPad/Surface accessories from being
// reclassified back into "Tablets" merely because the title contains iPad,
// Tablet, Surface Pro, Galaxy Tab, etc.
const MOBILE_TABLET_ACCESSORY = [
  "folio",
  "magic keyboard folio",
  "smart keyboard folio",
  "smart folio",
  "keyboard folio",
  "rugged folio",
  "tablet folio",
  "ipad folio",
  "ipad case",
  "ipad cover",
  "ipad hülle",
  "ipad hulle",
  "ipad huelle",
  "ipad sleeve",
  "ipad tasche",
  "ipad keyboard",
  "ipad stand",
  "ipad halter",
  "ipad halterung",
  "ipad holder",
  "ipad dock",
  "ipad adapter",
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
  "ipad pro landscape"
];

const MOBILE_CABLE = [
  "kabel","cable","adapter","converter","konverter","usb-c auf","usb c auf",
  "lightning auf"
];

const TABLET_DEVICE = [
  "tablet","ipad","galaxy tab","surface go","surface pro","lenovo tab",
  "xiaomi pad","redmi pad","matepad"
];

const PHONE_DEVICE = [
  "smartphone","iphone","galaxy s","galaxy a","galaxy z","galaxy xcover",
  "pixel ","google pixel","redmi note","redmi ","xiaomi ","oneplus",
  "nothing phone","fairphone","motorola","moto g","moto edge","nokia",
  "honor ","oppo ","realme","doro ","emporia","crosscall","gigaset",
  "hmd ","cat phone","rugged phone","mobiltelefon","mobile phone",
  "asus rog phone","zenfone","sony xperia","xperia ","huawei p","huawei mate"
];

function classifyMobile(p) {
  if (txt(p.category) !== "Mobile") return null;
  const t = norm(p.title);

  if (any(t, MOBILE_ACCESSORY) || any(t, MOBILE_TABLET_ACCESSORY)) {
    return move(p, "Mobile", "Mobile Zubehör", "mobile:accessory");
  }

  if (any(t, MOBILE_CABLE) && !any(t, ["smartphone","tablet"])) {
    return move(p, "Mobile", "Mobile Zubehör", "mobile:cable-adapter");
  }

  if (any(t, TABLET_DEVICE)) {
    return move(p, "Mobile", "Tablets", "mobile:tablet-device");
  }

  if (any(t, PHONE_DEVICE)) {
    return move(p, "Mobile", "Smartphones", "mobile:phone-device");
  }

  if (txt(p.subcategory) === "Smartphones") {
    return review("mobile:unknown-inside-smartphones");
  }

  if (txt(p.subcategory) === "Tablets") {
    return review("mobile:unknown-inside-tablets");
  }

  return null;
}

/* =========================================================
   COMPUTER
   ========================================================= */

const COMPUTER_ACCESSORY = [
  "sleeve","notebooktasche","laptoptasche","tasche","rucksack","backpack",
  "case","cover","dock","dockingstation","docking station","stand","stander",
  "halterung","holder","ladegerat","ladegeraet","charger","netzteil",
  "power adapter","privacy filter","screen protector","schutzfolie",
  "keyboard cover","notebook kuhler","laptop kuhler","cooling pad",
  "kabel","cable","adapter","converter","konverter","hub"
];

const LAPTOP_DEVICE = [
  "notebook","laptop","macbook","thinkpad","elitebook","probook","latitude",
  "vivobook","zenbook","ideapad","chromebook","pavilion","travelmate",
  "expertbook","surface laptop","legion "
];

const MINI_PC_DEVICE = [
  "mini pc","mini-pc","minipc","intel nuc","nuc ","tiny pc","micro pc"
];

const DESKTOP_DEVICE = [
  "desktop pc","desktop-pc","desktop computer","workstation","tower pc",
  "tower-pc","all-in-one pc","all in one pc","gaming pc"
];

function classifyComputer(p) {
  if (txt(p.category) !== "Computer") return null;
  const t = norm(p.title);

  if (any(t, COMPUTER_ACCESSORY)) {
    return move(p, "Computer", "Computer-Zubehör", "computer:accessory");
  }

  if (any(t, MINI_PC_DEVICE)) {
    return move(p, "Computer", "Mini-PCs", "computer:mini-pc");
  }

  if (any(t, DESKTOP_DEVICE)) {
    return move(p, "Computer", "Desktop-PCs", "computer:desktop");
  }

  if (any(t, LAPTOP_DEVICE)) {
    return move(p, "Computer", "Laptops", "computer:laptop");
  }

  if (txt(p.subcategory) === "Laptops") {
    return review("computer:unknown-inside-laptops");
  }

  return null;
}

/* =========================================================
   PC-KOMPONENTEN
   ========================================================= */

const PC_CABLE = [
  "sata kabel","sata cable","pcie kabel","pcie cable","stromkabel",
  "power cable","verlangerungskabel","extension cable","adapterkabel",
  "adapter cable","molex adapter","sata adapter","pcie adapter",
  "riser cable","risercable"
];

function classifyPc(p) {
  if (txt(p.category) !== "PC-Komponenten") return null;
  const t = norm(p.title);

  if (any(t, PC_CABLE)) {
    return move(p, "PC-Komponenten", "Kabel & Adapter", "pc:cable-adapter");
  }

  return null;
}

/* =========================================================
   PERIPHERIE
   ========================================================= */

const PERIPHERIE_CABLE = [
  "hdmi kabel","hdmi cable","displayport kabel","displayport cable",
  "dvi kabel","dvi cable","vga kabel","vga cable","usb kabel","usb cable",
  "audio kabel","audio cable","adapterkabel","adapter cable",
  "displayport adapter","hdmi adapter","dvi adapter","vga adapter"
];

const MONITOR_ACCESSORY = [
  "monitorarm","monitor arm","monitorhalter","monitor halter","monitor stand",
  "monitorstander","monitor stander","wandhalter","wall mount","desk mount",
  "halterung","bracket","vesa","privacy filter","blickschutz",
  "screen protector","schutzfolie"
];

const KEYBOARD_ACCESSORY = [
  "keycap","keycaps","tastenkappen","handballenauflage","wrist rest",
  "keyboard cover","tastatur cover","switch set"
];

const MOUSE_ACCESSORY = [
  "mousepad","mouse pad","mauspad","mausmatte","mouse mat","grip tape",
  "mouse grip","mouse skates","mouse feet","mausgleiter","bungee"
];

const HEADSET_ACCESSORY = [
  "ohrpolster","earpad","ear pad","ear cushion","headset stand",
  "headset halter","kopfhorerstander","kopfhorer stand"
];

function classifyPeripherie(p) {
  if (txt(p.category) !== "Peripherie") return null;
  const t = norm(p.title);
  const s = txt(p.subcategory);

  if (any(t, PERIPHERIE_CABLE)) {
    return move(p, "Peripherie", "Kabel & Adapter", "peripherie:cable-adapter");
  }

  if (s === "Monitore" && any(t, MONITOR_ACCESSORY)) {
    return move(p, "Peripherie", "Zubehör", "peripherie:monitor-accessory");
  }

  if (s === "Tastaturen" && any(t, KEYBOARD_ACCESSORY)) {
    return move(p, "Peripherie", "Zubehör", "peripherie:keyboard-accessory");
  }

  if (s === "Mäuse" && any(t, MOUSE_ACCESSORY)) {
    return move(p, "Peripherie", "Zubehör", "peripherie:mouse-accessory");
  }

  if (s === "Headsets" && any(t, HEADSET_ACCESSORY)) {
    return move(p, "Peripherie", "Zubehör", "peripherie:headset-accessory");
  }

  if (any(t, ["dockingstation","docking station","dock station","usb dock"])) {
    return move(p, "Peripherie", "Dockingstationen", "peripherie:dock");
  }

  if (any(t, ["webcam ","web camera","conference camera"]) &&
      !any(t, ["halterung","mount","cover","abdeckung"])) {
    return move(p, "Peripherie", "Webcams", "peripherie:webcam");
  }

  return null;
}

/* =========================================================
   NETZWERK
   ========================================================= */

const NETWORK_CABLE = [
  "patchkabel","patch cable","netzwerkkabel","network cable","ethernet cable",
  "ethernet kabel","lan kabel","lan cable","rj45 kabel","rj45 cable",
  "usb lan adapter","usb-lan-adapter","usb ethernet adapter","usb-c ethernet",
  "usb c ethernet","usb rj45","usb-c rj45","usb c rj45","lan adapter",
  "ethernet adapter"
];

function classifyNetwork(p) {
  if (txt(p.category) !== "Netzwerk") return null;
  if (txt(p.subcategory) === "Kabel & Adapter") return null;
  const t = norm(p.title);

  if (any(t, NETWORK_CABLE)) {
    return move(p, "Netzwerk", "Kabel & Adapter", "network:cable-adapter");
  }

  if (any(t, ["firewall appliance","security gateway","utm appliance"])) {
    return move(p, "Netzwerk", "IT-Sicherheit", "network:security-appliance");
  }

  return null;
}

/* =========================================================
   OFFICE & BUSINESS
   ========================================================= */

function classifyOffice(p) {
  if (txt(p.category) !== "Office & Business") return null;
  const t = norm(p.title);

  if (any(t, [
    "software","lizenz","license","licence","subscription","abonnement",
    "microsoft 365","office 365","windows server","antivirus"
  ])) {
    return move(p, "Office & Business", "Software", "office:software");
  }

  if (any(t, [
    "projektor","projector","beamer"
  ])) {
    return move(p, "Office & Business", "Projektoren", "office:projector");
  }

  if (any(t, [
    "conference","konferenz","videokonferenz","video conference",
    "conference bar","meeting room","teams room","zoom room"
  ])) {
    return move(
      p,
      "Office & Business",
      "Conferencing & Collaboration",
      "office:conference"
    );
  }

  if (any(t, [
    "telefonanlage","phone system","pbx","sip server","telephone system"
  ])) {
    return move(p, "Office & Business", "Telefonsysteme", "office:phone-system");
  }

  if (any(t, [
    "dect telefon","dect phone","ip telefon","ip phone","telefon ","telephone ",
    "business phone","schnurlostelefon"
  ])) {
    return move(p, "Office & Business", "Telefonie", "office:telephony");
  }

  if (any(t, [
    "mikrofon","microphone","audio interface","mischpult","mixer ",
    "studio monitor","pa speaker","professional audio"
  ])) {
    return move(
      p,
      "Office & Business",
      "Professional Audio",
      "office:professional-audio"
    );
  }

  if (any(t, [
    "digital signage","videowall","video wall","professional display",
    "signage display","av extender","av matrix"
  ])) {
    return move(
      p,
      "Office & Business",
      "Professional AV",
      "office:professional-av"
    );
  }

  if (any(t, [
    "drucker","printer","scanner","multifunktionsdrucker","multifunction printer",
    "plotter","toner","tinte","ink cartridge","druckerpatrone","trommel","drum unit"
  ])) {
    return move(
      p,
      "Office & Business",
      "Drucker & Scanner",
      "office:printer-scanner"
    );
  }

  return null;
}

/* =========================================================
   SMART HOME
   ========================================================= */

function classifySmartHome(p) {
  if (txt(p.category) !== "Smart Home") return null;
  const t = norm(p.title);

  if (any(t, [
    "lampe","leuchte","bulb","licht","lighting","led strip","lichtband",
    "deckenleuchte","wandleuchte","spotlight","smart light"
  ])) {
    return move(p, "Smart Home", "Beleuchtung", "smarthome:lighting");
  }

  if (any(t, [
    "kamera","camera","uberwachung","surveillance","video doorbell",
    "videoturklingel","turklingel kamera","doorbell camera","nvr ","dvr ",
    "security camera","alarmanlage","alarm system"
  ])) {
    return move(
      p,
      "Smart Home",
      "Sicherheit & Überwachung",
      "smarthome:surveillance"
    );
  }

  if (any(t, [
    "rauchmelder","smoke detector","co melder","carbon monoxide",
    "wassermelder","water leak","glasbruch","glass break","sirene","siren"
  ])) {
    return move(p, "Smart Home", "Sicherheit", "smarthome:safety");
  }

  if (any(t, [
    "smart plug","steckdose","energy meter","energiemesser","strommesser",
    "power meter","wechselrichter","inverter","solarpanel","solar panel",
    "power station"
  ])) {
    return move(p, "Smart Home", "Energie & Strom", "smarthome:energy");
  }

  if (any(t, [
    "thermostat","heizkorper","heizkoerper","rollladen","jalousie",
    "aktor","actuator","relais","relay","gebaudeautomation","building automation",
    "turschloss","smart lock"
  ])) {
    return move(p, "Smart Home", "Gebäudetechnik", "smarthome:building-tech");
  }

  if (any(t, [
    "home cinema","heimkino","soundbar","tv receiver","media player",
    "streaming box","apple tv","chromecast","tv box"
  ])) {
    return move(p, "Smart Home", "TV & Home Cinema", "smarthome:home-cinema");
  }

  return null;
}

/* =========================================================
   DATENSPEICHER
   ========================================================= */

function classifyStorage(p) {
  if (txt(p.category) !== "Datenspeicher") return null;

  if (txt(p.subcategory) !== "Storage") {
    return move(p, "Datenspeicher", "Storage", "storage:final-subcategory");
  }

  return null;
}

/* =========================================================
   CLASSIFY
   ========================================================= */

function classify(p) {
  return (
    classifyMobile(p) ||
    classifyComputer(p) ||
    classifyPc(p) ||
    classifyPeripherie(p) ||
    classifyNetwork(p) ||
    classifyOffice(p) ||
    classifySmartHome(p) ||
    classifyStorage(p)
  );
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadAll() {
  const out = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    let data = null;
    let err = null;

    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await supabase
          .from("products")
          .select("sku,title,brand,category,subcategory")
          .range(from, from + pageSize - 1);

        if (!res.error) {
          data = res.data || [];
          err = null;
          break;
        }
        err = res.error;
      } catch (e) {
        err = e;
      }

      if (attempt < 4) await sleep(500 * attempt);
    }

    if (err) throw err;

    out.push(...data);
    console.log(`Lidos: ${out.length}`);

    if (data.length < pageSize) break;
  }

  return out;
}

function esc(v) {
  return `"${String(v ?? "").replaceAll('"', '""')}"`;
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

const products = await loadAll();
const rows = [];

for (const p of products) {
  const r = classify(p);
  if (!r) continue;

  rows.push({
    sku: txt(p.sku),
    title: txt(p.title),
    brand: txt(p.brand),
    old_category: txt(p.category),
    old_subcategory: txt(p.subcategory),
    new_category: r.newCategory,
    new_subcategory: r.newSubcategory,
    reason: r.reason,
    confidence: r.confidence,
    status: r.status,
    blocked: "NO",
    block_reason: "",
  });
}

// Validate targets against final taxonomy.
for (const row of rows) {
  if (row.status !== "CHANGE") continue;

  const validSubs = FINAL[row.new_category];

  if (!validSubs || !validSubs.has(row.new_subcategory)) {
    row.blocked = "YES";
    row.status = "BLOCKED";
    row.block_reason = "target-not-in-final-taxonomy";
  }
}

// Block same SKU if conflicting targets appear.
const groups = new Map();

for (const row of rows) {
  if (!groups.has(row.sku)) groups.set(row.sku, []);
  groups.get(row.sku).push(row);
}

for (const skuRows of groups.values()) {
  const targets = new Set(
    skuRows
      .filter((r) => r.status === "CHANGE")
      .map((r) => `${r.new_category}|${r.new_subcategory}`)
  );

  if (targets.size > 1) {
    for (const row of skuRows) {
      row.blocked = "YES";
      row.status = "BLOCKED";
      row.block_reason = "same-sku-conflicting-targets";
    }
  }
}

const changes = rows.filter(
  (r) => r.status === "CHANGE" && r.blocked === "NO"
);
const reviews = rows.filter((r) => r.status === "REVIEW");
const blocked = rows.filter((r) => r.blocked === "YES");

const uniqueChanges = new Map();
for (const row of changes) {
  if (!uniqueChanges.has(row.sku)) uniqueChanges.set(row.sku, row);
}

const stamp = new Date()
  .toISOString()
  .replaceAll(":", "-")
  .replaceAll(".", "-");

const report = path.join(
  OUT,
  `subcategory-sanity-v21-${APPLY ? "apply" : "dry-run"}-${stamp}.csv`
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
    ...rows.map((row) => headers.map((h) => esc(row[h])).join(",")),
  ].join("\n"),
  "utf8"
);

const transitionMap = new Map();

for (const row of changes) {
  const label =
    `${row.old_category} > ${row.old_subcategory}` +
    ` => ${row.new_category} > ${row.new_subcategory}` +
    ` [${row.reason}]`;

  transitionMap.set(label, (transitionMap.get(label) || 0) + 1);
}

console.log("");
console.log("========== IUMATEC SUBCATEGORY SANITY V2.1 ==========");
console.log(`Produtos analisados: ${products.length}`);
console.log(`Mudancas seguras: ${changes.length}`);
console.log(`SKUs unicos a atualizar: ${uniqueChanges.size}`);
console.log(`Revisao manual: ${reviews.length}`);
console.log(`Bloqueados: ${blocked.length}`);
console.log(`Modo: ${APPLY ? "APPLY" : "DRY RUN"}`);
console.log("");

console.log("TOP TRANSICOES:");
for (const [label, count] of [...transitionMap.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 40)) {
  console.log(`${String(count).padStart(6)} | ${label}`);
}

console.log("");
console.log("AMOSTRA:");
for (const row of changes.slice(0, 30)) {
  console.log(
    `${row.sku} | ${row.title}\n` +
    `  ${row.old_category} > ${row.old_subcategory}` +
    ` => ${row.new_category} > ${row.new_subcategory}` +
    ` [${row.reason}]`
  );
}

let applied = 0;
let errors = 0;

if (APPLY) {
  console.log("");
  console.log("A atualizar SOMENTE category + subcategory...");

  const list = [...uniqueChanges.values()];

  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const err = await updateRow(row);

    if (err) {
      errors++;
      console.error(`ERRO ${row.sku}: ${err?.message || String(err)}`);
    } else {
      applied++;
    }

    if ((i + 1) % 250 === 0 || i + 1 === list.length) {
      console.log(
        `SKUs ${i + 1}/${list.length} | OK ${applied} | Erros ${errors}`
      );
    }
  }
}

console.log("");
console.log("====================================================");
console.log(`Mudancas seguras: ${changes.length}`);
console.log(`SKUs unicos a atualizar: ${uniqueChanges.size}`);
console.log(`Revisao manual: ${reviews.length}`);
console.log(`Bloqueados: ${blocked.length}`);
console.log(`SKUs aplicados: ${applied}`);
console.log(`Erros APPLY: ${errors}`);
console.log(`Relatorio: ${report}`);

if (!APPLY) {
  console.log("");
  console.log("DRY RUN concluido. NENHUM produto foi alterado.");
  console.log("");
  console.log("Se Bloqueados = 0, pode executar:");
  console.log(
    "node .\\scripts\\cleanup-subcategories-supabase-v21.mjs " +
    "--apply --confirm=IUMATEC-SANITY-V21"
  );
} else {
  console.log("");
  console.log("APPLY concluido.");
  console.log("Somente category/subcategory foram alterados.");
  console.log("Preco, stock, imagens e restantes campos NAO foram alterados.");
  console.log("");
  console.log("Execute novamente SEM --apply. Objetivo: Mudancas seguras: 0");
}
