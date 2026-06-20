import fs from "fs";
import path from "path";

const inputFiles = [
  "integrations/alltron/out/iumatec-catalog-live.json",
  "integrations/alltron/out/winning-products.json",
  "integrations/alltron/out/iumatec-catalog-sellable.json",
  "integrations/alltron/out/iumatec-catalog-filtered.json",
  "integrations/alltron/out/iumatec-catalog-enriched.json",
];

const outputFile = "integrations/alltron/out/iumatec-storefront-clean.json";

function readJson(file) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return [];

  try {
    const data = JSON.parse(fs.readFileSync(full, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function getVariantId(product) {
  const id = product.merchandiseId || product.shopifyVariantId;
  if (!id) return "";

  if (String(id).startsWith("gid://shopify/ProductVariant/")) {
    return String(id);
  }

  const numeric = String(id).replace(/[^\d]/g, "");
  return numeric ? `gid://shopify/ProductVariant/${numeric}` : "";
}

function getHandle(product) {
  return String(
    product.shopifyProductHandle ||
      product.productHandle ||
      product.slug ||
      ""
  ).trim();
}

function getImage(product) {
  if (typeof product.image === "string" && product.image.trim()) {
    return product.image.trim();
  }

  if (Array.isArray(product.images)) {
    const found = product.images.find(
      (img) => typeof img === "string" && img.trim()
    );
    if (found) return found.trim();
  }

  if (typeof product.shopifyImageUrl === "string" && product.shopifyImageUrl.trim()) {
    return product.shopifyImageUrl.trim();
  }

  return "";
}

function getStock(product) {
  const qty = Number(product.stockQty ?? product.stock ?? 0);
  return Number.isFinite(qty) ? qty : 0;
}

function getPrice(product) {
  const price = Number(product.price ?? 0);
  return Number.isFinite(price) ? price : 0;
}

function isSynced(product) {
  const status = String(product.shopifySyncStatus || "").trim();

  if (!status) return true;

  return (
    status === "synced" ||
    status === "updated-existing" ||
    status === "ok"
  );
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function familyKey(product) {
  let title = normalizeText(product.title || product.fullTitle || "");

  title = title
    .replace(/\b(midnight|mitternacht|starlight|platinum|platinium|ocean|violet|sky blue|space black|space schwarz|silber|silver|schwarz|black|grau|gray|grey|blau|blue|weiss|white|gold|rose|rot|red|grun|green)\b/g, "")
    .replace(/\b(64gb|128gb|256gb|512gb|1tb|2tb|4tb|8gb|16gb|24gb|32gb|64gb|128gb)\b/g, "")
    .replace(/\b(64 gb|128 gb|256 gb|512 gb|1 tb|2 tb|4 tb|8 gb|16 gb|24 gb|32 gb|64 gb|128 gb)\b/g, "")
    .replace(/\b(wifi|wi fi|5g|cellular|lte)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return `${normalizeText(product.brand)}-${title}`;
}

function scoreProduct(product) {
  let score = 0;

  if (getHandle(product)) score += 500;
  if (getVariantId(product)) score += 500;
  if (getImage(product)) score += 250;
  if (getPrice(product) > 0) score += 200;
  if (getStock(product) > 0) score += 200;
  if (isSynced(product)) score += 200;
  if (product.shopifyProductId) score += 80;
  if (product.ean) score += 40;
  if (product.internalNumber) score += 30;
  if (product.description || product.description2) score += 20;

  return score;
}

const all = [];

for (const file of inputFiles) {
  const items = readJson(file);
  console.log(`${file}: ${items.length}`);

  for (const item of items) {
    all.push({
      ...item,
      _sourceFile: file,
      merchandiseId: getVariantId(item),
      slug: getHandle(item),
      productHandle: getHandle(item),
      shopifyProductHandle: getHandle(item),
      image: getImage(item),
      price: getPrice(item),
      stockQty: getStock(item),
      inStock: getStock(item) > 0,
      category: item.category || item.iumatecCategory?.main || item.rawCategory?.cat1 || "Zubehör",
      subcategory:
        item.subcategory ||
        item.iumatecCategory?.sub ||
        item.rawCategory?.cat3 ||
        item.rawCategory?.cat2 ||
        "Sonstiges",
    });
  }
}

const valid = all.filter((product) => {
  return (
    getHandle(product) &&
    getVariantId(product) &&
    getImage(product) &&
    getPrice(product) > 0 &&
    getStock(product) > 0 &&
    isSynced(product)
  );
});

const byVariant = new Map();

for (const product of valid) {
  const key = getVariantId(product);
  const current = byVariant.get(key);

  if (!current || scoreProduct(product) > scoreProduct(current)) {
    byVariant.set(key, product);
  }
}

const deduped = Array.from(byVariant.values());

deduped.sort((a, b) => {
  const stockDiff = getStock(b) - getStock(a);
  if (stockDiff !== 0) return stockDiff;

  return scoreProduct(b) - scoreProduct(a);
});

const cleaned = deduped.map(({ _sourceFile, ...product }) => product);

const outputPath = path.join(process.cwd(), outputFile);
fs.writeFileSync(outputPath, JSON.stringify(cleaned, null, 2), "utf8");

console.log("");
console.log("========== CLEAN DONE ==========");
console.log("Total loaded:", all.length);
console.log("Valid:", valid.length);
console.log("Clean unique:", cleaned.length);
console.log("Removed:", all.length - cleaned.length);
console.log("Output:", outputFile);
console.log("================================");