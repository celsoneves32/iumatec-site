import fs from "fs";
import path from "path";

const INPUT_FILES = [
  "integrations/alltron/out/iumatec-tech-catalog.json",
  "integrations/alltron/out/iumatec-catalog-live.json",
  "integrations/alltron/out/winning-products.json",
  "integrations/alltron/out/iumatec-catalog-sellable.json",
  "integrations/alltron/out/iumatec-catalog-filtered.json",
  "integrations/alltron/out/iumatec-catalog-enriched.json",
];

const OUTPUT_FILE =
  "integrations/alltron/out/iumatec-master-catalog.json";

const CONFLICT_REPORT_FILE =
  "integrations/alltron/out/iumatec-master-conflicts.json";

const PRICE_REPORT_FILE =
  "integrations/alltron/out/iumatec-master-price-protection.json";

const PACK_REPORT_FILE =
  "integrations/alltron/out/iumatec-master-pack-unit-review.json";

const IMAGE_REPORT_FILE =
  "integrations/alltron/out/iumatec-master-image-safety.json";

// Este catÃ¡logo Ã© criado pelo parseAlltronProducts.mjs a partir do XML e do
// CSV de imagens validados por LITM exato. Os restantes ficheiros podem conter
// galerias antigas ou associaÃ§Ãµes histÃ³ricas da Shopify e nÃ£o sÃ£o usados para
// acrescentar imagens a um produto que jÃ¡ tenha uma imagem Alltron validada.
const TRUSTED_IMAGE_SOURCE =
  "integrations/alltron/out/iumatec-tech-catalog.json";

const MIN_NET_MARGIN = 0.10;
const MIN_NET_PROFIT = 2.00;
const PAYMENT_RATE = 0.02;
const PAYMENT_FIXED = 0.30;
const FREE_SHIPPING_FROM = 49;
const SHIPPING_RESERVE = 5.90;

function readJson(relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`Missing: ${relativePath}`);
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));

    if (!Array.isArray(data)) {
      console.log(`Skipped, not array: ${relativePath}`);
      return [];
    }

    console.log(`${relativePath}: ${data.length}`);
    return data;
  } catch (error) {
    console.error(`Failed to read ${relativePath}:`, error);
    return [];
  }
}

function text(value) {
  return String(value ?? "").trim();
}

function normalize(value) {
  return text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ã¤/g, "a")
    .replace(/Ã¶/g, "o")
    .replace(/Ã¼/g, "u")
    .replace(/ÃŸ/g, "ss")
    .replace(/[^a-z0-9]+/g, "");
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

function unique(values) {
  return [...new Set(values.map(text).filter(Boolean))];
}

function getImages(product) {
  const urls = [];

  if (typeof product.image === "string") {
    urls.push(product.image);
  }

  for (const field of [
    product.images,
    product.imageUrls,
    product.gallery,
    product.shopifyImages,
  ]) {
    if (!Array.isArray(field)) continue;

    for (const url of field) {
      if (typeof url === "string") {
        urls.push(url);
      }
    }
  }

  if (typeof product.shopifyImageUrl === "string") {
    urls.push(product.shopifyImageUrl);
  }

  return unique(urls).filter(
    (url) =>
      url.startsWith("https://") ||
      url.startsWith("http://"),
  );
}

