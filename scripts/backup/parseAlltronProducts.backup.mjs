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

const imageCsvFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "alltron-bilder-urls.csv",
);

const outputFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-tech-catalog.json",
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

function loadImageMap() {
  if (!fs.existsSync(imageCsvFile)) {
    console.warn(`Image CSV not found: ${imageCsvFile}`);
    return new Map();
  }

  console.log("Reading image CSV:", imageCsvFile);

  const raw = fs.readFileSync(imageCsvFile, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const imageMap = new Map();

  for (let index = 1; index < lines.length; index++) {
    const line = lines[index].trim();

    if (!line) continue;

    const separatorPosition = line.indexOf(";");

    if (separatorPosition === -1) continue;

    const alltronSku = line
      .slice(0, separatorPosition)
      .replace(/^\uFEFF/, "")
      .trim();

    const imageUrl = line
      .slice(separatorPosition + 1)
      .trim();

    if (!alltronSku || !imageUrl.startsWith("http")) {
      continue;
    }

    const currentImages = imageMap.get(alltronSku) || [];

    currentImages.push(imageUrl);

    imageMap.set(alltronSku, currentImages);
  }

  for (const [sku, urls] of imageMap.entries()) {
    imageMap.set(sku, uniqueUrls(urls));
  }

  console.log("Image CSV lines:", lines.length);
  console.log("Products with CSV images:", imageMap.size);

  return imageMap;
}

console.log("Reading XML:", xmlFile);

if (!fs.existsSync(xmlFile)) {
  throw new Error(`XML file not found: ${xmlFile}`);
}

const imageMap = loadImageMap();

const xmlBuffer = fs.readFileSync(xmlFile);
const xmlText = decodeXml(xmlBuffer);
const xmlData = parser.parse(xmlText);

const items = normalizeArray(xmlData?.items?.item);

console.log("Products found in XML:", items.length);

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

  const price =
    toNumber(product?.price_information?.ECPR) ||
    toNumber(product?.price_information?.EXPR) ||
    toNumber(product?.price_information?.INPR) ||
    null;

  const vat = toNumber(
    product?.price_information?.VAT,
  );

  const expr = toNumber(
    product?.price_information?.EXPR,
  );

  const inpr = toNumber(
    product?.price_information?.INPR,
  );

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
    expr,
    inpr,

    deliveryDate,
    warrantyMonths,
    weight,

    image: images[0] || null,
    images,
    imageUrls: images,

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

const productsWithImages = products.filter(
  (product) => product.images.length > 0,
);

const productsWithMultipleImages = products.filter(
  (product) => product.images.length > 1,
);

const totalImages = products.reduce(
  (sum, product) => sum + product.images.length,
  0,
);

console.log("");
console.log("========== TECH CATALOG DONE ==========");
console.log("Output:", outputFile);
console.log("Products exported:", products.length);
console.log("Products with images:", productsWithImages.length);
console.log(
  "Products with multiple images:",
  productsWithMultipleImages.length,
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
    images: product.images.length,
    firstImages: product.images.slice(0, 5),
    description: product.description,
    description2: product.description2,
  });
}

console.log("===================================");