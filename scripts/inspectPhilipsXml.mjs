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

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: true,
});

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

console.log("Reading XML...");

const xmlBuffer = fs.readFileSync(xmlFile);
const xmlText = iconv.decode(xmlBuffer, "windows-1252");
const parsedXml = parser.parse(xmlText);

const items = normalizeArray(parsedXml?.items?.item);

const philipsItems = items.filter((item) => {
  const text = JSON.stringify(item).toLowerCase();

  return text.includes("32b2u3601");
});

console.log("");
console.log("Philips products found:", philipsItems.length);

for (let index = 0; index < philipsItems.length; index++) {
  console.log("");
  console.log(`========== PRODUCT ${index + 1} ==========`);

  console.dir(philipsItems[index], {
    depth: null,
    maxArrayLength: 50,
  });
}

console.log("");
console.log("Searching image CSV by image ID 395682571...");

const csvRaw = fs.readFileSync(imageCsvFile, "utf8");
const csvLines = csvRaw.split(/\r?\n/).filter(Boolean);

const matchingImageLines = csvLines.filter(
  (line) =>
    line.includes("395682571") ||
    line.toLowerCase().includes("32b2u3601"),
);

console.log("Matching CSV lines:", matchingImageLines.length);

for (const line of matchingImageLines.slice(0, 30)) {
  console.log(line);
}