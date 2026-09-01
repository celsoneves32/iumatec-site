import fs from "fs";
import path from "path";

const INPUT_FILE =
  "integrations/alltron/out/iumatec-master-catalog.json";

const OUTPUT_FILE =
  "integrations/alltron/out/iumatec-storefront-clean.json";

const REPORT_FILE =
  "integrations/alltron/out/iumatec-storefront-report.json";

const SWISS_EQUIVALENCE_REPORT_FILE =
  "integrations/alltron/out/iumatec-swiss-equivalence-report.json";

const ALLOWED_CATEGORIES = new Set([
  "Computer",
  "PC-Komponenten",
  "Peripherie",
  "Netzwerk",
  "Mobile",
  "Datenspeicher",
  "Office & Business",
  "Smart Home",
]);

const ALLOWED_ACCESSORY_SUBCATEGORIES = new Set([
  "Notebook-Zubehör",
  "Computer-Zubehör",
  "Mobile Zubehör",
  "Smartphone-Zubehör",
  "Tablet-Zubehör",
  "Kabel & Adapter",
  "Dockingstationen",
  "Ladegeräte",
  "Powerbanks",
  "USB-Hubs",
  "Services & Lizenzen",
]);

const STRONG_TECH_TERMS = [
  "laptop",
  "notebook",
  "macbook",
  "thinkpad",
  "elitebook",
  "probook",
  "latitude",
  "chromebook",
  "desktop pc",
  "workstation",
  "mini pc",
  "monitor",
  "bildschirm",
  "display",
  "grafikkarte",
  "geforce",
  "radeon",
  "rtx",
  "mainboard",
  "motherboard",
  "prozessor",
  "processor",
  "intel core",
  "ryzen",
  "ddr4",
  "ddr5",
  "arbeitsspeicher",
  "netzteil",
  "power supply",
  "ssd",
  "nvme",
  "hard disk",
  "festplatte",
  "hdd",
  "nas",
  "synology",
  "qnap",
  "router",
  "switch",
  "access point",
  "accesspoint",
  "wlan",
  "wifi",
  "mesh",
  "unifi",
  "iphone",
  "smartphone",
  "galaxy s",
  "galaxy a",
  "galaxy z",
  "pixel",
  "redmi",
  "xiaomi",
  "ipad",
  "tablet",
  "galaxy tab",
  "smartwatch",
  "apple watch",
  "tastatur",
  "keyboard",
  "maus",
  "mouse",
  "headset",
  "webcam",
  "mikrofon",
  "microphone",
  "dockingstation",
  "docking station",
  "usb hub",
  "usb-hub",
  "drucker",
  "printer",
  "laserjet",
  "officejet",
  "ecotank",
  "toner",
  "patrone",
  "cartridge",
  "security camera",
  "überwachungskamera",
  "ueberwachungskamera",
  "smart plug",
];

const BLOCKED_TERMS = [
  "beef jerky",
  "gewürz",
  "gewurz",
  "pfeffer",
  "salz",
  "kaffee",
  "tee ",
  "getränk",
  "getrank",
  "lebensmittel",
  "schokolade",
  "bonbon",
  "snack",
  "kaugummi",
  "küche",
  "kuche",
  "kochtopf",
  "pfanne",
  "messer",
  "besteck",
  "geschirr",
  "glas ",
  "teller",
  "tasse",
  "gefrierbox",
  "gefrierdose",
  "aufbewahrungsdose",
  "möbel",
  "mobel",
  "stuhl",
  "sofa",
  "bett ",
  "matratze",
  "teppich",
  "vorhang",
  "dekoration",
  "deko ",
  "kerze",
  "pflanze",
  "garten",
  "blumentopf",
  "dünger",
  "dunger",
  "saatgut",
  "spielzeug",
  "puzzle",
  "plüschtier",
  "pluschtier",
  "puppe",
  "lego",
  "playmobil",
  "basteln",
  "bastel",
  "stoff ",
  "wolle",
  "näh",
  "nah ",
  "papier ",
  "heft ",
  "bleistift",
  "buntstift",
  "kugelschreiber",
  "radiergummi",
  "serviette",
  "geschenkpapier",
  "tierfutter",
  "hundefutter",
  "katzenfutter",
  "kosmetik",
  "shampoo",
  "parfum",
  "zahnbürste",
  "zahnburste",
  "kleidung",
  "jacke",
  "hose ",
  "schuhe",
  "sportnahrung",
  "vitamin",
  "medikament",
];