function getVariantId(product) {
  const raw =
    product.merchandiseId ||
    product.shopifyVariantId ||
    "";

  const value = text(raw);

  if (!value) return "";

  if (value.startsWith("gid://shopify/ProductVariant/")) {
    return value;
  }

  const numeric = value.replace(/[^\d]/g, "");

  return numeric
    ? `gid://shopify/ProductVariant/${numeric}`
    : "";
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

function isTrustedImageSource(sourceFile) {
  return text(sourceFile) === TRUSTED_IMAGE_SOURCE;
}

function hasTrustedImageSource(product) {
  return Array.isArray(product?._sources)
    ? product._sources.some(isTrustedImageSource)
    : false;
}

let rejectedLegacyImageCount = 0;
const rejectedLegacyImageExamples = [];
const MAX_REJECTED_IMAGE_EXAMPLES = 5000;

function selectSafeImages(current, incoming) {
  const currentImages = getImages(current);
  const incomingImages = getImages(incoming);
  const incomingIsTrusted = isTrustedImageSource(
    incoming?._sourceFile,
  );
  const currentHasTrusted = hasTrustedImageSource(current);

  // A fonte validada substitui qualquer galeria antiga que tenha sido lida
  // antes. Atualmente o CSV da Alltron contÃ©m uma imagem por LITM, mas esta
  // lÃ³gica aceitarÃ¡ automaticamente vÃ¡rias quando a fonte oficial as trouxer.
  if (incomingIsTrusted) {
    return incomingImages;
  }

  // Depois de existir uma imagem Alltron validada, nÃ£o acumulamos imagens de
  // catÃ¡logos antigos. Foi esta acumulaÃ§Ã£o que permitiu aparecer na galeria uma
  // imagem pertencente a outro artigo.
  if (currentHasTrusted && currentImages.length > 0) {
    const rejected = incomingImages.filter(
      (url) => !currentImages.includes(url),
    );

    rejectedLegacyImageCount += rejected.length;

    if (
      rejected.length > 0 &&
      rejectedLegacyImageExamples.length <
        MAX_REJECTED_IMAGE_EXAMPLES
    ) {
      rejectedLegacyImageExamples.push({
        litm: text(current.litm || current.alltronSku),
        ean: text(current.ean),
        title: text(current.fullTitle || current.title),
        rejectedSource: text(incoming?._sourceFile),
        rejectedImages: rejected,
      });
    }

    return currentImages;
  }

  return unique([...currentImages, ...incomingImages]);
}

function getVatRate(product) {
  const raw = number(product.vat);
  if (raw <= 0) return 0.081;
  return raw > 1 ? raw / 100 : raw;
}

function getCostIncludingVat(product) {
  const inpr = number(product.inpr);
  if (inpr > 0) return inpr;

  const expr = number(product.expr);
  return expr > 0 ? expr * (1 + getVatRate(product)) : 0;
}

function roundRetailPrice(value) {
  if (!(value > 0)) return 0;
  // Arredonda apenas para o prÃ³ximo CHF 0,05, nunca para .90.
  return Number((Math.ceil((value - 0.000001) * 20) / 20).toFixed(2));
}

function protectedSellingPrice(product) {
  const vatRate = getVatRate(product);

  // INPR = custo incluindo IVA
  const costGross = getCostIncludingVat(product);

  // EXPR = custo líquido sem IVA.
  // É a base correta quando a empresa recupera o IVA de compra.
  const exprCostNet = number(product.expr);

  const costNet =
    exprCostNet > 0
      ? exprCostNet
      : costGross > 0
        ? costGross / (1 + vatRate)
        : 0;

  const recommended = number(product.ecpr);
  const currentPrice = getPrice(product);

  if (!(costNet > 0) || !(costGross > 0)) {
    return {
      price: 0,
      cost: 0,
      costNet: 0,
      vatRate,
      recommended,
      minimumSafe: 0,
      status: "blocked-missing-cost",
      shippingReserve: 0,
    };
  }

  // ==========================================================
  // MARGEM LIQUIDA
  //
  // venda líquida = preço bruto / (1 + IVA)
  //
  // lucro =
  // venda líquida
  // - custo líquido produto
  // - transporte fornecedor
  // - fee percentual pagamento
  // - fee fixo pagamento
  //
  // lucro / venda líquida >= 10%
  // ==========================================================

  const marginCoefficient =
    ((1 - MIN_NET_MARGIN) / (1 + vatRate)) -
    PAYMENT_RATE;

  // ==========================================================
  // LUCRO MINIMO ABSOLUTO
  //
  // lucro >= CHF 2.00
  // ==========================================================

  const profitCoefficient =
    (1 / (1 + vatRate)) -
    PAYMENT_RATE;

  if (
    !(marginCoefficient > 0) ||
    !(profitCoefficient > 0)
  ) {
    return {
      price: 0,
      cost: Number(costGross.toFixed(2)),
      costNet: Number(costNet.toFixed(2)),
      vatRate,
      recommended,
      minimumSafe: 0,
      status: "blocked-invalid-financial-coefficients",
      shippingReserve: 0,
    };
  }

  // ==========================================================
  // PRIMEIRO CALCULO SEM TRANSPORTE
  // ==========================================================

  const baseWithoutShipping =
    costNet + PAYMENT_FIXED;

  const minimumByMarginWithoutShipping =
    baseWithoutShipping / marginCoefficient;

  const minimumByProfitWithoutShipping =
    (baseWithoutShipping + MIN_NET_PROFIT) /
    profitCoefficient;

  const minimumWithoutShipping = Math.max(
    minimumByMarginWithoutShipping,
    minimumByProfitWithoutShipping,
  );

  const roundedMinimumWithoutShipping =
    roundRetailPrice(minimumWithoutShipping);

  // ==========================================================
  // TRANSPORTE
  //
  // Se:
  // - o preço atual já oferece envio grátis
  // OU
  // - o próprio preço mínimo entra na zona de envio grátis
  //
  // reservar CHF 5.90.
  // ==========================================================

  const currentTriggersFreeShipping =
    currentPrice >= FREE_SHIPPING_FROM;

  const minimumTriggersFreeShipping =
    roundedMinimumWithoutShipping >=
    FREE_SHIPPING_FROM;

  const shippingReserve =
    currentTriggersFreeShipping ||
    minimumTriggersFreeShipping
      ? SHIPPING_RESERVE
      : 0;

  // ==========================================================
  // CALCULO FINAL
  // ==========================================================

  const baseCosts =
    costNet +
    shippingReserve +
    PAYMENT_FIXED;

  const minimumByMargin =
    baseCosts / marginCoefficient;

  const minimumByProfit =
    (baseCosts + MIN_NET_PROFIT) /
    profitCoefficient;

  const minimumSafe = Math.max(
    minimumByMargin,
    minimumByProfit,
  );

  const roundedMinimumSafe =
    roundRetailPrice(minimumSafe);

  const currentPriceSafe =
    currentPrice > 0 &&
    currentPrice + 0.000001 >=
      roundedMinimumSafe;

  const price = currentPriceSafe
    ? currentPrice
    : roundedMinimumSafe;

  return {
    price,
    cost: Number(costGross.toFixed(2)),
    costNet: Number(costNet.toFixed(2)),
    vatRate: Number(vatRate.toFixed(4)),
    recommended,
    minimumByMargin:
      Number(minimumByMargin.toFixed(2)),
    minimumByProfit:
      Number(minimumByProfit.toFixed(2)),
    minimumSafe: roundedMinimumSafe,
    status: currentPriceSafe
      ? "current-price-safe"
      : "raised-to-protected-minimum",
    shippingReserve,
  };
}

function detectPackUnitSuspicion(product, protectedPrice) {
  const title = text(
    product.fullTitle ||
      product.title ||
      product.title2,
  );
  const normalizedTitle = title.toLowerCase();
  const oldPrice = getPrice(product);
  const cost = protectedPrice.cost;
  const recommended = protectedPrice.recommended;

  const packMarkers = [
    /\b\d+\s*(?:stÃ¼ck|stk\.?|pcs?|pieces?|teilig(?:e[snr]?)?|er[- ]?pack|packung(?:en)?|einheiten)\b/i,
    /\b\d+\s*[xÃ—]\s*\d+(?:[.,]\d+)?\s*(?:mg|g|kg|ml|cl|l)\b/i,
    /\b(?:multipack|bundle|karton|carton)\b/i,
    /\b\d+\s*(?:er[- ]?)?set\b/i,
  ];

  const reasons = [];

  if (packMarkers.some((pattern) => pattern.test(normalizedTitle))) {
    reasons.push("pack-marker-in-title");
  }

  if (oldPrice > 0 && cost > oldPrice * 2) {
    reasons.push("cost-more-than-2x-old-price");
  }

  if (oldPrice > 0 && recommended > oldPrice * 2) {
    reasons.push("recommended-more-than-2x-old-price");
  }

  if (!reasons.length) return null;

  return {
    litm: text(product.litm || product.alltronSku),
    sku: text(product.sku),
    ean: text(product.ean),
    title,
    oldPrice,
    protectedPrice: protectedPrice.price,
    cost,
    recommended,
    reasons,
  };
}

function longer(first, second) {
  const a = text(first);
  const b = text(second);

  if (!a) return b;
  if (!b) return a;

  return b.length > a.length ? b : a;
}

function preferred(first, second) {
  return text(second) || text(first);
}

function positive(first, second) {
  const a = number(first);
  const b = number(second);

  return b > 0 ? b : a;
}

function getKeys(product) {
  const keys = [];

  const variantId = getVariantId(product);
  const litm = text(product.litm || product.alltronSku);
  const ean = text(product.ean);
  const internalNumber = text(product.internalNumber);
  const sku = text(product.sku);

  if (variantId) keys.push(`variant:${variantId}`);
  if (litm) keys.push(`litm:${normalize(litm)}`);
  if (ean) keys.push(`ean:${normalize(ean)}`);
  if (internalNumber) {
    keys.push(`internal:${normalize(internalNumber)}`);
  }
  if (sku) keys.push(`sku:${normalize(sku)}`);

  return unique(keys);
}

function getIdentity(product) {
  return {
    variantId: getVariantId(product),
    litm: normalize(product.litm || product.alltronSku),
    ean: normalize(product.ean),
    internalNumber: normalize(product.internalNumber),
    sku: normalize(product.sku),
  };
}

function sameNonEmpty(first, second) {
  return Boolean(first && second && first === second);
}

function differentNonEmpty(first, second) {
  return Boolean(first && second && first !== second);
}

function evaluateMatch(current, incoming) {
  const a = getIdentity(current);
  const b = getIdentity(incoming);

  const strongMatches = [
    sameNonEmpty(a.variantId, b.variantId),
    sameNonEmpty(a.litm, b.litm),
    sameNonEmpty(a.ean, b.ean),
  ].filter(Boolean).length;

  const strongConflicts = [
    differentNonEmpty(a.variantId, b.variantId),
    differentNonEmpty(a.litm, b.litm),
    differentNonEmpty(a.ean, b.ean),
  ].filter(Boolean).length;

  const internalMatch = sameNonEmpty(
    a.internalNumber,
    b.internalNumber,
  );

  const skuMatch = sameNonEmpty(a.sku, b.sku);

  if (strongConflicts > 0) {
    return {
      allowed: false,
      score: -1000,
      reason: "strong-identifier-conflict",
      currentIdentity: a,
      incomingIdentity: b,
    };
  }

  if (strongMatches > 0) {
    return {
      allowed: true,
      score:
        strongMatches * 100 +
        (internalMatch ? 20 : 0) +
        (skuMatch ? 10 : 0),
      reason: "strong-identifier-match",
      currentIdentity: a,
      incomingIdentity: b,
    };
  }

  // NÃºmeros internos e SKUs podem ser reutilizados, truncados ou estar
  // incorretos nalguns catÃ¡logos. Sem LITM, EAN ou variante coincidente,
  // sÃ³ aceitamos a junÃ§Ã£o quando ambos os identificadores fracos coincidem.
  if (internalMatch && skuMatch) {
    return {
      allowed: true,
      score: 25,
      reason: "double-weak-identifier-match",
      currentIdentity: a,
      incomingIdentity: b,
    };
  }

  return {
    allowed: false,
    score: 0,
    reason: "insufficient-identity-match",
    currentIdentity: a,
    incomingIdentity: b,
  };
}

function mergeProduct(current, incoming) {
  if (!current) {
    const images = getImages(incoming);
    const stock = getStock(incoming);
    const variantId = getVariantId(incoming);

    return {
      ...incoming,

      merchandiseId: variantId,
      shopifyVariantId:
        incoming.shopifyVariantId || variantId,

      image: images[0] || "",
      images,
      imageUrls: images,

      price: getPrice(incoming),
      stockQty: stock,
      stock,
      inStock: stock > 0,

      _sources: unique([incoming._sourceFile]),
    };
  }

  const images = selectSafeImages(current, incoming);

  const variantId =
    getVariantId(incoming) ||
    getVariantId(current);

  const stock =
    getStock(incoming) > 0
      ? getStock(incoming)
      : getStock(current);

  const price =
    getPrice(incoming) > 0
      ? getPrice(incoming)
      : getPrice(current);

  return {
    ...current,
    ...incoming,

    litm:
      preferred(current.litm, incoming.litm) ||
      preferred(current.alltronSku, incoming.alltronSku),

    alltronSku:
      preferred(current.alltronSku, incoming.alltronSku) ||
      preferred(current.litm, incoming.litm),

    sku: preferred(current.sku, incoming.sku),

    internalNumber: preferred(
      current.internalNumber,
      incoming.internalNumber,
    ),

    ean: preferred(current.ean, incoming.ean),

    brand: preferred(current.brand, incoming.brand),

    title: longer(current.title, incoming.title),

    title2: longer(current.title2, incoming.title2),

    fullTitle: longer(
      current.fullTitle,
      incoming.fullTitle,
    ),

    description: longer(
      current.description,
      incoming.description,
    ),

    description2: longer(
      current.description2,
      incoming.description2,
    ),

    deliveryDate: preferred(
      current.deliveryDate,
      incoming.deliveryDate,
    ),

    warrantyMonths: positive(
      current.warrantyMonths,
      incoming.warrantyMonths,
    ),

    weight: positive(
      current.weight,
      incoming.weight,
    ),

    merchandiseId: variantId,

    shopifyVariantId:
      incoming.shopifyVariantId ||
      current.shopifyVariantId ||
      variantId,

    shopifyProductId:
      incoming.shopifyProductId ||
      current.shopifyProductId ||
      "",

    shopifyProductHandle:
      incoming.shopifyProductHandle ||
      current.shopifyProductHandle ||
      incoming.productHandle ||
      current.productHandle ||
      incoming.slug ||
      current.slug ||
      "",

    productHandle:
      incoming.productHandle ||
      current.productHandle ||
      incoming.shopifyProductHandle ||
      current.shopifyProductHandle ||
      incoming.slug ||
      current.slug ||
      "",

    slug:
      incoming.slug ||
      current.slug ||
      incoming.shopifyProductHandle ||
      current.shopifyProductHandle ||
      "",

    shopifySyncStatus:
      incoming.shopifySyncStatus ||
      current.shopifySyncStatus ||
      "",

    shopifyMatchStatus:
      incoming.shopifyMatchStatus ||
      current.shopifyMatchStatus ||
      "",

    price,
    ecpr: positive(current.ecpr, incoming.ecpr),
    expr: positive(current.expr, incoming.expr),
    inpr: positive(current.inpr, incoming.inpr),
    vat: positive(current.vat, incoming.vat),

    stockQty: stock,
    stock,
    inStock: stock > 0,

    image: images[0] || "",
    images,
    imageUrls: images,

    rawCategory: {
      ...(current.rawCategory || {}),
      ...(incoming.rawCategory || {}),
    },

    iumatecCategory: {
      ...(current.iumatecCategory || {}),
      ...(incoming.iumatecCategory || {}),
    },

    category:
      incoming.category ||
      current.category ||
      "",

    subcategory:
      incoming.subcategory ||
      current.subcategory ||
      "",

    _sources: unique([
      ...(Array.isArray(current._sources)
        ? current._sources
        : []),

      incoming._sourceFile,
    ]),
  };
}

const records = [];

for (const inputFile of INPUT_FILES) {
  const products = readJson(inputFile);

  for (const product of products) {
    records.push({
      ...product,
      _sourceFile: inputFile,
    });
  }
}

console.log("");
console.log("Total records loaded:", records.length);

const products = [];
const keyToIndexes = new Map();
const conflicts = [];
let blockedUnsafeMerges = 0;
const MAX_CONFLICT_EXAMPLES = 5000;

function registerKey(key, index) {
  if (!keyToIndexes.has(key)) {
    keyToIndexes.set(key, new Set());
  }

  keyToIndexes.get(key).add(index);
}

for (const record of records) {
  const keys = getKeys(record);

  if (!keys.length) continue;

  const candidateIndexes = new Set();

  for (const key of keys) {
    const indexes = keyToIndexes.get(key);

    if (!indexes) continue;

    for (const candidateIndex of indexes) {
      candidateIndexes.add(candidateIndex);
    }
  }

  let index = null;
  let bestEvaluation = null;

  for (const candidateIndex of candidateIndexes) {
    const evaluation = evaluateMatch(
      products[candidateIndex],
      record,
    );

    if (!evaluation.allowed) {
      blockedUnsafeMerges++;

      if (conflicts.length < MAX_CONFLICT_EXAMPLES) {
        conflicts.push({
          reason: evaluation.reason,
          matchedKeys: keys.filter((key) =>
            keyToIndexes.get(key)?.has(candidateIndex),
          ),
          current: {
            title: products[candidateIndex]?.title,
            ...evaluation.currentIdentity,
            sources: products[candidateIndex]?._sources,
          },
          incoming: {
            title: record?.title,
            ...evaluation.incomingIdentity,
            source: record?._sourceFile,
          },
        });
      }

      continue;
    }

    if (
      !bestEvaluation ||
      evaluation.score > bestEvaluation.score
    ) {
      index = candidateIndex;
      bestEvaluation = evaluation;
    }
  }

  if (index === null) {
    index = products.length;

    const merged = mergeProduct(null, record);

    products.push(merged);

    for (const key of keys) {
      registerKey(key, index);
    }

    continue;
  }

  const merged = mergeProduct(products[index], record);

  products[index] = merged;

  for (const key of [
    ...keys,
    ...getKeys(merged),
  ]) {
    registerKey(key, index);
  }
}

const priceProtection = [];
const packUnitReview = [];

const masterCatalog = products
  .map(({ _sourceFile, ...product }) => {
    let protectedPrice = protectedSellingPrice(product);
    const oldPrice = getPrice(product);
    const packSuspicion = detectPackUnitSuspicion(
      product,
      protectedPrice,
    );

    if (packSuspicion) {
      packUnitReview.push(packSuspicion);
    }

    // Uma diferenÃ§a superior a 2x entre custo e preÃ§o atual costuma indicar
    // mistura de preÃ§o por unidade com custo do pack (ou uma junÃ§Ã£o errada).
    // NÃ£o inventamos um preÃ§o muito mais alto: bloqueamos atÃ© revisÃ£o manual.
    if (
      oldPrice > 0 &&
      protectedPrice.cost > oldPrice * 2
    ) {
      protectedPrice = {
        ...protectedPrice,
        price: 0,
        minimumSafe: 0,
        status: "blocked-pack-unit-mismatch",
        shippingReserve: 0,
      };
    }

    if (
      protectedPrice.status !== "current-price-safe" ||
      Math.abs(oldPrice - protectedPrice.price) > 0.001
    ) {
      priceProtection.push({
        litm: text(product.litm || product.alltronSku),
        ean: text(product.ean),
        title: text(product.fullTitle || product.title),
        oldPrice,
        ...protectedPrice,
      });
    }

    return {
      ...product,
      originalPrice: oldPrice,
      price: protectedPrice.price,
      purchaseCostInclVat: protectedPrice.cost,
      purchaseCostNet: protectedPrice.costNet || 0,
      minimumSafePrice: protectedPrice.minimumSafe || 0,
      priceSafetyStatus: protectedPrice.status,
      priceRule:
        "keep-current-if-safe-otherwise-net-cost+vat+payment+shipping+10%-margin+CHF2-profit",
      packUnitReviewRequired: Boolean(packSuspicion),
    };
  })
  .sort((a, b) => {
    const stockDifference =
      getStock(b) - getStock(a);

    if (stockDifference !== 0) {
      return stockDifference;
    }

    return getPrice(b) - getPrice(a);
  });

const outputPath = path.join(
  process.cwd(),
  OUTPUT_FILE,
);

const conflictReportPath = path.join(
  process.cwd(),
  CONFLICT_REPORT_FILE,
);

fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
});

