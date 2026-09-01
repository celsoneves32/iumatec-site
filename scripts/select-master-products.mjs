import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const MASTER_PATH = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-catalog.json"
);

const OUTPUT_PATH = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-candidates.json"
);

const REPORT_PATH = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-candidates-report.json"
);

function text(value) {
  return String(value ?? "").trim();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstImage(product) {
  const candidates = [
    product.image,
    product.imageUrl,
    product.mainImage,
    product.featuredImage,
    product.shopifyFeaturedImage,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
  ];

  return candidates.find(
    (value) =>
      typeof value === "string" &&
      value.trim() &&
      /^https?:\/\//i.test(value.trim())
  )?.trim() || "";
}

function getDescription(product) {
  return text(
    product.description2 ||
    product.description ||
    product.longDescription ||
    product.shortDescription
  );
}

function getTitle(product) {
  return text(
    product.fullTitle ||
    product.title ||
    product.name ||
    product.sku ||
    product.litm
  );
}

function getSku(product) {
  return text(
    product.sku ||
    product.partNumber ||
    product.manufacturerPartNumber ||
    product.litm
  );
}

function getStock(product) {
  return number(
    product.stockQty ??
    product.stock ??
    product.quantity ??
    product.availableQuantity
  );
}

function getPrice(product) {
  return number(
    product.price ??
    product.salePrice ??
    product.retailPrice
  );
}

function main() {
  if (!fs.existsSync(MASTER_PATH)) {
    throw new Error(`Master catalog not found: ${MASTER_PATH}`);
  }

  console.log("Reading master catalog...");
  const raw = JSON.parse(fs.readFileSync(MASTER_PATH, "utf8"));

  if (!Array.isArray(raw)) {
    throw new Error("Master catalog is not an array.");
  }

  const report = {
    total: raw.length,
    accepted: 0,
    rejected: 0,
    missingSku: 0,
    missingTitle: 0,
    missingPrice: 0,
    missingStock: 0,
    missingImage: 0,
    missingDescription: 0,
    alreadyLinkedToShopify: 0,
  };

  const seenSkus = new Set();
  const candidates = [];

  for (const product of raw) {
    const sku = getSku(product).toUpperCase();
    const title = getTitle(product);
    const price = getPrice(product);
    const stock = getStock(product);
    const image = firstImage(product);
    const description = getDescription(product);

    let valid = true;

    if (!sku) {
      report.missingSku++;
      valid = false;
    }

    if (!title) {
      report.missingTitle++;
      valid = false;
    }

    if (!(price > 0)) {
      report.missingPrice++;
      valid = false;
    }

    if (!(stock > 0)) {
      report.missingStock++;
      valid = false;
    }

    if (!image) {
      report.missingImage++;
      valid = false;
    }

    if (!description) {
      report.missingDescription++;
      valid = false;
    }

    if (!valid || seenSkus.has(sku)) {
      report.rejected++;
      continue;
    }

    seenSkus.add(sku);

    const alreadyLinkedToShopify = Boolean(
      product.merchandiseId ||
      product.shopifyVariantId ||
      product.shopifyProductId
    );

    if (alreadyLinkedToShopify) {
      report.alreadyLinkedToShopify++;
    }

    candidates.push({
      ...product,
      sku,
      title,
      price,
      stock,
      image,
      description,
      alreadyLinkedToShopify,
    });

    report.accepted++;
  }

  candidates.sort((a, b) => {
    if (a.alreadyLinkedToShopify !== b.alreadyLinkedToShopify) {
      return Number(a.alreadyLinkedToShopify) -
        Number(b.alreadyLinkedToShopify);
    }

    if (b.stock !== a.stock) {
      return b.stock - a.stock;
    }

    return b.price - a.price;
  });

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(candidates, null, 2),
    "utf8"
  );

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log("");
  console.log("========== MASTER SELECTION DONE ==========");
  console.log(`Total master products: ${report.total}`);
  console.log(`Accepted candidates: ${report.accepted}`);
  console.log(`Rejected: ${report.rejected}`);
  console.log(`Already linked to Shopify: ${report.alreadyLinkedToShopify}`);
  console.log(`Missing SKU: ${report.missingSku}`);
  console.log(`Missing title: ${report.missingTitle}`);
  console.log(`Missing price: ${report.missingPrice}`);
  console.log(`Missing stock: ${report.missingStock}`);
  console.log(`Missing image: ${report.missingImage}`);
  console.log(`Missing description: ${report.missingDescription}`);
  console.log(`Candidates file: ${OUTPUT_PATH}`);
  console.log(`Report file: ${REPORT_PATH}`);
  console.log("===========================================");
}

try {
  main();
} catch (error) {
  console.error(
    "FATAL ERROR:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
}
