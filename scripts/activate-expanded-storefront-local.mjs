import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "integrations", "alltron", "out");
const CURRENT = path.join(OUT, "iumatec-storefront-clean.json");
const PREVIEW = path.join(OUT, "iumatec-storefront-expanded-preview.json");
const AUDIT = path.join(OUT, "iumatec-storefront-activation-audit.json");
const BACKUPS = path.join(OUT, "storefront-backups");
const MANIFEST = path.join(BACKUPS, "latest-backup.json");

// Esta versão foi preparada para a pré-visualização auditada em 26-07-2026.
// Para uma reconstrução futura com outra quantidade, indique explicitamente
// ACTIVATION_EXPECTED_COUNT antes de executar a auditoria e a ativação.
const EXPECTED_COUNT = Math.max(
  1,
  Number(process.env.ACTIVATION_EXPECTED_COUNT || 52248),
);
const ACTION = String(process.env.CATALOG_ACTION || "PREVIEW")
  .trim()
  .toUpperCase();
const APPLY =
  process.env.STOREFRONT_APPLY === "YES_ACTIVATE_LOCAL_CATALOG";
const ROLLBACK =
  process.env.STOREFRONT_ROLLBACK === "YES_RESTORE_LATEST_BACKUP";

function readArray(file, label) {
  if (!fs.existsSync(file)) {
    throw new Error(`${label} not found: ${file}`);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(data)) {
    throw new Error(`${label} must be a JSON array`);
  }
  return data;
}

function text(value) {
  return String(value ?? "").trim();
}

