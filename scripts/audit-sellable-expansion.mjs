import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "integrations", "alltron", "out");
const MASTER = path.join(OUT, "iumatec-master-catalog.json");
const SHOPIFY_MAP = path.join(OUT, "shopify-product-variant-map.json");
const REPORT = path.join(OUT, "sellable-expansion-audit.json");
const SAMPLE = path.join(OUT, "sellable-expansion-new-sample.json");

const text = (value) => String(value ?? "").trim();
const norm = (value) => text(value).toUpperCase().replace(/\s+/g, " ");
const digits = (value) => text(value).replace(/\D/g, "");
const number = (value) => {
  const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

function readArray(file, label) {
  if (!fs.existsSync(file)) throw new Error(`${label} not found: ${file}`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (Array.isArray(data)) return data;
  for (const key of ["variants", "products", "rows", "items", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  throw new Error(`${label} must contain an array`);
}

function images(product) {
  return [...new Set([
    product.image, product.imageUrl, product.mainImage, product.featuredImage,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
  ].filter((value) => typeof value === "string" && /^https?:\/\//i.test(value.trim()))
    .map((value) => value.trim()))];
}

function title(product) {
  return text(product.fullTitle || product.title || product.name);
}

function description(product) {
  return text(product.description2 || product.description || product.longDescription || product.shortDescription);
}

function price(product) {
  // `price` is the verified IUMATEC selling price. Never use ecpr/expr/inpr.
  return number(product.price ?? product.salePrice ?? product.retailPrice);
}

function stock(product) {
  return number(product.stockQty ?? product.stock ?? product.quantity ?? product.availableQuantity);
}

function variantId(product) {
  const value = text(product.merchandiseId || product.shopifyVariantId || product.variantId);
  const id = digits(value);
  return id ? `gid://shopify/ProductVariant/${id}` : "";
}

function rowSku(row) {
  return norm(row.sku || row.variantSku || row.SKU);
}

function rowBarcode(row) {
  return digits(row.barcode || row.ean || row.EAN);
}

function addCount(index, key) {
  if (key) index.set(key, (index.get(key) || 0) + 1);
}

function main() {
  console.log("Reading master catalog...");
  const master = readArray(MASTER, "Master catalog");
  console.log("Reading Shopify identity map...");
  const shopify = readArray(SHOPIFY_MAP, "Shopify identity map");

  const shopifyVariantIds = new Set();
  const shopifySkuCounts = new Map();
  const shopifyBarcodeCounts = new Map();
  for (const row of shopify) {
    const id = variantId(row);
    if (id) shopifyVariantIds.add(id);
    addCount(shopifySkuCounts, rowSku(row));
    addCount(shopifyBarcodeCounts, rowBarcode(row));
  }

  const counts = {
    masterProducts: master.length,
    shopifyVariants: shopify.length,
    completeSellable: 0,
    alreadyInShopify: 0,
    safelyNew: 0,
    ambiguousIdentity: 0,
    missingIdentity: 0,
    missingPrice: 0,
    missingStock: 0,
    missingImage: 0,
    missingTitle: 0,
    missingDescription: 0,
  };

  const candidates = [];
  const seenNewKeys = new Set();

  for (const product of master) {
    const productTitle = title(product);
    const productDescription = description(product);
    const productPrice = price(product);
    const productStock = stock(product);
    const productImages = images(product);
    const sku = norm(product.sku || product.partNumber || product.manufacturerPartNumber);
    const ean = digits(product.ean || product.barcode);
    const litm = text(product.litm || product.alltronSku);
    const vid = variantId(product);

    let complete = true;
    if (!productTitle) { counts.missingTitle++; complete = false; }
    if (!productDescription) { counts.missingDescription++; complete = false; }
    if (!(productPrice > 0)) { counts.missingPrice++; complete = false; }
    if (!(productStock > 0)) { counts.missingStock++; complete = false; }
    if (!productImages.length) { counts.missingImage++; complete = false; }
    if (!complete) continue;
    counts.completeSellable++;

    const byVariant = vid && shopifyVariantIds.has(vid);
    const skuMatches = sku ? (shopifySkuCounts.get(sku) || 0) : 0;
    const barcodeMatches = ean ? (shopifyBarcodeCounts.get(ean) || 0) : 0;
    if (byVariant || skuMatches === 1 || barcodeMatches === 1) {
      counts.alreadyInShopify++;
      continue;
    }
    if (skuMatches > 1 || barcodeMatches > 1) {
      counts.ambiguousIdentity++;
      continue;
    }
    if (!litm || (!sku && !ean)) {
      counts.missingIdentity++;
      continue;
    }

    const uniqueKey = ean ? `ean:${ean}` : `sku:${sku}`;
    if (seenNewKeys.has(uniqueKey)) {
      counts.ambiguousIdentity++;
      continue;
    }
    seenNewKeys.add(uniqueKey);
    counts.safelyNew++;
    candidates.push({
      litm, sku, ean, title: productTitle, price: productPrice, stock: productStock,
      image: productImages[0], imagesCount: productImages.length,
      category: product.iumatecCategory || null,
    });
  }

  candidates.sort((a, b) => b.stock - a.stock || b.price - a.price);
  const report = {
    createdAt: new Date().toISOString(),
    mode: "READ_ONLY",
    sellingPriceField: "price",
    counts,
    firstBatchRecommendation: Math.min(100, counts.safelyNew),
    note: "No Shopify changes were made. Image validation is required before publishing a batch.",
  };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(SAMPLE, JSON.stringify(candidates.slice(0, 100), null, 2), "utf8");

  console.log("");
  console.log("========== SELLABLE EXPANSION AUDIT ==========");
  console.log(`Master products: ${counts.masterProducts}`);
  console.log(`Shopify variants: ${counts.shopifyVariants}`);
  console.log(`Complete sellable: ${counts.completeSellable}`);
  console.log(`Already in Shopify: ${counts.alreadyInShopify}`);
  console.log(`Safely new: ${counts.safelyNew}`);
  console.log(`Ambiguous identity - blocked: ${counts.ambiguousIdentity}`);
  console.log(`Missing identity - blocked: ${counts.missingIdentity}`);
  console.log(`Suggested first batch: ${report.firstBatchRecommendation}`);
  console.log(`Report: ${path.relative(ROOT, REPORT)}`);
  console.log(`100-product sample: ${path.relative(ROOT, SAMPLE)}`);
  console.log("Shopify changes: NONE");
  console.log("==============================================");
}

try { main(); }
catch (error) { console.error("FATAL:", error instanceof Error ? error.stack : String(error)); process.exit(1); }
