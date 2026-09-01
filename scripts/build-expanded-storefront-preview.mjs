import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "integrations", "alltron", "out");
const MASTER_FILE = path.join(OUT, "iumatec-master-catalog.json");
const SHOPIFY_MAP_FILE = path.join(OUT, "shopify-product-variant-map.json");
const CURRENT_FILE = path.join(OUT, "iumatec-storefront-clean.json");
const OUTPUT_FILE = path.join(OUT, "iumatec-storefront-expanded-preview.json");
const REPORT_FILE = path.join(OUT, "iumatec-storefront-expanded-preview-report.json");
const EXCLUSION_AUDIT_FILE = path.join(OUT, "iumatec-storefront-expanded-exclusion-audit.json");
const TARGET = Math.max(1, Number(process.env.EXPANSION_TARGET || 109000));
const AUDIT_EXAMPLE_LIMIT = 100;

const text = (value) => String(value ?? "").trim();
const MODE = text(process.env.EXPANSION_MODE || "TECH").toUpperCase();
const norm = (value) => text(value).toUpperCase().replace(/\s+/g, " ");
const digits = (value) => text(value).replace(/\D/g, "");
const number = (value) => {
  const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

function readArray(file, label, optional = false) {
  if (!fs.existsSync(file)) {
    if (optional) return [];
    throw new Error(`${label} not found: ${file}`);
  }
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

function title(product) { return text(product.fullTitle || product.title || product.name); }
function description(product) { return text(product.description2 || product.description || product.longDescription || product.shortDescription); }
function price(product) { return number(product.price ?? product.salePrice ?? product.retailPrice); }
function stock(product) { return number(product.stockQty ?? product.stock ?? product.quantity ?? product.availableQuantity); }
function variantId(value) {
  const id = digits(value);
  return id ? `gid://shopify/ProductVariant/${id}` : "";
}
function productVariantId(product) { return variantId(product.merchandiseId || product.shopifyVariantId || product.variantId); }
function addIndex(index, key, row) {
  if (!key) return;
  const rows = index.get(key) || [];
  rows.push(row);
  index.set(key, rows);
}
function uniqueVariants(rows) {
  return [...new Map(rows.map((row) => [variantId(row.variantId || row.merchandiseId), row])).values()];
}

function productSkuKeys(product) {
  return [...new Set([
    product.sku, product.internalNumber, product.partNumber,
    product.manufacturerPartNumber, product.litm, product.alltronSku,
  ].map(norm).filter(Boolean))];
}

function productEanKeys(product) {
  return [...new Set([product.ean, product.barcode, product.gtin]
    .map(digits).filter((value) => value.length >= 8))];
}

function resolutionDetails(product, indexes) {
  const known = productVariantId(product);
  if (known && indexes.byVariant.has(known)) {
    return { match: { row: indexes.byVariant.get(known), method: "variantId" }, reason: "" };
  }
  const skuKeys = productSkuKeys(product);
  const skuRows = uniqueVariants(skuKeys.flatMap((key) => indexes.bySku.get(key) || []));
  if (skuRows.length === 1) return { match: { row: skuRows[0], method: "uniqueSku" }, reason: "" };
  const eanKeys = productEanKeys(product);
  const eanRows = uniqueVariants(eanKeys.flatMap((key) => indexes.byBarcode.get(key) || []));
  if (eanRows.length === 1) return { match: { row: eanRows[0], method: "uniqueBarcode" }, reason: "" };
  if (skuRows.length > 1 && eanRows.length) {
    const eanIds = new Set(eanRows.map((row) => variantId(row.variantId || row.merchandiseId)));
    const intersection = skuRows.filter((row) => eanIds.has(variantId(row.variantId || row.merchandiseId)));
    if (intersection.length === 1) {
      return { match: { row: intersection[0], method: "skuAndBarcode" }, reason: "" };
    }
  }
  if (skuRows.length > 1) return { match: null, reason: "ambiguousSku" };
  if (eanRows.length > 1) return { match: null, reason: "ambiguousBarcode" };
  if (known) return { match: null, reason: "variantIdNotInShopifyMap" };
  if (!skuKeys.length && !eanKeys.length) return { match: null, reason: "missingIdentityKeys" };
  return { match: null, reason: "noSafeShopifyMatch" };
}

function uniqueProducts(rows) {
  return [...new Set(rows)];
}

function masterResolutionDetails(product, indexes) {
  const known = productVariantId(product);
  const variantRows = known ? uniqueProducts(indexes.byVariant.get(known) || []) : [];
  if (variantRows.length === 1) {
    return { product: variantRows[0], method: "variantId", reason: "" };
  }

  const skuKeys = productSkuKeys(product);
  const skuRows = uniqueProducts(skuKeys.flatMap((key) => indexes.bySku.get(key) || []));
  if (skuRows.length === 1) {
    return { product: skuRows[0], method: "uniqueSku", reason: "" };
  }

  const eanKeys = productEanKeys(product);
  const eanRows = uniqueProducts(eanKeys.flatMap((key) => indexes.byEan.get(key) || []));
  if (eanRows.length === 1) {
    return { product: eanRows[0], method: "uniqueEan", reason: "" };
  }

  if (skuRows.length > 1 && eanRows.length) {
    const eanSet = new Set(eanRows);
    const intersection = skuRows.filter((row) => eanSet.has(row));
    if (intersection.length === 1) {
      return { product: intersection[0], method: "skuAndEan", reason: "" };
    }
  }

  if (variantRows.length > 1) return { product: null, method: "", reason: "ambiguousMasterVariantId" };
  if (skuRows.length > 1) return { product: null, method: "", reason: "ambiguousMasterSku" };
  if (eanRows.length > 1) return { product: null, method: "", reason: "ambiguousMasterEan" };
  if (!known && !skuKeys.length && !eanKeys.length) {
    return { product: null, method: "", reason: "currentProductMissingIdentityKeys" };
  }
  return { product: null, method: "", reason: "notFoundInMasterByVariantSkuOrEan" };
}

function resolve(product, indexes) {
  return resolutionDetails(product, indexes).match;
}

function category(product) {
  const main = text(product?.iumatecCategory?.main || product.category || product?.rawCategory?.cat1 || "Weitere Produkte");
  const sub = text(product?.iumatecCategory?.sub || product.subcategory || product?.rawCategory?.cat2 || "Weitere Produkte");
  return { main, sub };
}

function categoryPriority(product) {
  const value = norm(category(product).main);
  const priorities = [
    "COMPUTER", "PC-KOMPONENTEN", "PERIPHERIE", "MOBILE", "NETZWERK",
    "DATENSPEICHER", "SMART HOME", "PRO AV", "COMPUTING", "NETZWERK & SERVER",
    "GEBÄUDE- & ELEKTROTECHNIK", "BÜRO & FREIZEIT",
  ];
  const index = priorities.findIndex((item) => value.includes(norm(item)));
  return index < 0 ? priorities.length : index;
}

function allowedInMode(product) {
  if (MODE === "ALL") return true;
  const mapped = category(product);
  const main = norm(mapped.main);
  const sub = norm(mapped.sub);

  const allowedMain = [
    "COMPUTER",
    "PC-KOMPONENTEN",
    "PERIPHERIE",
    "MOBILE",
    "NETZWERK",
    "DATENSPEICHER",
    "SMART HOME",
    "COMPUTING & SOFTWARE",
    "NETZWERK & SERVER",
    "PRO AV & MULTIMEDIA",
    "TELCO & UCC",
  ];
  if (allowedMain.some((value) => main === norm(value))) return true;

  if (main === norm("Gebäude- & Elektrotechnik")) {
    return [
      "GEBÄUDETECHNIK",
      "ENERGIE & STROMVERTEILUNG",
      "SICHERHEIT",
      "BELEUCHTUNG",
    ].some((value) => sub === norm(value));
  }

  return false;
}

function run() {
  console.log("Reading master catalog...");
  const master = readArray(MASTER_FILE, "Master catalog");
  console.log("Reading Shopify identity map...");
  const shopify = readArray(SHOPIFY_MAP_FILE, "Shopify identity map");
  const current = readArray(CURRENT_FILE, "Current storefront", true);

  const indexes = { byVariant: new Map(), bySku: new Map(), byBarcode: new Map() };
  for (const row of shopify) {
    const id = variantId(row.variantId || row.merchandiseId);
    if (id) indexes.byVariant.set(id, row);
    addIndex(indexes.bySku, norm(row.sku || row.skuNormalized), row);
    const barcode = digits(row.barcode || row.ean);
    if (barcode.length >= 8) addIndex(indexes.byBarcode, barcode, row);
  }
  const masterIndexes = { byVariant: new Map(), bySku: new Map(), byEan: new Map() };
  for (const product of master) {
    const id = productVariantId(product);
    if (id) addIndex(masterIndexes.byVariant, id, product);
    for (const key of productSkuKeys(product)) addIndex(masterIndexes.bySku, key, product);
    for (const key of productEanKeys(product)) addIndex(masterIndexes.byEan, key, product);
  }
  const currentVariants = new Set(current.map(productVariantId).filter(Boolean));
  const methods = {};
  const resolved = [];
  const seenVariants = new Set();
  const exclusionCounts = {};
  const exclusionExamples = {};
  const currentVariantStatus = new Map();
  const masterProductStatus = new WeakMap();

  function auditExample(product, reason, id = "") {
    exclusionCounts[reason] = (exclusionCounts[reason] || 0) + 1;
    const examples = exclusionExamples[reason] || [];
    if (examples.length < AUDIT_EXAMPLE_LIMIT) {
      examples.push({
        title: title(product),
        sku: text(product.sku || product.internalNumber || product.litm || product.alltronSku),
        ean: digits(product.ean || product.barcode || product.gtin),
        variantId: id || productVariantId(product),
        price: price(product),
        stock: stock(product),
        imageCount: images(product).length,
        category: category(product),
      });
      exclusionExamples[reason] = examples;
    }
  }

  for (const product of master) {
    const productImages = images(product);
    const productPrice = price(product);
    const productStock = stock(product);
    const knownCurrentId = productVariantId(product);
    let exclusionReason = "";
    if (!title(product)) exclusionReason = "missingTitle";
    else if (!description(product)) exclusionReason = "missingDescription";
    else if (!(productPrice > 0)) exclusionReason = "missingOrInvalidPrice";
    else if (!(productStock > 0)) exclusionReason = "outOfStock";
    else if (!productImages.length) exclusionReason = "missingValidatedImage";
    if (exclusionReason) {
      masterProductStatus.set(product, exclusionReason);
      auditExample(product, exclusionReason, knownCurrentId);
      if (knownCurrentId && currentVariants.has(knownCurrentId) && !currentVariantStatus.has(knownCurrentId)) {
        currentVariantStatus.set(knownCurrentId, exclusionReason);
      }
      continue;
    }
    const resolution = resolutionDetails(product, indexes);
    const match = resolution.match;
    if (!match) {
      exclusionReason = resolution.reason || "noSafeShopifyMatch";
      masterProductStatus.set(product, exclusionReason);
      auditExample(product, exclusionReason, knownCurrentId);
      if (knownCurrentId && currentVariants.has(knownCurrentId) && !currentVariantStatus.has(knownCurrentId)) {
        currentVariantStatus.set(knownCurrentId, exclusionReason);
      }
      continue;
    }
    if (!allowedInMode(product)) {
      exclusionReason = "categoryNotAllowedInMode";
      masterProductStatus.set(product, exclusionReason);
      auditExample(product, exclusionReason, knownCurrentId);
      if (knownCurrentId && currentVariants.has(knownCurrentId) && !currentVariantStatus.has(knownCurrentId)) {
        currentVariantStatus.set(knownCurrentId, exclusionReason);
      }
      continue;
    }
    const id = variantId(match.row.variantId || match.row.merchandiseId);
    const productId = text(match.row.productId);
    const handle = text(match.row.handle || match.row.productHandle);
    if (!id) exclusionReason = "resolvedVariantIdMissing";
    else if (!productId) exclusionReason = "shopifyProductIdMissing";
    else if (!handle) exclusionReason = "shopifyHandleMissing";
    else if (seenVariants.has(id)) exclusionReason = "duplicateResolvedVariant";
    if (exclusionReason) {
      masterProductStatus.set(product, exclusionReason);
      auditExample(product, exclusionReason, id || knownCurrentId);
      if ((id || knownCurrentId) && currentVariants.has(id || knownCurrentId) && !currentVariantStatus.has(id || knownCurrentId)) {
        currentVariantStatus.set(id || knownCurrentId, exclusionReason);
      }
      continue;
    }
    seenVariants.add(id);
    masterProductStatus.set(product, "safelyResolved");
    if (currentVariants.has(id)) currentVariantStatus.set(id, "safelyResolved");
    methods[match.method] = (methods[match.method] || 0) + 1;
    const mappedCategory = category(product);
    resolved.push({
      ...product,
      title: title(product),
      price: productPrice,
      stock: productStock,
      stockQty: productStock,
      inStock: true,
      image: productImages[0],
      images: productImages,
      imageUrls: productImages,
      category: mappedCategory.main,
      subcategory: mappedCategory.sub,
      merchandiseId: id,
      shopifyVariantId: id,
      shopifyProductId: productId,
      slug: handle,
      productHandle: handle,
      shopifyProductHandle: handle,
      shopifyMatchMethod: match.method,
      _wasInCurrentStorefront: currentVariants.has(id),
      _categoryPriority: categoryPriority(product),
    });
  }

  resolved.sort((a, b) => {
    if (a._wasInCurrentStorefront !== b._wasInCurrentStorefront) return Number(b._wasInCurrentStorefront) - Number(a._wasInCurrentStorefront);
    if (a._categoryPriority !== b._categoryPriority) return a._categoryPriority - b._categoryPriority;
    if (b.stock !== a.stock) return b.stock - a.stock;
    return a.price - b.price;
  });
  const selected = resolved.slice(0, TARGET).map(({ _wasInCurrentStorefront, _categoryPriority, ...product }) => product);
  const selectedVariants = new Set(selected.map(productVariantId).filter(Boolean));
  for (const product of resolved.slice(TARGET)) {
    const id = productVariantId(product);
    auditExample(product, "excludedByTargetLimit", id);
    if (currentVariants.has(id)) currentVariantStatus.set(id, "excludedByTargetLimit");
  }
  for (const id of selectedVariants) {
    if (currentVariants.has(id)) currentVariantStatus.set(id, "selected");
  }

  const missingCurrentCounts = {};
  const missingCurrentExamples = {};
  const currentMasterMatchMethods = {};
  for (const product of current) {
    const id = productVariantId(product);
    let status = id ? currentVariantStatus.get(id) : "";
    let masterMatchMethod = "";
    if (!status) {
      const masterResolution = masterResolutionDetails(product, masterIndexes);
      masterMatchMethod = masterResolution.method;
      if (masterResolution.product) {
        status = masterProductStatus.get(masterResolution.product) || "masterProductStatusMissing";
        if (status === "safelyResolved") {
          const shopifyResolution = resolutionDetails(masterResolution.product, indexes);
          const resolvedId = shopifyResolution.match
            ? variantId(shopifyResolution.match.row.variantId || shopifyResolution.match.row.merchandiseId)
            : "";
          status = resolvedId && selectedVariants.has(resolvedId)
            ? "selectedThroughMasterIdentityFallback"
            : "safelyResolvedButNotSelected";
        }
        currentMasterMatchMethods[masterMatchMethod] = (currentMasterMatchMethods[masterMatchMethod] || 0) + 1;
      } else {
        status = masterResolution.reason;
      }
    }
    if (status === "selected" || status === "selectedThroughMasterIdentityFallback") continue;
    missingCurrentCounts[status] = (missingCurrentCounts[status] || 0) + 1;
    const examples = missingCurrentExamples[status] || [];
    if (examples.length < AUDIT_EXAMPLE_LIMIT) {
      examples.push({
        title: title(product),
        sku: text(product.sku || product.internalNumber || product.litm || product.alltronSku),
        ean: digits(product.ean || product.barcode || product.gtin),
        variantId: id,
        masterMatchMethod,
      });
      missingCurrentExamples[status] = examples;
    }
  }
  const categories = {};
  for (const product of selected) {
    const key = `${product.category} > ${product.subcategory}`;
    categories[key] = (categories[key] || 0) + 1;
  }
  const report = {
    generatedAt: new Date().toISOString(), mode: "PREVIEW_ONLY", expansionMode: MODE,
    target: TARGET, masterProducts: master.length, shopifyVariants: shopify.length,
    currentStorefrontProducts: current.length, safelyResolvedComplete: resolved.length,
    selectedProducts: selected.length, methods,
    topCategories: Object.fromEntries(Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 100)),
    currentStorefrontWasNotModified: true, shopifyWasNotModified: true,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(selected, null, 2), "utf8");
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(EXCLUSION_AUDIT_FILE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: "PREVIEW_ONLY_AUDIT",
    expansionMode: MODE,
    masterProducts: master.length,
    currentStorefrontProducts: current.length,
    selectedProducts: selected.length,
    exclusionCounts,
    exclusionExamples,
    currentProductsNotSelected: Object.values(missingCurrentCounts).reduce((sum, count) => sum + count, 0),
    currentProductsNotSelectedByReason: missingCurrentCounts,
    currentProductsNotSelectedExamples: missingCurrentExamples,
    currentProductsMatchedToMasterByFallback: currentMasterMatchMethods,
    notes: [
      "exclusionCounts uses the first failing criterion in the same order as the preview builder.",
      "Current storefront products are matched back to the master by variant ID, then unique SKU, then unique EAN.",
      `Examples are limited to ${AUDIT_EXAMPLE_LIMIT} per reason.`,
      "This audit does not modify the active storefront or Shopify.",
    ],
  }, null, 2), "utf8");
  console.log("");
  console.log("========== EXPANDED STOREFRONT PREVIEW ==========");
  console.log(`Expansion mode: ${MODE}`);
  console.log(`Target: ${TARGET}`);
  console.log(`Safely resolved complete: ${resolved.length}`);
  console.log(`Selected for preview: ${selected.length}`);
  console.log(`Current catalog preserved: ${current.length}`);
  console.log(`By variant ID: ${methods.variantId || 0}`);
  console.log(`By unique SKU: ${methods.uniqueSku || 0}`);
  console.log(`By unique barcode: ${methods.uniqueBarcode || 0}`);
  console.log(`By SKU + barcode: ${methods.skuAndBarcode || 0}`);
  console.log(`Preview: ${path.relative(ROOT, OUTPUT_FILE)}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_FILE)}`);
  console.log(`Exclusion audit: ${path.relative(ROOT, EXCLUSION_AUDIT_FILE)}`);
  console.log("");
  console.log("Master exclusions by first failing criterion:");
  for (const [reason, count] of Object.entries(exclusionCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count}`);
  }
  console.log("");
  console.log("Current storefront products not selected:");
  for (const [reason, count] of Object.entries(missingCurrentCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count}`);
  }
  console.log("Shopify changes: NONE");
  console.log("Current storefront changes: NONE");
  console.log("=================================================");
}

try { run(); }
catch (error) { console.error("FATAL:", error instanceof Error ? error.stack : String(error)); process.exit(1); }
