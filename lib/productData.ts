import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";

export type Product = {
  sku: string;
  slug: string;
  title: string;
  brand?: string;
  price: number;
  image?: string | null;
  images?: string[];
  category?: string;
  subcategory?: string;
  description?: string;
  description2?: string;
  ean?: string;
  internalNumber?: string;
  inStock?: boolean;
  stockQty?: number;
  deliveryDate?: string | null;
  merchandiseId?: string | null;
  shopifyProductHandle?: string | null;
  shopifyProductId?: string | null;
  shopifyVariantId?: string | null;
  shopifySyncStatus?: string | null;
  energyLabel?: {
    class?: string | null;
    labelUrl?: string | null;
    productDataSheetUrl?: string | null;
  } | null;
};

type CatalogRecord = Record<string, any>;

const STOREFRONT_CLEAN_PATH = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-storefront-clean.json"
);

const CATALOG_PATHS = [STOREFRONT_CLEAN_PATH];

function normalize(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ã¤/g, "a")
    .replace(/Ã¶/g, "o")
    .replace(/Ã¼/g, "u")
    .replace(/ÃŸ/g, "ss")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .trim();
}

function getNestedValue(record: CatalogRecord, key: string): any {
  return key.split(".").reduce<any>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) return acc[part];
    return undefined;
  }, record);
}

function pickString(record: CatalogRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = getNestedValue(record, key);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return undefined;
}

function pickNumber(record: CatalogRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = getNestedValue(record, key);

    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string") {
      const parsed = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return undefined;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) return [value.trim()];

  return [];
}

function slugifyValue(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "und")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function cleanupText(value?: string | null): string | undefined {
  if (!value) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function normalizeProductVariantGid(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("gid://shopify/ProductVariant/")) return trimmed;

  const numeric = trimmed.replace(/[^\d]/g, "");
  if (!numeric) return null;

  return `gid://shopify/ProductVariant/${numeric}`;
}

function resolveShopifyHandle(record: CatalogRecord): string | null {
  const handle = pickString(record, [
    "shopifyProductHandle",
    "shopifyHandle",
    "handle",
    "productHandle",
    "shopifyProduct.handle",
    "shopifyHandleFromSync",
    "matchedHandle",
  ]);

  return handle ? slugifyValue(handle) : null;
}

function resolveMerchandiseId(record: CatalogRecord): string | null {
  const direct = pickString(record, [
    "merchandiseId",
    "shopifyMerchandiseId",
    "variantGid",
    "shopifyVariantGid",
  ]);

  const normalizedDirect = normalizeProductVariantGid(direct);
  if (normalizedDirect) return normalizedDirect;

  const variantId = pickString(record, [
    "shopifyVariantId",
    "variantId",
    "shopifyVariant.id",
  ]);

  return normalizeProductVariantGid(variantId);
}

function resolveImages(record: CatalogRecord, mainImage?: string | null): string[] {
  const images = [
    ...(mainImage ? [mainImage] : []),
    ...toStringArray(getNestedValue(record, "images")),
    ...toStringArray(getNestedValue(record, "imageUrls")),
    ...toStringArray(getNestedValue(record, "gallery")),
    ...toStringArray(getNestedValue(record, "shopifyImages")),
    ...toStringArray(getNestedValue(record, "shopifyImageUrl")),
  ].filter((url) => url.startsWith("http"));

  return [...new Set(images)];
}

