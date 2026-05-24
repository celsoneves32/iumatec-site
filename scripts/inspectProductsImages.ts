import fs from "fs";
import path from "path";

const file = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-tech-catalog.json"
);

const data = JSON.parse(fs.readFileSync(file, "utf8"));

console.log("TOTAL:", data.length);

console.dir(data.slice(0, 2), {
  depth: 5,
  colors: true,
});