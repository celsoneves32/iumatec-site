import slugify from "slugify";

export type NormalizedProduct = {
  externalId: string;
  sku: string;
  title: string;
  description: string;
  vendor: string;
  productType?: string;
  category?: string;
  subcategory?: string;
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

function normalize(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .trim();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

export function buildHandle(title: string, sku: string) {
  const base = slugify(title || sku, { lower: true, strict: true, trim: true });
  return base || slugify(sku, { lower: true, strict: true, trim: true });
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function mapToIumatecCategory(input: {
  title: string;
  description: string;
  productType: string;
}) {
  const title = normalize(input.title);
  const description = normalize(input.description);
  const productType = normalize(input.productType);
  const text = [title, description, productType].join(" ");

  const isTablet = hasAny(text, [
    "tablet",
    "ipad",
    "galaxy tab",
    "tab s",
    "lenovo tab",
    "surface pro",
  ]);

  const isSmartphone = hasAny(text, [
    "smartphone",
    "mobile phone",
    "mobiltelefon",
    "iphone",
    "galaxy s",
    "galaxy a",
    "pixel",
    "xiaomi",
    "redmi",
  ]);

  const isLaptop = hasAny(text, [
    "notebook",
    "laptop",
    "macbook",
    "mobile workstation",
    "elitebook",
    "probook",
    "thinkpad",
    "latitude",
    "surface laptop",
  ]);

  const isDesktop = hasAny(text, [
    "desktop",
    "pc system",
    "workstation",
    "tower",
    "optiplex",
    "prodesk",
    "elitedesk",
  ]);

  const isMiniPc = hasAny(text, ["mini pc", "minipc", "nuc"]);

  const isAllInOne = hasAny(text, [
    "all-in-one",
    "all in one",
    "aio",
    "pro aio",
  ]);

  const monitorBlocked =
    isTablet ||
    isSmartphone ||
    isLaptop ||
    isDesktop ||
    isMiniPc ||
    isAllInOne ||
    hasAny(text, [
      "schutzfolie",
      "screen protector",
      "displayfolie",
      "case",
      "cover",
      "halterung",
      "stand",
      "adapter",
      "ersatzdisplay",
      "lcd panel",
      "touchscreen",
    ]);

  const isMonitor =
    !monitorBlocked &&
    hasAny(text, [
      "monitor",
      "bildschirm",
      "pc monitor",
      "gaming monitor",
      "curved monitor",
      "ultrawide monitor",
      "desktop display",
    ]);

  // IMPORTANTE: Mobile vem antes de Monitor, porque tablets têm "display" na descrição.
  if (isSmartphone) {
    return {
      category: "Mobile",
      subcategory: "Smartphones",
      productType: "Mobile > Smartphones",
    };
  }

  if (isTablet) {
    return {
      category: "Mobile",
      subcategory: "Tablets",
      productType: "Mobile > Tablets",
    };
  }

  if (isLaptop) {
    return {
      category: "Computer",
      subcategory: "Laptops",
      productType: "Computer > Laptops",
    };
  }

  if (isMiniPc) {
    return {
      category: "Computer",
      subcategory: "Mini PCs",
      productType: "Computer > Mini PCs",
    };
  }

  if (isAllInOne || isDesktop) {
    return {
      category: "Computer",
      subcategory: "Desktop-PCs",
      productType: "Computer > Desktop-PCs",
    };
  }

  if (isMonitor) {
    return {
      category: "Peripherie",
      subcategory: "Monitors",
      productType: "Peripherie > Monitors",
    };
  }

  if (
    text.includes("grafikkarte") ||
    text.includes("graphics card") ||
    text.includes("gpu") ||
    text.includes("geforce") ||
    text.includes("radeon")
  ) {
    return {
      category: "PC-Komponenten",
      subcategory: "Grafikkarten",
      productType: "PC-Komponenten > Grafikkarten",
    };
  }

  if (
    text.includes("arbeitsspeicher") ||
    text.includes(" ram ") ||
    text.includes("memory") ||
    text.includes("ddr4") ||
    text.includes("ddr5")
  ) {
    return {
      category: "PC-Komponenten",
      subcategory: "Arbeitsspeicher",
      productType: "PC-Komponenten > Arbeitsspeicher",
    };
  }

  if (text.includes("mainboard") || text.includes("motherboard")) {
    return {
      category: "PC-Komponenten",
      subcategory: "Mainboards",
      productType: "PC-Komponenten > Mainboards",
    };
  }

  if (
    text.includes("netzteil") ||
    text.includes("power supply") ||
    text.includes("psu")
  ) {
    return {
      category: "PC-Komponenten",
      subcategory: "Netzteile",
      productType: "PC-Komponenten > Netzteile",
    };
  }

  if (
    text.includes("ssd") ||
    text.includes("festplatte") ||
    text.includes("hard disk") ||
    text.includes("hdd") ||
    text.includes("nvme")
  ) {
    return {
      category: "Datenspeicher",
      subcategory: "SSD & Festplatten",
      productType: "Datenspeicher > SSD & Festplatten",
    };
  }

  if (text.includes("nas")) {
    return {
      category: "Datenspeicher",
      subcategory: "NAS",
      productType: "Datenspeicher > NAS",
    };
  }

  if (text.includes("tastatur") || text.includes("keyboard")) {
    return {
      category: "Peripherie",
      subcategory: "Tastaturen",
      productType: "Peripherie > Tastaturen",
    };
  }

  if (
    text.includes("maus") ||
    text.includes("mouse") ||
    text.includes("gaming mouse")
  ) {
    return {
      category: "Peripherie",
      subcategory: "Mäuse",
      productType: "Peripherie > Mäuse",
    };
  }

  if (
    text.includes("headset") ||
    text.includes("kopfhorer") ||
    text.includes("kopfhörer") ||
    text.includes("headphone") ||
    text.includes("earbuds")
  ) {
    return {
      category: "Peripherie",
      subcategory: "Headsets",
      productType: "Peripherie > Headsets",
    };
  }

  if (text.includes("webcam")) {
    return {
      category: "Peripherie",
      subcategory: "Webcams",
      productType: "Peripherie > Webcams",
    };
  }

  if (text.includes("docking") || text.includes("dock")) {
    return {
      category: "Peripherie",
      subcategory: "Dockingstationen",
      productType: "Peripherie > Dockingstationen",
    };
  }

  if (text.includes("router")) {
    return {
      category: "Netzwerk",
      subcategory: "Router",
      productType: "Netzwerk > Router",
    };
  }

  if (text.includes("switch") || text.includes("switchbox")) {
    return {
      category: "Netzwerk",
      subcategory: "Netzwerk-Switches",
      productType: "Netzwerk > Netzwerk-Switches",
    };
  }

  if (text.includes("wlan") || text.includes("wifi") || text.includes("mesh")) {
    return {
      category: "Netzwerk",
      subcategory: "WLAN Mesh",
      productType: "Netzwerk > WLAN Mesh",
    };
  }

  if (text.includes("drucker") || text.includes("printer")) {
    return {
      category: "Büro & Drucker",
      subcategory: "Drucker",
      productType: "Büro & Drucker > Drucker",
    };
  }

  if (
    text.includes("toner") ||
    text.includes("tinte") ||
    text.includes("patrone") ||
    text.includes("cartridge")
  ) {
    return {
      category: "Büro & Drucker",
      subcategory: "Tinte & Toner",
      productType: "Büro & Drucker > Tinte & Toner",
    };
  }

  if (
    text.includes("papier") ||
    text.includes("etikett") ||
    text.includes("label")
  ) {
    return {
      category: "Büro & Drucker",
      subcategory: "Papier & Etiketten",
      productType: "Büro & Drucker > Papier & Etiketten",
    };
  }

  if (
    text.includes("kamera") ||
    text.includes("camera") ||
    text.includes("security cam")
  ) {
    return {
      category: "Smart Home",
      subcategory: "Kameras",
      productType: "Smart Home > Kameras",
    };
  }

  if (
    text.includes("steckdose") ||
    text.includes("smart plug") ||
    text.includes("smart home")
  ) {
    return {
      category: "Smart Home",
      subcategory: "Smarte Steckdosen",
      productType: "Smart Home > Smarte Steckdosen",
    };
  }

  if (
    text.includes("beleuchtung") ||
    text.includes("smart light") ||
    text.includes("led")
  ) {
    return {
      category: "Smart Home",
      subcategory: "Smarte Beleuchtung",
      productType: "Smart Home > Smarte Beleuchtung",
    };
  }

  return {
    category: "Zubehör",
    subcategory: "Sonstiges Zubehör",
    productType: "Zubehör > Sonstiges Zubehör",
  };
}

export function mapAlltronProductNodeToNormalized(
  node: any
): NormalizedProduct | null {
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

  const rawProductType =
    cleanText(node.Kategorie) ||
    cleanText(node.Category) ||
    cleanText(node.Warengruppe) ||
    cleanText(node.CAT1) ||
    cleanText(node.CAT2) ||
    cleanText(node.CAT3) ||
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

  const barcode = cleanText(node.EAN) || cleanText(node.Barcode) || undefined;

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

  const mapped = mapToIumatecCategory({
    title,
    description,
    productType: rawProductType,
  });

  const tags = uniqueStrings([
    "alltron",
    vendor,
    mapped.category,
    mapped.subcategory,
    `category:${mapped.category}`,
    `subcategory:${mapped.subcategory}`,
    `external_id:${externalId}`,
  ]);

  return {
    externalId,
    sku,
    title,
    description,
    vendor,
    productType: mapped.productType,
    category: mapped.category,
    subcategory: mapped.subcategory,
    tags,
    price,
    stock: Math.max(0, stock),
    images: imageCandidates,
    barcode,
    handle: buildHandle(title, sku),
    status: "ACTIVE",
  };
}

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