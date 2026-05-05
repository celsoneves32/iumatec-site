import fs from "fs";
import path from "path";
import iconv from "iconv-lite";
import { XMLParser } from "fast-xml-parser";

type AnyObj = Record<string, any>;

type CatalogProduct = {
  sku: string;
  internalNumber: string;
  ean: string;
  title: string;
  title2: string;
  fullTitle: string;
  brand: string;
  stock: number;
  price: number | null;
  image: string | null;
  images: string[];
  description: string;
  description2: string;
  rawCategory: {
    cat1: string;
    cat2: string;
    cat3: string;
    cat4: string;
  };
  iumatecCategory: {
    main: string;
    sub: string;
    priority: number;
  };
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
  trimValues: true,
});

const downloadsDir = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads"
);

const outDir = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out"
);

fs.mkdirSync(outDir, { recursive: true });

function decodeXmlFile(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const xml = iconv.decode(buffer, "windows-1252");
  return parser.parse(xml);
}

function norm(value: unknown): string {
  return String(value ?? "").trim();
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/'/g, "")
    .replace(",", ".");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function uniq(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function getArticleItemsFromXml(data: AnyObj): AnyObj[] {
  if (Array.isArray(data?.items?.item)) return data.items.item;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.item)) return data.item;
  return [];
}

function getPriceItemsFromXml(data: AnyObj): AnyObj[] {
  if (Array.isArray(data?.prices?.item)) return data.prices.item;
  if (Array.isArray(data?.prices?.price)) return data.prices.price;
  if (Array.isArray(data?.price)) return data.price;
  if (Array.isArray(data?.item)) return data.item;
  return [];
}

function getPartNumber(item: AnyObj) {
  return item?.part_number || {};
}

function getCategory(item: AnyObj) {
  return (
    item?.part_catagory ||
    item?.part_category ||
    item?.category ||
    item?.item_category ||
    {}
  );
}

function getArticleKeys(item: AnyObj) {
  const pn = getPartNumber(item);

  return uniq([
    norm(pn?.LITT),
    norm(pn?.LITM),
    norm(pn?.MITM),
    norm(pn?.EITM),
    norm(item?.LITT),
    norm(item?.LITM),
    norm(item?.MITM),
    norm(item?.EITM),
    norm(item?.sku),
    norm(item?.SKU),
    norm(item?.ean),
    norm(item?.EAN),
  ]);
}

function getPriceKeys(item: AnyObj) {
  return uniq([
    norm(item?.LITT),
    norm(item?.LITM),
    norm(item?.MITM),
    norm(item?.EITM),
    norm(item?.sku),
    norm(item?.SKU),
    norm(item?.ean),
    norm(item?.EAN),
    norm(item?.part_number?.LITT),
    norm(item?.part_number?.LITM),
    norm(item?.part_number?.MITM),
    norm(item?.part_number?.EITM),
  ]);
}