fs.writeFileSync(
  outputPath,
  JSON.stringify(masterCatalog, null, 2),
  "utf8",
);

fs.writeFileSync(
  conflictReportPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      blockedUnsafeMerges,
      savedExamples: conflicts.length,
      conflicts,
    },
    null,
    2,
  ),
  "utf8",
);

fs.writeFileSync(
  path.join(process.cwd(), PRICE_REPORT_FILE),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      assumptions: {
        minimumNetMargin: MIN_NET_MARGIN,
        minimumNetProfit: MIN_NET_PROFIT,
        paymentRate: PAYMENT_RATE,
        paymentFixed: PAYMENT_FIXED,
        freeShippingFrom: FREE_SHIPPING_FROM,
        shippingReserve: SHIPPING_RESERVE,
        exprFallbackVatRate: 0.081,
        rounding: "up-to-next-CHF-0.05",
        recommendedPricePolicy:
          "ECPR is reference only and never forces an increase",
      },
      reviewedProducts: priceProtection.length,
      blockedMissingCost: priceProtection.filter(
        (item) => item.status === "blocked-missing-cost",
      ).length,
      raisedToProtectedMinimum: priceProtection.filter(
        (item) =>
          item.status === "raised-to-protected-minimum",
      ).length,
      products: priceProtection,
    },
    null,
    2,
  ),
  "utf8",
);

