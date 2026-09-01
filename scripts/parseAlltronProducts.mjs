import fs from "fs";
import path from "path";
import iconv from "iconv-lite";
import { XMLParser } from "fast-xml-parser";

const xmlFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "ArtikeldatenV2.xml",
);

const priceXmlFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "PreisdatenV2.xml",
);

const imageCsvFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "alltron-bilder-urls.csv",
);

const energyXmlFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "alltron-energielabels.xml",
);

const outputFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-tech-catalog.json",
);

const imageAuditFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-image-association-audit.json",
);

const energyAuditFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-energy-association-audit.json",
);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
  trimValues: true,
});

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function clean(value) {
  return String(value ?? "").trim();
}

function toNumber(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
}

function uniqueUrls(urls) {
  return [
    ...new Set(
      urls
        .map((url) => clean(url))
        .filter(
          (url) =>
            url.startsWith("http://") ||
            url.startsWith("https://"),
        ),
    ),
  ];
}

function decodeXml(buffer) {
  const beginning = buffer
    .subarray(0, Math.min(buffer.length, 500))
    .toString("ascii");

  const declaredEncoding =
    beginning.match(/encoding=["']([^"']+)["']/i)?.[1] || "";

  if (/1252|windows-1252/i.test(declaredEncoding)) {
    return iconv.decode(buffer, "windows-1252");
  }

  if (/8859-1|latin1/i.test(declaredEncoding)) {
    return iconv.decode(buffer, "iso-8859-1");
  }

  return iconv.decode(buffer, "utf8");
}

function repairText(value) {
  let text = clean(value);

  if (!text) return "";

  const looksBroken =
    text.includes("Ã") ||
    text.includes("Â") ||
    text.includes("â€") ||
    text.includes("├");

  if (!looksBroken) {
    return text;
  }

  try {
    const repaired = Buffer.from(text, "latin1").toString("utf8");

    if (!repaired.includes(" ")) {
      text = repaired;
    }
  } catch {
    // Mantém o texto original quando não for possível reparar.
  }

  return text;
}

function getXmlImages(product) {
  const possibleItems = [
    ...normalizeArray(product?.media?.item),
    ...normalizeArray(product?.media?.image),
    ...normalizeArray(product?.images?.image),
    ...normalizeArray(product?.images?.item),
    ...normalizeArray(product?.product_media?.item),
  ];

  const urls = possibleItems
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      return (
        item?.MIME_SOURCE ||
        item?.SOURCE ||
        item?.URL ||
        item?.MEDIA_URL ||
        item?.ImageURL ||
        item?.imageUrl ||
        item?.url ||
        ""
      );
    })
    .filter(Boolean);

  return uniqueUrls(urls);
}

function parseCsvLine(line, delimiter = ";") {
  const columns = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index++;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === delimiter && !quoted) {
      columns.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  columns.push(current.trim());
  return columns;
}

