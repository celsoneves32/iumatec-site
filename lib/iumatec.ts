import fs from "fs";
import path from "path";

export type IumatecProduct = {
  sku: string;
  slug: string;
  title: string;
  brand?: string;
  price: number | null;
  stock: number;
  image: string | null;
  images: string[];
  category: string;
  subcategory: string;
  description?: string;
  description2?: string;
  ean?: string;
  internalNumber?: string;
};

function getCatalogPath() {
  return path.join(
    process.cwd(),
    "integrations",
    "alltron",
    "out",
    "iumatec-catalog-filtered.json"
  );
}

function readCatalog(): IumatecProduct[] {
  const file = getCatalogPath();

  if (!fs.existsSync(file)) {
    console.warn("Catalog not found:", file);
    return [];
  }

  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) return [];

  return data;
}

export function getIumatecProducts(): IumatecProduct[] {
  const products = readCatalog();

  return [...products].sort((a, b) => {
    const aHasImage = a.image ? 1 : 0;
    const bHasImage = b.image ? 1 : 0;

    if (aHasImage !== bHasImage) {
      return bHasImage - aHasImage;
    }

    return (b.price ?? 0) - (a.price ?? 0);
  });
}

export function getIumatecProductBySlug(slug: string): IumatecProduct | null {
  const products = readCatalog();
  return products.find((p) => p.slug === slug) ?? null;
}