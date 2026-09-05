import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/*
 IUMATEC PAGE CLEANUP V1.2.2 — PROTECTED APPLY
 ==============================================
 Consome SOMENTE o último:
   page-cleanup-v122-safe-*.csv

 Proteções:
 - exige exatamente 189 linhas auditadas;
 - aceita apenas as 10 transições aprovadas;
 - bloqueia SKUs duplicados/conflitantes;
 - confirma que cada produto ainda está na categoria/subcategoria antiga;
 - altera SOMENTE category + subcategory;
 - cria snapshot BEFORE e relatório AFTER;
 - não toca nos 42 REVIEW.
*/

const APPLY = process.argv.includes("--apply");
const CONFIRM =
  process.argv.find((x) => x.startsWith("--confirm="))?.split("=")[1] || "";

if (!APPLY || CONFIRM !== "IUMATEC-PAGE-CLEANUP-V122") {
  throw new Error(
    "APPLY bloqueado. Use exatamente:\n" +
    "node .\\scripts\\iumatec-page-cleanup-v122-apply.mjs " +
    "--apply --confirm=IUMATEC-PAGE-CLEANUP-V122"
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

const files = fs.readdirSync(OUT)
  .filter((name) => /^page-cleanup-v122-safe-.*\.csv$/i.test(name))
  .map((name) => ({
    name,
    full: path.join(OUT, name),
    mtime: fs.statSync(path.join(OUT, name)).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (!files.length) {
  throw new Error("Não encontrei page-cleanup-v122-safe-*.csv");
}

const source = files[0];
const rows = readCsv(source.full);

const EXPECTED_COUNT = 189;

const allowedTransitions = new Set([
  "Mobile|Smartphones=>Mobile|Mobile Zubehör",
  "Computer|Laptops=>Computer|Desktop-PCs",
  "Mobile|Tablets=>Mobile|Mobile Zubehör",
  "Computer|Laptops=>Peripherie|Tastaturen",
  "Computer|Laptops=>Computer|Mini-PCs",
  "Mobile|Smartphones=>Peripherie|Foto & Video",
  "Mobile|Tablets=>Peripherie|Zubehör",
  "Computer|Laptops=>Computer|Computer-Zubehör",
  "Mobile|Smartphones=>Peripherie|Sound & Light",
  "Mobile|Smartphones=>Peripherie|Audio",
]);

if (rows.length !== EXPECTED_COUNT) {
  throw new Error(
    `Gate bloqueado: esperava ${EXPECTED_COUNT} linhas SAFE, encontrei ${rows.length}.`
  );
}

const seen = new Map();
const conflicts = [];
const invalid = [];

for (const row of rows) {
  const sku = String(row.sku || "").trim();
  const key =
    `${row.old_category}|${row.old_subcategory}=>` +
    `${row.proposed_category}|${row.proposed_subcategory}`;

  if (!sku) {
    invalid.push({ ...row, gate_error: "missing-sku" });
    continue;
  }

  if (!allowedTransitions.has(key)) {
    invalid.push({ ...row, gate_error: `transition-not-allowed:${key}` });
  }

  if (seen.has(sku)) {
    const prev = seen.get(sku);
    const prevTarget = `${prev.proposed_category}|${prev.proposed_subcategory}`;
    const target = `${row.proposed_category}|${row.proposed_subcategory}`;
    if (prevTarget !== target) {
      conflicts.push({ ...row, gate_error: "same-sku-conflicting-target" });
    }
  } else {
    seen.set(sku, row);
  }
}

if (invalid.length || conflicts.length) {
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  writeCsv(path.join(OUT, `page-cleanup-v122-apply-BLOCKED-${stamp}.csv`), [
    ...invalid,
    ...conflicts,
  ]);
  throw new Error(
    `APPLY bloqueado: invalid=${invalid.length}, conflicts=${conflicts.length}`
  );
}

console.log("");
console.log("========== IUMATEC PAGE CLEANUP V1.2.2 APPLY ==========");
console.log(`Fonte: ${source.name}`);
console.log(`Candidatos auditados: ${rows.length}`);
console.log("REVIEW: NÃO será tocado");
console.log("Campos permitidos: category, subcategory");
console.log("");

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const beforePath = path.join(OUT, `page-cleanup-v122-before-${stamp}.csv`);
const afterPath = path.join(OUT, `page-cleanup-v122-apply-${stamp}.csv`);

const before = [];
const after = [];

let applied = 0;
let stale = 0;
let errors = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];

  // Snapshot atual antes de alterar.
  const { data: current, error: readError } = await supabase
    .from("products")
    .select("sku,title,category,subcategory")
    .eq("sku", row.sku);

  if (readError) {
    errors++;
    after.push({ ...row, apply_status: "READ_ERROR", apply_error: readError.message });
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
    after.push({ ...row, apply_status: "ERROR", apply_error: error.message });
  } else if (!data || data.length === 0) {
    stale++;
    after.push({ ...row, apply_status: "STALE_OR_NOT_FOUND", apply_error: "" });
  } else {
    applied++;
    after.push({ ...row, apply_status: "APPLIED", apply_error: "" });
  }

  if ((i + 1) % 50 === 0 || i + 1 === rows.length) {
    console.log(
      `SKUs ${i + 1}/${rows.length} | OK ${applied} | STALE ${stale} | Erros ${errors}`
    );
  }

  if ((i + 1) % 25 === 0) await sleep(150);
}

writeCsv(beforePath, before);
writeCsv(afterPath, after);

console.log("");
console.log("=================================================");
console.log(`Candidatos: ${rows.length}`);
console.log(`Aplicados: ${applied}`);
console.log(`STALE/not found: ${stale}`);
console.log(`Erros APPLY: ${errors}`);
console.log(`Snapshot BEFORE: ${beforePath}`);
console.log(`Relatório APPLY: ${afterPath}`);
console.log("");
console.log("Somente category/subcategory foram alterados.");
console.log("Os 42 REVIEW NÃO foram alterados.");
