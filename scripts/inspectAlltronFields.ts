// scripts/inspectAlltronFields.ts
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

const downloadsDir = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads"
);

function decodeXmlFile(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const xml = iconv.decode(buffer, "windows-1252");
  return parser.parse(xml);
}

function getItems(data: any): any[] {
  if (Array.isArray(data?.items?.item)) return data.items.item;
  if (Array.isArray(data?.prices?.item)) return data.prices.item;
  if (Array.isArray(data?.item)) return data.item;
  return [];
}

function printKeys(obj: any, prefix = "", seen = new Set<string>()) {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (!seen.has(fullKey)) {
      seen.add(fullKey);
      console.log(fullKey);
    }

    if (obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
      printKeys(obj[key], fullKey, seen);
    }
  }
}

const articleFile = path.join(downloadsDir, "ArtikeldatenV2.xml");
const priceFile = path.join(downloadsDir, "PreisdatenV2.xml");

const articleData = decodeXmlFile(articleFile);
const priceData = decodeXmlFile(priceFile);

const articleItems = getItems(articleData);
const priceItems = getItems(priceData);

console.log("=== ARTICLE SAMPLE KEYS ===");
if (articleItems[0]) {
  printKeys(articleItems[0]);
}

console.log("\n=== PRICE SAMPLE KEYS ===");
if (priceItems[0]) {
  printKeys(priceItems[0]);
}

console.log("\n=== ARTICLE SAMPLE JSON ===");
console.log(JSON.stringify(articleItems[0], null, 2));

console.log("\n=== PRICE SAMPLE JSON ===");
console.log(JSON.stringify(priceItems[0], null, 2));