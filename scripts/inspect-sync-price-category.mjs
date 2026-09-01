import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "integrations", "alltron", "out");
const INPUT = path.join(OUT, "storefront-shopify-resolved.json");
const DRY_REPORT = path.join(OUT, "shopify-sync-dry-run-report.json");
const OUTPUT = path.join(OUT, "sync-price-category-diagnostic.json");

function text(value) {
  return String(value ?? "").trim();
}

function usefulPriceFields(product) {
  const result = {};
  for (const [key, value] of Object.entries(product)) {
    if (!/(price|preis|ecpr|expr|inpr|cost|margin|markup|purchase|retail|sale)/i.test(key)) {
      continue;
    }
    if (value === null || value === undefined || value === "") continue;
    if (["string", "number", "boolean"].includes(typeof value)) result[key] = value;
  }
  return result;
}

function compactCategory(product) {
  return {
    category: product.category ?? null,
    subcategory: product.subcategory ?? null,
    iumatecCategory: product.iumatecCategory ?? null,
    rawCategory: product.rawCategory ?? null,
    categoryPath: product.categoryPath ?? null,
    productType: product.productType ?? null,
    type: product.type ?? null,
    group: product.group ?? null,
  };
}

function run() {
  if (!fs.existsSync(INPUT)) throw new Error(`Missing file: ${INPUT}`);
  if (!fs.existsSync(DRY_REPORT)) throw new Error(`Missing file: ${DRY_REPORT}`);

  const products = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  const dryRun = JSON.parse(fs.readFileSync(DRY_REPORT, "utf8"));
  const comparisons = Array.isArray(dryRun.comparisons) ? dryRun.comparisons : [];
  const byProductId = new Map(
    products.map((product) => [text(product.shopifyProductId), product]),
  );

  const rows = comparisons.map((comparison) => {
    const product = byProductId.get(text(comparison.productId));
    if (!product) {
      return {
        productId: comparison.productId,
        title: comparison.title,
        error: "Product not found in resolved catalog",
      };
    }

    return {
      productId: comparison.productId,
      variantId: comparison.variantId,
      title: comparison.title,
      litm: product.litm ?? product.alltronSku ?? null,
      sku: product.sku ?? null,
      ean: product.ean ?? null,
      shopifyCurrentPrice: comparison?.changes?.price?.before ?? null,
      dryRunProposedPrice: comparison?.changes?.price?.after ?? null,
      allPriceLikeFields: usefulPriceFields(product),
      categories: compactCategory(product),
      descriptions: {
        description: product.description ?? null,
        description2: product.description2 ?? null,
        title: product.title ?? null,
        fullTitle: product.fullTitle ?? null,
      },
    };
  });

  const report = {
    createdAt: new Date().toISOString(),
    mode: "LOCAL_DIAGNOSTIC_ONLY",
    shopifyWrites: 0,
    productsInspected: rows.length,
    rows,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2), "utf8");

  console.log("========== PRICE/CATEGORY DIAGNOSTIC ==========");
  for (const row of rows) {
    console.log(`- ${row.title}`);
    console.log(`  Shopify: ${row.shopifyCurrentPrice}`);
    console.log(`  Proposed: ${row.dryRunProposedPrice}`);
    console.log(`  Price fields: ${JSON.stringify(row.allPriceLikeFields)}`);
    console.log(`  Category: ${JSON.stringify(row.categories.iumatecCategory)}`);
    console.log(`  Raw category: ${JSON.stringify(row.categories.rawCategory)}`);
  }
  console.log(`Report: ${path.relative(ROOT, OUTPUT)}`);
  console.log("Shopify changes: NONE");
  console.log("================================================");
}

try {
  run();
} catch (error) {
  console.error("FATAL:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
