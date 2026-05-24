import fs from "fs";
import path from "path";
import iconv from "iconv-lite";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
  trimValues: true,
});

const file = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "ArtikeldatenV2.xml"
);

const outFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-tech-catalog.json"
);

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function toNumber(value: unknown): number {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function normalizeArray(value: any): any[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getImages(p: any): string[] {
  const mediaItems = [
    ...normalizeArray(p?.media?.item),
    ...normalizeArray(p?.media?.image),
    ...normalizeArray(p?.images?.image),
    ...normalizeArray(p?.images?.item),
    ...normalizeArray(p?.product_media?.item),
  ];

  return mediaItems
    .map((img: any) => {
      const url =
        img?.MIME_SOURCE ||
        img?.SOURCE ||
        img?.URL ||
        img?.MEDIA_URL ||
        img?.ImageURL ||
        img?.imageUrl ||
        img?.url;

      if (!url) return null;

      const cleanUrl = String(url).trim();

      if (
        cleanUrl.startsWith("http://") ||
        cleanUrl.startsWith("https://")
      ) {
        return cleanUrl;
      }

      return null;
    })
    .filter(Boolean) as string[];
}

console.log("Reading file:", file);

const buffer = fs.readFileSync(file);
const xml = iconv.decode(buffer, "windows-1252");
const data = parser.parse(xml);

const items = Array.isArray(data?.items?.item) ? data.items.item : [];

console.log("Products found:", items.length);

const products = items.map((p: any) => {
  const litm = clean(p?.part_number?.LITM);
  const sku = clean(p?.part_number?.LITT);
  const internalNumber = clean(p?.part_number?.MITM);
  const ean = clean(p?.part_number?.EITM);

  const title = clean(p?.part_description?.DESC);
  const title2 = clean(p?.part_description?.DESC2);
  const fullTitle = [title, title2].filter(Boolean).join(" ");

  const brand = clean(p?.additional_information?.MAFT);
  const stock = toNumber(p?.additional_information?.STQU);

  const price =
    toNumber(p?.price_information?.ECPR) ||
    toNumber(p?.price_information?.EXPR) ||
    toNumber(p?.price_information?.INPR) ||
    null;

  const vat = toNumber(p?.price_information?.VAT);
  const expr = toNumber(p?.price_information?.EXPR);
  const inpr = toNumber(p?.price_information?.INPR);

  const cat1 = clean(p?.part_category?.CAT1);
  const cat2 = clean(p?.part_category?.CAT2);
  const cat3 = clean(p?.part_category?.CAT3);
  const cat4 = clean(p?.part_category?.CATA);

  const description = clean(p?.part_description?.WTXT);
  const description2 = clean(p?.part_description?.WTX2);

  const images = getImages(p);

  return {
    litm,
    sku,
    internalNumber,
    ean,

    title,
    title2,
    fullTitle,

    brand,
    stock,
    price,
    vat,
    expr,
    inpr,

    images,
    image: images[0] || null,

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

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(products, null, 2), "utf8");

console.log(`Saved: ${outFile}`);
console.log(`Products exported: ${products.length}`);
console.log(
  `Products with images: ${
    products.filter((p) => Array.isArray(p.images) && p.images.length > 0)
      .length
  }`
);

console.dir(products.slice(0, 3), { depth: null });