const CATEGORY_RULES = [
  ["Mobile", "Smartphones", /\b(smartphone|iphone|galaxy [saz] ?\d+|pixel \d+|redmi note|oneplus|oppo|nothing phone)\b/],
  ["Mobile", "Tablets", /\b(tablet|ipad|galaxy tab|lenovo tab|matepad|surface (go|pro))\b/],
  ["Mobile", "Zubehör", /\b(iphone|smartphone|ipad|tablet).*(case|cover|hulle|schutzglas|schutzfolie|halterung)\b|\b(panzerglass|displayschutz|handyhulle)\b/],
  ["Peripherie", "Audio", /\b(studio monitor|lautsprecher|speaker|aktivlautsprecher|soundbar|m audio|presonus|yamaha hs|krk)\b/],
  ["Peripherie", "Monitor-Zubehör", /\b(monitor arm|monitor stand|monitor halter|monitorhalter|displayhalterung|vesa halter|tischhalterung)\b/],
  ["Peripherie", "Monitore", /\b(bildschirm|gaming monitor|business monitor|lcd monitor|led monitor|oled monitor|curved monitor|ultrawide|monitor)\b/],
  ["Zubehör", "Notebook-Zubehör", /\b(laptop|notebook).*(tasche|sleeve|rucksack|halter|stand|netzteil|zubehor)\b/],
  ["Computer", "Laptops", /\b(laptop|notebook|macbook|thinkpad|vivobook|zenbook|chromebook|probook|elitebook|ideapad|latitude)\b/],
  ["Computer", "Desktop-PCs", /\b(desktop pc|mini pc|minipc|workstation|all in one|imac|prodesk|elitedesk|optiplex|thinkcentre|nuc)\b/],
  ["PC-Komponenten", "Grafikkarten", /\b(grafikkarte|geforce rtx|rtx ?\d{4}|radeon rx|rx ?\d{4}|quadro)\b/],
  ["PC-Komponenten", "Prozessoren", /\b(prozessor|processor|cpu|intel core|core i[3579]|ryzen [3579])\b/],
  ["PC-Komponenten", "RAM", /\b(arbeitsspeicher|ddr[345]|so dimm|sodimm|ram kit|memory kit)\b/],
  ["PC-Komponenten", "Mainboards", /\b(mainboard|motherboard)\b/],
  ["PC-Komponenten", "Netzteile", /\b(netzteil|power supply|psu)\b/],
  ["PC-Komponenten", "Gehäuse", /\b(pc gehause|computer gehause|pc case|computer case)\b/],
  ["PC-Komponenten", "Kühlung", /\b(cpu cooler|cpu kuhler|wasserkühlung|wasserkuhlung|aio kuhler|aio cooler)\b/],
  ["Datenspeicher", "Externe SSD", /\b(externe ssd|external ssd|portable ssd)\b/],
  ["Datenspeicher", "SSD", /\b(ssd|nvme|solid state|m 2 drive)\b/],
  ["Datenspeicher", "HDD", /\b(festplatte|hard disk|hdd)\b/],
  ["Datenspeicher", "NAS", /\b(nas|synology|qnap)\b/],
  ["Netzwerk", "Switches", /\b(network switch|netzwerk switch|ethernet switch|managed switch|unmanaged switch)\b/],
  ["Netzwerk", "Router", /\b(router|firewall)\b/],
  ["Netzwerk", "WLAN Mesh", /\b(access point|accesspoint|mesh wifi|mesh wlan|wlan|wi fi)\b/],
  ["Netzwerk", "Netzwerk Kabel", /\b(patchkabel|netzwerkkabel|ethernet kabel|rj45|cat ?[678])\b/],
  ["Peripherie", "Dockingstationen", /\b(dockingstation|docking station|thunderbolt dock|usb c dock|port replikator)\b/],
  ["Peripherie", "USB-Hubs", /\b(usb hub|usb c hub|type c hub)\b/],
  ["Peripherie", "Tastaturen", /\b(tastatur|keyboard)\b/],
  ["Peripherie", "Mäuse", /\b(computermaus|gaming maus|wireless maus|mouse|trackball)\b/],
  ["Peripherie", "Headsets", /\b(headset|kopfhorer|kopfhoerer|headphone)\b/],
  ["Peripherie", "Webcams", /\b(webcam)\b/],
  ["Peripherie", "Mikrofone", /\b(mikrofon|microphone)\b/],
  ["Office & Business", "Tinte & Toner", /\b(toner|tintenpatrone|druckerpatrone|ink cartridge|cartridge)\b/],
  ["Office & Business", "Drucker", /\b(drucker|printer|multifunktionsdrucker|laserjet|officejet|pixma|ecotank)\b/],
  ["Smart Home", "Kameras", /\b(security camera|uberwachungskamera|ueberwachungskamera|ip kamera|netzwerkkamera)\b/],
  ["Smart Home", "Steckdosen", /\b(smart plug|smarte steckdose|smart steckdose)\b/],
  ["Smart Home", "Beleuchtung", /\b(smart light|smart lampe|led strip|led stripe|smart beleuchtung)\b/],
  ["Peripherie", "Kabel & Adapter", /\b(kabel|cable|adapter|dongle|konverter|converter|displayport|hdmi|mini dp|usb c zu)\b/],
];

