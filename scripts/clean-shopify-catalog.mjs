import fs from "fs";
import path from "path";

const inputFiles = [
  "integrations/alltron/out/iumatec-tech-catalog.json",
  "integrations/alltron/out/iumatec-catalog-live.json",
  "integrations/alltron/out/winning-products.json",
  "integrations/alltron/out/iumatec-catalog-sellable.json",
  "integrations/alltron/out/iumatec-catalog-filtered.json",
  "integrations/alltron/out/iumatec-catalog-enriched.json",
];

const outputFile =
  "integrations/alltron/out/iumatec-master-catalog.json";

function readJson(relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`Missing: ${relativePath}`);
    return [];
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(fullPath, "utf8"),
    );

    if (!Array.isArray(parsed)) {
      console.log(`Not an array: ${relativePath}`);
      return [];
    }

    console.log(`${relativePath}: ${parsed.length}`);
    return parsed;
  } catch (error) {
    console.error(`Failed to read ${relativePath}:`, error);
    return [];
  }
}

function cleanString(value) {
  return String(value ?? "").trim();
}

function normalize(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function uniqueStrings(values) {
  return [
    ...new Set(
      values
        .map((value) => cleanString(value))
        .filter(Boolean),
    ),
  ];
}

function getImages(product) {
  const images = [];

  if (typeof product.image === "string") {
    images.push(product.image);
  }

  const arrayFields = [
    product.images,
    product.imageUrls,
    product.gallery,
    product.shopifyImages,
  ];

  for (const field of arrayFields) {
    if (!Array.isArray(field)) continue;

    for (const image of field) {
      if (typeof image === "string") {
        images.push(image);
      }
    }
  }

  if (typeof product.shopifyImageUrl === "string") {
    images.push(product.shopifyImageUrl);
  }

  return uniqueStrings(images).filter(
    (url) =>
      url.startsWith("https://") ||
      url.startsWith("http://"),
  );
}

function getVariantId(product) {
  const raw =
    product.merchandiseId ||
    product.shopifyVariantId ||
    "";

  const value = cleanString(raw);

  if (!value) return "";

  if (
    value.startsWith(
      "gid://shopify/ProductVariant/",
    )
  ) {
    return value;
  }

  const numeric = value.replace(/[^\d]/g, "");

  return numeric
    ? `gid://shopify/ProductVariant/${numeric}`
    : "";
}

function getStock(product) {
  return toNumber(
    product.stockQty ??
      product.stock ??
      product.quantity ??
      0,
  );
}

function getPrice(product) {
  return toNumber(
    product.price ??
      product.finalPrice ??
      product.shopifyPrice ??
      0,
  );
}

function getIdentityKeys(product) {
  const keys = [];

  const variantId = getVariantId(product);
  const litm = cleanString(
    product.litm || product.alltronSku,
  );
  const ean = cleanString(product.ean);
  const internalNumber = cleanString(
    product.internalNumber,
  );
  const sku = cleanString(product.sku);

  if (variantId) {
    keys.push(`variant:${variantId}`);
  }

  if (litm) {
    keys.push(`litm:${normalize(litm)}`);
  }

  if (ean) {
    keys.push(`ean:${normalize(ean)}`);
  }

  if (internalNumber) {
    keys.push(
      `internal:${normalize(internalNumber)}`,
    );
  }

  if (sku) {
    keys.push(`sku:${normalize(sku)}`);
  }

  return uniqueStrings(keys);
}

function chooseLongerText(first, second) {
  const a = cleanString(first);
  const b = cleanString(second);

  if (!a) return b;
  if (!b) return a;

  return b.length > a.length ? b : a;
}

function choosePreferredText(first, second) {
  const a = cleanString(first);
  const b = cleanString(second);

  return b || a;
}

function choosePositiveNumber(first, second) {
  const a = toNumber(first);
  const b = toNumber(second);

  if (b > 0) return b;
  return a;
}

function mergeObjects(first, second) {
  if (!first && !second) return undefined;
  if (!first) return second;
  if (!second) return first;

  return {
    ...first,
    ...second,
  };
}

function mergeProducts(current, incoming) {
  if (!current) {
    const images = getImages(incoming);

    return {
      ...incoming,
      merchandiseId: getVariantId(incoming),
      shopifyVariantId:
        incoming.shopifyVariantId ||
        getVariantId(incoming),
      image: images[0] || "",
      images,
      imageUrls: images,
      stockQty: getStock(incoming),
      stock: getStock(incoming),
      inStock: getStock(incoming) > 0,
      price: getPrice(incoming),
      _sources: uniqueStrings([
        incoming._sourceFile,
      ]),
    };
  }

  const images = uniqueStrings([
    ...getImages(current),
    ...getImages(incoming),
  ]);

  const variantId =
    getVariantId(incoming) ||
    getVariantId(current);

  const stock =
    getStock(incoming) > 0
      ? getStock(incoming)
      : getStock(current);

  const price =
    getPrice(incoming) > 0
      ? getPrice(incoming)
      : getPrice(current);

  return {
    ...current,
    ...incoming,

    litm:
      choosePreferredText(
        current.litm,
        incoming.litm,
      ) ||
      choosePreferredText(
        current.alltronSku,
        incoming.alltronSku,
      ),

    alltronSku:
      choosePreferredText(
        current.alltronSku,
        incoming.alltronSku,
      ) ||
      choosePreferredText(
        current.litm,
        incoming.litm,
      ),

    sku: choosePreferredText(
      current.sku,
      incoming.sku,
    ),

    internalNumber: choosePreferredText(
      current.internalNumber,
      incoming.internalNumber,
    ),

    ean: choosePreferredText(
      current.ean,
      incoming.ean,
    ),

    brand: choosePreferredText(
      current.brand,
      incoming.brand,
    ),

    title: chooseLongerText(
      current.title,
      incoming.title,
    ),

    title2: chooseLongerText(
      current.title2,
      incoming.title2,
    ),

    fullTitle: chooseLongerText(
      current.fullTitle,
      incoming.fullTitle,
    ),

    description: chooseLongerText(
      current.description,
      incoming.description,
    ),

    description2: chooseLongerText(
      current.description2,
      incoming.description2,
    ),

    deliveryDate: choosePreferredText(
      current.deliveryDate,
      incoming.deliveryDate,
    ),

    warrantyMonths: choosePositiveNumber(
      current.warrantyMonths,
      incoming.warrantyMonths,
    ),

    weight: choosePositiveNumber(
      current.weight,
      incoming.weight,
    ),

    merchandiseId: variantId,

    shopifyVariantId:
      incoming.shopifyVariantId ||
      current.shopifyVariantId ||
      variantId,

    shopifyProductId:
      incoming.shopifyProductId ||
      current.shopifyProductId ||
      "",

    shopifyProductHandle:
      incoming.shopifyProductHandle ||
      current.shopifyProductHandle ||
      incoming.productHandle ||
      current.productHandle ||
      incoming.slug ||
      current.slug ||
      "",

    productHandle:
      incoming.productHandle ||
      current.productHandle ||
      incoming.shopifyProductHandle ||
      current.shopifyProductHandle ||
      incoming.slug ||
      current.slug ||
      "",

    slug:
      incoming.slug ||
      current.slug ||
      incoming.shopifyProductHandle ||
      current.shopifyProductHandle ||
      "",

    shopifySyncStatus:
      incoming.shopifySyncStatus ||
      current.shopifySyncStatus ||
      "",

    shopifyMatchStatus:
      incoming.shopifyMatchStatus ||
      current.shopifyMatchStatus ||
      "",

    price,
    stockQty: stock,
    stock,
    inStock: stock > 0,

    image: images[0] || "",
    images,
    imageUrls: images,

    rawCategory: mergeObjects(
      current.rawCategory,
      incoming.rawCategory,
    ),

    iumatecCategory: mergeObjects(
      current.iumatecCategory,
      incoming.iumatecCategory,
    ),

    category:
      incoming.category ||
      current.category ||
      "",

    subcategory:
      incoming.subcategory ||
      current.subcategory ||
      "",

    _sources: uniqueStrings([
      ...(Array.isArray(current._sources)
        ? current._sources
        : []),
      ...(Array.isArray(incoming._sources)
        ? incoming._sources
        : []),
      incoming._sourceFile,
    ]),
  };
}

const records = [];

for (const inputFile of inputFiles) {
  const products = readJson(inputFile);

  for (const product of products) {
    records.push({
      ...product,
      _sourceFile: inputFile,
    });
  }
}

console.log("");
console.log("Total records loaded:", records.length);

const masterProducts = [];
const keyToIndex = new Map();

for (const record of records) {
  const keys = getIdentityKeys(record);

  let existingIndex = null;

  for (const key of keys) {
    if (keyToIndex.has(key)) {
      existingIndex = keyToIndex.get(key);
      break;
    }
  }

  if (existingIndex === null) {
    const newIndex = masterProducts.length;
    const merged = mergeProducts(null, record);

    masterProducts.push(merged);

    for (const key of keys) {
      keyToIndex.set(key, newIndex);
    }

    continue;
  }

  const merged = mergeProducts(
    masterProducts[existingIndex],
    record,
  );

  masterProducts[existingIndex] = merged;

  const mergedKeys = getIdentityKeys(merged);

  for (const key of [
    ...keys,
    ...mergedKeys,
  ]) {
    keyToIndex.set(key, existingIndex);
  }
}

const cleanedMaster = masterProducts.map(
  ({ _sourceFile, ...product }) => product,
);

cleanedMaster.sort((first, second) => {
  const stockDifference =
    getStock(second) - getStock(first);

  if (stockDifference !== 0) {
    return stockDifference;
  }

  return getPrice(second) - getPrice(first);
});

const outputPath = path.join(
  process.cwd(),
  outputFile,
);

fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
});

