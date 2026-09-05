import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/*
 IUMATEC Catalog Safe Apply Gate V1.1
 ==================================
 - Lê o relatório V3.1 mais recente.
 - NÃO volta a classificar os 52k produtos.
 - Seleciona apenas tipos/transições de baixo risco.
 - DRY RUN por defeito.
 - APPLY protegido por confirmação explícita.
 - APPLY altera SOMENTE category + subcategory.
*/

const APPLY = process.argv.includes("--apply");
const CONFIRM =
  process.argv.find((x) => x.startsWith("--confirm="))?.split("=")[1] || "";

if (APPLY && CONFIRM !== "IUMATEC-CATALOG-SAFE-V11") {
  throw new Error(
    "APPLY bloqueado. Use: --apply --confirm=IUMATEC-CATALOG-SAFE-V11"
  );
}

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
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();
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

const reports = fs
  .readdirSync(OUT)
  .filter((name) => /^catalog-classifier-v31-safe-changes-.*\.csv$/i.test(name))
  .map((name) => ({
    name,
    full: path.join(OUT, name),
    mtime: fs.statSync(path.join(OUT, name)).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (!reports.length) {
  throw new Error(
    "Nenhum catalog-classifier-v31-safe-changes-*.csv encontrado."
  );
}

const source = reports[0];
const rows = readCsv(source.full);

/*
 Tipos autorizados para esta primeira aplicação.

 Deliberadamente ficam FORA deste V1:
 - monitor_device
 - laptop_device
 - desktop_pc
 - keyboard
 - router
 - network_switch
 - network_cable_adapter
 - printer_consumable

 Motivo:
 vimos exemplos em que essas famílias ainda podem ser ambíguas.
*/
const ALLOWED_TYPES = new Set([
  "mobile_accessory",
  "computer_accessory",
  "docking_station",
  "tablet_device",
  "smartphone_device",
  "mini_pc_device",
  "graphics_card",
  "monitor_accessory",
  "webcam",
  "printer_scanner",
  "robot_vacuum",
  "motherboard",
  "ram_module",
  "processor",
  "storage_device",
  "mouse",
  "headset",
  "pc_cable_adapter",
  "keyboard_mouse_combo",
]);

function decision(row) {
  const type = txt(row.product_type);
  const title = norm(row.title);
  const oldCat = txt(row.old_category);
  const oldSub = txt(row.old_subcategory);
  const newCat = txt(row.proposed_category);
  const newSub = txt(row.proposed_subcategory);

  if (!ALLOWED_TYPES.has(type)) {
    return ["HOLD", `type-not-allowed:${type}`];
  }

  // Printer: só aparelhos reais nesta fase, não consumíveis.
  if (type === "printer_scanner" && txt(row.reason) !== "printer-device") {
    return ["HOLD", "printer-not-device-rule"];
  }

  // Cabos/adaptadores de headset não são headsets.
  if (
    type === "headset" &&
    /kabel|cable|adapter|extension|verlanger/.test(title)
  ) {
    return ["HOLD", "headset-cable-accessory"];
  }

  // Filtros/arms/halterungen nunca viram monitor device.
  if (
    newCat === "Peripherie" &&
    newSub === "Monitore" &&
    /filter|blickschutz|privacy|halter|mount|arm|stand/.test(title)
  ) {
    return ["HOLD", "accessory-into-monitor"];
  }

  // Acessórios nunca entram nas páginas de aparelhos.
  if (
    (
      (newCat === "Mobile" && ["Smartphones", "Tablets"].includes(newSub)) ||
      (newCat === "Computer" &&
        ["Laptops", "Desktop-PCs", "Mini-PCs"].includes(newSub))
    ) &&
    /\bcase\b|\bcover\b|\bfolio\b|\bfilter\b|\bprivacy\b|\bhalter\b|\bhalterung\b|\bholder\b|\bmount\b|\bstand\b|\bkickstand\b|\bbag\b|\btasche\b|\bsleeve\b|\bcable\b|\bkabel\b|\badapter\b|\bdock\b|\bdocking\b|\bcharger\b|\bladegerat\b|\bpowerbank\b|\bglass\b|\bschutzglas\b|\bschutzfolie\b|\bcage\b/.test(
      title
    )
  ) {
    return ["HOLD", "accessory-into-device-page"];
  }

  // Impressoras nunca podem entrar em Desktop-PCs.
  if (
    newCat === "Computer" &&
    newSub === "Desktop-PCs" &&
    /deskjet|laserjet|officejet|drucker|printer|ecotank/.test(title)
  ) {
    return ["HOLD", "printer-into-desktop"];
  }

  // Cabos/extensões nunca podem virar Mainboard.
  if (
    newCat === "PC-Komponenten" &&
    newSub === "Mainboards" &&
    /cable|kabel|extension|verlangerung|connector|24\s*pin/.test(title)
  ) {
    return ["HOLD", "cable-into-mainboard"];
  }

  // Robot vacuum nunca entra em Mobile.
  if (
    newCat === "Mobile" &&
    /robotersauger|saugroboter|robot vacuum|roborock/.test(title)
  ) {
    return ["HOLD", "robot-into-mobile"];
  }

  if (!oldCat || !oldSub || !newCat || !newSub || !txt(row.sku)) {
    return ["BLOCK", "missing-critical-field"];
  }

  if (oldCat === newCat && oldSub === newSub) {
    return ["HOLD", "no-change"];
  }

  return ["CANDIDATE", "safe-v1"];
}

const evaluated = rows.map((row) => {
  const [gate_status, gate_reason] = decision(row);
  return { ...row, gate_status, gate_reason };
});

const candidates = evaluated.filter((r) => r.gate_status === "CANDIDATE");
const held = evaluated.filter((r) => r.gate_status === "HOLD");
const blocked = evaluated.filter((r) => r.gate_status === "BLOCK");

const bySku = new Map();

for (const row of candidates) {
  if (!bySku.has(row.sku)) bySku.set(row.sku, []);
  bySku.get(row.sku).push(row);
}

const conflicts = [];

for (const [sku, skuRows] of bySku) {
  const targets = new Set(
    skuRows.map((r) => `${r.proposed_category}|${r.proposed_subcategory}`)
  );

  if (targets.size > 1) {
    conflicts.push(...skuRows.map((r) => ({
      ...r,
      gate_status: "BLOCK",
      gate_reason: "same-sku-conflicting-targets",
    })));
  }
}

const conflictSkus = new Set(conflicts.map((r) => r.sku));

const safeCandidates = candidates.filter((r) => !conflictSkus.has(r.sku));
const uniqueCandidates = new Map();

for (const row of safeCandidates) {
  if (!uniqueCandidates.has(row.sku)) uniqueCandidates.set(row.sku, row);
}

const allBlocked = [...blocked, ...conflicts];

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const mode = APPLY ? "apply" : "dry-run";

const candidatesPath = path.join(
  OUT,
  `catalog-safe-apply-v11-candidates-${stamp}.csv`
);
const heldPath = path.join(
  OUT,
  `catalog-safe-apply-v11-held-${stamp}.csv`
);
const blockedPath = path.join(
  OUT,
  `catalog-safe-apply-v11-blocked-${stamp}.csv`
);
const applyPath = path.join(
  OUT,
  `catalog-safe-apply-v11-${mode}-${stamp}.csv`
);

writeCsv(candidatesPath, [...uniqueCandidates.values()]);
writeCsv(heldPath, held);
writeCsv(blockedPath, allBlocked);

function grouped(list, fn) {
  const m = new Map();
  for (const x of list) {
    const k = fn(x);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

console.log("");
console.log("========== IUMATEC CATALOG SAFE APPLY GATE V1.1 ==========");
console.log(`Fonte V3.1: ${source.name}`);
console.log(`Linhas V3.1 analisadas: ${rows.length}`);
console.log(`Candidatos seguros: ${safeCandidates.length}`);
console.log(`SKUs únicos candidatos: ${uniqueCandidates.size}`);
console.log(`HELD para próxima fase: ${held.length}`);
console.log(`BLOCKED: ${allBlocked.length}`);
console.log(`Modo: ${APPLY ? "APPLY" : "DRY RUN"}`);
console.log("Nota V1.1: filtros de segurança vão para HELD; só conflitos/linhas inválidas ficam BLOCKED.");

console.log("");
console.log("=== CANDIDATOS POR PRODUCT_TYPE ===");
for (const [k, count] of grouped(
  [...uniqueCandidates.values()],
  (r) => r.product_type
).slice(0, 30)) {
  console.log(`${String(count).padStart(6)} | ${k}`);
}

console.log("");
console.log("=== TOP TRANSICOES CANDIDATAS ===");
for (const [k, count] of grouped(
  [...uniqueCandidates.values()],
  (r) =>
    `${r.old_category} > ${r.old_subcategory} => ` +
    `${r.proposed_category} > ${r.proposed_subcategory}`
).slice(0, 40)) {
  console.log(`${String(count).padStart(6)} | ${k}`);
}

console.log("");
console.log("=== AMOSTRA CANDIDATOS ===");
for (const r of [...uniqueCandidates.values()].slice(0, 50)) {
  console.log(
    `${r.sku} | ${r.title}\n` +
    `  ${r.old_category} > ${r.old_subcategory} => ` +
    `${r.proposed_category} > ${r.proposed_subcategory} ` +
    `[${r.product_type} | ${r.reason}]`
  );
}

if (allBlocked.length) {
  console.log("");
  console.log("=== BLOCKED ===");
  for (const r of allBlocked.slice(0, 30)) {
    console.log(
      `${r.sku} | ${r.title}\n` +
      `  ${r.gate_reason}`
    );
  }
}

let applied = 0;
let stale = 0;
let errors = 0;
const applyRows = [];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateOne(row) {
  let lastError = null;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const { data, error } = await supabase
        .from("products")
        .update({
          category: row.proposed_category,
          subcategory: row.proposed_subcategory,
        })
        .eq("sku", row.sku)
        .eq("category", row.old_category)
        .eq("subcategory", row.old_subcategory)
        .select("sku");

      if (!error) {
        if (!data || data.length === 0) {
          return { status: "STALE_OR_NOT_FOUND", error: "" };
        }
        return { status: "APPLIED", error: "" };
      }

      lastError = error;
    } catch (e) {
      lastError = e;
    }

    if (attempt < 4) await sleep(400 * attempt);
  }

  return {
    status: "ERROR",
    error: lastError?.message || String(lastError || "unknown"),
  };
}

let supabase = null;

if (APPLY) {
  if (allBlocked.length > 0) {
    throw new Error(
      `APPLY bloqueado: existem ${allBlocked.length} linhas BLOCKED.`
    );
  }

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error("Supabase URL/key não encontrados.");
  }

  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const list = [...uniqueCandidates.values()];

  console.log("");
  console.log("A atualizar SOMENTE category + subcategory...");

  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const result = await updateOne(row);

    if (result.status === "APPLIED") applied++;
    else if (result.status === "STALE_OR_NOT_FOUND") stale++;
    else errors++;

    applyRows.push({
      ...row,
      apply_status: result.status,
      apply_error: result.error,
    });

    if ((i + 1) % 200 === 0 || i + 1 === list.length) {
      console.log(
        `SKUs ${i + 1}/${list.length} | OK ${applied} | ` +
        `STALE ${stale} | Erros ${errors}`
      );
    }
  }

  writeCsv(applyPath, applyRows);
}

console.log("");
console.log("=================================================");
console.log(`SKUs candidatos: ${uniqueCandidates.size}`);
console.log(`HELD: ${held.length}`);
console.log(`BLOCKED: ${allBlocked.length}`);
console.log(`Aplicados: ${applied}`);
console.log(`STALE/not found: ${stale}`);
console.log(`Erros APPLY: ${errors}`);
console.log(`Candidatos CSV: ${candidatesPath}`);
console.log(`HELD CSV: ${heldPath}`);
console.log(`BLOCKED CSV: ${blockedPath}`);

if (!APPLY) {
  console.log("");
  console.log("DRY RUN concluído. NENHUM produto foi alterado.");
  console.log("");
  console.log("Se BLOCKED = 0 e a amostra dos CANDIDATES estiver correta:");
  console.log(
    "npx @dotenvx/dotenvx run -f .env.local -- node " +
    ".\\scripts\\iumatec-catalog-safe-apply-v11.mjs " +
    "--apply --confirm=IUMATEC-CATALOG-SAFE-V11"
  );
} else {
  console.log(`Relatório APPLY: ${applyPath}`);
  console.log("");
  console.log("APPLY concluído.");
  console.log("Somente category/subcategory foram alterados.");
  console.log("Preço, stock, imagens e restantes campos NÃO foram alterados.");
}
