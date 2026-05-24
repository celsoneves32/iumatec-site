import "dotenv/config";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_ADMIN_API_VERSION =
  process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";

if (!SHOPIFY_STORE_DOMAIN) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
if (!SHOPIFY_ADMIN_ACCESS_TOKEN) {
  throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");
}

async function shopifyAdmin(query, variables = {}) {
  const res = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(`Shopify HTTP ${res.status}: ${JSON.stringify(json)}`);
  }

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(" | "));
  }

  return json.data;
}

const MANAGED_COLLECTIONS = [
  "Laptops",
  "Monitore",
  "Smartphones",
  "Tablets",
  "Grafikkarten",
  "Desktop-PCs",
  "Mini PCs",
  "Router",
  "Netzwerk-Switches",
  "WLAN Mesh",
  "Drucker",
  "Externe SSD",
  "NAS",
  "Tastaturen",
  "Mäuse",
  "Headsets",
  "Webcams",
  "Dockingstationen",
  "Zubehör",
];

const COLLECTION_RULES = [
  {
    title: "Laptops",
    keywords: [
      "laptop",
      "notebook",
      "macbook",
      "thinkpad",
      "elitebook",
      "probook",
      "latitude",
      "ideapad",
      "vivobook",
      "zenbook",
      "legion",
    ],
    exclude: [
      "garantie",
      "garantieerw",
      "prosupport",
      "support",
      "service",
      "warranty",
      "kunststoffkoffer",
      "koffer",
      "privacy",
      "privacy filter",
      "pf 2way",
      "2way",
      "filter",
      "tasche",
      "notebooktasche",
      "laptoptasche",
      "rucksack",
      "trolley",
      "rolling",
      "sleeve",
      "hülle",
      "huelle",
      "case",
      "cover",
      "akku",
      "notebook akku",
      "laptop akku",
      "batterie",
      "notebook batterie",
      "laptop batterie",
      "halter",
      "halterung",
      "stand",
      "laptop stand",
      "notebook stand",
      "laptopstander",
      "ständer",
      "staender",
      "cooling",
      "cooler",
      "kühler",
      "kuhler",
      "lock",
      "schloss",
      "security",
      "kabel",
      "adapter",
      "dock",
      "docking",
      "netzteil",
      "ladegerät",
      "ladegerat",
      "charger",
      "schutzfolie",
      "displayfolie",
      "folie",
    ],
  },
  {
    title: "Monitore",
    keywords: [
      "monitor",
      "display",
      "bildschirm",
      "q27",
      "aoc",
      "philips",
      "iiyama",
      "dell monitor",
      "curved",
      "ips",
      "va",
      "oled",
      "uhd",
      "4k",
      "2560x1440",
      "1920x1080",
    ],
    exclude: [
      "halter",
      "halterung",
      "arm",
      "mount",
      "ständer",
      "staender",
      "stand",
      "kabel",
      "adapter",
      "privacy filter",
      "schutzfolie",
      "folie",
    ],
  },
  {
    title: "Smartphones",
    keywords: [
      "smartphone",
      "iphone",
      "galaxy",
      "pixel",
      "xiaomi",
      "redmi",
      "motorola",
      "oppo",
      "oneplus",
      "nothing phone",
    ],
    exclude: [
      "case",
      "hülle",
      "huelle",
      "cover",
      "schutzfolie",
      "glas",
      "charger",
      "ladegerät",
      "ladegerat",
      "kabel",
      "adapter",
      "halter",
      "akku",
      "batterie",
    ],
  },
  {
    title: "Tablets",
    keywords: ["tablet", "ipad", "galaxy tab", "surface go", "surface pro"],
    exclude: [
      "case",
      "hülle",
      "huelle",
      "cover",
      "schutzfolie",
      "tastatur",
      "keyboard",
      "stift",
      "pen",
      "halter",
      "stand",
      "adapter",
      "kabel",
    ],
  },
  {
    title: "Grafikkarten",
    keywords: [
      "grafikkarte",
      "gpu",
      "nvidia",
      "geforce",
      "radeon",
      "quadro",
      "rtx",
      "gtx",
      "t400",
    ],
    exclude: ["kabel", "adapter", "halter", "support"],
  },
  {
    title: "Desktop-PCs",
    keywords: ["desktop", "workstation", "tower", "optiplex", "thinkcentre"],
    exclude: ["monitor", "tastatur", "keyboard", "maus", "mouse", "kabel", "adapter"],
  },
  {
    title: "Mini PCs",
    keywords: ["mini pc", "minipc", "nuc", "tiny pc", "mini-pc"],
    exclude: ["halter", "mount", "adapter", "kabel", "netzteil"],
  },
  {
    title: "Router",
    keywords: ["router", "fritzbox", "wlan router"],
    exclude: ["kabel", "adapter", "halter"],
  },
  {
    title: "Netzwerk-Switches",
    keywords: ["switch", "netzwerk-switch", "ethernet switch", "poe switch"],
    exclude: ["nintendo switch", "switch spiel", "switch case"],
  },
  {
    title: "WLAN Mesh",
    keywords: ["mesh", "wlan mesh", "wifi mesh", "deco"],
    exclude: ["kabel", "adapter"],
  },
  {
    title: "Drucker",
    keywords: [
      "drucker",
      "printer",
      "laserjet",
      "inkjet",
      "multifunktionsdrucker",
      "officejet",
      "pixma",
    ],
    exclude: ["toner", "tinte", "kartusche", "patrone", "papier"],
  },
  {
    title: "Externe SSD",
    keywords: ["externe ssd", "external ssd", "portable ssd", "ssd extern"],
    exclude: ["gehäuse", "gehaeuse", "case", "adapter", "kabel"],
  },
  {
    title: "NAS",
    keywords: ["nas", "synology", "qnap"],
    exclude: ["festplatte", "hdd", "ssd", "ram", "speicher"],
  },
  {
    title: "Tastaturen",
    keywords: ["tastatur", "keyboard"],
    exclude: ["case", "cover", "schutzfolie"],
  },
  {
    title: "Mäuse",
    keywords: ["maus", "mouse"],
    exclude: ["pad", "matte", "bungee"],
  },
  {
    title: "Headsets",
    keywords: ["headset", "kopfhörer", "kopfhoerer", "headphones", "earbuds"],
    exclude: ["case", "adapter", "kabel"],
  },
  {
    title: "Webcams",
    keywords: ["webcam", "conference camera", "konferenzkamera"],
    exclude: ["halter", "stativ", "kabel"],
  },
  {
    title: "Dockingstationen",
    keywords: ["docking", "dock", "dockingstation", "usb-c hub", "thunderbolt dock"],
    exclude: [],
  },
  {
    title: "Zubehör",
    keywords: [
      "zubehör",
      "zubehor",
      "adapter",
      "kabel",
      "case",
      "hülle",
      "huelle",
      "cover",
      "ladegerät",
      "ladegerat",
      "charger",
      "tasche",
      "notebooktasche",
      "laptoptasche",
      "rucksack",
      "trolley",
      "halter",
      "halterung",
      "stand",
      "ständer",
      "staender",
      "akku",
      "batterie",
      "netzteil",
      "privacy filter",
      "privacy",
      "schutzfolie",
      "folie",
      "sleeve",
      "lock",
      "schloss",
      "garantie",
      "prosupport",
      "service",
      "warranty",
      "koffer",
    ],
    exclude: [],
  },
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function getProductSearchText(product) {
  return normalize(
    [
      product.title,
      product.handle,
      product.vendor,
      product.productType,
      ...(product.tags || []),
    ].join(" ")
  );
}

function matchesRule(product, rule) {
  const text = getProductSearchText(product);

  const hasKeyword = rule.keywords.some((keyword) =>
    text.includes(normalize(keyword))
  );

  if (!hasKeyword) return false;

  const hasExcluded = (rule.exclude || []).some((keyword) =>
    text.includes(normalize(keyword))
  );

  return !hasExcluded;
}

function findCollectionTitlesForProduct(product) {
  const matches = COLLECTION_RULES.filter((rule) =>
    matchesRule(product, rule)
  ).map((rule) => rule.title);

  return [...new Set(matches)];
}

async function getAllProducts() {
  const query = `
    query Products($cursor: String) {
      products(first: 100, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          handle
          vendor
          productType
          tags
          collections(first: 50) {
            nodes {
              id
              title
              handle
            }
          }
        }
      }
    }
  `;

  let cursor = null;
  const products = [];

  while (true) {
    const data = await shopifyAdmin(query, { cursor });
    products.push(...data.products.nodes);

    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }

  return products;
}

async function getAllCollections() {
  const query = `
    query Collections($cursor: String) {
      collections(first: 100, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          handle
        }
      }
    }
  `;

  let cursor = null;
  const collections = [];

  while (true) {
    const data = await shopifyAdmin(query, { cursor });
    collections.push(...data.collections.nodes);

    if (!data.collections.pageInfo.hasNextPage) break;
    cursor = data.collections.pageInfo.endCursor;
  }

  return collections;
}

async function createCollection(title) {
  const mutation = `
    mutation CreateCollection($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection {
          id
          title
          handle
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyAdmin(mutation, {
    input: {
      title,
      sortOrder: "BEST_SELLING",
    },
  });

  const errors = data.collectionCreate.userErrors || [];

  if (errors.length) {
    throw new Error(
      `Collection create error for ${title}: ${errors
        .map((e) => e.message)
        .join(" | ")}`
    );
  }

  return data.collectionCreate.collection;
}

async function addProductToCollection(collectionId, productId) {
  const mutation = `
    mutation AddProductsToCollection($id: ID!, $productIds: [ID!]!) {
      collectionAddProducts(id: $id, productIds: $productIds) {
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyAdmin(mutation, {
    id: collectionId,
    productIds: [productId],
  });

  const errors = data.collectionAddProducts.userErrors || [];

  if (errors.length) {
    const message = errors.map((e) => e.message).join(" | ").toLowerCase();

    if (
      message.includes("already") ||
      message.includes("exist") ||
      message.includes("gid://shopify/product")
    ) {
      return false;
    }

    throw new Error(`Add product error: ${errors.map((e) => e.message).join(" | ")}`);
  }

  return true;
}

async function removeProductFromCollection(collectionId, productId) {
  const mutation = `
    mutation RemoveProductsFromCollection($id: ID!, $productIds: [ID!]!) {
      collectionRemoveProducts(id: $id, productIds: $productIds) {
        job {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyAdmin(mutation, {
    id: collectionId,
    productIds: [productId],
  });

  const errors = data.collectionRemoveProducts.userErrors || [];

  if (errors.length) {
    const message = errors.map((e) => e.message).join(" | ").toLowerCase();

    if (
      message.includes("not") ||
      message.includes("does not") ||
      message.includes("gid://shopify/product")
    ) {
      return false;
    }

    throw new Error(
      `Remove product error: ${errors.map((e) => e.message).join(" | ")}`
    );
  }

  return true;
}

async function main() {
  console.log("Loading Shopify products...");
  const products = await getAllProducts();

  console.log(`Products found: ${products.length}`);

  console.log("Loading Shopify collections...");
  const collections = await getAllCollections();

  const managedKeys = MANAGED_COLLECTIONS.map(normalize);

  const collectionMap = new Map(
    collections.map((collection) => [normalize(collection.title), collection])
  );

  for (const title of MANAGED_COLLECTIONS) {
    const key = normalize(title);

    if (!collectionMap.has(key)) {
      console.log(`Creating collection: ${title}`);
      const collection = await createCollection(title);
      collectionMap.set(key, collection);
    }
  }

  let assigned = 0;
  let alreadyAssigned = 0;
  let removedWrong = 0;
  let skipped = 0;

  for (const product of products) {
    const targetTitles = findCollectionTitlesForProduct(product);
    const targetKeys = new Set(targetTitles.map(normalize));

    const currentManagedCollections = (product.collections?.nodes || []).filter(
      (collection) => managedKeys.includes(normalize(collection.title))
    );

    for (const collection of currentManagedCollections) {
      const currentKey = normalize(collection.title);

      if (!targetKeys.has(currentKey)) {
        const removed = await removeProductFromCollection(collection.id, product.id);

        if (removed) {
          console.log(`REMOVE WRONG: ${product.title} from ${collection.title}`);
          removedWrong++;
        }
      }
    }

    if (!targetTitles.length) {
      console.log(`SKIP: ${product.title}`);
      skipped++;
      continue;
    }

    for (const title of targetTitles) {
      const collection = collectionMap.get(normalize(title));

      if (!collection) {
        console.log(`Missing collection: ${title}`);
        continue;
      }

      const alreadyInCollection = (product.collections?.nodes || []).some(
        (c) => normalize(c.title) === normalize(title)
      );

      if (alreadyInCollection) {
        console.log(`ALREADY: ${product.title} -> ${title}`);
        alreadyAssigned++;
        continue;
      }

      const added = await addProductToCollection(collection.id, product.id);

      if (added) {
        console.log(`ADD: ${product.title} -> ${title}`);
        assigned++;
      } else {
        console.log(`ALREADY: ${product.title} -> ${title}`);
        alreadyAssigned++;
      }
    }
  }

  console.log("DONE");
  console.log({ assigned, alreadyAssigned, removedWrong, skipped });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});