import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(".env.local"), override: false });
dotenv.config({ path: path.resolve(".env"), override: false });

const url =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const key =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  throw new Error("Supabase URL/key nao encontrados.");
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log("");
console.log("=== IUMATEC ENERGY LABEL AUDIT ===");

const sample = await supabase
  .from("products")
  .select("*")
  .limit(1)
  .maybeSingle();

if (sample.error) throw sample.error;

if (!sample.data) {
  console.log("Tabela products vazia.");
  process.exit(0);
}

const keys = Object.keys(sample.data);

const energyKeys = keys.filter((key) =>
  /(energy|energie|label|efficien|datasheet|data_sheet)/i.test(key),
);

console.log("");
console.log("Colunas relacionadas encontradas:");
console.log(
  energyKeys.length
    ? energyKeys.join(", ")
    : "(nenhuma)",
);

if (!keys.includes("energy_label")) {
  console.log("");
  console.log(
    "RESULTADO: a coluna products.energy_label NAO existe.",
  );
  console.log(
    "A interface esta preparada, mas ainda falta sincronizar as etiquetas para o Supabase.",
  );
  process.exit(0);
}

const { count, error: countError } = await supabase
  .from("products")
  .select("sku", {
    count: "exact",
    head: true,
  })
  .not("energy_label", "is", null);

if (countError) throw countError;

console.log("");
console.log(`Produtos com energy_label: ${count || 0}`);

const examples = await supabase
  .from("products")
  .select("sku,title,category,subcategory,energy_label")
  .not("energy_label", "is", null)
  .limit(10);

if (examples.error) throw examples.error;

console.log("");
console.log("Exemplos:");

for (const row of examples.data || []) {
  console.log("");
  console.log("SKU:", row.sku);
  console.log("Titulo:", row.title);
  console.log(
    "Categoria:",
    `${row.category || ""} > ${row.subcategory || ""}`,
  );
  console.log(
    "energy_label:",
    JSON.stringify(row.energy_label),
  );
}

console.log("");

if ((count || 0) > 0) {
  console.log("OK: o Supabase tem etiquetas energeticas.");
  console.log("Abra um dos produtos acima no localhost para testar.");
} else {
  console.log(
    "ATENCAO: a coluna existe, mas nao ha produtos com energy_label preenchido.",
  );
  console.log(
    "Precisamos sincronizar os dados energeticos Alltron para products.energy_label.",
  );
}
