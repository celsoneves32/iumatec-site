import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";

export function readXmlFile(filePath: string) {
  const xml = fs.readFileSync(filePath, "utf8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
  });

  return parser.parse(xml);
}

export function findDownloadedXmlFile(fileNames: string[], pattern: RegExp): string | null {
  const file = fileNames.find((f) => pattern.test(f));
  return file ?? null;
}

export function getXmlPath(fileName: string) {
  return path.join(process.cwd(), "integrations", "alltron", "downloads", fileName);
}