fs.writeFileSync(
  outputPath,
  JSON.stringify(cleanedMaster, null, 2),
  "utf8",
);

const withVariant = cleanedMaster.filter(
  (product) => Boolean(getVariantId(product)),
);

const withImages = cleanedMaster.filter(
  (product) => getImages(product).length > 0,
);

const withDescription = cleanedMaster.filter(
  (product) =>
    cleanString(product.description) ||
    cleanString(product.description2),
);

const withPrice = cleanedMaster.filter(
  (product) => getPrice(product) > 0,
);

const withStock = cleanedMaster.filter(
  (product) => getStock(product) > 0,
);

console.log("");
console.log("========== MASTER CATALOG DONE ==========");
console.log("Loaded records:", records.length);
console.log("Unique products:", cleanedMaster.length);
console.log("With Shopify variant:", withVariant.length);
console.log("With images:", withImages.length);
console.log(
  "With description:",
  withDescription.length,
);
console.log("With price:", withPrice.length);
console.log("With stock:", withStock.length);
console.log("Output:", outputFile);
console.log("=========================================");

console.log("");
console.log("========== PHILIPS CHECK ==========");

const philipsProducts = cleanedMaster.filter(
  (product) =>
    cleanString(product.title)
      .toLowerCase()
      .includes("32b2u3601"),
);

for (const product of philipsProducts) {
  console.log({
    litm: product.litm,
    sku: product.sku,
    title: product.title,
    merchandiseId: product.merchandiseId,
    price: product.price,
    stock: product.stockQty,
    images: getImages(product).length,
    description: product.description,
    description2: product.description2,
    warrantyMonths: product.warrantyMonths,
    sources: product._sources,
  });
}

console.log("===================================");