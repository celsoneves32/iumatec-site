import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("ERRO: variáveis Supabase não encontradas.");
  console.error("Preciso de SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e uma chave.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const TABLE = "products";
const PAGE_SIZE = 1000;

const outDir = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out"
);

fs.mkdirSync(outDir, { recursive: true });

function firstExisting(keys, candidates) {
  return candidates.find((x) => keys.includes(x)) || null;
}

function clean(v) {
  return String(v ?? "").trim();
}

function csv(v) {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

console.log("");
console.log("========== IUMATEC SUPABASE CATEGORY AUDIT ==========");
console.log("Modo: READ ONLY");
console.log("Tabela:", TABLE);
console.log("");

const { data: sampleRows, error: sampleError } = await supabase
  .from(TABLE)
  .select("*")
  .limit(1);

if (sampleError) {
  console.error("Erro a ler tabela products:");
  console.error(sampleError);
  process.exit(1);
}

if (!sampleRows?.length) {
  console.error("Tabela products está vazia.");
  process.exit(1);
}

const keys = Object.keys(sampleRows[0]);

const idField = firstExisting(keys, [
  "id",
  "sku",
  "handle",
]);

const skuField = firstExisting(keys, [
  "sku",
  "product_sku",
]);

const titleField = firstExisting(keys, [
  "title",
  "name",
  "product_name",
  "productName",
]);

const brandField = firstExisting(keys, [
  "brand",
  "manufacturer",
  "vendor",
]);

const categoryField = firstExisting(keys, [
  "category",
  "main_category",
  "kategorie",
  "product_category",
]);

const subcategoryField = firstExisting(keys, [
  "subcategory",
  "sub_category",
  "subCategory",
  "unterkategorie",
]);

console.log("Campos encontrados:");
console.log("ID:          ", idField);
console.log("SKU:         ", skuField);
console.log("Título:      ", titleField);
console.log("Marca:       ", brandField);
console.log("Categoria:   ", categoryField);
console.log("Subcategoria:", subcategoryField);
console.log("");

if (!categoryField) {
  console.error("ERRO: não encontrei a coluna de categoria.");
  console.error("Colunas existentes:");
  console.log(keys.join(", "));
  process.exit(1);
}

const fields = [
  idField,
  skuField,
  titleField,
  brandField,
  categoryField,
  subcategoryField,
].filter(Boolean);

const uniqueFields = [...new Set(fields)];

let all = [];
let from = 0;

while (true) {
  let query = supabase
    .from(TABLE)
    .select(uniqueFields.join(","))
    .range(from, from + PAGE_SIZE - 1);

  if (idField) {
    query = query.order(idField, { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Erro na página iniciada em ${from}:`);
    console.error(error);
    process.exit(1);
  }

  if (!data?.length) break;

  all.push(...data);

  process.stdout.write(
    `\rLidos: ${all.length.toLocaleString("de-CH")}`
  );

  if (data.length < PAGE_SIZE) break;

  from += PAGE_SIZE;
}

console.log("");
console.log("");

const categoryMap = new Map();
const pairMap = new Map();

for (const p of all) {
  const category = clean(p[categoryField]) || "(sem categoria)";
  const subcategory =
    subcategoryField
      ? clean(p[subcategoryField]) || "(sem subcategoria)"
      : "(sem subcategoria)";

  const title = titleField ? clean(p[titleField]) : "";
  const brand = brandField ? clean(p[brandField]) : "";

  if (!categoryMap.has(category)) {
    categoryMap.set(category, {
      category,
      count: 0,
      samples: [],
    });
  }

  const c = categoryMap.get(category);
  c.count++;

  if (c.samples.length < 5 && title) {
    c.samples.push(
      brand ? `${brand} | ${title}` : title
    );
  }

  const pairKey = `${category}|||${subcategory}`;

  if (!pairMap.has(pairKey)) {
    pairMap.set(pairKey, {
      category,
      subcategory,
      count: 0,
      samples: [],
    });
  }

  const pair = pairMap.get(pairKey);
  pair.count++;

  if (pair.samples.length < 4 && title) {
    pair.samples.push(
      brand ? `${brand} | ${title}` : title
    );
  }
}

const categories = [...categoryMap.values()]
  .sort((a, b) => b.count - a.count);

const pairs = [...pairMap.values()]
  .sort((a, b) => b.count - a.count);

const audit = {
  generatedAt: new Date().toISOString(),
  mode: "read-only",
  table: TABLE,
  totalProducts: all.length,
  detectedFields: {
    id: idField,
    sku: skuField,
    title: titleField,
    brand: brandField,
    category: categoryField,
    subcategory: subcategoryField,
  },
  categoryCount: categories.length,
  categorySubcategoryCount: pairs.length,
  categories,
  categorySubcategories: pairs,
};

const jsonPath = path.join(
  outDir,
  "supabase-category-audit.json"
);

fs.writeFileSync(
  jsonPath,
  JSON.stringify(audit, null, 2),
  "utf8"
);

const csvPath = path.join(
  outDir,
  "supabase-category-subcategory-audit.csv"
);

const csvLines = [
  [
    "category",
    "subcategory",
    "count",
    "sample_1",
    "sample_2",
    "sample_3",
    "sample_4",
  ].map(csv).join(","),
];

for (const r of pairs) {
  csvLines.push(
    [
      r.category,
      r.subcategory,
      r.count,
      r.samples[0] || "",
      r.samples[1] || "",
      r.samples[2] || "",
      r.samples[3] || "",
    ].map(csv).join(",")
  );
}

fs.writeFileSync(
  csvPath,
  csvLines.join("\n"),
  "utf8"
);

console.log("========== RESULTADO ==========");
console.log(
  "Produtos:",
  all.length.toLocaleString("de-CH")
);
console.log(
  "Categorias distintas:",
  categories.length
);
console.log(
  "Combinações categoria/subcategoria:",
  pairs.length
);
console.log("");

console.log("TOP 30 CATEGORIAS:");
console.log("");

for (const r of categories.slice(0, 30)) {
  console.log(
    `${String(r.count).padStart(7)} | ${r.category}`
  );
}

console.log("");
console.log("JSON:", jsonPath);
console.log("CSV: ", csvPath);
console.log("");
console.log(
  "AUDITORIA CONCLUÍDA. Nenhum produto foi alterado."
);
console.log(
  "Preço, stock, imagens e restantes campos permaneceram intactos."
);