function getTextBlob(item: AnyObj) {
  const cat = getCategory(item);

  return [
    norm(item?.part_description?.DESC),
    norm(item?.part_description?.DESC2),
    norm(item?.part_description?.WTXT),
    norm(item?.part_description?.WTX2),
    norm(item?.additional_information?.MAFT),
    norm(cat?.CAT1),
    norm(cat?.CAT2),
    norm(cat?.CAT3),
    norm(cat?.CATA),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function loadArticleItems() {
  const file = path.join(downloadsDir, "ArtikeldatenV2.xml");
  const data = decodeXmlFile(file);
  return getArticleItemsFromXml(data);
}

function loadPriceItems() {
  const file = path.join(downloadsDir, "PreisdatenV2.xml");
  const data = decodeXmlFile(file);
  return getPriceItemsFromXml(data);
}

function loadImageIndex() {
  const file = path.join(downloadsDir, "alltron-bilder-urls.csv");
  const csvRaw = fs.readFileSync(file);
  const csvText = iconv.decode(csvRaw, "windows-1252");

  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const imageIndex = new Map<string, string[]>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const sep = line.includes(";") ? ";" : ",";
    const parts = line.split(sep);

    if (parts.length < 2) continue;

    const key = norm(parts[0]);
    const url = norm(parts[1]);

    if (!key || !url) continue;

    if (!imageIndex.has(key)) {
      imageIndex.set(key, []);
    }

    imageIndex.get(key)!.push(url);
  }

  return imageIndex;
}

function buildPriceIndex(priceItems: AnyObj[]) {
  const priceIndex = new Map<
    string,
    {
      price: number | null;
      stock: number | null;
      raw: AnyObj;
    }
  >();

  for (const item of priceItems) {
    const priceBlock = item?.price || {};
    const keys = getPriceKeys(item);

    const price =
      toNumber(priceBlock?.EXPR) ??
      toNumber(priceBlock?.ECPR) ??
      toNumber(priceBlock?.INPR) ??
      toNumber(item?.EXPR) ??
      toNumber(item?.ECPR) ??
      toNumber(item?.INPR) ??
      toNumber(item?.price) ??
      null;

    const stock =
      toNumber(item?.STQU) ??
      toNumber(item?.stock) ??
      toNumber(item?.quantity) ??
      toNumber(item?.QTY) ??
      null;

    for (const key of keys) {
      if (!priceIndex.has(key)) {
        priceIndex.set(key, { price, stock, raw: item });
      }
    }
  }

  return priceIndex;
}

function mapToIumatecCategory(item: AnyObj) {
  const text = getTextBlob(item);

  if (
    hasAny(text, [
      "notebook",
      "laptop",
      "ultrabook",
      "macbook",
      "thinkpad",
      "elitebook",
      "probook",
      "vivobook",
      "zenbook",
      "chromebook",
      "surface laptop",
      "gaming notebook",
      "portable pc",
    ])
  ) {
    return { main: "Computer", sub: "Laptops", priority: 100 };
  }

  if (
    hasAny(text, [
      "desktop",
      "pc-system",
      "pc system",
      "workstation",
      "all-in-one pc",
      "aio pc",
      "gaming pc",
      "business pc",
      "tower pc",
      "desktop computer",
      "desktop-pc",
    ])
  ) {
    return { main: "Computer", sub: "Desktop-PCs", priority: 99 };
  }

  if (hasAny(text, ["mini pc", "minipc", "nuc", "thin client"])) {
    return { main: "Computer", sub: "Mini PCs", priority: 98 };
  }

  if (
    hasAny(text, [
      "smartphone",
      "handy",
      "iphone",
      "galaxy s",
      "galaxy a",
      "pixel phone",
      "mobile phone",
    ])
  ) {
    return { main: "Mobile", sub: "Smartphones", priority: 97 };
  }

  if (hasAny(text, ["tablet", "ipad", "galaxy tab", "surface go", "surface pro"])) {
    return { main: "Mobile", sub: "Tablets", priority: 96 };
  }

  if (
    hasAny(text, [
      "monitor",
      "display",
      "curved monitor",
      "oled monitor",
      "lcd monitor",
      "gaming monitor",
      "screen",
    ])
  ) {
    return { main: "Peripherie", sub: "Monitors", priority: 95 };
  }

  if (
    hasAny(text, [
      "grafikkarte",
      "graphic card",
      "gpu",
      "geforce",
      "radeon",
      "rtx",
      "quadro",
      "arc graphics",
    ])
  ) {
    return { main: "PC-Komponenten", sub: "Grafikkarten", priority: 94 };
  }

  if (hasAny(text, ["mainboard", "motherboard"])) {
    return { main: "PC-Komponenten", sub: "Mainboards", priority: 93 };
  }

  if (
    hasAny(text, [
      "arbeitsspeicher",
      "ram",
      "ddr4",
      "ddr5",
      "so-dimm",
      "sodimm",
      "memory module",
    ])
  ) {
    return { main: "PC-Komponenten", sub: "Arbeitsspeicher (RAM)", priority: 92 };
  }

  if (
    hasAny(text, [
      "prozessor",
      "processor",
      "intel core",
      "ryzen",
      "threadripper",
      "xeon",
      "cpu",
      "celeron",
      "pentium",
    ])
  ) {
    return { main: "PC-Komponenten", sub: "Prozessoren", priority: 91 };
  }

  if (hasAny(text, ["netzteil", "power supply", "psu"])) {
    return { main: "PC-Komponenten", sub: "Netzteile", priority: 90 };
  }

  if (hasAny(text, ["ssd", "nvme", "m.2"])) {
    return { main: "Datenspeicher", sub: "SSD", priority: 89 };
  }

  if (hasAny(text, ["hdd", "harddisk", "hard drive"])) {
    return { main: "Datenspeicher", sub: "HDD", priority: 88 };
  }

  if (hasAny(text, ["nas"])) {
    return { main: "Datenspeicher", sub: "NAS", priority: 87 };
  }

  if (hasAny(text, ["router"])) {
    return { main: "Netzwerk", sub: "Router", priority: 86 };
  }

  if (hasAny(text, ["switch"])) {
    return { main: "Netzwerk", sub: "Netzwerk-Switches", priority: 85 };
  }

  if (hasAny(text, ["mesh"])) {
    return { main: "Netzwerk", sub: "WLAN Mesh", priority: 84 };
  }

  if (hasAny(text, ["webcam", "conference cam", "conference camera"])) {
    return { main: "Peripherie", sub: "Webcams", priority: 83 };
  }

  if (hasAny(text, ["headset", "gaming headset", "kopfhörer mit mikrofon"])) {
    return { main: "Peripherie", sub: "Headsets", priority: 82 };
  }

  if (hasAny(text, ["tastatur", "keyboard"])) {
    return { main: "Peripherie", sub: "Tastaturen", priority: 81 };
  }

  if (hasAny(text, ["maus", "mouse"])) {
    return { main: "Peripherie", sub: "Mäuse", priority: 80 };
  }

  if (hasAny(text, ["docking", "dock"])) {
    return { main: "Peripherie", sub: "Dockingstationen", priority: 79 };
  }

  if (
    hasAny(text, [
      "usb-kabel",
      "usb c kabel",
      "usb-c kabel",
      "displayport kabel",
      "hdmi kabel",
      "patchkabel",
      "netzwerkkabel",
      "ethernet cable",
      "usb cable",
      "adapter",
      "usb adapter",
      "video adapter",
      "display adapter",
    ])
  ) {
    return { main: "Zubehör", sub: "Kabel & Adapter", priority: 78 };
  }

  if (hasAny(text, ["gaming chair", "gaming-stuhl", "gaming stuhl"])) {
    return { main: "Gaming", sub: "Gaming-Stühle", priority: 77 };
  }

  if (
    hasAny(text, [
      "controller",
      "gaming mouse",
      "gaming keyboard",
      "xbox",
      "playstation",
      "nintendo switch",
      "joy-con",
      "gaming accessory",
      "gamepad",
    ])
  ) {
    return { main: "Gaming", sub: "Gaming Zubehör", priority: 76 };
  }

  if (
    hasAny(text, [
      "kamera",
      "überwachung",
      "surveillance",
      "security camera",
      "ip kamera",
      "cctv",
      "nvr",
      "dvr",
    ])
  ) {
    return { main: "Smart Home", sub: "Kameras", priority: 75 };
  }

  if (hasAny(text, ["smart plug", "steckdose", "smarte steckdose"])) {
    return { main: "Smart Home", sub: "Smarte Steckdosen", priority: 74 };
  }

  if (
    hasAny(text, [
      "beleuchtung",
      "smart light",
      "smart bulb",
      "led lampe",
      "smart lighting",
      "wifi light",
      "zigbee light",
    ])
  ) {
    return { main: "Smart Home", sub: "Smarte Beleuchtung", priority: 73 };
  }

  if (hasAny(text, ["drucker", "printer", "multifunktionsdrucker"])) {
    return { main: "Office & Business", sub: "Drucker", priority: 72 };
  }

  if (hasAny(text, ["scanner", "document scanner"])) {
    return { main: "Office & Business", sub: "Scanner", priority: 71 };
  }

  if (hasAny(text, ["lautsprecher", "speaker", "mikrofon", "microphone", "audio interface"])) {
    return { main: "Audio", sub: "Audio Zubehör", priority: 70 };
  }

  return { main: "Sonstiges", sub: "Andere", priority: 20 };
}

const blockedWords = [
  "toner",
  "tinte",
  "ink",
  "patrone",
  "etikett",
  "papier",
  "ordner",
  "hefter",
  "locher",
  "pflanzen",
  "garten",
  "bewässerung",
  "futter",
  "katzen",
  "hund",
];

const preferredMains = new Set([
  "Computer",
  "Mobile",
  "Peripherie",
  "PC-Komponenten",
  "Datenspeicher",
  "Netzwerk",
  "Gaming",
  "Smart Home",
  "Office & Business",
  "Audio",
]);

const preferredSubs = new Set([
  "Laptops",
  "Desktop-PCs",
  "Mini PCs",
  "Smartphones",
  "Tablets",
  "Monitors",
  "Grafikkarten",
  "Mainboards",
  "Arbeitsspeicher (RAM)",
  "Prozessoren",
  "Netzteile",
  "SSD",
  "HDD",
  "NAS",
  "Router",
  "Netzwerk-Switches",
  "WLAN Mesh",
  "Webcams",
  "Headsets",
  "Tastaturen",
  "Mäuse",
  "Dockingstationen",
  "Gaming Zubehör",
  "Gaming-Stühle",
  "Kameras",
  "Smarte Steckdosen",
  "Smarte Beleuchtung",
  "Drucker",
  "Scanner",
  "Audio Zubehör",
]);

console.log("Loading ArtikeldatenV2.xml ...");
const articleItems = loadArticleItems();
console.log("Article items:", articleItems.length);

console.log("Loading PreisdatenV2.xml ...");
const priceItems = loadPriceItems();
console.log("Price items:", priceItems.length);

console.log("Loading alltron-bilder-urls.csv ...");
const imageIndex = loadImageIndex();
console.log("Image index size:", imageIndex.size);

console.log("Building price index ...");
const priceIndex = buildPriceIndex(priceItems);
console.log("Price index size:", priceIndex.size);

let matchedPriceCount = 0;
let matchedImageCount = 0;

const catalog: CatalogProduct[] = articleItems.map((item) => {
  const pn = getPartNumber(item);
  const articleKeys = getArticleKeys(item);

  const title = norm(item?.part_description?.DESC);
  const title2 = norm(item?.part_description?.DESC2);
  const description = norm(item?.part_description?.WTXT);
  const description2 = norm(item?.part_description?.WTX2);
  const brand = norm(item?.additional_information?.MAFT);

  let priceData:
    | {
        price: number | null;
        stock: number | null;
        raw: AnyObj;
      }
    | null = null;

  for (const key of articleKeys) {
    const hit = priceIndex.get(key);
    if (hit) {
      priceData = hit;
      break;
    }
  }

  const imageList = uniq(
    articleKeys.flatMap((key) => ensureArray(imageIndex.get(key)))
  );

  if (priceData) matchedPriceCount++;
  if (imageList.length > 0) matchedImageCount++;

  const cat = getCategory(item);
  const category = mapToIumatecCategory(item);

  return {
    sku:
      norm(pn?.LITT) ||
      norm(pn?.LITM) ||
      norm(item?.LITT) ||
      norm(item?.LITM) ||
      articleKeys[0] ||
      "",
    internalNumber:
      norm(pn?.MITM) ||
      norm(item?.MITM) ||
      "",
    ean:
      norm(pn?.EITM) ||
      norm(item?.EITM) ||
      "",
    title,
    title2,
    fullTitle: [title, title2].filter(Boolean).join(" - "),
    brand,
    stock:
      priceData?.stock ??
      toNumber(item?.additional_information?.STQU) ??
      0,
    price: priceData?.price ?? null,
    image: imageList[0] ?? null,
    images: imageList,
    description,
    description2,
    rawCategory: {
      cat1: norm(cat?.CAT1),
      cat2: norm(cat?.CAT2),
      cat3: norm(cat?.CAT3),
      cat4: norm(cat?.CATA),
    },
    iumatecCategory: category,
  };
});

const filtered = catalog
  .filter((p) => {
    if (!p.sku) return false;
    if (!p.fullTitle) return false;
    if (!p.image) return false;
    if (p.price === null || p.price <= 10) return false;

    const text = [
      p.title,
      p.title2,
      p.description,
      p.description2,
      p.brand,
      p.rawCategory.cat1,
      p.rawCategory.cat2,
      p.rawCategory.cat3,
      p.rawCategory.cat4,
      p.iumatecCategory.main,
      p.iumatecCategory.sub,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (blockedWords.some((word) => text.includes(word))) return false;

    const isPreferredMain = preferredMains.has(p.iumatecCategory.main);
    const isPreferredSub = preferredSubs.has(p.iumatecCategory.sub);

    return isPreferredMain || isPreferredSub;
  })
  .sort((a, b) => {
    const aMain = preferredMains.has(a.iumatecCategory.main) ? 1 : 0;
    const bMain = preferredMains.has(b.iumatecCategory.main) ? 1 : 0;

    if (bMain !== aMain) return bMain - aMain;

    const aSub = preferredSubs.has(a.iumatecCategory.sub) ? 1 : 0;
    const bSub = preferredSubs.has(b.iumatecCategory.sub) ? 1 : 0;

    if (bSub !== aSub) return bSub - aSub;

    if (b.iumatecCategory.priority !== a.iumatecCategory.priority) {
      return b.iumatecCategory.priority - a.iumatecCategory.priority;
    }

    const aStock = a.stock > 0 ? 1 : 0;
    const bStock = b.stock > 0 ? 1 : 0;

    if (bStock !== aStock) return bStock - aStock;

    return (b.price ?? 0) - (a.price ?? 0);
  });

const finalProducts = filtered.slice(0, 12000);

fs.writeFileSync(
  path.join(outDir, "iumatec-catalog-full.json"),
  JSON.stringify(catalog, null, 2),
  "utf8"
);

fs.writeFileSync(
  path.join(outDir, "iumatec-catalog-filtered.json"),
  JSON.stringify(finalProducts, null, 2),
  "utf8"
);

const summary = {
  totalArticles: articleItems.length,
  totalPrices: priceItems.length,
  totalImagesIndexed: imageIndex.size,
  totalCatalog: catalog.length,
  matchedPriceCount,
  matchedImageCount,
  totalFilteredBeforeLimit: filtered.length,
  totalFiltered: finalProducts.length,
};

fs.writeFileSync(
  path.join(outDir, "iumatec-catalog-summary.json"),
  JSON.stringify(summary, null, 2),
  "utf8"
);

console.log("Summary:", summary);
console.log("Saved:");
console.log("- integrations/alltron/out/iumatec-catalog-full.json");
console.log("- integrations/alltron/out/iumatec-catalog-filtered.json");
console.log("- integrations/alltron/out/iumatec-catalog-summary.json");