// scripts/inspectImageCsv.ts
import fs from "fs";
import path from "path";
import iconv from "iconv-lite";
import { parse } from "csv-parse/sync";

const file = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "alltron-bilder-urls.csv"
);

const raw = fs.readFileSync(file);
const text = iconv.decode(raw, "windows-1252");

const rows = parse(text, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  bom: true,
  delimiter: ","
}) as Record<string, any>[];

console.log("Total rows:", rows.length);

if (rows.length > 0) {
  console.log("Headers:");
  console.log(Object.keys(rows[0]));

  console.log("\nFirst row:");
  console.log(rows[0]);
}