import fs from "fs";
import path from "path";

const file = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "alltron-bilder-urls.csv"
);

const raw = fs.readFileSync(file, "utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);

console.log("Total lines:", lines.length);
console.log("Line 1:");
console.log(lines[0]);
console.log("Line 2:");
console.log(lines[1]);
console.log("Line 3:");
console.log(lines[2]);