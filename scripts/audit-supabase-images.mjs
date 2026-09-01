import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const key =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Faltam credenciais Supabase.");
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function normalizeImages(product) {
  const out = [];

  function add(value) {
    if (!value) return;

    if (Array.isArray(value)) {
      for (const v of value) add(v);
      return;
    }

    if (typeof value === "string") {
      const s = value.trim();
      if (!s) return;

      if (s.startsWith("[") || s.startsWith("{")) {
        try {
          add(JSON.parse(s));
          return;
        } catch {}
      }

      out.push(s);
      return;
    }

    if (typeof value === "object") {
      if (value.url) add(value.url);
      else if (value.src) add(value.src);
    }
  }

  add(product.image);
  add(product.images);

  return [...new Set(out)];
}

let offset = 0;
const pageSize = 1000;
const products = [];

console.log("A ler produtos do Supabase...");

while (true) {
  const { data, error } = await supabase
    .from("products")
    .select("sku,image,images")
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  if (!data?.length) break;

  products.push(...data);

  process.stdout.write(`\rLidos: ${products.length}`);

  if (data.length < pageSize) break;
  offset += pageSize;
}

console.log("\n");

let zero = 0;
let one = 0;
let two = 0;
let threeFive = 0;
let sixPlus = 0;

let icecatProducts = 0;
let withMultiple = 0;

for (const p of products) {
  const imgs = normalizeImages(p);
  const n = imgs.length;

  if (n === 0) zero++;
  else if (n === 1) one++;
  else if (n === 2) two++;
  else if (n >= 3 && n <= 5) threeFive++;
  else if (n >= 6) sixPlus++;

  if (n >= 2) withMultiple++;

  if (
    imgs.some((x) =>
      String(x).toLowerCase().includes("icecat.biz")
    )
  ) {
    icecatProducts++;
  }
}

console.log("========== IUMATEC SUPABASE IMAGE AUDIT ==========");
console.log(`Produtos no Supabase:        ${products.length}`);
console.log(`0 imagens:                   ${zero}`);
console.log(`1 imagem:                    ${one}`);
console.log(`2 imagens:                   ${two}`);
console.log(`3-5 imagens:                 ${threeFive}`);
console.log(`6+ imagens:                  ${sixPlus}`);
console.log("");
console.log(`Produtos com 2+ imagens:     ${withMultiple}`);
console.log(`Produtos com imagens Icecat: ${icecatProducts}`);
console.log("==================================================");
