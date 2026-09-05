import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/*
 IUMATEC LAPTOP RESIDUAL V1.4 — APPLY PROTEGIDO
 ==============================================
 Usa EXCLUSIVAMENTE o CSV SAFE já auditado do V1.4.

 Proteções:
 - exige --apply
 - exige --confirm=IUMATEC-LAPTOP-V14
 - exige exatamente 116 SKUs
 - exige exatamente:
     95 -> Computer > Computer-Zubehör
     19 -> Computer > Desktop-PCs
      2 -> Computer > Mini-PCs
 - origem obrigatória: Computer > Laptops
 - altera SOMENTE category e subcategory
 - cria snapshot BEFORE
 - não toca no CSV REVIEW
*/

const APPLY = process.argv.includes("--apply");
const CONFIRM = (process.argv.find((x) => x.startsWith("--confirm=")) || "").split("=")[1] || "";

if (!APPLY || CONFIRM !== "IUMATEC-LAPTOP-V14") {
  console.error("ABORTADO.");
  console.error("Use:");
  console.error(
    "npx @dotenvx/dotenvx run -f .env.local -- node .\\scripts\\iumatec-laptop-residual-v14-apply.mjs --apply --confirm=IUMATEC-LAPTOP-V14"
  );
  process.exit(2);
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

const EXPECTED_TOTAL = 116;
const EXPECTED = new Map([
  ["Computer|Laptops=>Computer|Computer-Zubehör", 95],
  ["Computer|Laptops=>Computer|Desktop-PCs", 19],
  ["Computer|Laptops=>Computer|Mini-PCs", 2],
]);

function latestSafeCsv() {
  const files = fs
    .readdirSync(OUT)
    .filter((f) => /^laptop-residual-v14-safe-.*\.csv$/i.test(f))
    .map((f) => ({
      name: f,
      full: path.join(OUT, f),
      mtime: fs.statSync(path.join(OUT, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (!files.length) {
    throw new Error("Nenhum laptop-residual-v14-safe-*.csv encontrado.");
  }
  return files[0].full;
}

// Parser CSV simples com suporte a aspas, vírgulas e quebras dentro de campos.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map((x) => x.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((x) => String(x).trim() !== ""))
    .map((r) =>
      Object.fromEntries(headers.map((h, idx) => [h, r[idx] ?? ""]))
    );
}

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

const source = latestSafeCsv();
const parsed = parseCsv(fs.readFileSync(source, "utf8"));

const candidates = parsed.map((r) => ({
  sku: String(r.sku || "").trim(),
  title: String(r.title || "").trim(),
  brand: String(r.brand || "").trim(),
  old_category: String(r.old_category || "").trim(),
  old_subcategory: String(r.old_subcategory || "").trim(),
  proposed_category: String(r.proposed_category || "").trim(),
  proposed_subcategory: String(r.proposed_subcategory || "").trim(),
  product_type: String(r.product_type || "").trim(),
  reason: String(r.reason || "").trim(),
  status: String(r.status || "").trim(),
}));

console.log("");
console.log("========== IUMATEC LAPTOP RESIDUAL V1.4 APPLY ==========");
console.log(`Fonte: ${path.basename(source)}`);
console.log(`Candidatos auditados: ${candidates.length}`);
console.log("REVIEW: NÃO será tocado");
console.log("Campos permitidos: category, subcategory");
console.log("");

if (candidates.length !== EXPECTED_TOTAL) {
  throw new Error(`ABORTADO: esperados ${EXPECTED_TOTAL} candidatos, recebidos ${candidates.length}.`);
}

const seen = new Set();
const actual = new Map();

for (const r of candidates) {
  if (!r.sku) throw new Error("ABORTADO: candidato sem SKU.");
  if (seen.has(r.sku)) throw new Error(`ABORTADO: SKU duplicado no SAFE CSV: ${r.sku}`);
  seen.add(r.sku);

  if (r.status !== "SAFE") {
    throw new Error(`ABORTADO: SKU ${r.sku} não tem status SAFE.`);
  }

  if (r.old_category !== "Computer" || r.old_subcategory !== "Laptops") {
    throw new Error(
      `ABORTADO: origem inesperada em ${r.sku}: ${r.old_category} > ${r.old_subcategory}`
    );
  }

  if (r.proposed_category !== "Computer") {
    throw new Error(`ABORTADO: categoria destino inesperada em ${r.sku}.`);
  }

  if (!["Computer-Zubehör", "Desktop-PCs", "Mini-PCs"].includes(r.proposed_subcategory)) {
    throw new Error(
      `ABORTADO: subcategoria destino não permitida em ${r.sku}: ${r.proposed_subcategory}`
    );
  }

  const k =
    `${r.old_category}|${r.old_subcategory}` +
    `=>${r.proposed_category}|${r.proposed_subcategory}`;
  actual.set(k, (actual.get(k) || 0) + 1);
}

for (const [k, expected] of EXPECTED) {
  const got = actual.get(k) || 0;
  if (got !== expected) {
    throw new Error(`ABORTADO: transição ${k}: esperado ${expected}, recebido ${got}.`);
  }
}

for (const [k, got] of actual) {
  if (!EXPECTED.has(k)) {
    throw new Error(`ABORTADO: transição não auditada: ${k} (${got}).`);
  }
}

for (const [k, count] of [...actual.entries()].sort((a,b) => b[1]-a[1])) {
  console.log(`${String(count).padStart(4)} | ${k}`);
}

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const beforeRows = [];
const applyRows = [];

let ok = 0;
let stale = 0;
let errors = 0;

for (let i = 0; i < candidates.length; i++) {
  const r = candidates[i];

  try {
    const { data: current, error: readErr } = await supabase
      .from("products")
      .select("sku,title,brand,category,subcategory")
      .eq("sku", r.sku);

    if (readErr) throw readErr;

    const rows = current || [];
    if (!rows.length) {
      stale++;
      applyRows.push({
        sku: r.sku,
        status: "STALE_NOT_FOUND",
        old_category: r.old_category,
        old_subcategory: r.old_subcategory,
        new_category: r.proposed_category,
        new_subcategory: r.proposed_subcategory,
        error: "",
      });
      continue;
    }

    for (const c of rows) {
      beforeRows.push({
        sku: c.sku,
        title: c.title,
        brand: c.brand,
        category: c.category,
        subcategory: c.subcategory,
      });
    }

    const eligible = rows.filter(
      (c) => c.category === "Computer" && c.subcategory === "Laptops"
    );

    if (!eligible.length) {
      stale++;
      applyRows.push({
        sku: r.sku,
        status: "STALE_CHANGED",
        old_category: rows[0]?.category || "",
        old_subcategory: rows[0]?.subcategory || "",
        new_category: r.proposed_category,
        new_subcategory: r.proposed_subcategory,
        error: "",
      });
      continue;
    }

    // ALTERAÇÃO PROPOSITADAMENTE LIMITADA A ESTES 2 CAMPOS.
    const { data: updated, error: updateErr } = await supabase
      .from("products")
      .update({
        category: r.proposed_category,
        subcategory: r.proposed_subcategory,
      })
      .eq("sku", r.sku)
      .eq("category", "Computer")
      .eq("subcategory", "Laptops")
      .select("sku");

    if (updateErr) throw updateErr;

    if (!(updated || []).length) {
      stale++;
      applyRows.push({
        sku: r.sku,
        status: "STALE_NO_ROW_UPDATED",
        old_category: "Computer",
        old_subcategory: "Laptops",
        new_category: r.proposed_category,
        new_subcategory: r.proposed_subcategory,
        error: "",
      });
      continue;
    }

    ok++;
    applyRows.push({
      sku: r.sku,
      status: "OK",
      old_category: r.old_category,
      old_subcategory: r.old_subcategory,
      new_category: r.proposed_category,
      new_subcategory: r.proposed_subcategory,
      error: "",
    });
  } catch (e) {
    errors++;
    applyRows.push({
      sku: r.sku,
      status: "ERROR",
      old_category: r.old_category,
      old_subcategory: r.old_subcategory,
      new_category: r.proposed_category,
      new_subcategory: r.proposed_subcategory,
      error: e?.message || String(e),
    });
  }

  if ((i + 1) % 20 === 0 || i + 1 === candidates.length) {
    console.log(
      `SKUs ${i + 1}/${candidates.length} | OK ${ok} | STALE ${stale} | Erros ${errors}`
    );
  }
}

const beforePath = path.join(OUT, `laptop-residual-v14-before-${stamp}.csv`);
const applyPath = path.join(OUT, `laptop-residual-v14-apply-${stamp}.csv`);

writeCsv(beforePath, beforeRows);
writeCsv(applyPath, applyRows);

console.log("");
console.log("=====================================================");
console.log(`Candidatos: ${candidates.length}`);
console.log(`Aplicados: ${ok}`);
console.log(`STALE/not found: ${stale}`);
console.log(`Erros APPLY: ${errors}`);
console.log(`Snapshot BEFORE: ${beforePath}`);
console.log(`Relatório APPLY: ${applyPath}`);
console.log("");
console.log("Somente category/subcategory foram alterados.");
console.log("O CSV REVIEW NÃO foi alterado.");

if (stale !== 0 || errors !== 0 || ok !== EXPECTED_TOTAL) {
  process.exitCode = 1;
}
