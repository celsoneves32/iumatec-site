import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "integrations", "alltron", "out");
const STOREFRONT_FILE = path.join(OUT, "iumatec-storefront-clean.json");
const SHOPIFY_MAP_FILE = path.join(OUT, "shopify-product-variant-map.json");
const REPORT_FILE = path.join(OUT, "storefront-shopify-reconciliation-report.json");
const RESOLVED_FILE = path.join(OUT, "storefront-shopify-resolved.json");
const REVIEW_FILE = path.join(OUT, "storefront-shopify-review.json");

function text(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return text(value).toUpperCase();
}

function digits(value) {
  return text(value).replace(/\D/g, "");
}

function addIndex(index, key, row) {
  if (!key) return;
  const list = index.get(key) || [];
  list.push(row);
  index.set(key, list);
}

function uniqueByVariant(rows) {
  return [...new Map(rows.map((row) => [row.variantId || row.merchandiseId, row])).values()];
}

function masterVariantId(product) {
  return text(product.merchandiseId || product.shopifyVariantId);
}

function productSkuCandidates(product) {
  return [...new Set([
    normalized(product.sku),
    normalized(product.internalNumber),
    normalized(product.partNumber),
    normalized(product.manufacturerPartNumber),
    normalized(product.litm),
    normalized(product.alltronSku),
  ].filter(Boolean))];
}

function productEanCandidates(product) {
  return [...new Set([
    digits(product.ean),
    digits(product.barcode),
    digits(product.gtin),
  ].filter((value) => value.length >= 8))];
}

function compactProduct(product) {
  return {
    title: text(product.title || product.fullTitle || product.name),
    slug: text(product.slug),
    litm: text(product.litm || product.alltronSku),
    sku: text(product.sku),
    internalNumber: text(product.internalNumber),
    ean: text(product.ean || product.barcode || product.gtin),
    merchandiseId: masterVariantId(product),
  };
}

function compactShopify(row) {
  return {
    productId: text(row.productId),
    variantId: text(row.variantId || row.merchandiseId),
    sku: text(row.sku),
    barcode: text(row.barcode),
    handle: text(row.handle),
    productTitle: text(row.productTitle),
    productStatus: text(row.productStatus),
  };
}

function resolveProduct(product, indexes) {
  const knownVariantId = masterVariantId(product);
  if (knownVariantId) {
    const exact = indexes.byVariantId.get(knownVariantId);
    if (exact) {
      return { status: "resolved", method: "variantId", matches: [exact] };
    }
  }

  const skuRows = uniqueByVariant(
    productSkuCandidates(product).flatMap((key) => indexes.bySku.get(key) || []),
  );

  if (skuRows.length === 1) {
    return { status: "resolved", method: "uniqueSku", matches: skuRows };
  }

  const eanRows = uniqueByVariant(
    productEanCandidates(product).flatMap((key) => indexes.byBarcode.get(key) || []),
  );

  if (eanRows.length === 1) {
    return { status: "resolved", method: "uniqueBarcode", matches: eanRows };
  }

  if (skuRows.length > 1 && eanRows.length > 0) {
    const eanIds = new Set(eanRows.map((row) => row.variantId || row.merchandiseId));
    const intersection = skuRows.filter((row) =>
      eanIds.has(row.variantId || row.merchandiseId),
    );
    if (intersection.length === 1) {
      return { status: "resolved", method: "skuAndBarcode", matches: intersection };
    }
  }

  const ambiguous = uniqueByVariant([...skuRows, ...eanRows]);
  if (ambiguous.length > 0) {
    return { status: "ambiguous", method: "multipleMatches", matches: ambiguous };
  }

  return { status: "new", method: "notFound", matches: [] };
}

function readArray(file, label) {
  if (!fs.existsSync(file)) throw new Error(`${label} not found: ${file}`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(data)) throw new Error(`${label} must be a JSON array`);
  return data;
}

function run() {
  console.log("Reading approved storefront catalog...");
  const storefront = readArray(STOREFRONT_FILE, "Storefront catalog");
  console.log("Reading Shopify identity map...");
  const shopifyRows = readArray(SHOPIFY_MAP_FILE, "Shopify identity map");

  const indexes = {
    byVariantId: new Map(),
    bySku: new Map(),
    byBarcode: new Map(),
  };

  for (const row of shopifyRows) {
    const variantId = text(row.variantId || row.merchandiseId);
    if (variantId) indexes.byVariantId.set(variantId, row);
    addIndex(indexes.bySku, normalized(row.sku || row.skuNormalized), row);
    const barcode = digits(row.barcode);
    if (barcode.length >= 8) addIndex(indexes.byBarcode, barcode, row);
  }

  const resolved = [];
  const review = [];
  const methods = {};

  for (const product of storefront) {
    const result = resolveProduct(product, indexes);
    methods[result.method] = (methods[result.method] || 0) + 1;

    if (result.status === "resolved") {
      const match = result.matches[0];
      resolved.push({
        ...product,
        shopifyProductId: text(match.productId),
        shopifyVariantId: text(match.variantId || match.merchandiseId),
        merchandiseId: text(match.variantId || match.merchandiseId),
        shopifyHandle: text(match.handle),
        shopifyMatchMethod: result.method,
      });
    } else {
      review.push({
        status: result.status,
        method: result.method,
        product: compactProduct(product),
        matches: result.matches.map(compactShopify),
      });
    }
  }

  const ambiguous = review.filter((row) => row.status === "ambiguous");
  const newProducts = review.filter((row) => row.status === "new");
  const report = {
    createdAt: new Date().toISOString(),
    storefrontProducts: storefront.length,
    shopifyVariants: shopifyRows.length,
    resolved: resolved.length,
    ambiguous: ambiguous.length,
    notFoundPotentiallyNew: newProducts.length,
    methods,
    safety: {
      shopifyWritten: false,
      productsCreated: 0,
      productsUpdated: 0,
    },
    files: {
      resolved: path.relative(ROOT, RESOLVED_FILE),
      review: path.relative(ROOT, REVIEW_FILE),
    },
  };

  fs.writeFileSync(RESOLVED_FILE, JSON.stringify(resolved, null, 2), "utf8");
  fs.writeFileSync(REVIEW_FILE, JSON.stringify(review, null, 2), "utf8");
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("========== RECONCILIATION DONE ==========");
  console.log(`Approved storefront products: ${storefront.length}`);
  console.log(`Shopify variants: ${shopifyRows.length}`);
  console.log(`Resolved safely: ${resolved.length}`);
  console.log(`Ambiguous - blocked: ${ambiguous.length}`);
  console.log(`Not found - potentially new: ${newProducts.length}`);
  console.log(`By existing variant ID: ${methods.variantId || 0}`);
  console.log(`By unique SKU: ${methods.uniqueSku || 0}`);
  console.log(`By unique barcode: ${methods.uniqueBarcode || 0}`);
  console.log(`By SKU + barcode: ${methods.skuAndBarcode || 0}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_FILE)}`);
  console.log("Shopify changes: NONE");
  console.log("=========================================");
}

try {
  run();
} catch (error) {
  console.error("FATAL:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
