import "server-only";
import { cache } from "react";
import catalogPart1 from "../integrations/alltron/out/iumatec-storefront-clean-1.json";
import catalogPart2 from "../integrations/alltron/out/iumatec-storefront-clean-2.json";

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
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
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

function resolveImages(
  record: CatalogRecord,
  mainImage?: string | null,
): string[] {
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
      record.shopifyProductTitle,
  );

  const titleHas = (terms: string[]) =>
    terms.some((term) => title.includes(normalize(term)));

  const rawHas = (terms: string[]) =>
    terms.some((term) =>
      [cat1, cat2, cat3, cat4].some((cat) => cat.includes(normalize(term))),
    );

  const titleOrRawHas = (terms: string[]) => titleHas(terms) || rawHas(terms);

  /*
   * Classify specific product families before generic accessories.
   * Descriptions often mention compatible devices, so product-family rules
   * intentionally rely on the title and the supplier category path.
   */
  if (
    titleOrRawHas([
      "netzwerkkabel",
      "patchkabel",
      "ethernet kabel",
      "ethernet-kabel",
      "lan kabel",
      "lan-kabel",
      "rj45 kabel",
      "rj45-kabel",
      "cat5e",
      "cat6",
      "cat 6",
      "cat7",
      "cat 7",
      "cat8",
      "cat 8",
    ])
  ) {
    return { category: "Netzwerk", subcategory: "Netzwerk-Kabel" };
  }

  if (
    titleOrRawHas([
      "externe ssd",
      "external ssd",
      "portable ssd",
      "portable solid state",
    ])
  ) {
    return { category: "Datenspeicher", subcategory: "Externe SSD" };
  }

  if (
    titleOrRawHas([
      "externe festplatte",
      "external hard drive",
      "portable hard drive",
      "portable hdd",
    ])
  ) {
    return { category: "Datenspeicher", subcategory: "Externe HDD" };
  }

  if (
    titleOrRawHas([
      "digitalkamera",
      "systemkamera",
      "spiegelreflexkamera",
      "kompaktkamera",
      "dslr",
      "mirrorless",
      "camcorder",
      "action cam",
      "actioncam",
    ])
  ) {
    return { category: "Foto & Video", subcategory: "Kameras" };
  }

  if (
    titleOrRawHas([
      "objektiv",
      "camera lens",
      "kameraobjektiv",
      "teleobjektiv",
      "weitwinkelobjektiv",
    ])
  ) {
    return { category: "Foto & Video", subcategory: "Objektive" };
  }

  if (
    titleOrRawHas([
      "kamerastativ",
      "camera tripod",
      "fotostativ",
      "gimbal",
      "smallrig",
      "kameratasche",
      "camera bag",
      "blitzgerat",
      "blitzgerät",
      "studioleuchte",
      "ringlicht",
    ])
  ) {
    return { category: "Foto & Video", subcategory: "Foto-Zubehör" };
  }

  if (
    titleOrRawHas([
      "dab radio",
      "dab+ radio",
      "internetradio",
      "uhrenradio",
      "radiowecker",
      "kofferradio",
      "tischradio",
      "radio tuner",
    ])
  ) {
    return { category: "Audio & Hi-Fi", subcategory: "Radios" };
  }

  if (
    titleOrRawHas([
      "bluetooth lautsprecher",
      "bluetooth speaker",
      "portable speaker",
      "party speaker",
      "partybox",
      "soundbar",
      "subwoofer",
      "regallautsprecher",
      "standlautsprecher",
      "lautsprecher",
      "speaker",
    ])
  ) {
    return { category: "Audio & Hi-Fi", subcategory: "Lautsprecher" };
  }

  if (
    titleOrRawHas([
      "in-ear kopfhorer",
      "in-ear kopfhörer",
      "over-ear kopfhorer",
      "over-ear kopfhörer",
      "true wireless",
      "wireless earbuds",
      "bluetooth kopfhorer",
      "bluetooth kopfhörer",
      "airpods",
      "earbuds",
    ])
  ) {
    return { category: "Audio & Hi-Fi", subcategory: "Kopfhörer" };
  }

  if (
    titleOrRawHas([
      "plattenspieler",
      "turntable",
      "stereoanlage",
      "hi-fi anlage",
      "hifi anlage",
      "av receiver",
      "audio receiver",
      "verstarker",
      "verstärker",
    ])
  ) {
    return { category: "Audio & Hi-Fi", subcategory: "Hi-Fi" };
  }

  if (
    titleOrRawHas([
      "smartwatch",
      "fitness tracker",
      "fitnesstracker",
      "sportuhr",
      "apple watch",
      "galaxy watch",
      "pixel watch",
    ])
  ) {
    return { category: "Mobile", subcategory: "Smartwatches" };
  }

  if (
    rawHas(["kabel", "adapter", "video-kabel", "audio-kabel", "usb-kabel"]) ||
    titleHas([
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
    titleHas([
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
    titleHas([
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
    titleHas([
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
    titleHas([
      "ipad",
      "galaxy tab",
      "surface pro",
      "tablet ",
      "tab s",
      "tab a",
    ]) ||
    rawHas(["tablet", "tablets"])
  ) {
    return { category: "Mobile", subcategory: "Tablets" };
  }

  if (
    titleHas([
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
    titleHas([
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
    titleOrRawHas([
      "monitorhalterung",
      "monitor halterung",
      "monitorarm",
      "monitor arm",
      "displayhalterung",
      "display halterung",
      "bildschirmhalterung",
      "vesa halterung",
      "monitor stand",
      "monitorstander",
      "monitorständer",
      "privacy filter",
      "blickschutzfilter",
    ])
  ) {
    return { category: "Zubehör", subcategory: "Monitor-Zubehör" };
  }

  if (
    rawHas(["monitore", "display", "bildschirm"]) ||
    titleHas([
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
    titleHas(["desktop set", "keyboard", "tastatur", "combo", "mk270", "mk470"])
  ) {
    return { category: "Peripherie", subcategory: "Tastaturen" };
  }

  if (rawHas(["maus", "mouse"]) || titleHas(["maus", "mouse", "trackball"])) {
    return { category: "Peripherie", subcategory: "Mäuse" };
  }

  if (
    rawHas(["headset", "kopfhorer", "kopfhoerer"]) ||
    titleHas(["headset", "kopfhorer", "kopfhoerer", "headphone", "earbuds"])
  ) {
    return { category: "Peripherie", subcategory: "Headsets" };
  }

  if (rawHas(["webcam"]) || titleHas(["webcam"])) {
    return { category: "Peripherie", subcategory: "Webcams" };
  }

  if (
    rawHas(["mikrofon", "microphone"]) ||
    titleHas(["mikrofon", "microphon", "microphone"])
  ) {
    return { category: "Peripherie", subcategory: "Mikrofone" };
  }

  if (
    rawHas(["grafikkarte", "graphics card"]) ||
    titleHas([
      "grafikkarte",
      "graphics card",
      "gpu",
      "geforce",
      "rtx ",
      "radeon",
    ])
  ) {
    return { category: "PC-Komponenten", subcategory: "Grafikkarten" };
  }

  if (
    rawHas(["arbeitsspeicher", "memory", "ram"]) ||
    titleHas([
      "arbeitsspeicher",
      "ram",
      "memory",
      "ddr4",
      "ddr5",
      "so-dimm",
      "sodimm",
    ])
  ) {
    return { category: "PC-Komponenten", subcategory: "RAM" };
  }

  if (
    rawHas(["mainboard", "motherboard"]) ||
    titleHas(["mainboard", "motherboard"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Mainboards" };
  }

  if (
    rawHas(["netzteil", "power supply"]) ||
    titleHas(["netzteil", "power supply", "psu"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Netzteile" };
  }

  if (
    rawHas(["prozessor", "processor", "cpu"]) ||
    titleHas(["prozessor", "processor", "cpu ", "intel core", "ryzen"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Prozessoren" };
  }

  if (
    rawHas(["gehause", "gehaeuse", "pc case"]) ||
    titleHas(["pc gehause", "pc case"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Gehäuse" };
  }

  if (
    rawHas(["kuhler", "kuehler", "cooler"]) ||
    titleHas(["cpu cooler", "kuhler", "kuehler"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Kühlung" };
  }

  if (rawHas(["router", "firewall"]) || titleHas(["router", "firewall"])) {
    return { category: "Netzwerk", subcategory: "Router" };
  }

  if (rawHas(["switch", "switches"]) || titleHas(["switch", "switches"])) {
    return { category: "Netzwerk", subcategory: "Switches" };
  }

  if (
    rawHas(["wlan", "wifi", "mesh", "access point", "accesspoint"]) ||
    titleHas(["wlan", "wifi", "wi-fi", "mesh", "access point", "accesspoint"])
  ) {
    return { category: "Netzwerk", subcategory: "WLAN Mesh" };
  }

  if (
    rawHas(["ssd", "solid state drive"]) ||
    titleHas(["ssd", "nvme", "m.2", "solid state"])
  ) {
    return { category: "Datenspeicher", subcategory: "SSD" };
  }

  if (
    rawHas(["festplatte", "hard disk", "hdd"]) ||
    titleHas(["festplatte", "hard disk", "hdd"])
  ) {
    return { category: "Datenspeicher", subcategory: "HDD" };
  }

  if (rawHas(["nas"]) || titleHas(["nas", "synology", "qnap"])) {
    return { category: "Datenspeicher", subcategory: "NAS" };
  }

  if (
    rawHas(["drucker", "printer"]) ||
    titleHas([
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
    titleHas([
      "toner",
      "tinte",
      "patrone",
      "cartridge",
      "druckerpatrone",
      "ink cartridge",
    ])
  ) {
    return { category: "Office & Business", subcategory: "Tinte & Toner" };
  }

  if (
    rawHas(["papier", "etikett", "etiketten"]) ||
    titleHas([
      "papier",
      "etikett",
      "labels",
      "label",
      "etikettenrolle",
      "fotopapier",
    ])
  ) {
    return { category: "Office & Business", subcategory: "Papier & Etiketten" };
  }

  if (
    rawHas(["uberwachung", "ueberwachung", "security camera", "ip-kamera"]) ||
    titleHas([
      "security cam",
      "uberwachungskamera",
      "ueberwachungskamera",
      "überwachungskamera",
      "ip kamera",
      "ip-kamera",
      "outdoor camera",
      "indoor camera",
      "video doorbell",
      "videoturklingel",
    ])
  ) {
    return { category: "Smart Home", subcategory: "Kameras" };
  }

  if (titleOrRawHas(["steckdose", "smart plug", "wlan stecker"])) {
    return { category: "Smart Home", subcategory: "Steckdosen" };
  }

  if (
    titleOrRawHas([
      "smart light",
      "smart bulb",
      "led stripe",
      "led strip",
      "lampe",
    ])
  ) {
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
  return String(value || "")
    .trim()
    .toLowerCase();
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
  energyMap: Map<string, Product["energyLabel"]>,
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
    description: cleanupText(
      pickString(record, ["description", "shortDescription"]),
    ),
    description2: cleanupText(
      pickString(record, ["description2", "longDescription"]),
    ),
    ean: cleanupText(pickString(record, ["ean", "gtin"])),
    internalNumber: cleanupText(
      pickString(record, ["internalNumber", "articleNumber", "articleNo"]),
    ),
    inStock,
    stockQty,
    deliveryDate:
      pickString(record, ["deliveryDate", "eta", "availableFrom"]) || null,
    merchandiseId,
    shopifyProductHandle,
    shopifyProductId: cleanupText(pickString(record, ["shopifyProductId"])),
    shopifyVariantId: cleanupText(
      pickString(record, ["shopifyVariantId", "variantId"]),
    ),
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

export function isSellableProduct(product: Product) {
  return Boolean(
    isValidMerchandiseId(product.merchandiseId) &&
      product.price > 0 &&
      product.image &&
      ((product.stockQty ?? 0) > 0 || product.inStock),
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
    ].join(" "),
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

function categoryRelevanceScore(
  product: Product,
  category?: string,
  subcategory?: string,
): number {
  let score = scoreProduct(product);
  const title = normalize(product.title);
  const wantedCategory = normalize(category);
  const wantedSubcategory = normalize(subcategory);

  if (wantedCategory && normalize(product.category) === wantedCategory) {
    score += 2000;
  }

  if (
    wantedSubcategory &&
    normalize(product.subcategory) === wantedSubcategory
  ) {
    score += 3500;
  }

  const strongTitleTerms: Record<string, string[]> = {
    laptops: [
      "laptop",
      "notebook",
      "macbook",
      "thinkpad",
      "elitebook",
      "probook",
      "latitude",
      "chromebook",
    ],
    monitore: [
      "monitor",
      "bildschirm",
      "gaming display",
      "business display",
    ],
    smartphones: [
      "smartphone",
      "iphone",
      "galaxy s",
      "galaxy a",
      "galaxy z",
      "google pixel",
      "xiaomi",
      "redmi",
      "oppo",
      "motorola",
      "fairphone",
    ],
    tablets: [
      "tablet",
      "ipad",
      "galaxy tab",
      "surface pro",
      "lenovo tab",
      "matepad",
    ],
    grafikkarten: ["grafikkarte", "graphics card", "geforce", "rtx", "radeon"],
    ssd: ["ssd", "nvme", "solid state"],
    hdd: ["hdd", "festplatte", "hard drive"],
    nas: ["nas", "synology", "qnap"],
  };

  for (const term of strongTitleTerms[wantedSubcategory] || []) {
    if (title.includes(term)) {
      score += 1200;
      break;
    }
  }

  return score;
}

function sortForCategory(
  products: Product[],
  category?: string,
  subcategory?: string,
) {
  return [...products].sort((a, b) => {
    const relevanceDifference =
      categoryRelevanceScore(b, category, subcategory) -
      categoryRelevanceScore(a, category, subcategory);

    if (relevanceDifference !== 0) return relevanceDifference;

    const stockDifference = (b.stockQty ?? 0) - (a.stockQty ?? 0);
    if (stockDifference !== 0) return stockDifference;

    return a.price - b.price;
  });
}

const loadAllProducts = cache((): Product[] => {
  const allRecords = [
    ...(catalogPart1 as CatalogRecord[]),
    ...(catalogPart2 as CatalogRecord[]),
  ];
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

  return Array.from(unique.values());
});

const loadCleanProducts = cache((): Product[] =>
  loadAllProducts().filter((product) => !isBlockedProduct(product)),
);

const loadPurchasableProducts = cache((): Product[] =>
  loadCleanProducts()
    .filter(isSellableProduct)
    .sort((a, b) => scoreProduct(b) - scoreProduct(a)),
);

function productLookupKeys(product: Product): string[] {
  return [
    product.slug,
    product.shopifyProductHandle,
    product.sku,
    product.internalNumber,
    product.ean,
    product.title,
  ]
    .filter(Boolean)
    .map((value) => slugifyValue(String(value)));
}

const loadProductBySlugIndex = cache(() => {
  const index = new Map<string, Product>();

  for (const product of loadAllProducts()) {
    for (const key of productLookupKeys(product)) {
      if (key && !index.has(key)) index.set(key, product);
    }
  }

  return index;
});

function productFamilyKey(product: Product): string {
  let title = normalize(product.title)
    .replace(
      /\b(midnight|mitternacht|sky blue|sky-blue|silber|silver|schwarz|black|grau|gray|grey|blau|blue|weiss|white|gold|rose|rot|red|grun|green|starlight|space schwarz|space black)\b/g,
      "",
    )
    .replace(
      /\b(64gb|128gb|256gb|512gb|1tb|2tb|4tb|8gb|16gb|24gb|32gb|64 gb|128 gb|256 gb|512 gb|1 tb|2 tb|4 tb|8 gb|16 gb|24 gb|32 gb)\b/g,
      "",
    )
    .replace(/\b(wifi|wi-fi|5g|cellular|lte)\b/g, "")
    .replace(/[,/()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${normalize(product.brand)}-${title}`;
}

const loadProductFamilyIndex = cache(() => {
  const index = new Map<string, Product[]>();

  for (const product of loadPurchasableProducts()) {
    const key = productFamilyKey(product);
    if (!key) continue;

    const family = index.get(key);
    if (family) family.push(product);
    else index.set(key, [product]);
  }

  return index;
});

const loadCategoryIndex = cache(() => {
  const byCategory = new Map<string, Product[]>();
  const bySubcategory = new Map<string, Product[]>();

  for (const product of loadPurchasableProducts()) {
    const category = normalize(product.category);
    const subcategory = normalize(product.subcategory);

    if (category) {
      const categoryItems = byCategory.get(category);
      if (categoryItems) categoryItems.push(product);
      else byCategory.set(category, [product]);
    }

    if (category && subcategory) {
      const key = `${category}\u0000${subcategory}`;
      const subcategoryItems = bySubcategory.get(key);
      if (subcategoryItems) subcategoryItems.push(product);
      else bySubcategory.set(key, [product]);
    }
  }

  return { byCategory, bySubcategory };
});

export function getAllProducts(): Product[] {
  return loadAllProducts();
}

export function getCleanProducts(): Product[] {
  return loadCleanProducts();
}

export function getAllProductSlugs(): string[] {
  return getPurchasableProducts().map((product) => product.slug);
}

export function getProductBySlug(slug: string): Product | undefined {
  const wanted = slugifyValue(decodeURIComponent(slug || ""));
  return loadProductBySlugIndex().get(wanted);
}

export function getProductVariants(
  product: Product,
  limit = 24,
): Product[] {
  const currentSlug = product.slug;
  const family =
    loadProductFamilyIndex().get(productFamilyKey(product)) || [product];
  const seen = new Set<string>();

  return [...family]
    .filter((item) => {
      if (!item.slug || seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    })
    .sort((a, b) => {
      if (a.slug === currentSlug) return -1;
      if (b.slug === currentSlug) return 1;
      return a.price - b.price;
    })
    .slice(0, Math.max(1, limit));
}

export function getFeaturedProducts(limit = 8): Product[] {
  return getPurchasableProducts(limit);
}

export function getPurchasableProducts(limit?: number): Product[] {
  const items = loadPurchasableProducts();

  return typeof limit === "number" ? items.slice(0, limit) : items;
}

export function getTopProducts(limit = 8): Product[] {
  return getPurchasableProducts(limit);
}

export function getCatalogRecordCount(): number {
  return (
    (catalogPart1 as CatalogRecord[]).length +
    (catalogPart2 as CatalogRecord[]).length
  );
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

  return sortForCategory(
    getPurchasableProducts().filter(
      (product) => normalize(product.category) === c,
    ),
    category,
  );
}

export function getProductsBySubcategory(
  category?: string,
  subcategory?: string,
): Product[] {
  const c = normalize(category);
  const s = normalize(subcategory);

  return sortForCategory(
    getPurchasableProducts().filter((product) => {
      const matchesCategory = !c || normalize(product.category) === c;
      const matchesSubcategory = !s || normalize(product.subcategory) === s;
      return matchesCategory && matchesSubcategory;
    }),
    category,
    subcategory,
  );
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
      ].join(" "),
    );

    return text.includes(q);
  });
}

export function getRelatedProducts(
  currentSlug: string,
  category?: string,
  subcategory?: string,
  limit = 4,
): Product[] {
  const c = normalize(category);
  const s = normalize(subcategory);
  const { byCategory, bySubcategory } = loadCategoryIndex();
  const sameSubcategory =
    c && s ? bySubcategory.get(`${c}\u0000${s}`) || [] : [];
  const sameCategory = c ? byCategory.get(c) || [] : [];
  const candidates =
    sameSubcategory.length > 1
      ? sameSubcategory
      : sameCategory.length > 1
        ? sameCategory
        : getPurchasableProducts();

  return candidates
    .filter((product) => product.slug !== currentSlug)
    .slice(0, limit);
}

export type CatalogQuery = {
  q?: string;
  category?: string;
  subcategory?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: "featured" | "price-desc" | "price-asc" | "title-asc" | "brand-asc";
  offset?: number;
  limit?: number;
};

export type CatalogFacet = { label: string; count: number };

function facet(
  products: Product[],
  getter: (product: Product) => string | undefined,
): CatalogFacet[] {
  const counts = new Map<string, number>();
  for (const product of products) {
    const label = String(getter(product) || "").trim();
    if (label) counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "de"));
}

export function queryCatalog(query: CatalogQuery = {}) {
  const all = getPurchasableProducts();
  const q = normalize(query.q);
  const category = normalize(query.category === "Alle" ? "" : query.category);
  const subcategory = normalize(
    query.subcategory === "Alle" ? "" : query.subcategory,
  );
  const wantedBrands = new Set((query.brands || []).map(normalize));
  const minPrice = Number.isFinite(query.minPrice) ? Number(query.minPrice) : 0;
  const maxPrice = Number.isFinite(query.maxPrice)
    ? Number(query.maxPrice)
    : Number.POSITIVE_INFINITY;

  const searched = all.filter((product) => {
    if (!q) return true;
    return normalize(
      [
        product.title,
        product.brand,
        product.sku,
        product.ean,
        product.category,
        product.subcategory,
      ].join(" "),
    ).includes(q);
  });

  const categoryBase = searched.filter(
    (product) => !category || normalize(product.category) === category,
  );
  const subcategoryBase = categoryBase.filter(
    (product) => !subcategory || normalize(product.subcategory) === subcategory,
  );

  const filtered = subcategoryBase.filter((product) => {
    const price = Number(product.price || 0);
    const brandMatch =
      wantedBrands.size === 0 || wantedBrands.has(normalize(product.brand));
    const stockMatch =
      !query.inStock ||
      Boolean(product.inStock || Number(product.stockQty || 0) > 0);
    return brandMatch && stockMatch && price >= minPrice && price <= maxPrice;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case "price-desc":
        return b.price - a.price;
      case "price-asc":
        return a.price - b.price;
      case "title-asc":
        return a.title.localeCompare(b.title, "de");
      case "brand-asc":
        return String(a.brand || "").localeCompare(String(b.brand || ""), "de");
      default:
        return scoreProduct(b) - scoreProduct(a);
    }
  });

  const offset = Math.max(0, Number(query.offset || 0));
  const limit = Math.min(48, Math.max(1, Number(query.limit || 24)));
  const prices = searched.map((product) => product.price).filter(Number.isFinite);

  return {
    products: sorted.slice(offset, offset + limit),
    total: sorted.length,
    catalogTotal: all.length,
    offset,
    limit,
    hasMore: offset + limit < sorted.length,
    facets: {
      categories: facet(searched, (product) => product.category),
      subcategories: facet(categoryBase, (product) => product.subcategory),
      brands: facet(subcategoryBase, (product) => product.brand).slice(0, 40),
      available: subcategoryBase.filter(
        (product) => product.inStock || Number(product.stockQty || 0) > 0,
      ).length,
      minPrice: prices.length ? Math.floor(Math.min(...prices)) : 0,
      maxPrice: prices.length ? Math.ceil(Math.max(...prices)) : 10000,
    },
  };
}
