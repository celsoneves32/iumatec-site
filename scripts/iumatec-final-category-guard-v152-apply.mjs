import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/*
 IUMATEC FINAL CATEGORY GUARD V1.5.2 — APPLY
 ==========================================
 - Usa o CSV SAFE mais recente criado por:
     scripts/iumatec-final-category-guard-v152.mjs
 - Altera SOMENTE: category, subcategory
 - REVIEW nunca é tocado
 - Faz snapshot BEFORE e relatório APPLY
 - Faz proteção STALE: só altera se category/subcategory atuais
   ainda forem iguais ao estado auditado no CSV SAFE.
*/

const APPLY = process.argv.includes("--apply");
const CONFIRM_ARG = process.argv.find((x) => x.startsWith("--confirm="));
const CONFIRM = CONFIRM_ARG ? CONFIRM_ARG.split("=").slice(1).join("=") : "";

if (!APPLY || CONFIRM !== "IUMATEC-FINAL-V152") {
  console.error("");
  console.error("ABORTADO.");
  console.error("Use exatamente:");
  console.error(
    "node .\\scripts\\iumatec-final-category-guard-v152-apply.mjs --apply --confirm=IUMATEC-FINAL-V152"
  );
  process.exit(1);
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

function latestSafeCsv() {
  if (!fs.existsSync(OUT)) {
    throw new Error(`Pasta não encontrada: ${OUT}`);
  }

  const files = fs
    .readdirSync(OUT)
    .filter((f) => /^final-category-guard-v152-safe-.*\.csv$/i.test(f))
    .map((f) => ({
      name: f,
      full: path.join(OUT, f),
      mtime: fs.statSync(path.join(OUT, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (!files.length) {
    throw new Error(
      "Nenhum CSV SAFE V1.5.2 encontrado. Execute primeiro o DRY RUN V1.5.2."
    );
  }

  return files[0].full;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        quoted = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((v) => String(v).trim() !== ""))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = r[idx] ?? "";
      });
      return obj;
    });
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

const safePath = latestSafeCsv();
const safeText = fs.readFileSync(safePath, "utf8");
const candidates = parseCsv(safeText);

if (!candidates.length) {
  console.log("CSV SAFE está vazio. Nada para aplicar.");
  process.exit(0);
}

for (const r of candidates) {
  const required = [
    "sku",
    "old_category",
    "old_subcategory",
    "proposed_category",
    "proposed_subcategory",
    "status",
  ];
  for (const key of required) {
    if (!(key in r)) {
      throw new Error(`CSV SAFE inválido: coluna ausente "${key}".`);
    }
  }

  if (r.status !== "SAFE") {
    throw new Error(
      `CSV SAFE contém linha não-SAFE: ${r.sku} status=${r.status}`
    );
  }
}

console.log("");
console.log("========== IUMATEC FINAL CATEGORY GUARD V1.5.2 APPLY ==========");
console.log(`Fonte: ${path.basename(safePath)}`);
console.log(`Candidatos auditados: ${candidates.length}`);
console.log("REVIEW: NÃO será tocado");
console.log("Campos permitidos: category, subcategory");
console.log("");

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const beforePath = path.join(OUT, `final-category-guard-v152-before-${stamp}.csv`);
const applyPath = path.join(OUT, `final-category-guard-v152-apply-${stamp}.csv`);

const before = [];
const results = [];

let ok = 0;
let stale = 0;
let errors = 0;

for (let i = 0; i < candidates.length; i++) {
  const r = candidates[i];
  const sku = String(r.sku || "").trim();

  try {
    const { data: currentRows, error: readError } = await supabase
      .from("products")
      .select("sku,title,brand,category,subcategory,price,in_stock,stock_qty")
      .eq("sku", sku);

    if (readError) throw readError;

    const current = (currentRows || []).find(
      (p) =>
        String(p.category ?? "") === String(r.old_category ?? "") &&
        String(p.subcategory ?? "") === String(r.old_subcategory ?? "")
    );

    if (!current) {
      stale++;
      results.push({
        sku,
        status: "STALE",
        old_category: r.old_category,
        old_subcategory: r.old_subcategory,
        proposed_category: r.proposed_category,
        proposed_subcategory: r.proposed_subcategory,
        message: "Estado atual já não corresponde ao DRY RUN; não alterado.",
      });
    } else {
      before.push({
        sku: current.sku,
        title: current.title,
        brand: current.brand,
        category: current.category,
        subcategory: current.subcategory,
        price: current.price,
        in_stock: current.in_stock,
        stock_qty: current.stock_qty,
      });

      const { data: updated, error: updateError } = await supabase
        .from("products")
        .update({
          category: r.proposed_category,
          subcategory: r.proposed_subcategory,
        })
        .eq("sku", sku)
        .eq("category", r.old_category)
        .eq("subcategory", r.old_subcategory)
        .select("sku,category,subcategory");

      if (updateError) throw updateError;

      if (!updated || updated.length === 0) {
        stale++;
        results.push({
          sku,
          status: "STALE",
          old_category: r.old_category,
          old_subcategory: r.old_subcategory,
          proposed_category: r.proposed_category,
          proposed_subcategory: r.proposed_subcategory,
          message: "Update não encontrou linha no estado auditado.",
        });
      } else {
        ok++;
        results.push({
          sku,
          status: "OK",
          old_category: r.old_category,
          old_subcategory: r.old_subcategory,
          proposed_category: r.proposed_category,
          proposed_subcategory: r.proposed_subcategory,
          message: "",
        });
      }
    }
  } catch (err) {
    errors++;
    results.push({
      sku,
      status: "ERROR",
      old_category: r.old_category,
      old_subcategory: r.old_subcategory,
      proposed_category: r.proposed_category,
      proposed_subcategory: r.proposed_subcategory,
      message: err?.message || String(err),
    });
  }

  const done = i + 1;
  if (done % 20 === 0 || done === candidates.length) {
    console.log(
      `SKUs ${done}/${candidates.length} | OK ${ok} | STALE ${stale} | Erros ${errors}`
    );
  }
}

writeCsv(beforePath, before);
writeCsv(applyPath, results);

console.log("");
console.log("========================================================");
console.log(`Candidatos: ${candidates.length}`);
console.log(`Aplicados: ${ok}`);
console.log(`STALE/not found: ${stale}`);
console.log(`Erros APPLY: ${errors}`);
console.log(`Snapshot BEFORE: ${beforePath}`);
console.log(`Relatório APPLY: ${applyPath}`);
console.log("");
console.log("Somente category/subcategory foram alterados.");
console.log("REVIEW não foi alterado.");

if (errors > 0) {
  process.exitCode = 2;
}