fs.writeFileSync(
  path.join(process.cwd(), PACK_REPORT_FILE),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note:
        "Review only. No product was blocked or repriced solely because it appears here.",
      suspiciousProducts: packUnitReview.length,
      products: packUnitReview,
    },
    null,
    2,
  ),
  "utf8",
);

fs.writeFileSync(
  path.join(process.cwd(), IMAGE_REPORT_FILE),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      trustedImageSource: TRUSTED_IMAGE_SOURCE,
      policy:
        "Use only images from the exact-LITM validated Alltron catalog when available; never append legacy catalog images.",
      rejectedLegacyImageCount,
      savedExamples: rejectedLegacyImageExamples.length,
      rejectedLegacyImageExamples,
    },
    null,
    2,
  ),
  "utf8",
);

const withVariant = masterCatalog.filter(
  (product) => Boolean(getVariantId(product)),
).length;

const withImages = masterCatalog.filter(
  (product) => getImages(product).length > 0,
).length;

const withDescription = masterCatalog.filter(
  (product) =>
    text(product.description) ||
    text(product.description2),
).length;

const withPrice = masterCatalog.filter(
  (product) => getPrice(product) > 0,
).length;

const withStock = masterCatalog.filter(
  (product) => getStock(product) > 0,
).length;

console.log("");
console.log("========== MASTER CATALOG DONE ==========");
console.log("Loaded records:", records.length);
console.log("Unique products:", masterCatalog.length);
console.log("With Shopify variant:", withVariant);
console.log("With images:", withImages);
console.log("With description:", withDescription);
console.log("With price:", withPrice);
console.log("With stock:", withStock);
console.log("Blocked unsafe merges:", blockedUnsafeMerges);
console.log("Output:", OUTPUT_FILE);
console.log("Conflict report:", CONFLICT_REPORT_FILE);
console.log("Price protection report:", PRICE_REPORT_FILE);
console.log("Pack/unit review report:", PACK_REPORT_FILE);
console.log("Image safety report:", IMAGE_REPORT_FILE);
console.log("=========================================");

console.log("");
console.log("========== PHILIPS CHECK ==========");

const philipsProducts = masterCatalog.filter(
  (product) =>
    text(product.title)
      .toLowerCase()
      .includes("32b2u3601"),
);

for (const product of philipsProducts) {
  console.log({
    litm: product.litm,
    sku: product.sku,
    title: product.title,
    merchandiseId: product.merchandiseId,
    price: product.price,
    stock: product.stockQty,
    images: getImages(product).length,
    description: product.description,
    description2: product.description2,
    warrantyMonths: product.warrantyMonths,
    sources: product._sources,
  });
}

console.log("===================================");


