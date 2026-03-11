import slugify from "slugify";

export type NormalizedProduct = {
  externalId: string;
  sku: string;
  title: string;
  description: string;
  vendor: string;
  productType?: string;
  tags: string[];
  price: number;
  stock: number;
  images: string[];
  barcode?: string;
  handle: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
};

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function cleanNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

export function buildHandle(title: string, sku: string) {
  const base = slugify(title || sku, { lower: true, strict: true, trim: true });
  return base || slugify(sku, { lower: true, strict: true, trim: true });
}

/**
 * Este mapper é genérico e tolerante.
 * Depois que vires o XML real da Alltron, ajustamos os nomes exatos.
 */
export function mapAlltronProductNodeToNormalized(node: any): NormalizedProduct | null {
  const externalId =
    cleanText(node.Artikelnummer) ||
    cleanText(node.ArticleNumber) ||
    cleanText(node.Id) ||
    cleanText(node.ID);

  const sku =
    cleanText(node.SKU) ||
    cleanText(node.Artikelnummer) ||
    cleanText(node.ArticleNumber);

  const title =
    cleanText(node.Bezeichnung) ||
    cleanText(node.Titel) ||
    cleanText(node.Title) ||
    cleanText(node.Name);

  const description =
    cleanText(node.Beschreibung) ||
    cleanText(node.Description) ||
    cleanText(node.Langtext) ||
    "";

  const vendor =
    cleanText(node.Hersteller) ||
    cleanText(node.Brand) ||
    cleanText(node.Marke) ||
    "Alltron";

  const productType =
    cleanText(node.Kategorie) ||
    cleanText(node.Category) ||
    cleanText(node.Warengruppe) ||
    "Alltron";

  const price =
    cleanNumber(node.Preis) ||
    cleanNumber(node.Price) ||
    cleanNumber(node.VK) ||
    0;

  const stock =
    cleanNumber(node.Lagerbestand) ||
    cleanNumber(node.Stock) ||
    cleanNumber(node.Quantity) ||
    0;

  const barcode =
    cleanText(node.EAN) ||
    cleanText(node.Barcode) ||
    undefined;

  const imageCandidates = uniqueStrings(
    toArray(node.Bild)
      .concat(toArray(node.Image))
      .concat(toArray(node.ImageUrl))
      .concat(toArray(node.BildURL))
      .map((v) => cleanText(v))
  );

  if (!externalId || !sku || !title || price <= 0) {
    return null;
  }

  const tags = uniqueStrings([
    "alltron",
    vendor,
    productType,
    `external_id:${externalId}`,
  ]);

  return {
    externalId,
    sku,
    title,
    description,
    vendor,
    productType,
    tags,
    price,
    stock: Math.max(0, stock),
    images: imageCandidates,
    barcode,
    handle: buildHandle(title, sku),
    status: "ACTIVE",
  };
}

/**
 * Tenta encontrar uma lista de produtos em várias estruturas possíveis.
 */
export function extractProductNodes(parsedXml: any): any[] {
  const candidates = [
    parsedXml?.Artikel?.Artikel,
    parsedXml?.Artikeldaten?.Artikel,
    parsedXml?.Products?.Product,
    parsedXml?.ProductData?.Product,
    parsedXml?.Katalog?.Artikel,
    parsedXml?.Catalog?.Product,
  ];

  for (const candidate of candidates) {
    if (candidate) return Array.isArray(candidate) ? candidate : [candidate];
  }

  return [];
}

export function normalizeAlltronCatalog(parsedXml: any): NormalizedProduct[] {
  const nodes = extractProductNodes(parsedXml);

  return nodes
    .map(mapAlltronProductNodeToNormalized)
    .filter((p): p is NormalizedProduct => Boolean(p));
}
