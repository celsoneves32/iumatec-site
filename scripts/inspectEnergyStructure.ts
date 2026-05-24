import fs from "fs";
import path from "path";
import iconv from "iconv-lite";
import { XMLParser } from "fast-xml-parser";

const file = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "alltron-energielabels.xml"
);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
  trimValues: true,
});

const buffer = fs.readFileSync(file);
const xml = iconv.decode(buffer, "windows-1252");

const data = parser.parse(xml);

console.dir(Object.keys(data), { depth: 5 });

console.dir(data, { depth: 3 });