function normalizeHeader(value) {
  return clean(value)
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findColumnIndex(headers, candidates) {
  const normalizedCandidates = candidates.map(normalizeHeader);

  return headers.findIndex((header) =>
    normalizedCandidates.includes(normalizeHeader(header)),
  );
}

function loadImageMap(validLitms) {
  const audit = {
    source: imageCsvFile,
    matchingRule:
      "Exact LITM + explicit image URL from official CSV; shared URLs are accepted",
    csvLines: 0,
    acceptedRows: 0,
    acceptedProducts: 0,
    acceptedSharedUrlRows: 0,
    acceptedSharedUrlProducts: 0,
    sharedUrls: 0,
    rejectedRows: 0,
    rejectedByReason: {},
    rejectedExamples: [],
    sharedUrlAssociations: [],
  };

  function reject(reason, details = {}) {
    audit.rejectedRows++;
    audit.rejectedByReason[reason] =
      (audit.rejectedByReason[reason] || 0) + 1;

    if (audit.rejectedExamples.length < 500) {
      audit.rejectedExamples.push({
        reason,
        ...details,
      });
    }
  }

  if (!fs.existsSync(imageCsvFile)) {
    console.warn(`Image CSV not found: ${imageCsvFile}`);
    audit.rejectedByReason.imageCsvMissing = 1;
    return {
      imageMap: new Map(),
      audit,
    };
  }

  console.log("Reading image CSV:", imageCsvFile);

  const raw = fs.readFileSync(imageCsvFile, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  audit.csvLines = lines.length;

  if (lines.length === 0) {
    return {
      imageMap: new Map(),
      audit,
    };
  }

  const headers = parseCsvLine(lines[0]);
  let litmColumn = findColumnIndex(headers, [
    "LITM",
    "AlltronSku",
    "AlltronArticleNumber",
    "ArticleNumber",
    "Artikelnummer",
  ]);
  let urlColumn = findColumnIndex(headers, [
    "URL",
    "ImageURL",
    "BildURL",
    "MIME_SOURCE",
    "SOURCE",
  ]);

  const hasRecognizedHeader =
    litmColumn !== -1 &&
    urlColumn !== -1;

  if (!hasRecognizedHeader) {
    litmColumn = 0;
    urlColumn = 1;
  }

  const firstDataLine = hasRecognizedHeader ? 1 : 0;
  const candidates = [];

  for (let index = firstDataLine; index < lines.length; index++) {
    const columns = parseCsvLine(lines[index]);
    const alltronSku = clean(columns[litmColumn])
      .replace(/^\uFEFF/, "");
    const imageUrl = clean(columns[urlColumn]);

    if (!alltronSku) {
      reject("missingLITM", {
        line: index + 1,
      });
      continue;
    }

    if (!validLitms.has(alltronSku)) {
      reject("litmNotFoundInProductXml", {
        line: index + 1,
        litm: alltronSku,
      });
      continue;
    }

    if (
      !imageUrl.startsWith("https://") &&
      !imageUrl.startsWith("http://")
    ) {
      reject("invalidImageUrl", {
        line: index + 1,
        litm: alltronSku,
        value: imageUrl.slice(0, 200),
      });
      continue;
    }

    candidates.push({
      line: index + 1,
      litm: alltronSku,
      url: imageUrl,
    });
  }

  const urlOwners = new Map();

  for (const candidate of candidates) {
    const owners = urlOwners.get(candidate.url) || new Set();
    owners.add(candidate.litm);
    urlOwners.set(candidate.url, owners);
  }

  const sharedUrls = new Set(
    [...urlOwners.entries()]
      .filter(([, owners]) => owners.size > 1)
      .map(([url]) => url),
  );

  audit.sharedUrls = sharedUrls.size;
  audit.sharedUrlAssociations = [...sharedUrls]
    .slice(0, 500)
    .map((url) => ({
      url,
      litms: [...urlOwners.get(url)],
      accepted: true,
      reason:
        "The official CSV explicitly assigns this URL to every listed LITM",
    }));

  const imageMap = new Map();
  const acceptedPairs = new Set();
  const productsWithAcceptedSharedUrls = new Set();

  for (const candidate of candidates) {
    const pairKey = `${candidate.litm}\u0000${candidate.url}`;

    if (acceptedPairs.has(pairKey)) {
      reject("duplicateCsvRow", {
        line: candidate.line,
        litm: candidate.litm,
        url: candidate.url,
      });
      continue;
    }

    acceptedPairs.add(pairKey);

    const currentImages = imageMap.get(candidate.litm) || [];
    currentImages.push(candidate.url);
    imageMap.set(candidate.litm, currentImages);
    audit.acceptedRows++;

    if (sharedUrls.has(candidate.url)) {
      audit.acceptedSharedUrlRows++;
      productsWithAcceptedSharedUrls.add(candidate.litm);
    }
  }

  audit.acceptedProducts = imageMap.size;
  audit.acceptedSharedUrlProducts =
    productsWithAcceptedSharedUrls.size;

  console.log("Image CSV lines:", lines.length);
  console.log("Products with CSV images:", imageMap.size);
  console.log("Accepted CSV image rows:", audit.acceptedRows);
  console.log("Shared image URLs accepted:", audit.sharedUrls);
  console.log(
    "Products using accepted shared URLs:",
    audit.acceptedSharedUrlProducts,
  );
  console.log("Rejected CSV image rows:", audit.rejectedRows);

  return {
    imageMap,
    audit,
  };
}

function getXmlItems(xmlData) {
  return normalizeArray(
    xmlData?.items?.item ||
    xmlData?.prices?.item ||
    xmlData?.ITEMS?.item ||
    xmlData?.ITEMS?.ITEM ||
    xmlData?.PRICES?.item ||
    xmlData?.PRICES?.ITEM ||
    xmlData?.root?.items?.item ||
    xmlData?.root?.prices?.item ||
    xmlData?.root?.ITEMS?.ITEM ||
    xmlData?.root?.PRICES?.ITEM,
  );
}

function getEnergyProducts(xmlData) {
  return normalizeArray(
    xmlData?.products?.product ||
    xmlData?.PRODUCTS?.product ||
    xmlData?.PRODUCTS?.PRODUCT ||
    xmlData?.root?.products?.product ||
    xmlData?.root?.PRODUCTS?.PRODUCT,
  );
}

function loadEnergyMap(validLitms) {
  const audit = {
    source: energyXmlFile,
    matchingRule: "Exact SKU from energy feed matched to Alltron LITM",
    totalRecords: 0,
    uniqueSkus: 0,
    matchedProducts: 0,
    recordsWithEnergyLabel: 0,
    recordsWithAnyEnergyClass: 0,
    recordsWithEnergyClass: 0,
    recordsWithEnergyClassAtoG: 0,
    recordsWithEnergyClassAPPtoG: 0,
    recordsWithEnEV2020Class: 0,
    orphanSkus: 0,
    orphanExamples: [],
  };

  if (!fs.existsSync(energyXmlFile)) {
    console.warn(`Energy label XML not found: ${energyXmlFile}`);
    return {
      energyMap: new Map(),
      audit: {
        ...audit,
        missing: true,
      },
    };
  }

  console.log("Reading energy label XML:", energyXmlFile);

  const energyBuffer = fs.readFileSync(energyXmlFile);
  const energyText = decodeXml(energyBuffer);
  const energyData = parser.parse(energyText);
  const energyProducts = getEnergyProducts(energyData);

  audit.totalRecords = energyProducts.length;

  const energyMap = new Map();
  const allSkus = new Set();
  const matchedSkus = new Set();

  for (const item of energyProducts) {
    const sku = clean(item?.SKU);

    if (!sku) continue;

    allSkus.add(sku);

    const energyLabelUrl = clean(item?.EnergyLabel);
    const energyClass = repairText(item?.Energyclass);
    const energyClassAtoG = repairText(item?.EnergyclassAbisG);
    const energyClassAPPtoG = repairText(item?.EnergyclassAPPbisG);
    const energyEfficiencyClassEnEV2020 = repairText(
      item?.EnergieeffizienzklasseEnEV2020,
    );

    if (energyLabelUrl) {
      audit.recordsWithEnergyLabel++;
    }

    if (energyClass) {
      audit.recordsWithEnergyClass++;
    }

    if (energyClassAtoG) {
      audit.recordsWithEnergyClassAtoG++;
    }

    if (energyClassAPPtoG) {
      audit.recordsWithEnergyClassAPPtoG++;
    }

    if (energyEfficiencyClassEnEV2020) {
      audit.recordsWithEnEV2020Class++;
    }

    if (
      energyClass ||
      energyClassAtoG ||
      energyClassAPPtoG ||
      energyEfficiencyClassEnEV2020
    ) {
      audit.recordsWithAnyEnergyClass++;
    }

    if (!validLitms.has(sku)) {
      if (audit.orphanExamples.length < 200) {
        audit.orphanExamples.push(sku);
      }
      continue;
    }

    matchedSkus.add(sku);

    energyMap.set(sku, {
      energyLabelUrl:
        energyLabelUrl.startsWith("http://") ||
        energyLabelUrl.startsWith("https://")
          ? energyLabelUrl
          : null,
      energyClass: energyClass || null,
      energyClassAtoG: energyClassAtoG || null,
      energyClassAPPtoG: energyClassAPPtoG || null,
      energyEfficiencyClassEnEV2020:
        energyEfficiencyClassEnEV2020 || null,
    });
  }

  audit.uniqueSkus = allSkus.size;
  audit.matchedProducts = matchedSkus.size;
  audit.orphanSkus = [...allSkus].filter(
    (sku) => !validLitms.has(sku),
  ).length;

  console.log("Energy records found in XML:", audit.totalRecords);
  console.log("Energy SKUs:", audit.uniqueSkus);
  console.log("Energy products matched:", audit.matchedProducts);
  console.log(
    "Energy records with label URL:",
    audit.recordsWithEnergyLabel,
  );
  console.log(
    "Energy records with any class:",
    audit.recordsWithAnyEnergyClass,
  );
  console.log("Energy SKUs not found in product XML:", audit.orphanSkus);

  return {
    energyMap,
    audit,
  };
}

function loadPriceMap() {
  if (!fs.existsSync(priceXmlFile)) {
    throw new Error(`Price XML file not found: ${priceXmlFile}`);
  }

  console.log("Reading price XML:", priceXmlFile);

  const priceXmlBuffer = fs.readFileSync(priceXmlFile);
  const priceXmlText = decodeXml(priceXmlBuffer);
  const priceXmlData = parser.parse(priceXmlText);
  const priceItems = getXmlItems(priceXmlData);

  console.log("Price records found in XML:", priceItems.length);

  const priceMap = new Map();

  for (const item of priceItems) {
    const litm = clean(item?.LITM);

    if (!litm) continue;

    const priceData =
      item?.price ||
      item?.price_information ||
      {};

    priceMap.set(litm, {
      ecpr: toNumber(priceData?.ECPR),
      expr: toNumber(priceData?.EXPR),
      inpr: toNumber(priceData?.INPR),
      vat: toNumber(priceData?.VATR ?? priceData?.VAT),
    });
  }

  console.log("Price map entries:", priceMap.size);

  return priceMap;
}

console.log("Reading XML:", xmlFile);

if (!fs.existsSync(xmlFile)) {
  throw new Error(`XML file not found: ${xmlFile}`);
}

const priceMap = loadPriceMap();

const xmlBuffer = fs.readFileSync(xmlFile);
const xmlText = decodeXml(xmlBuffer);
const xmlData = parser.parse(xmlText);

const items = getXmlItems(xmlData);

console.log("Products found in XML:", items.length);

const validLitms = new Set(
  items
    .map((product) => clean(product?.LITM))
    .filter(Boolean),
);

const {
  imageMap,
  audit: imageAssociationAudit,
} = loadImageMap(validLitms);

const {
  energyMap,
  audit: energyAssociationAudit,
} = loadEnergyMap(validLitms);

const products = items.map((product) => {
  const litm = clean(product?.LITM);

  const sku = clean(product?.part_number?.LITT);
  const internalNumber = clean(product?.part_number?.MITM);
  const ean = clean(product?.part_number?.EITM);

  const title = repairText(product?.part_description?.DESC);

  const title2 = repairText(
    product?.part_description?.DES2 ||
      product?.part_description?.DESC2,
  );

  const fullTitle = [title, title2]
    .filter(Boolean)
    .join(" ");

  const description = repairText(
    product?.part_description?.WTXT,
  );

  const description2 = repairText(
    product?.part_description?.WTX2,
  );

  const brand = repairText(
    product?.additional_information?.MAFT,
  );

  const stock = toNumber(
    product?.additional_information?.STQU,
  );

  const deliveryDate = repairText(
    product?.additional_information?.DEDT,
  );

  const warrantyMonths = toNumber(
    product?.additional_information?.WAIM,
  );

  const weight = toNumber(
    product?.additional_information?.GWGH,
  );

  const localPriceData =
    product?.price ||
    product?.price_information ||
    {};

  const externalPriceData = priceMap.get(litm) || {};

  const ecpr =
    toNumber(externalPriceData?.ecpr) ||
    toNumber(localPriceData?.ECPR);

  const expr =
    toNumber(externalPriceData?.expr) ||
    toNumber(localPriceData?.EXPR);

  const inpr =
    toNumber(externalPriceData?.inpr) ||
    toNumber(localPriceData?.INPR);

  const vat =
    toNumber(externalPriceData?.vat) ||
    toNumber(localPriceData?.VATR ?? localPriceData?.VAT);

  const price =
    ecpr ||
    expr ||
    inpr ||
    null;

  const categoryData =
    product?.part_catagory ||
    product?.part_category ||
    {};

  const cat1 = repairText(categoryData?.CAT1);
  const cat2 = repairText(categoryData?.CAT2);
  const cat3 = repairText(categoryData?.CAT3);
  const cat4 = repairText(categoryData?.CATA);

  const xmlImages = getXmlImages(product);
  const csvImages = imageMap.get(litm) || [];

  const images = uniqueUrls([
    ...csvImages,
    ...xmlImages,
  ]);

  const energyData = energyMap.get(litm) || {};

  return {
    litm,
    alltronSku: litm,

    sku,
    internalNumber,
    ean,

    title,
    title2,
    fullTitle,

    brand,

    stock,
    stockQty: stock,
    inStock: stock > 0,

    price,
    vat,
    ecpr,
    expr,
    inpr,

    deliveryDate,
    warrantyMonths,
    weight,

    image: images[0] || null,
    images,
    imageUrls: images,

    energyLabel:
      energyData.energyLabelUrl || null,
    energyLabelUrl:
      energyData.energyLabelUrl || null,
    energyClass:
      energyData.energyClass || null,
    energyClassAtoG:
      energyData.energyClassAtoG || null,
    energyClassAPPtoG:
      energyData.energyClassAPPtoG || null,
    energyEfficiencyClassEnEV2020:
      energyData.energyEfficiencyClassEnEV2020 || null,

    description,
    description2,

    rawCategory: {
      cat1,
      cat2,
      cat3,
      cat4,
    },

    iumatecCategory: {
      main: cat1 || "Sonstiges",
      sub: cat2 || "Andere",
    },
  };
});

fs.mkdirSync(path.dirname(outputFile), {
  recursive: true,
});

fs.writeFileSync(
  outputFile,
  JSON.stringify(products, null, 2),
  "utf8",
);

fs.writeFileSync(
  imageAuditFile,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      ...imageAssociationAudit,
      productsInXml: items.length,
      uniqueLitmsInXml: validLitms.size,
    },
    null,
    2,
  ),
  "utf8",
);

