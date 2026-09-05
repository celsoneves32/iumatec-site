import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/*
 IUMATEC RESIDUAL CLEANUP V1.3 — PROTECTED APPLY
 ===============================================
 Consome SOMENTE o último:
   residual-cleanup-v13-safe-*.csv

 Proteções:
 - exige exatamente 41 candidatos;
 - exige exatamente as 4 transições auditadas, com as contagens auditadas;
 - bloqueia SKU vazio ou conflito de target;
 - só altera produtos ainda na category/subcategory auditadas;
 - altera SOMENTE category + subcategory;
 - cria snapshot BEFORE e relatório APPLY;
 - NÃO toca nos 38 REVIEW.
*/

const APPLY = process.argv.includes("--apply");
const CONFIRM =
  process.argv.find((x) => x.startsWith("--confirm="))?.split("=")[1] || "";

if (!APPLY || CONFIRM !== "IUMATEC-RESIDUAL-V13") {
  throw new Error(
    "APPLY bloqueado. Use exatamente:\n" +
    "node .\\scripts\\iumatec-residual-cleanup-v13-apply.mjs " +
    "--apply --confirm=IUMATEC-RESIDUAL-V13"
  );
}

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
      } else {
        cur += ch;
      }
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

const files = fs
  .readdirSync(OUT)
  .filter((name) => /^residual-cleanup-v13-safe-.*\.csv$/i.test(name))
  .map((name) => ({
    name,
    full: path.join(OUT, name),
    mtime: fs.statSync(path.join(OUT, name)).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (!files.length) {
  throw new Error("Não encontrei residual-cleanup-v13-safe-*.csv");
}

const source = files[0];
const rows = readCsv(source.full);

const EXPECTED_TOTAL = 41;

const EXPECTED_TRANSITIONS = new Map([
  ["Computer|Laptops=>Computer|Desktop-PCs", 28],
  ["Mobile|Smartphones=>Mobile|Mobile Zubehör", 7],
  ["Computer|Laptops=>Computer|Mini-PCs", 5],
  ["Mobile|Tablets=>Mobile|Mobile Zubehör", 1],
]);

if (rows.length !== EXPECTED_TOTAL) {
  throw new Error(
    `Gate bloqueado: esperava ${EXPECTED_TOTAL} candidatos, encontrei ${rows.length}.`
  );
}

const transitionCounts = new Map();
const seen = new Map();
const invalid = [];
const conflicts = [];

for (const row of rows) {
  const sku = String(row.sku || "").trim();
  const transition =
    `${row.old_category}|${row.old_subcategory}=>` +
    `${row.proposed_category}|${row.proposed_subcategory}`;

  transitionCounts.set(
    transition,
    (transitionCounts.get(transition) || 0) + 1
  );

  if (!sku) {
    invalid.push({ ...row, gate_error: "missing-sku" });
    continue;
  }

  if (!EXPECTED_TRANSITIONS.has(transition)) {
    invalid.push({
      ...row,
      gate_error: `transition-not-approved:${transition}`,
    });
  }

  if (seen.has(sku)) {
    const prev = seen.get(sku);
    const prevTarget = `${prev.proposed_category}|${prev.proposed_subcategory}`;
    const currentTarget = `${row.proposed_category}|${row.proposed_subcategory}`;

    if (prevTarget !== currentTarget) {
      conflicts.push({
        ...row,
        gate_error: "same-sku-conflicting-target",
      });
    }
  } else {
    seen.set(sku, row);
  }
}

for (const [transition, expected] of EXPECTED_TRANSITIONS) {
  const actual = transitionCounts.get(transition) || 0;
  if (actual !== expected) {
    invalid.push({
      sku: "",
      title: "",
      old_category: "",
      old_subcategory: "",
      proposed_category: "",
      proposed_subcategory: "",
      product_type: "",
      reason: "",
      status: "",
      gate_error:
        `transition-count-mismatch:${transition}:expected=${expected}:actual=${actual}`,
    });
  }
}

for (const transition of transitionCounts.keys()) {
  if (!EXPECTED_TRANSITIONS.has(transition)) {
    invalid.push({
      sku: "",
      title: "",
      old_category: "",
      old_subcategory: "",
      proposed_category: "",
      proposed_subcategory: "",
      product_type: "",
      reason: "",
      status: "",
      gate_error: `unexpected-transition:${transition}`,
    });
  }
}

if (invalid.length || conflicts.length) {
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const blockedPath = path.join(
    OUT,
    `residual-cleanup-v13-apply-BLOCKED-${stamp}.csv`
  );

  writeCsv(blockedPath, [...invalid, ...conflicts]);

  throw new Error(
    `APPLY bloqueado: invalid=${invalid.length}, conflicts=${conflicts.length}\n` +
    `Relatório: ${blockedPath}`
  );
}

console.log("");
console.log("========== IUMATEC RESIDUAL CLEANUP V1.3 APPLY ==========");
console.log(`Fonte: ${source.name}`);
console.log(`Candidatos auditados: ${rows.length}`);
console.log("REVIEW: NÃO será tocado");
console.log("Campos permitidos: category, subcategory");
console.log("");

for (const [transition, expected] of EXPECTED_TRANSITIONS) {
  console.log(`${String(expected).padStart(3)} | ${transition}`);
}

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const beforePath = path.join(OUT, `residual-cleanup-v13-before-${stamp}.csv`);
const applyPath = path.join(OUT, `residual-cleanup-v13-apply-${stamp}.csv`);

const before = [];
const appliedRows = [];

let applied = 0;
let stale = 0;
let errors = 0;

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];

  const { data: current, error: readError } = await supabase
    .from("products")
    .select("sku,title,category,subcategory")
    .eq("sku", row.sku);

  if (readError) {
    errors++;
    appliedRows.push({
      ...row,
      apply_status: "READ_ERROR",
      apply_error: readError.message,
    });
    continue;
  }

  for (const c of current || []) {
    before.push({
      sku: c.sku,
      title: c.title,
      category: c.category,
      subcategory: c.subcategory,
      target_category: row.proposed_category,
      target_subcategory: row.proposed_subcategory,
    });
  }

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

  if (error) {
    errors++;
    appliedRows.push({
      ...row,
      apply_status: "ERROR",
      apply_error: error.message,
    });
  } else if (!data || data.length === 0) {
    stale++;
    appliedRows.push({
      ...row,
      apply_status: "STALE_OR_NOT_FOUND",
      apply_error: "",
    });
  } else {
    applied++;
    appliedRows.push({
      ...row,
      apply_status: "APPLIED",
      apply_error: "",
    });
  }

  if ((i + 1) % 20 === 0 || i + 1 === rows.length) {
    console.log(
      `SKUs ${i + 1}/${rows.length} | OK ${applied} | STALE ${stale} | Erros ${errors}`
    );
  }
}

writeCsv(beforePath, before);
writeCsv(applyPath, appliedRows);

console.log("");
console.log("=================================================");
console.log(`Candidatos: ${rows.length}`);
console.log(`Aplicados: ${applied}`);
console.log(`STALE/not found: ${stale}`);
console.log(`Erros APPLY: ${errors}`);
console.log(`Snapshot BEFORE: ${beforePath}`);
console.log(`Relatório APPLY: ${applyPath}`);
console.log("");
console.log("Somente category/subcategory foram alterados.");
console.log("Os 38 REVIEW NÃO foram alterados.");