function readJson(relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));

  if (!Array.isArray(parsed)) {
    throw new Error("Master catalog is not an array.");
  }

  return parsed;
}

function clean(value) {
  return String(value ?? "").trim();
}

function normalize(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();
}

function number(value) {
  const parsed = Number(
    String(value ?? "")
      .trim()
      .replace(/\s/g, "")
      .replace(",", "."),
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function getVariantId(product) {
  const raw =
    product.merchandiseId ||
    product.shopifyVariantId ||
    "";

  const value = clean(raw);

  if (!value) return "";

  if (value.startsWith("gid://shopify/ProductVariant/")) {
    return value;
  }

  const numeric = value.replace(/[^\d]/g, "");

  return numeric
    ? `gid://shopify/ProductVariant/${numeric}`
    : "";
}

function getImages(product) {
  const values = [];

  if (typeof product.image === "string") {
    values.push(product.image);
  }

  for (const field of [
    product.images,
    product.imageUrls,
    product.gallery,
    product.shopifyImages,
  ]) {
    if (!Array.isArray(field)) continue;

    for (const image of field) {
      if (typeof image === "string") {
        values.push(image);
      }
    }
  }

  return [
    ...new Set(
      values
        .map(clean)
        .filter(
          (url) =>
            url.startsWith("https://") ||
            url.startsWith("http://"),
        ),
    ),
  ];
}

function getStock(product) {
  return number(
    product.stockQty ??
      product.stock ??
      product.quantity ??
      0,
  );
}

function getPrice(product) {
  return number(
    product.price ??
      product.finalPrice ??
      product.shopifyPrice ??
      0,
  );
}

function marketVersion(product) {
  const value = normalize(
    [
      product.title,
      product.title2,
      product.fullTitle,
      product.sku,
      product.description,
    ].join(" "),
  );

  const swiss =
    /(^|[\s(/_-])(ch|swiss|schweiz)(?=$|[\s)/_-])/.test(value) ||
    /\b(ch tastatur|tastatur ch|qwertz ch|schweizer version)\b/.test(value);
  const eu =
    /(^|[\s(/_-])(eu|europe|europa)(?=$|[\s)/_-])/.test(value) ||
    /\b(eu version|eu ware|european version)\b/.test(value);

  if (swiss && !eu) return "CH";
  if (eu && !swiss) return "EU";
  return "UNKNOWN";
}

function normalizedEan(product) {
  return clean(product.ean).replace(/\D/g, "");
}

function productText(product) {
  return normalize(
    [
      product.title,
      product.title2,
      product.fullTitle,
      product.brand,
      product.description,
      product.description2,
      product.category,
      product.subcategory,
      product.rawCategory?.cat1,
      product.rawCategory?.cat2,
      product.rawCategory?.cat3,
      product.rawCategory?.cat4,
    ].join(" "),
  );
}

function containsAny(text, terms) {
  return terms.some((term) =>
    text.includes(normalize(term)),
  );
}

function classifyProduct(product) {
  const currentCategory = clean(product.category);
  const currentSubcategory = clean(product.subcategory);

  if (
    ALLOWED_CATEGORIES.has(currentCategory) &&
    currentSubcategory
  ) {
    return {
      category: currentCategory,
      subcategory: currentSubcategory,
      matchedBy: "existing-category",
    };
  }

  const text = productText(product);

  for (const [category, subcategory, pattern] of CATEGORY_RULES) {
    if (pattern.test(text)) {
      return {
        category,
        subcategory,
        matchedBy: "category-rule",
      };
    }
  }

  return {
    category: "Zubehör",
    subcategory: "Computer-Zubehör",
    matchedBy: "technology-fallback",
  };
}

function isBlocked(product) {
  const text = productText(product);

  return containsAny(text, BLOCKED_TERMS);
}

function isTechnologyProduct(product) {
  const category = clean(product.category);
  const subcategory = clean(product.subcategory);
  const text = productText(product);

  if (isBlocked(product)) {
    return false;
  }

  if (ALLOWED_CATEGORIES.has(category)) {
    return true;
  }

  if (
    category === "Zubehör" &&
    ALLOWED_ACCESSORY_SUBCATEGORIES.has(subcategory)
  ) {
    return true;
  }

  return containsAny(text, STRONG_TECH_TERMS);
}

function isPurchasable(product) {
  return (
    Boolean(getVariantId(product)) &&
    Boolean(
      clean(
        product.shopifyProductHandle ||
          product.productHandle ||
          product.slug,
      ),
    ) &&
    getPrice(product) > 0 &&
    product.priceSafetyStatus !== "blocked-missing-cost" &&
    getStock(product) > 0 &&
    getImages(product).length > 0
  );
}

function createSlug(product) {
  return clean(
    product.shopifyProductHandle ||
      product.productHandle ||
      product.slug,
  );
}

console.log("Reading master catalog...");

const masterProducts = readJson(INPUT_FILE);

console.log("Master products:", masterProducts.length);

let blockedCount = 0;
let nonTechCount = 0;
let nonPurchasableCount = 0;

const accepted = [];

for (const product of masterProducts) {
  if (isBlocked(product)) {
    blockedCount++;
    continue;
  }

  if (!isTechnologyProduct(product)) {
    nonTechCount++;
    continue;
  }

  const classification = classifyProduct(product);

  const classifiedProduct = {
    ...product,
    category: classification.category,
    subcategory: classification.subcategory,
    categoryMatchedBy: classification.matchedBy,
    iumatecCategory: {
      ...(product.iumatecCategory || {}),
      main: classification.category,
      sub: classification.subcategory,
    },
  };

  if (!isPurchasable(classifiedProduct)) {
    nonPurchasableCount++;
    continue;
  }

  const images = getImages(classifiedProduct);
  const stock = getStock(classifiedProduct);
  const price = getPrice(classifiedProduct);
  const merchandiseId = getVariantId(classifiedProduct);
  const slug = createSlug(classifiedProduct);

  accepted.push({
    ...classifiedProduct,

    merchandiseId,
    shopifyVariantId:
      classifiedProduct.shopifyVariantId || merchandiseId,

    slug,
    productHandle: slug,
    shopifyProductHandle: slug,

    price,

    stockQty: stock,
    stock,
    inStock: stock > 0,

    image: images[0] || "",
    images,
    imageUrls: images,
  });
}

const byVariant = new Map();

for (const product of accepted) {
  const key = getVariantId(product);

  const current = byVariant.get(key);

  if (!current) {
    byVariant.set(key, product);
    continue;
  }

  const currentDescriptionLength =
    clean(current.description).length +
    clean(current.description2).length;

  const newDescriptionLength =
    clean(product.description).length +
    clean(product.description2).length;

  if (newDescriptionLength > currentDescriptionLength) {
    byVariant.set(key, product);
  }
}

const variantProducts = Array.from(byVariant.values());
const productsByEan = new Map();

for (const product of variantProducts) {
  const ean = normalizedEan(product);
  if (!ean) continue;
  if (!productsByEan.has(ean)) productsByEan.set(ean, []);
  productsByEan.get(ean).push(product);
}

const hiddenEuVariants = new Set();
const swissEquivalenceDecisions = [];

for (const [ean, group] of productsByEan) {
  if (group.length < 2) continue;

  const swiss = group.filter(
    (product) => marketVersion(product) === "CH",
  );
  const eu = group.filter(
    (product) => marketVersion(product) === "EU",
  );

  // Mesmo EAN + marcação explícita CH/EU é a prova mínima exigida.
  // Sem estes dois sinais, nada é ocultado automaticamente.
  if (!swiss.length || !eu.length) continue;

  const preferredSwiss = [...swiss].sort((a, b) => {
    const stockDifference = getStock(b) - getStock(a);
    if (stockDifference !== 0) return stockDifference;
    return getPrice(a) - getPrice(b);
  })[0];

  for (const euProduct of eu) {
    hiddenEuVariants.add(getVariantId(euProduct));
    swissEquivalenceDecisions.push({
      ean,
      reason: "same-ean-explicit-ch-and-eu",
      keptSwiss: {
        litm: clean(
          preferredSwiss.litm || preferredSwiss.alltronSku,
        ),
        title: clean(
          preferredSwiss.fullTitle || preferredSwiss.title,
        ),
        variantId: getVariantId(preferredSwiss),
      },
      hiddenEu: {
        litm: clean(euProduct.litm || euProduct.alltronSku),
        title: clean(euProduct.fullTitle || euProduct.title),
        variantId: getVariantId(euProduct),
      },
    });
  }
}

const storefrontProducts = variantProducts
  .filter(
    (product) =>
      !hiddenEuVariants.has(getVariantId(product)),
  )
  .sort((a, b) => {
  const stockDifference =
    getStock(b) - getStock(a);

  if (stockDifference !== 0) {
    return stockDifference;
  }

  return getPrice(a) - getPrice(b);
});

const outputPath = path.join(
  process.cwd(),
  OUTPUT_FILE,
);

const reportPath = path.join(
  process.cwd(),
  REPORT_FILE,
);

fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
});

