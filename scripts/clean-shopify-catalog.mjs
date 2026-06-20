import fs from "fs";
import path from "path";

const inputFiles = [
  "integrations/alltron/out/iumatec-catalog-live.json",
  "integrations/alltron/out/winning-products.json",
  "integrations/alltron/out/iumatec-catalog-sellable.json",
  "integrations/alltron/out/iumatec-catalog-filtered.json",
  "integrations/alltron/out/iumatec-catalog-enriched.json",
];

const outputFile = "integrations/alltron/out/iumatec-storefront-clean.json";

function readJson(file) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return [];

  try {
    const data = JSON.parse(fs.readFileSync(full, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function normalizeText(value) {
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
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "und")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getVariantId(product) {
  const id = product.merchandiseId || product.shopifyVariantId;
  if (!id) return "";

  if (String(id).startsWith("gid://shopify/ProductVariant/")) {
    return String(id);
  }

  const numeric = String(id).replace(/[^\d]/g, "");
  return numeric ? `gid://shopify/ProductVariant/${numeric}` : "";
}

function getHandle(product) {
  const handle = String(
    product.shopifyProductHandle ||
      product.productHandle ||
      product.slug ||
      ""
  ).trim();

  return handle ? slugify(handle) : "";
}

function getImages(product) {
  const urls = [];

  if (typeof product.image === "string" && product.image.trim()) {
    urls.push(product.image.trim());
  }

  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (typeof img === "string" && img.trim()) urls.push(img.trim());
    }
  }

  if (Array.isArray(product.imageUrls)) {
    for (const img of product.imageUrls) {
      if (typeof img === "string" && img.trim()) urls.push(img.trim());
    }
  }

  if (Array.isArray(product.gallery)) {
    for (const img of product.gallery) {
      if (typeof img === "string" && img.trim()) urls.push(img.trim());
    }
  }

  if (Array.isArray(product.shopifyImages)) {
    for (const img of product.shopifyImages) {
      if (typeof img === "string" && img.trim()) urls.push(img.trim());
    }
  }

  if (typeof product.shopifyImageUrl === "string" && product.shopifyImageUrl.trim()) {
    urls.push(product.shopifyImageUrl.trim());
  }

  return [...new Set(urls.filter((url) => url.startsWith("http")))];
}

function getImage(product) {
  return getImages(product)[0] || "";
}

function getStock(product) {
  const qty = Number(product.stockQty ?? product.stock ?? product.quantity ?? 0);
  return Number.isFinite(qty) ? qty : 0;
}

function getPrice(product) {
  const price = Number(product.price ?? product.finalPrice ?? product.shopifyPrice ?? 0);
  return Number.isFinite(price) ? price : 0;
}

function isSynced(product) {
  const status = String(product.shopifySyncStatus || "").trim();

  if (!status) return true;

  return (
    status === "synced" ||
    status === "updated-existing" ||
    status === "ok"
  );
}

function rawCategoryText(product) {
  return normalizeText(
    [
      product.rawCategory?.cat1,
      product.rawCategory?.cat2,
      product.rawCategory?.cat3,
      product.rawCategory?.cat4,
      product.cat1,
      product.cat2,
      product.cat3,
      product.cat4,
    ].join(" ")
  );
}

function productText(product) {
  return normalizeText(
    [
      product.sku,
      product.internalNumber,
      product.ean,
      product.title,
      product.title2,
      product.fullTitle,
      product.shopifyProductTitle,
      product.brand,
      product.description,
      product.description2,
      product.rawCategory?.cat1,
      product.rawCategory?.cat2,
      product.rawCategory?.cat3,
      product.rawCategory?.cat4,
      product.cat1,
      product.cat2,
      product.cat3,
      product.cat4,
    ].join(" ")
  );
}

function titleText(product) {
  return normalizeText(
    [
      product.title,
      product.title2,
      product.fullTitle,
      product.shopifyProductTitle,
    ].join(" ")
  );
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function mapCategory(product) {
  const text = productText(product);
  const title = titleText(product);
  const raw = rawCategoryText(product);

  const rawHas = (terms) => hasAny(raw, terms);
  const titleHas = (terms) => hasAny(title, terms);
  const textHas = (terms) => hasAny(text, terms);

  /*
    Muito importante:
    Regras específicas primeiro.
    Assim "HDMI Dock" não cai em cabo,
    "DisplayPort KVM" não cai em monitor,
    e "Notebook Dockingstation" não cai em Laptops.
  */

  if (
    rawHas(["kvm", "kvm systeme", "kvm-systeme"]) ||
    textHas(["kvm switch", "kvm-switch", "displayport kvm", "hdmi kvm", "kvm "])
  ) {
    return { category: "Netzwerk", subcategory: "KVM-Switches" };
  }

  if (
    rawHas(["dockingstation", "docking", "notebook dockingstation", "port replikator"]) ||
    textHas([
      "dockingstation",
      "docking station",
      "travel dock",
      "usb c dock",
      "usb-c dock",
      "thunderbolt dock",
      "displaylink dock",
      "port replikator",
      "port-replikator",
      "travel docking",
    ])
  ) {
    return { category: "Peripherie", subcategory: "Dockingstationen" };
  }

  if (
    rawHas(["kabel", "adapter", "kabel adapter", "video kabel", "audio kabel"]) ||
    textHas([
      "hdmi kabel",
      "displayport kabel",
      "dp kabel",
      "usb kabel",
      "usb c kabel",
      "usb-c kabel",
      "thunderbolt kabel",
      "patchkabel",
      "netzwerkkabel",
      "ethernet kabel",
      "adapter",
      "dongle",
      "splitter",
      "konverter",
      "converter",
      "usb c zu",
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
    rawHas(["notebook zubehor", "notebook-zubehor", "taschen", "rucksack"]) ||
    textHas([
      "notebook zubehor",
      "notebook-zubehor",
      "laptop zubehor",
      "laptop-zubehor",
      "notebook tasche",
      "laptop tasche",
      "notebook sleeve",
      "laptop sleeve",
      "rucksack",
      "notebook stand",
      "laptop stand",
      "notebook halter",
      "laptop halter",
      "privacy filter",
      "blickschutz",
    ])
  ) {
    return { category: "Zubehör", subcategory: "Notebook-Zubehör" };
  }

  if (
    textHas([
      "panzerglass",
      "schutzglas",
      "displayschutz",
      "schutzfolie",
      "screen protector",
      "kameraschutz",
      "handyhulle",
      "handy hulle",
      "iphone hulle",
      "iphone case",
      "smartphone case",
      "tablet case",
      "ipad case",
      "cover",
      "powerbank",
      "ladegerat",
      "charger",
      "stylus",
      "active pen",
      "ersatzstift",
      "pencil",
    ])
  ) {
    return { category: "Mobile", subcategory: "Zubehör" };
  }

  if (
    rawHas(["notebook"]) ||
    titleHas([
      "macbook",
      "notebook",
      "laptop",
      "probook",
      "elitebook",
      "thinkpad",
      "latitude",
      "surface laptop",
      "vivobook",
      "zenbook",
      "yoga",
      "ideapad",
      "travelmate",
      "aspire",
    ])
  ) {
    return { category: "Computer", subcategory: "Laptops" };
  }

  if (
    rawHas(["smartphone", "mobiltelefon", "mobile phone"]) ||
    titleHas([
      "iphone",
      "galaxy s",
      "galaxy a",
      "galaxy z",
      "pixel",
      "smartphone",
      "xiaomi",
      "redmi",
      "oppo",
      "motorola",
      "nothing phone",
    ])
  ) {
    return { category: "Mobile", subcategory: "Smartphones" };
  }

  if (
    rawHas(["tablet", "tablets"]) ||
    titleHas([
      "ipad",
      "galaxy tab",
      "surface pro",
      "tablet",
      "tab s",
      "tab a",
      "tab active",
    ])
  ) {
    return { category: "Mobile", subcategory: "Tablets" };
  }

  if (
    textHas([
      "mini pc",
      "minipc",
      "mini-pc",
      "nuc",
      "tiny pc",
      "pro mini",
      "mini desktop",
    ])
  ) {
    return { category: "Computer", subcategory: "Mini PCs" };
  }

  if (
    rawHas(["desktop", "workstation", "pc systeme", "pc-systeme"]) ||
    textHas([
      "workstation",
      "tower pc",
      "desktop pc",
      "desktop-computer",
      "pc system",
      "pc-system",
      "barebone",
      "all in one",
      "all-in-one",
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
    ])
  ) {
    return { category: "Computer", subcategory: "Desktop-PCs" };
  }

  if (
    rawHas(["monitore", "monitor", "bildschirm"]) ||
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
    textHas(["keyboard", "tastatur", "desktop set", "mk270", "mk470"])
  ) {
    return { category: "Peripherie", subcategory: "Tastaturen" };
  }

  if (
    rawHas(["maus", "mouse"]) ||
    textHas(["maus", "mouse", "trackball"])
  ) {
    return { category: "Peripherie", subcategory: "Mäuse" };
  }

  if (
    rawHas(["headset", "kopfhorer", "kopfhoerer"]) ||
    textHas(["headset", "kopfhorer", "kopfhoerer", "headphone", "earbuds"])
  ) {
    return { category: "Peripherie", subcategory: "Headsets" };
  }

  if (
    rawHas(["webcam"]) ||
    textHas(["webcam"])
  ) {
    return { category: "Peripherie", subcategory: "Webcams" };
  }

  if (
    rawHas(["mikrofon", "microphone"]) ||
    textHas(["mikrofon", "microphone", "microphon"])
  ) {
    return { category: "Peripherie", subcategory: "Mikrofone" };
  }

  if (
    rawHas(["grafikkarte", "graphics card"]) ||
    textHas(["grafikkarte", "graphics card", "gpu", "geforce", "rtx", "radeon"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Grafikkarten" };
  }

  if (
    rawHas(["arbeitsspeicher", "memory", "ram"]) ||
    textHas(["arbeitsspeicher", "ram", "memory", "ddr4", "ddr5", "so dimm", "sodimm"])
  ) {
    return { category: "PC-Komponenten", subcategory: "RAM" };
  }

  if (
    rawHas(["mainboard", "motherboard"]) ||
    textHas(["mainboard", "motherboard"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Mainboards" };
  }

  if (
    rawHas(["netzteil", "power supply"]) ||
    textHas(["netzteil", "power supply", "psu"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Netzteile" };
  }

  if (
    rawHas(["prozessor", "processor", "cpu"]) ||
    textHas(["prozessor", "processor", "intel core", "ryzen", "cpu"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Prozessoren" };
  }

  if (
    rawHas(["gehause", "gehaeuse", "case"]) ||
    textHas(["pc gehause", "pc case", "computer case"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Gehäuse" };
  }

  if (
    rawHas(["kuhler", "kuehler", "cooler"]) ||
    textHas(["cpu cooler", "kuhler", "kuehler", "aio cooler", "wasserkühlung", "wasserkuehlung"])
  ) {
    return { category: "PC-Komponenten", subcategory: "Kühlung" };
  }

  if (
    rawHas(["router", "firewall"]) ||
    textHas(["router", "firewall"])
  ) {
    return { category: "Netzwerk", subcategory: "Router" };
  }

  if (
    rawHas(["switch", "switches"]) ||
    textHas(["switch", "switches"])
  ) {
    return { category: "Netzwerk", subcategory: "Switches" };
  }

  if (
    rawHas(["wlan", "wifi", "wi fi", "mesh", "access point", "accesspoint"]) ||
    textHas(["wlan", "wifi", "wi fi", "mesh", "access point", "accesspoint"])
  ) {
    return { category: "Netzwerk", subcategory: "WLAN Mesh" };
  }

  if (
    rawHas(["netzwerkkabel", "patchkabel", "rj45"]) ||
    textHas(["rj45", "cat6", "cat 6", "cat7", "cat 7", "ethernet"])
  ) {
    return { category: "Netzwerk", subcategory: "Netzwerk Kabel" };
  }

  if (
    rawHas(["ssd", "solid state drive"]) ||
    textHas(["ssd", "nvme", "m 2", "solid state"])
  ) {
    return { category: "Datenspeicher", subcategory: "SSD" };
  }

  if (
    rawHas(["festplatte", "hard disk", "hdd"]) ||
    textHas(["festplatte", "hard disk", "hdd"])
  ) {
    return { category: "Datenspeicher", subcategory: "HDD" };
  }

  if (
    rawHas(["nas"]) ||
    textHas(["nas", "synology", "qnap"])
  ) {
    return { category: "Datenspeicher", subcategory: "NAS" };
  }

  if (
    textHas(["externe ssd", "external ssd", "portable ssd", "portable drive"])
  ) {
    return { category: "Datenspeicher", subcategory: "Externe SSD" };
  }

  if (
    rawHas(["drucker", "printer"]) ||
    textHas([
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
    textHas(["toner", "tinte", "patrone", "cartridge", "druckerpatrone"])
  ) {
    return { category: "Office & Business", subcategory: "Tinte & Toner" };
  }

  if (
    rawHas(["papier", "etikett", "etiketten"]) ||
    textHas(["papier", "etikett", "labels", "etikettenrolle", "fotopapier"])
  ) {
    return { category: "Office & Business", subcategory: "Papier & Etiketten" };
  }

  if (
    rawHas(["kamera", "camera", "uberwachung", "ueberwachung"]) ||
    textHas(["kamera", "camera", "security cam", "überwachungskamera", "ueberwachungskamera"])
  ) {
    return { category: "Smart Home", subcategory: "Kameras" };
  }

  if (
    textHas(["steckdose", "smart plug", "smartplug"])
  ) {
    return { category: "Smart Home", subcategory: "Steckdosen" };
  }

  if (
    textHas(["beleuchtung", "light", "led strip", "led stripe", "lampe"])
  ) {
    return { category: "Smart Home", subcategory: "Beleuchtung" };
  }

  return { category: "Zubehör", subcategory: "Sonstiges Zubehör" };
}

function familyKey(product) {
  let title = normalizeText(product.title || product.fullTitle || "");

  title = title
    .replace(/\b(midnight|mitternacht|starlight|platinum|platinium|ocean|violet|sky blue|space black|space schwarz|silber|silver|schwarz|black|grau|gray|grey|blau|blue|weiss|white|gold|rose|rot|red|grun|green)\b/g, "")
    .replace(/\b(64gb|128gb|256gb|512gb|1tb|2tb|4tb|8gb|16gb|24gb|32gb|64gb|128gb)\b/g, "")
    .replace(/\b(64 gb|128 gb|256 gb|512 gb|1 tb|2 tb|4 tb|8 gb|16 gb|24 gb|32 gb|64 gb|128 gb)\b/g, "")
    .replace(/\b(wifi|wi fi|5g|cellular|lte)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return `${normalizeText(product.brand)}-${title}`;
}

function scoreProduct(product) {
  let score = 0;

  if (getHandle(product)) score += 500;
  if (getVariantId(product)) score += 500;
  if (getImage(product)) score += 250;
  if (getPrice(product) > 0) score += 200;
  if (getStock(product) > 0) score += 200;
  if (isSynced(product)) score += 200;
  if (product.shopifyProductId) score += 80;
  if (product.ean) score += 40;
  if (product.internalNumber) score += 30;
  if (product.description || product.description2) score += 20;

  const mapped = mapCategory(product);

  if (mapped.category !== "Zubehör") score += 100;
  if (mapped.subcategory !== "Sonstiges Zubehör" && mapped.subcategory !== "Sonstiges") {
    score += 80;
  }

  return score;
}

function isBlockedProduct(product) {
  const text = productText(product);

  const blockedTerms = [
    "garantie",
    "garantieerweiterung",
    "warranty",
    "support service",
    "servicepack",
    "prosupport",
    "care pack",
    "kaffee",
    "kaffeefettloser",
    "serviertablett",
    "holztablett",
    "spielzeug",
    "toy",
    "lexibook",
    "disney frozen",
  ];

  return blockedTerms.some((term) => text.includes(normalizeText(term)));
}

const all = [];

for (const file of inputFiles) {
  const items = readJson(file);
  console.log(`${file}: ${items.length}`);

  for (const item of items) {
    const mapped = mapCategory(item);
    const images = getImages(item);
    const handle = getHandle(item);

    all.push({
      ...item,

      _sourceFile: file,

      merchandiseId: getVariantId(item),

      slug: handle,
      productHandle: handle,
      shopifyProductHandle: handle,

      image: images[0] || "",
      images,

      price: getPrice(item),
      stockQty: getStock(item),
      stock: getStock(item),
      inStock: getStock(item) > 0,

      /*
        Aqui está a correção principal:
        NÃO usamos item.category nem item.iumatecCategory antiga.
        Recalculamos sempre com mapCategory().
      */
      category: mapped.category,
      subcategory: mapped.subcategory,
      iumatecCategory: {
        main: mapped.category,
        sub: mapped.subcategory,
      },
    });
  }
}

const valid = all.filter((product) => {
  return (
    !isBlockedProduct(product) &&
    getHandle(product) &&
    getVariantId(product) &&
    getImage(product) &&
    getPrice(product) > 0 &&
    getStock(product) > 0 &&
    isSynced(product)
  );
});

const byVariant = new Map();

for (const product of valid) {
  const key = getVariantId(product);
  const current = byVariant.get(key);

  if (!current || scoreProduct(product) > scoreProduct(current)) {
    byVariant.set(key, product);
  }
}

const deduped = Array.from(byVariant.values());

deduped.sort((a, b) => {
  const stockDiff = getStock(b) - getStock(a);
  if (stockDiff !== 0) return stockDiff;

  return scoreProduct(b) - scoreProduct(a);
});

const cleaned = deduped.map(({ _sourceFile, ...product }) => product);

const outputPath = path.join(process.cwd(), outputFile);
fs.writeFileSync(outputPath, JSON.stringify(cleaned, null, 2), "utf8");

const categoryCounts = {};

for (const product of cleaned) {
  const key = `${product.category || "SEM"} > ${product.subcategory || "SEM"}`;
  categoryCounts[key] = (categoryCounts[key] || 0) + 1;
}

console.log("");
console.log("========== CLEAN DONE ==========");
console.log("Total loaded:", all.length);
console.log("Valid:", valid.length);
console.log("Clean unique:", cleaned.length);
console.log("Removed:", all.length - cleaned.length);
console.log("Output:", outputFile);
console.log("================================");

console.log("");
console.log("========== TOP CATEGORIES ==========");
console.log(
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
);
console.log("====================================");