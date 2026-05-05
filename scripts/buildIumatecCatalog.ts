import fs from "fs";
import path from "path";

type AnyObj = Record<string, any>;

type TechCatalogItem = {
  sku?: string;
  internalNumber?: string;
  ean?: string;
  title?: string;
  title2?: string;
  fullTitle?: string;
  brand?: string;
  stock?: number;
  price?: number | null;
  images?: string[];
  image?: string | null;
  description?: string;
  description2?: string;
  rawCategory?: {
    cat1?: string;
    cat2?: string;
    cat3?: string;
    cat4?: string;
  };
  iumatecCategory?: {
    main?: string;
    sub?: string;
  };
};

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch (error) {
    console.error(`Failed to read ${filePath}`, error);
    return fallback;
  }
}

function slugify(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " und ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeImageArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .filter((url) => url.startsWith("http://") || url.startsWith("https://"));
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

const inFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-tech-catalog.json"
);

const outFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-products.json"
);

const source = readJsonFile<TechCatalogItem[]>(inFile, []);

const products = source.map((item, index) => {
  const title = clean(item.title);
  const title2 = clean(item.title2);
  const fullTitle = clean(item.fullTitle) || [title, title2].filter(Boolean).join(" - ");
  const brand = clean(item.brand);

  const slugBase =
    slugify(fullTitle) ||
    slugify(title) ||
    slugify(item.sku || "") ||
    `product-${index + 1}`;

  const images = uniqueStrings([
    ...normalizeImageArray(item.images),
    clean(item.image),
  ]);

  const firstImage = images[0] || null;

  const rawCat1 = clean(item.rawCategory?.cat1);
  const rawCat2 = clean(item.rawCategory?.cat2);
  const rawCat3 = clean(item.rawCategory?.cat3);
  const rawCat4 = clean(item.rawCategory?.cat4);

  const mainCategory = clean(item.iumatecCategory?.main) || "Sonstiges";
  const subCategory = clean(item.iumatecCategory?.sub) || "Andere";

  return {
    id: item.sku || item.internalNumber || item.ean || `item-${index + 1}`,
    sku: clean(item.sku),
    internalNumber: clean(item.internalNumber),
    ean: clean(item.ean),
    slug: slugBase,

    title,
    title2: title2 || null,
    fullTitle,

    brand: brand || null,
    stock: Number(item.stock ?? 0),
    price: item.price === null || item.price === undefined ? null : Number(item.price),

    image: firstImage,
    images,

    description: clean(item.description) || null,
    description2: clean(item.description2) || null,

    rawCategory: {
      cat1: rawCat1 || null,
      cat2: rawCat2 || null,
      cat3: rawCat3 || null,
      cat4: rawCat4 || null,
    },

    iumatecCategory: {
      main: mainCategory,
      sub: subCategory,
    },

    categoryLabel:
      subCategory && subCategory !== "Andere"
        ? `${mainCategory} / ${subCategory}`
        : mainCategory,
  };
});

fs.writeFileSync(outFile, JSON.stringify(products, null, 2), "utf8");

console.log(`Products created: ${products.length}`);
console.log(`Saved: integrations/alltron/out/iumatec-products.json`);

const withImages = products.filter((p) => Array.isArray(p.images) && p.images.length > 0).length;
console.log(`Products with images: ${withImages}`);