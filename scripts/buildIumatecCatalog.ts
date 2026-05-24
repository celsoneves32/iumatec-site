import fs from "fs";
import path from "path";
import iconv from "iconv-lite";
import { XMLParser } from "fast-xml-parser";

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function slugify(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " und ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function flattenXmlItems(value: any): any[] {
  const items: any[] = [];

  function walk(node: any) {
    if (!node) return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    if (typeof node !== "object") return;

    if (
      node.SKU !== undefined &&
      (
        node.EnergyLabel !== undefined ||
        node.Energyclass !== undefined ||
        node.EnergyclassAbisG !== undefined ||
        node.EnergyclassAPPbisG !== undefined ||
        node.EnergieeffizienzklasseEnEV2020 !== undefined
      )
    ) {
      items.push(node);
      return;
    }

    for (const child of Object.values(node)) {
      walk(child);
    }
  }

  walk(value);

  return items;
}

const inFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-tech-catalog.json"
);

const imageCsv = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "alltron-bilder-urls.csv"
);

const energyXml = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "alltron-energielabels.xml"
);

const outFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-products.json"
);

const source = readJsonFile<any[]>(inFile, []);

/* IMAGES */
const imageMap = new Map<string, string[]>();

if (fs.existsSync(imageCsv)) {
  const rawCsv = fs.readFileSync(imageCsv, "utf8");

  const lines = rawCsv.split(/\r?\n/).filter(Boolean);

  for (const line of lines) {
    const cols = line.split(";");

    if (cols.length < 2) continue;

    const key = clean(cols[0]);
    const imageUrl = clean(cols[1]);

    if (
      !key ||
      key.toLowerCase() === "sku" ||
      !imageUrl.startsWith("http")
    ) {
      continue;
    }

    if (!imageMap.has(key)) {
      imageMap.set(key, []);
    }

    imageMap.get(key)?.push(imageUrl);
  }
}

console.log("Images loaded:", imageMap.size);

/* ENERGY LABELS */
const energyMap = new Map<string, any>();

if (fs.existsSync(energyXml)) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: true,
    trimValues: true,
  });

  const buffer = fs.readFileSync(energyXml);

  const xml = iconv.decode(buffer, "windows-1252");

  const data = parser.parse(xml);

  const items = flattenXmlItems(data);

  for (const item of items) {
    const energySku = clean(item.SKU);

    if (!energySku) continue;

    const energyClass =
      clean(item.EnergieeffizienzklasseEnEV2020) ||
      clean(item.EnergyclassAbisG) ||
      clean(item.EnergyclassAPPbisG) ||
      clean(item.Energyclass);

    const energyLabelUrl = clean(item.EnergyLabel);

    energyMap.set(energySku, {
      class:
        energyClass &&
        energyClass !== "Keine"
          ? energyClass
          : null,

      labelUrl:
        energyLabelUrl &&
        energyLabelUrl.startsWith("http")
          ? energyLabelUrl
          : null,

      productDataSheetUrl: null,
    });
  }
}

console.log("Energy labels loaded:", energyMap.size);

const products = source.map((item, index) => {
  const title = clean(item.title);

  const title2 = clean(item.title2);

  const fullTitle =
    clean(item.fullTitle) ||
    [title, title2].filter(Boolean).join(" - ");

  const sku = clean(item.sku);

  const internalNumber = clean(item.internalNumber);

  const ean = clean(item.ean);

  const litm = clean(item.litm);

  const slug =
    slugify(fullTitle) ||
    slugify(title) ||
    slugify(sku) ||
    `product-${index + 1}`;

  const csvImages =
    imageMap.get(sku) ||
    imageMap.get(internalNumber) ||
    imageMap.get(ean) ||
    imageMap.get(litm) ||
    [];

  const images = [...new Set(csvImages.filter(Boolean))];

  let energyLabel =
    energyMap.get(sku) ||
    energyMap.get(internalNumber) ||
    null;

  if (!energyLabel && internalNumber) {
    const digitsOnly = internalNumber.replace(/\D/g, "");

    energyLabel = energyMap.get(digitsOnly) || null;
  }

  const mainCategory =
    clean(item.iumatecCategory?.main) || "Sonstiges";

  const subCategory =
    clean(item.iumatecCategory?.sub) || "Andere";

  return {
    id:
      sku ||
      internalNumber ||
      ean ||
      `item-${index + 1}`,

    litm,
    sku,
    internalNumber,
    ean,
    slug,

    title,

    title2: title2 || null,

    fullTitle,

    brand: clean(item.brand) || null,

    stock: Number(item.stock ?? 0),

    price:
      item.price === null || item.price === undefined
        ? null
        : Number(item.price),

    image: images[0] || null,

    images,

    description: clean(item.description) || null,

    description2: clean(item.description2) || null,

    rawCategory: {
      cat1: clean(item.rawCategory?.cat1) || null,
      cat2: clean(item.rawCategory?.cat2) || null,
      cat3: clean(item.rawCategory?.cat3) || null,
      cat4: clean(item.rawCategory?.cat4) || null,
    },

    iumatecCategory: {
      main: mainCategory,
      sub: subCategory,
    },

    categoryLabel:
      subCategory && subCategory !== "Andere"
        ? `${mainCategory} / ${subCategory}`
        : mainCategory,

    energyLabel,
  };
});

fs.writeFileSync(
  outFile,
  JSON.stringify(products, null, 2),
  "utf8"
);

console.log(`Products created: ${products.length}`);

console.log(
  `Saved: integrations/alltron/out/iumatec-products.json`
);

console.log(
  `Products with images: ${
    products.filter((p) => p.images?.length > 0).length
  }`
);

console.log(
  `Products with energy label: ${
    products.filter((p) => p.energyLabel).length
  }`
);