function readJsonArray(filePath: string): CatalogRecord[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function getRawText(record: CatalogRecord) {
  return normalize(
    [
      record.title,
      record.fullTitle,
      record.name,
      record.productTitle,
      record.shopifyProductTitle,
      record.description,
      record.description2,
      record.shortDescription,
      record.longDescription,
      record.brand,
      record.vendor,
      record.manufacturer,
      record.rawCategory?.cat1,
      record.rawCategory?.cat2,
      record.rawCategory?.cat3,
      record.rawCategory?.cat4,
      record.iumatecCategory?.main,
      record.iumatecCategory?.sub,
      record.category,
      record.subcategory,
      record.cat1,
      record.cat2,
      record.cat3,
      record.cat4,
    ].join(" ")
  );
}

function mapCategoryFromRaw(record: CatalogRecord) {
  const existingCategory =
    cleanupText(record.category) || cleanupText(record.iumatecCategory?.main);

  const existingSubcategory =
    cleanupText(record.subcategory) || cleanupText(record.iumatecCategory?.sub);

  const cat1 = normalize(record.rawCategory?.cat1 || record.cat1);
  const cat2 = normalize(record.rawCategory?.cat2 || record.cat2);
  const cat3 = normalize(record.rawCategory?.cat3 || record.cat3);
  const cat4 = normalize(record.rawCategory?.cat4 || record.cat4);

  const title = normalize(
    record.title ||
      record.fullTitle ||
      record.name ||
      record.productTitle ||
      record.shopifyProductTitle
  );

  const text = getRawText(record);

  const has = (terms: string[]) =>
    terms.some((term) => text.includes(normalize(term)));

  const titleHas = (terms: string[]) =>
    terms.some((term) => title.includes(normalize(term)));

  const rawHas = (terms: string[]) =>
    terms.some((term) =>
      [cat1, cat2, cat3, cat4].some((cat) => cat.includes(normalize(term)))
    );

  if (
    rawHas(["kabel", "adapter", "video-kabel", "audio-kabel", "usb-kabel"]) ||
    has([
      "displayport kabel",
      "hdmi kabel",
      "usb-c kabel",
      "usb c kabel",
      "thunderbolt kabel",
      "patchkabel",
      "netzwerkkabel",
      "ethernet kabel",
      "adapter",
      "dongle",
      "splitter",
      "konverter",
      "converter",
      "usb-c zu",
      "hdmi adapter",
      "displayport adapter",
      "vga adapter",
      "dvi adapter",
      "kabel",
      "cable",
    ])
  ) {
    return { category: "Peripherie", subcategory: "Kabel & Adapter" };
  }

  if (
    rawHas(["docking", "dock", "port-replikator"]) ||
    has([
      "dockingstation",
      "docking station",
      "dock ",
      "usb-c dock",
      "thunderbolt dock",
      "port replikator",
      "port-replikator",
    ])
  ) {
    return { category: "Peripherie", subcategory: "Dockingstationen" };
  }

  if (
    rawHas(["notebook-zubehor", "notebook zubehor", "taschen", "rucksack"]) ||
    has([
      "laptop tasche",
      "notebook tasche",
      "notebook sleeve",
      "laptop sleeve",
      "rucksack",
      "sleeve",
      "laptopsafe",
      "notebook safe",
      "notebook-zubehor",
      "laptop-zubehor",
      "notebook zubehor",
      "laptop zubehor",
      "notebook stand",
      "laptop stand",
      "notebook halter",
      "laptop halter",
    ])
  ) {
    return { category: "Zubehör", subcategory: "Notebook-Zubehör" };
  }

  if (
    has([
      "panzerglass",
      "schutzglas",
      "displayschutz",
      "screen protector",
      "schutzfolie",
      "kameraschutz",
      "camera protector",
      "handyhulle",
      "handy hulle",
      "iphone hulle",
      "iphone case",
      "smartphone case",
      "tablet case",
      "ipad case",
      "cover",
      "ladegerat",
      "charger",
      "powerbank",
      "active pen",
      "ersatzstift",
      "ersatzstifte",
      "stylus",
      "pencil",
    ])
  ) {
    return { category: "Mobile", subcategory: "Zubehör" };
  }

  if (
    cat3 === "notebook" ||
    cat4 === "notebook" ||
    titleHas([
      "macbook",
      "notebook",
      "probook",
      "elitebook",
      "thinkpad",
      "latitude",
      "surface laptop",
      "laptop ",
    ])
  ) {
    return { category: "Computer", subcategory: "Laptops" };
  }

  if (
    titleHas([
      "iphone",
      "galaxy s",
      "galaxy a",
      "galaxy z",
      "pixel ",
      "smartphone",
      "xiaomi ",
      "redmi ",
      "oppo ",
      "motorola ",
    ]) ||
    rawHas(["smartphone", "mobiltelefon", "mobile phone"])
  ) {
    return { category: "Mobile", subcategory: "Smartphones" };
  }

  if (
    titleHas(["ipad", "galaxy tab", "surface pro", "tablet ", "tab s", "tab a"]) ||
    rawHas(["tablet", "tablets"])
  ) {
    return { category: "Mobile", subcategory: "Tablets" };
  }

  if (
    has([
      "mini pc",
      "minipc",
      "mini-pc",
      "usff",
      "nuc",
      "tiny pc",
      "pro mini",
    ])
  ) {
    return { category: "Computer", subcategory: "Mini PCs" };
  }

  if (
    rawHas(["desktop", "workstation", "pc-systeme", "pc systeme"]) ||
    has([
      "workstation",
      "tower pc",
      "desktop pc",
      "pc system",
      "pc-system",
      "barebone",
      "all-in-one",
      "all in one",
      "mini tower",
      "micro tower",
      "small form factor",
      "sff",
      "optiplex",
      "prodesk",
      "elitedesk",
      "thinkcentre",
      "precision tower",
      "z2 tower",
      "z4 tower",
      "z6 tower",
      "z8 tower",
      "gaming desktop",
      "desktop-computer",
    ])
  ) {
    return { category: "Computer", subcategory: "Desktop-PCs" };
  }

  if (
    rawHas(["monitore", "display", "bildschirm"]) ||
    has([
      "gaming monitor",
      "business monitor",
      "lcd monitor",
      "led monitor",
      "oled monitor",
      "curved monitor",
      "monitor 24",
      "monitor 27",
      "monitor 32",
      "monitor 34",
      "monitor 49",
      "display 24",
      "display 27",
      "display 32",
      "qhd monitor",
      "uhd monitor",
      "4k monitor",
      "fhd monitor",
      "bildschirm",
    ])
  ) {
    return { category: "Peripherie", subcategory: "Monitore" };
  }

  if (
    rawHas(["tastatur", "keyboard"]) ||
    has(["desktop set", "keyboard", "tastatur", "combo", "mk270", "mk470"])
  ) {
    return { category: "Peripherie", subcategory: "Tastaturen" };
  }

  if (rawHas(["maus", "mouse"]) || has(["maus", "mouse", "trackball"])) {
    return { category: "Peripherie", subcategory: "Mäuse" };
  }

  if (
    rawHas(["headset", "kopfhorer", "kopfhoerer"]) ||
    has(["headset", "kopfhorer", "kopfhoerer", "headphone"])
  ) {
    return { category: "Peripherie", subcategory: "Headsets" };
  }

  if (rawHas(["webcam"]) || has(["webcam"])) {
    return { category: "Peripherie", subcategory: "Webcams" };
  }

  if (
    rawHas(["mikrofon", "microphone"]) ||
    has(["mikrofon", "microphon", "microphone"])
  ) {
    return { category: "Peripherie", subcategory: "Mikrofone" };
  }

  if (
    rawHas(["grafikkarte", "graphics card"]) ||
    has(["grafikkarte", "graphics card", "gpu", "geforce", "rtx ", "radeon"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Grafikkarten" };
  }

  if (
    rawHas(["arbeitsspeicher", "memory", "ram"]) ||
    has(["arbeitsspeicher", "ram", "memory", "ddr4", "ddr5", "so-dimm", "sodimm"])
  ) {
    return { category: "PC-Komponenten", subcategory: "RAM" };
  }

  if (rawHas(["mainboard", "motherboard"]) || has(["mainboard", "motherboard"])) {
    return { category: "PC-Komponenten", subcategory: "Mainboards" };
  }

  if (rawHas(["netzteil", "power supply"]) || has(["netzteil", "power supply", "psu"])) {
    return { category: "PC-Komponenten", subcategory: "Netzteile" };
  }

  if (
    rawHas(["prozessor", "processor", "cpu"]) ||
    has(["prozessor", "processor", "cpu ", "intel core", "ryzen"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Prozessoren" };
  }

  if (rawHas(["gehause", "gehaeuse", "case"]) || has(["pc gehause", "pc case"])) {
    return { category: "PC-Komponenten", subcategory: "Gehäuse" };
  }

  if (rawHas(["kuhler", "kuehler", "cooler"]) || has(["cpu cooler", "kuhler", "kuehler"])) {
    return { category: "PC-Komponenten", subcategory: "Kühlung" };
  }

  if (rawHas(["router", "firewall"]) || has(["router", "firewall"])) {
    return { category: "Netzwerk", subcategory: "Router" };
  }

  if (rawHas(["switch", "switches"]) || has(["switch", "switches"])) {
    return { category: "Netzwerk", subcategory: "Switches" };
  }

  if (
    rawHas(["wlan", "wifi", "mesh", "access point", "accesspoint"]) ||
    has(["wlan", "wifi", "wi-fi", "mesh", "access point", "accesspoint"])
  ) {
    return { category: "Netzwerk", subcategory: "WLAN Mesh" };
  }

  if (
    rawHas(["netzwerkkabel", "patchkabel", "rj45"]) ||
    has(["rj45", "cat6", "cat 6", "cat7", "cat 7"])
  ) {
    return { category: "Netzwerk", subcategory: "Netzwerk Kabel" };
  }

  if (
    rawHas(["ssd", "solid state drive"]) ||
    has(["ssd", "nvme", "m.2", "solid state"])
  ) {
    return { category: "Datenspeicher", subcategory: "SSD" };
  }

  if (
    rawHas(["festplatte", "hard disk", "hdd"]) ||
    has(["festplatte", "hard disk", "hdd"])
  ) {
    return { category: "Datenspeicher", subcategory: "HDD" };
  }

  if (rawHas(["nas"]) || has(["nas", "synology", "qnap"])) {
    return { category: "Datenspeicher", subcategory: "NAS" };
  }

  if (has(["externe ssd", "external ssd", "portable ssd", "portable drive"])) {
    return { category: "Datenspeicher", subcategory: "Externe SSD" };
  }

  if (
    rawHas(["drucker", "printer"]) ||
    has([
      "drucker",
      "printer",
      "multifunktionsdrucker",
      "laserjet",
      "officejet",
      "pixma",
      "ecotank",
    ])
  ) {
    return { category: "Office & Business", subcategory: "Drucker" };
  }

  if (
    rawHas(["toner", "tinte", "patrone"]) ||
    has(["toner", "tinte", "patrone", "cartridge", "druckerpatrone", "ink cartridge"])
  ) {
    return { category: "Office & Business", subcategory: "Tinte & Toner" };
  }

  if (
    rawHas(["papier", "etikett", "etiketten"]) ||
    has(["papier", "etikett", "labels", "label", "etikettenrolle", "fotopapier"])
  ) {
    return { category: "Office & Business", subcategory: "Papier & Etiketten" };
  }

  if (
    rawHas(["kamera", "camera", "uberwachung", "ueberwachung"]) ||
    has(["kamera", "camera", "security cam", "überwachungskamera", "ueberwachungskamera"])
  ) {
    return { category: "Smart Home", subcategory: "Kameras" };
  }

  if (has(["steckdose", "smart plug", "plug"])) {
    return { category: "Smart Home", subcategory: "Steckdosen" };
  }

  if (has(["beleuchtung", "light", "led stripe", "led strip", "lampe"])) {
    return { category: "Smart Home", subcategory: "Beleuchtung" };
  }

  if (existingCategory && existingSubcategory) {
    return {
      category: existingCategory,
      subcategory: existingSubcategory,
    };
  }

  return { category: "Zubehör", subcategory: "Sonstiges Zubehör" };
}

function makeEnergyKey(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function buildEnergyMap(records: CatalogRecord[]) {
  const map = new Map<string, Product["energyLabel"]>();

  for (const record of records) {
    const energyLabel =
      typeof record.energyLabel === "object" && record.energyLabel
        ? (record.energyLabel as Product["energyLabel"])
        : null;

    if (!energyLabel) continue;

    const keys = [
      pickString(record, ["sku"]),
      pickString(record, ["internalNumber"]),
      pickString(record, ["ean"]),
      pickString(record, ["litm"]),
    ];

    for (const key of keys) {
      const cleanKey = makeEnergyKey(key);
      if (cleanKey) map.set(cleanKey, energyLabel);
    }
  }

  return map;
}

function mapRecordToProduct(
  record: CatalogRecord,
  energyMap: Map<string, Product["energyLabel"]>
): Product | null {
  const title =
    pickString(record, [
      "title",
      "fullTitle",
      "name",
      "productTitle",
      "label",
      "beschreibung",
      "shopifyProductTitle",
    ]) || "";

  const sku =
    pickString(record, [
      "sku",
      "articleNumber",
      "articleNo",
      "id",
      "internalNumber",
    ]) || "";

  if (!title || !sku) return null;

  const mappedCategory = mapCategoryFromRaw(record);
  const shopifyProductHandle = resolveShopifyHandle(record);
  const fallbackSlug = pickString(record, ["slug"]) || title;
  const slug = shopifyProductHandle || slugifyValue(fallbackSlug);

  const image =
    pickString(record, [
      "image",
      "imageUrl",
      "mainImage",
      "featuredImage",
      "shopifyFeaturedImage",
      "shopifyImageUrl",
    ]) || null;

  const images = resolveImages(record, image);

  const stockQty =
    pickNumber(record, [
      "stockQty",
      "stock",
      "quantity",
      "availableQty",
      "available",
    ]) ?? 0;

  const rawInStock = getNestedValue(record, "inStock");
  const inStock = typeof rawInStock === "boolean" ? rawInStock : stockQty > 0;

  const merchandiseId = resolveMerchandiseId(record);

  const energyFromRecord =
    typeof record.energyLabel === "object" && record.energyLabel
      ? (record.energyLabel as Product["energyLabel"])
      : null;

  const energyLabel =
    energyFromRecord ||
    energyMap.get(makeEnergyKey(pickString(record, ["sku"]))) ||
    energyMap.get(makeEnergyKey(pickString(record, ["internalNumber"]))) ||
    energyMap.get(makeEnergyKey(pickString(record, ["ean"]))) ||
    null;

  return {
    sku,
    slug,
    title,
    brand: cleanupText(pickString(record, ["brand", "vendor", "manufacturer"])),
    price:
      pickNumber(record, [
        "price",
        "salePrice",
        "grossPrice",
        "finalPrice",
        "shopifyPrice",
        "comparePrice",
      ]) ?? 0,
    image: images[0] || image,
    images,
    category: mappedCategory.category,
    subcategory: mappedCategory.subcategory,
    description: cleanupText(pickString(record, ["description", "shortDescription"])),
    description2: cleanupText(pickString(record, ["description2", "longDescription"])),
    ean: cleanupText(pickString(record, ["ean", "gtin"])),
    internalNumber: cleanupText(
      pickString(record, ["internalNumber", "articleNumber", "articleNo"])
    ),
    inStock,
    stockQty,
    deliveryDate: pickString(record, ["deliveryDate", "eta", "availableFrom"]) || null,
    merchandiseId,
    shopifyProductHandle,
    shopifyProductId: cleanupText(pickString(record, ["shopifyProductId"])),
    shopifyVariantId: cleanupText(pickString(record, ["shopifyVariantId", "variantId"])),
    shopifySyncStatus: cleanupText(pickString(record, ["shopifySyncStatus"])),
    energyLabel,
  };
}

export function isValidMerchandiseId(value?: string | null) {
  return (
    typeof value === "string" &&
    value.trim().startsWith("gid://shopify/ProductVariant/")
  );
}

function isSyncedProduct(product: Product) {
  const status = String(product.shopifySyncStatus || "").trim();

  if (!status) return true;

  return status === "synced" || status === "updated-existing" || status === "ok";
}

export function isSellableProduct(product: Product) {
  return Boolean(
    isSyncedProduct(product) &&
      isValidMerchandiseId(product.merchandiseId) &&
      product.price > 0 &&
      product.image &&
      ((product.stockQty ?? 0) > 0 || product.inStock)
  );
}

function isBlockedProduct(product: Product) {
  const text = normalize(
    [
      product.title,
      product.brand,
      product.sku,
      product.ean,
      product.category,
      product.subcategory,
      product.description,
      product.description2,
    ].join(" ")
  );

  const allowedOffice =
    product.category === "Office & Business" ||
    product.subcategory === "Tinte & Toner" ||
    product.subcategory === "Papier & Etiketten";

  if (allowedOffice) return false;

  const blockedTerms = [
    "garantie",
    "garantieerw",
    "prosupport",
    "warranty",
    "support service",
    "servicepack",
    "kaffee",
    "kaffeefettloser",
    "serviertablett",
    "holztablett",
    "spielzeug",
    "toy",
    "lexibook",
    "disney",
    "frozen",
  ];

  return blockedTerms.some((term) => text.includes(normalize(term)));
}

export function scoreProduct(product: Product): number {
  let score = 0;

  if (isSellableProduct(product)) score += 2000;
  if (product.shopifyProductHandle) score += 600;
  if (isValidMerchandiseId(product.merchandiseId)) score += 500;

  if ((product.stockQty ?? 0) >= 20) score += 260;
  else if ((product.stockQty ?? 0) >= 6) score += 220;
  else if ((product.stockQty ?? 0) > 0) score += 160;

  if (product.price > 0) score += 180;
  if ((product.images?.length ?? 0) > 1) score += 130;
  if (product.image) score += 120;
  if (product.brand) score += 40;
  if (product.energyLabel?.class || product.energyLabel?.labelUrl) score += 30;
  if (product.description || product.description2) score += 20;

  return score;
}

const loadAllProducts = cache((): Product[] => {
  const allRecords = CATALOG_PATHS.flatMap(readJsonArray);
  const energyMap = buildEnergyMap(allRecords);

  const mapped = allRecords
    .map((record) => mapRecordToProduct(record, energyMap))
    .filter((item): item is Product => Boolean(item));

  const unique = new Map<string, Product>();

  for (const product of mapped) {
    const key =
      product.merchandiseId ||
      product.ean ||
      product.internalNumber ||
      product.sku ||
      product.shopifyProductHandle ||
      product.slug;

    const existing = unique.get(key);

    if (!existing || scoreProduct(product) > scoreProduct(existing)) {
      unique.set(key, product);
    }
  }

  return Array.from(unique.values()).sort(
    (a, b) => scoreProduct(b) - scoreProduct(a)
  );
});

export function getAllProducts(): Product[] {
  return loadAllProducts();
}

export function getCleanProducts(): Product[] {
  return loadAllProducts().filter((product) => !isBlockedProduct(product));
}

export function getAllProductSlugs(): string[] {
  return getPurchasableProducts().map((product) => product.slug);
}

export function getProductBySlug(slug: string): Product | undefined {
  const wanted = slugifyValue(decodeURIComponent(slug || ""));

  return getAllProducts().find((product) => {
    const candidates = [
      product.slug,
      product.shopifyProductHandle,
      product.sku,
      product.internalNumber,
      product.ean,
      product.title,
    ]
      .filter(Boolean)
      .map((value) => slugifyValue(String(value)));

    return candidates.includes(wanted);
  });
}

export function getFeaturedProducts(limit = 8): Product[] {
  return getPurchasableProducts(limit);
}

export function getPurchasableProducts(limit?: number): Product[] {
  const items = getCleanProducts()
    .filter(isSellableProduct)
    .sort((a, b) => scoreProduct(b) - scoreProduct(a));

  return typeof limit === "number" ? items.slice(0, limit) : items;
}

export function getTopProducts(limit = 8): Product[] {
  return getPurchasableProducts(limit);
}

export function getImmediatelyAvailableProducts(limit = 8): Product[] {
  const items = getPurchasableProducts()
    .filter((product) => (product.stockQty ?? 0) >= 6)
    .sort((a, b) => (b.stockQty ?? 0) - (a.stockQty ?? 0));

  return items.slice(0, limit);
}

export function getBestDealProducts(limit = 8): Product[] {
  const items = getPurchasableProducts()
    .filter((product) => product.price > 0)
    .sort((a, b) => {
      const aScore = scoreProduct(a) / Math.max(a.price, 1);
      const bScore = scoreProduct(b) / Math.max(b.price, 1);
      return bScore - aScore;
    });

  return items.slice(0, limit);
}

export function getProductsByCategory(category?: string): Product[] {
  if (!category) return getPurchasableProducts();

  const c = normalize(category);

  return getPurchasableProducts().filter(
    (product) => normalize(product.category) === c
  );
}

export function getProductsBySubcategory(
  category?: string,
  subcategory?: string
): Product[] {
  const c = normalize(category);
  const s = normalize(subcategory);

  return getPurchasableProducts().filter((product) => {
    const matchesCategory = !c || normalize(product.category) === c;
    const matchesSubcategory = !s || normalize(product.subcategory) === s;
    return matchesCategory && matchesSubcategory;
  });
}

export function searchProducts(query?: string): Product[] {
  const q = normalize(query);
  if (!q) return getPurchasableProducts();

  return getPurchasableProducts().filter((product) => {
    const text = normalize(
      [
        product.title,
        product.brand,
        product.sku,
        product.ean,
        product.category,
        product.subcategory,
        product.shopifyProductHandle,
      ].join(" ")
    );

    return text.includes(q);
  });
}

export function getRelatedProducts(
  currentSlug: string,
  category?: string,
  subcategory?: string,
  limit = 4
): Product[] {
  const all = getPurchasableProducts().filter(
    (product) => product.slug !== currentSlug
  );

  const c = normalize(category);
  const s = normalize(subcategory);

  const sameSubcategory = s
    ? all.filter(
        (product) =>
          normalize(product.category) === c &&
          normalize(product.subcategory) === s
      )
    : [];

  if (sameSubcategory.length > 0) {
    return sameSubcategory
      .sort((a, b) => scoreProduct(b) - scoreProduct(a))
      .slice(0, limit);
  }

  const sameCategory = c
    ? all.filter((product) => normalize(product.category) === c)
    : [];

  if (sameCategory.length > 0) {
    return sameCategory
      .sort((a, b) => scoreProduct(b) - scoreProduct(a))
      .slice(0, limit);
  }

  return all.sort((a, b) => scoreProduct(b) - scoreProduct(a)).slice(0, limit);
}