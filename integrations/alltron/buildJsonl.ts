import fs from "fs";
import path from "path";
import { NormalizedProduct } from "./mapToShopify";

const OUT_DIR = path.join(process.cwd(), "integrations", "alltron", "out");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Gera JSONL para productCreate.
 * Mantemos 1 variante por produto na fase inicial.
 */
export function buildProductCreateJsonl(products: NormalizedProduct[], fileName = "products.jsonl") {
  ensureDir(OUT_DIR);

  const outPath = path.join(OUT_DIR, fileName);

  const lines = products.map((p) =>
    JSON.stringify({
      product: {
        title: p.title,
        descriptionHtml: p.description,
        vendor: p.vendor,
        productType: p.productType,
        handle: p.handle,
        tags: p.tags,
        status: p.status,
      },
      media: [],
    })
  );

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  return outPath;
}
