import fs from "fs";
import path from "path";

const file = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-catalog-full.json"
);

const products = JSON.parse(fs.readFileSync(file, "utf8"));

console.log("Total products:", products.length);

const withImages = products.filter((p: any) => p.image);
const withoutImages = products.filter((p: any) => !p.image);

console.log("With images:", withImages.length);
console.log("Without images:", withoutImages.length);

console.log("\nSample with image:");
console.log(withImages[0]);

console.log("\nSample without image:");
console.log(withoutImages[0]);