function number(value) {
  const parsed = Number(
    String(value ?? "").replace(/\s/g, "").replace(",", "."),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function images(product) {
  return [
    ...new Set(
      [
        product.image,
        product.imageUrl,
        product.mainImage,
        product.featuredImage,
        ...(Array.isArray(product.images) ? product.images : []),
        ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
      ]
        .filter(
          (value) =>
            typeof value === "string" &&
            /^https?:\/\//i.test(value.trim()),
        )
        .map((value) => value.trim()),
    ),
  ];
}

function variantId(product) {
  return text(product.merchandiseId || product.shopifyVariantId);
}

function safetyFailures(product) {
  const failures = [];
  const price = number(product.price);
  const cost = number(product.purchaseCostInclVat);
  const minimum = number(product.minimumSafePrice);
  const status = text(product.priceSafetyStatus);
  const stock = number(product.stockQty ?? product.stock);

  if (!text(product.title || product.fullTitle)) {
    failures.push("missing-title");
  }
  if (
    !text(
      product.slug ||
        product.productHandle ||
        product.shopifyProductHandle,
    )
  ) {
    failures.push("missing-handle");
  }
  if (
    !variantId(product).startsWith(
      "gid://shopify/ProductVariant/",
    )
  ) {
    failures.push("invalid-shopify-variant");
  }
  if (!(price > 0)) failures.push("invalid-price");
  if (!(stock > 0)) failures.push("no-stock");
  if (!images(product).length) failures.push("missing-image");

  // Proteções obrigatórias introduzidas no catálogo mestre seguro.
  if (!(cost > 0)) failures.push("missing-purchase-cost");
  if (!(minimum > 0)) failures.push("missing-minimum-safe-price");
  if (price + 0.0001 < minimum) {
    failures.push("price-below-safe-minimum");
  }
  if (
    !["current-price-safe", "raised-to-protected-minimum"].includes(
      status,
    )
  ) {
    failures.push(`unsafe-price-status:${status || "missing"}`);
  }
  if (/^blocked-/i.test(status)) {
    failures.push(`blocked-product:${status}`);
  }

  return failures;
}

function auditCatalog(products) {
  const problems = [];
  const variants = new Map();

  products.forEach((product, index) => {
    const id = variantId(product);
    const failures = safetyFailures(product);

    if (id) {
      if (variants.has(id)) {
        failures.push(`duplicate-variant-with-index:${variants.get(id)}`);
      } else {
        variants.set(id, index);
      }
    }

    if (failures.length) {
      problems.push({
        index,
        litm: text(product.litm || product.alltronSku),
        sku: text(product.sku),
        ean: text(product.ean),
        title: text(product.title || product.fullTitle),
        variantId: id,
        price: number(product.price),
        purchaseCostInclVat: number(product.purchaseCostInclVat),
        minimumSafePrice: number(product.minimumSafePrice),
        priceSafetyStatus: text(product.priceSafetyStatus),
        failures,
      });
    }
  });

  const bytes = JSON.stringify(products);
  return {
    generatedAt: new Date().toISOString(),
    expectedProducts: EXPECTED_COUNT,
    productsFound: products.length,
    uniqueVariants: variants.size,
    invalidProducts: problems.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    safeToActivate:
      products.length === EXPECTED_COUNT &&
      variants.size === products.length &&
      problems.length === 0,
    problems,
  };
}

function writeAudit(audit) {
  fs.writeFileSync(AUDIT, JSON.stringify(audit, null, 2), "utf8");
}

function requireSafeAudit(products) {
  const audit = auditCatalog(products);
  writeAudit(audit);
  if (!audit.safeToActivate) {
    throw new Error(
      `Safety stop: activation audit failed. See ${path.relative(ROOT, AUDIT)}`,
    );
  }
  return audit;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function atomicReplace(source, destination, displacedPath) {
  if (fs.existsSync(destination)) {
    fs.renameSync(destination, displacedPath);
  }
  try {
    fs.renameSync(source, destination);
  } catch (error) {
    if (
      fs.existsSync(displacedPath) &&
      !fs.existsSync(destination)
    ) {
      fs.renameSync(displacedPath, destination);
    }
    throw error;
  }
}

function previewActivation() {
  const current = readArray(CURRENT, "Current storefront");
  const expanded = readArray(PREVIEW, "Expanded preview");
  const audit = auditCatalog(expanded);
  writeAudit(audit);

  console.log("========== LOCAL STOREFRONT ACTIVATION AUDIT ==========");
  console.log("Mode: PREVIEW ONLY");
  console.log(`Expected products: ${EXPECTED_COUNT}`);
  console.log(`Current products: ${current.length}`);
  console.log(`Expanded products found: ${expanded.length}`);
  console.log(`Unique Shopify variants: ${audit.uniqueVariants}`);
  console.log(`Unsafe/invalid products: ${audit.invalidProducts}`);
  console.log(`Safe to activate: ${audit.safeToActivate ? "YES" : "NO"}`);
  console.log(`SHA-256: ${audit.sha256}`);
  console.log(`Audit: ${path.relative(ROOT, AUDIT)}`);
  console.log("Shopify changes: NONE");
  console.log("Current storefront changes: NONE");
  console.log("=======================================================");

  if (!audit.safeToActivate) {
    throw new Error("Safety stop: activation audit failed");
  }
}

function activate() {
  const current = readArray(CURRENT, "Current storefront");
  const expanded = readArray(PREVIEW, "Expanded preview");
  const audit = requireSafeAudit(expanded);

  fs.mkdirSync(BACKUPS, { recursive: true });
  const id = stamp();
  const backup = path.join(
    BACKUPS,
    `iumatec-storefront-clean-${id}.json`,
  );
  const temp = path.join(
    OUT,
    `iumatec-storefront-clean-${id}.tmp`,
  );
  fs.writeFileSync(temp, JSON.stringify(expanded, null, 2), "utf8");

  const written = readArray(temp, "Temporary storefront");
  const writtenAudit = auditCatalog(written);
  if (
    !writtenAudit.safeToActivate ||
    writtenAudit.sha256 !== audit.sha256
  ) {
    fs.unlinkSync(temp);
    throw new Error("Safety stop: temporary catalog verification failed");
  }

  atomicReplace(temp, CURRENT, backup);
  fs.writeFileSync(
    MANIFEST,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        backup,
        previousProducts: current.length,
        activatedProducts: expanded.length,
        activatedSha256: audit.sha256,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("========== LOCAL STOREFRONT ACTIVATED ==========");
  console.log(`Previous products: ${current.length}`);
  console.log(`Activated products: ${expanded.length}`);
  console.log(`SHA-256: ${audit.sha256}`);
  console.log(`Backup: ${path.relative(ROOT, backup)}`);
  console.log("Shopify changes: NONE");
  console.log("Restart the local development server and test /produkte.");
  console.log("================================================");
}

function rollback() {
  if (!fs.existsSync(MANIFEST)) {
    throw new Error(`Backup manifest not found: ${MANIFEST}`);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const backup = text(manifest.backup);
  if (!backup || !fs.existsSync(backup)) {
    throw new Error(`Backup file not found: ${backup}`);
  }
  const restored = readArray(backup, "Backup storefront");
  const id = stamp();
  const temp = path.join(
    OUT,
    `iumatec-storefront-restore-${id}.tmp`,
  );
  const displaced = path.join(
    BACKUPS,
    `iumatec-storefront-before-rollback-${id}.json`,
  );
  fs.copyFileSync(backup, temp);
  atomicReplace(temp, CURRENT, displaced);
  console.log("========== LOCAL STOREFRONT RESTORED ==========");
  console.log(`Restored products: ${restored.length}`);
  console.log(
    `Expanded catalog saved at: ${path.relative(ROOT, displaced)}`,
  );
  console.log("Shopify changes: NONE");
  console.log("Restart the local development server.");
  console.log("================================================");
}

try {
  if (ACTION === "ROLLBACK") {
    if (!ROLLBACK) {
      throw new Error("Rollback confirmation missing");
    }
    rollback();
  } else if (ACTION === "ACTIVATE") {
    if (!APPLY) {
      throw new Error("Activation confirmation missing");
    }
    activate();
  } else {
    previewActivation();
  }
} catch (error) {
  console.error(
    "FATAL:",
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
}