fs.writeFileSync(
  outputPath,
  JSON.stringify(storefrontProducts, null, 2),
  "utf8",
);

const categoryCounts = {};

for (const product of storefrontProducts) {
  const key = `${product.category || "SEM"} > ${
    product.subcategory || "SEM"
  }`;

  categoryCounts[key] =
    (categoryCounts[key] || 0) + 1;
}

const report = {
  generatedAt: new Date().toISOString(),
  masterProducts: masterProducts.length,
  blocked: blockedCount,
  nonTechnology: nonTechCount,
  nonPurchasable: nonPurchasableCount,
  acceptedBeforeDeduplication: accepted.length,
  storefrontProducts: storefrontProducts.length,
  categories: Object.fromEntries(
    Object.entries(categoryCounts).sort(
      (a, b) => b[1] - a[1],
    ),
  ),
};

fs.writeFileSync(
  reportPath,
  JSON.stringify(report, null, 2),
  "utf8",
);

fs.writeFileSync(
  path.join(process.cwd(), SWISS_EQUIVALENCE_REPORT_FILE),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      rule:
        "Hide EU only when the same EAN has explicit CH and EU versions.",
      hiddenEuProducts: hiddenEuVariants.size,
      decisions: swissEquivalenceDecisions,
    },
    null,
    2,
  ),
  "utf8",
);

console.log("");
console.log("========== STOREFRONT DONE ==========");
console.log("Master:", masterProducts.length);
console.log("Blocked:", blockedCount);
console.log("Non technology:", nonTechCount);
console.log("Non purchasable:", nonPurchasableCount);
console.log("Accepted:", storefrontProducts.length);
console.log("Output:", OUTPUT_FILE);
console.log("Report:", REPORT_FILE);
console.log(
  "Hidden equivalent EU versions:",
  hiddenEuVariants.size,
);
console.log(
  "Swiss equivalence report:",
  SWISS_EQUIVALENCE_REPORT_FILE,
);
console.log("=====================================");

console.log("");
console.log("========== TOP CATEGORIES ==========");

console.log(
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40),
);

console.log("====================================");
