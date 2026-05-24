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

const filePath = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "alltron-energielabels.xml"
);

console.log("READ:", filePath);

const buffer = fs.readFileSync(filePath);
const xml = iconv.decode(buffer, "windows-1252");

const data = parser.parse(xml);

function findFirstArray(obj: any): any[] {
  if (!obj || typeof obj !== "object") return [];

  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }

    if (value && typeof value === "object") {
      const nested = findFirstArray(value);
      if (nested.length) return nested;
    }
  }

  return [];
}

const items = findFirstArray(data);

console.log("ITEMS:", items.length);

console.dir(items.slice(0, 3), {
  depth: 10,
  colors: true,
});