fs.writeFileSync(
  energyAuditFile,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      ...energyAssociationAudit,
      productsInXml: items.length,
      uniqueLitmsInXml: validLitms.size,
    },
    null,
    2,
  ),
  "utf8",
);

const productsWithImages = products.filter(
  (product) => product.images.length > 0,
);

const productsWithMultipleImages = products.filter(
  (product) => product.images.length > 1,
);

const productsWithPrices = products.filter(
  (product) => Number(product.price || 0) > 0,
);

const productsWithEnergyLabels = products.filter(
  (product) => Boolean(product.energyLabelUrl),
);

const productsWithEnergyClasses = products.filter(
  (product) =>
    Boolean(
      product.energyClass ||
      product.energyClassAtoG ||
      product.energyClassAPPtoG ||
      product.energyEfficiencyClassEnEV2020,
    ),
);

const totalImages = products.reduce(
  (sum, product) => sum + product.images.length,
  0,
);

console.log("");
console.log("========== TECH CATALOG DONE ==========");
console.log("Output:", outputFile);
console.log("Image audit:", imageAuditFile);
console.log("Energy audit:", energyAuditFile);
console.log("Products exported:", products.length);
console.log("Products with prices:", productsWithPrices.length);
console.log("Products with images:", productsWithImages.length);
console.log(
  "Products with multiple images:",
  productsWithMultipleImages.length,
);
console.log(
  "Products with energy labels:",
  productsWithEnergyLabels.length,
);
console.log(
  "Products with energy classes:",
  productsWithEnergyClasses.length,
);
console.log("Total image URLs:", totalImages);
console.log("=======================================");

const philipsCheck = products.filter((product) =>
  product.title
    .toLowerCase()
    .includes("32b2u3601"),
);

console.log("");
console.log("========== PHILIPS CHECK ==========");

for (const product of philipsCheck) {
  console.log({
    litm: product.litm,
    sku: product.sku,
    title: product.title,
    price: product.price,
    ecpr: product.ecpr,
    expr: product.expr,
    inpr: product.inpr,
    vat: product.vat,
    images: product.images.length,
    firstImages: product.images.slice(0, 5),
    energyLabelUrl: product.energyLabelUrl,
    energyClass: product.energyClass,
    energyClassAtoG: product.energyClassAtoG,
    energyClassAPPtoG: product.energyClassAPPtoG,
    energyEfficiencyClassEnEV2020:
      product.energyEfficiencyClassEnEV2020,
    description: product.description,
    description2: product.description2,
  });
}

console.log("===================================");
