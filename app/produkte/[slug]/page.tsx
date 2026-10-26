import Link from "next/link";
import { notFound } from "next/navigation";

import ProductGallery from "@/components/ProductGallery";
import ProductBuyBox from "@/components/product/ProductBuyBox";
import ProductTrust from "@/components/product/ProductTrust";
import ProductSpecs from "@/components/product/ProductSpecs";
import RelatedCarousel from "@/components/product/RelatedCarousel";
import ProductReviews from "@/components/product/ProductReviews";

import {
  getProductBySlug,
  getProductVariants,
  getRelatedProducts,
  queryCatalogProducts,
  type Product,
} from "@/lib/supabaseCatalog";

type Props = {
  params: {
    slug: string;
  };
};

type RecommendationTarget = {
  category: string;
  subcategory: string;
};

function formatPrice(price: number) {
  const safePrice = Number.isFinite(Number(price)) ? Number(price) : 0;
  const roundedPrice = safePrice.toFixed(2);
  const [francs, cents] = roundedPrice.split(".");
  return `CHF ${francs.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${cents}`;
}

function normalize(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .trim();
}

function getProductSlug(product: Product) {
  const productData = product as any;
  return String(
    productData.slug ||
      productData.shopifyProductHandle ||
      productData.productHandle ||
      "",
  ).trim();
}

function getMerchandiseId(product: Product) {
  const productData = product as any;
  return productData.merchandiseId || productData.shopifyVariantId || null;
}

function getStockQty(product: Product) {
  const productData = product as any;
  return Number(productData.stockQty ?? productData.stock ?? 0);
}

function getProductImages(product: Product) {
  const images = [
    product.image,
    ...(Array.isArray(product.images) ? product.images : []),
  ]
    .filter((image): image is string => Boolean(image?.trim()))
    .filter((image) => image.startsWith("http"));

  return Array.from(new Set(images));
}

function getVariantText(product: Product) {
  const productData = product as any;
  return `${productData.title || ""} ${productData.description || ""} ${
    productData.description2 || ""
  }`;
}

function getVariantColor(product: Product) {
  const text = getVariantText(product);

  return (
    text.match(
      /\b(Midnight|Mitternacht|Sky Blue|Sierra Blue|Titanium|Natural Titanium|Black Titanium|White Titanium|Blue Titanium|Silber|Silver|Schwarz|Black|Grau|Gray|Grey|Blau|Blue|Weiss|White|Gold|Rose Gold|Rosa|Pink|Rot|Red|Grün|Gruen|Green|Violett|Purple|Starlight|Space Schwarz|Space Black|Space Grau|Space Gray)\b/i,
    )?.[0] || null
  );
}

function getVariantStorage(product: Product) {
  return (
    getVariantText(product).match(
      /\b(64\s?GB|128\s?GB|256\s?GB|512\s?GB|1\s?TB|2\s?TB|4\s?TB)\b/i,
    )?.[0] || null
  );
}

function getVariantRam(product: Product) {
  return (
    getVariantText(product).match(
      /\b(4\s?GB|6\s?GB|8\s?GB|12\s?GB|16\s?GB|24\s?GB|32\s?GB|48\s?GB|64\s?GB|96\s?GB|128\s?GB)\b/i,
    )?.[0] || null
  );
}

function normalizeCapacity(value?: string | null) {
  return value ? value.replace(/(\d+)\s*(GB|TB)/i, "$1 $2") : null;
}

function getVariantLabel(product: Product) {
  const values = [
    getVariantColor(product),
    normalizeCapacity(getVariantStorage(product)),
    normalizeCapacity(getVariantRam(product)),
  ].filter(Boolean);

  return values.length
    ? Array.from(new Set(values)).join(" · ")
    : String(product.title || "Variante");
}

function colorHex(color?: string | null) {
  const key = normalize(color);

  if (key.includes("white") || key.includes("weiss")) return "#f8fafc";
  if (key.includes("silver") || key.includes("silber")) return "#cbd5e1";
  if (key.includes("gray") || key.includes("grey") || key.includes("grau"))
    return "#64748b";
  if (
    key.includes("black") ||
    key.includes("schwarz") ||
    key.includes("midnight")
  )
    return "#111827";
  if (key.includes("blue") || key.includes("blau")) return "#2563eb";
  if (key.includes("green") || key.includes("grun")) return "#16a34a";
  if (key.includes("red") || key.includes("rot")) return "#dc2626";
  if (key.includes("pink") || key.includes("rosa") || key.includes("rose"))
    return "#ec4899";
  if (key.includes("purple") || key.includes("violett")) return "#7c3aed";
  if (key.includes("gold") || key.includes("starlight")) return "#d6b76c";
  if (key.includes("titanium")) return "#8b8178";

  return "#d4d4d8";
}

const COMPLEMENTARY_TARGETS: Record<string, RecommendationTarget[]> = {
  laptops: [
    { category: "Computer", subcategory: "Computer-Zubehör" },
    { category: "Peripherie", subcategory: "Dockingstationen" },
    { category: "Peripherie", subcategory: "Mäuse" },
    { category: "Peripherie", subcategory: "Tastaturen" },
    { category: "Peripherie", subcategory: "Headsets" },
  ],
  smartphones: [
    { category: "Mobile", subcategory: "Mobile Zubehör" },
    { category: "Peripherie", subcategory: "Headsets" },
  ],
  tablets: [
    { category: "Mobile", subcategory: "Mobile Zubehör" },
    { category: "Peripherie", subcategory: "Tastaturen" },
    { category: "Peripherie", subcategory: "Headsets" },
  ],
  monitore: [
    { category: "Peripherie", subcategory: "Kabel & Adapter" },
    { category: "Peripherie", subcategory: "Dockingstationen" },
  ],
  monitors: [
    { category: "Peripherie", subcategory: "Kabel & Adapter" },
    { category: "Peripherie", subcategory: "Dockingstationen" },
  ],
  dockingstationen: [
    { category: "Peripherie", subcategory: "Kabel & Adapter" },
    { category: "Peripherie", subcategory: "Monitore" },
    { category: "Peripherie", subcategory: "Mäuse" },
    { category: "Peripherie", subcategory: "Tastaturen" },
  ],
  webcams: [
    { category: "Peripherie", subcategory: "Headsets" },
    { category: "Peripherie", subcategory: "Kabel & Adapter" },
  ],
  router: [
    { category: "Netzwerk", subcategory: "Kabel & Adapter" },
    { category: "Netzwerk", subcategory: "Switches" },
  ],
  switches: [
    { category: "Netzwerk", subcategory: "Kabel & Adapter" },
    { category: "Netzwerk", subcategory: "Router" },
  ],
  grafikkarten: [
    { category: "PC-Komponenten", subcategory: "Netzteile" },
    { category: "PC-Komponenten", subcategory: "Komponenten" },
  ],
};

function recommendationText(product: Product) {
  return normalize(
    [
      product.brand,
      product.title,
      product.category,
      product.subcategory,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => normalize(value))
        .filter((value) => value.length >= 2),
    ),
  );
}

function extractCompatibilityTokens(product: Product): string[] {
  const text = recommendationText(product);
  const tokens: string[] = [];

  const patterns = [
    /\biphone\s+(?:se(?:\s*\d{4})?|\d{1,2}(?:\s*(?:pro max|pro|plus|mini|max))?)\b/g,
    /\bipad\s+(?:pro|air|mini)?(?:\s+\d{1,2}(?:\.\d)?)?(?:\s+\d{4})?\b/g,

    /\bgalaxy\s+s\d{2}(?:\s*(?:ultra|plus|fe))?\b/g,
    /\bgalaxy\s+a\d{2}\b/g,
    /\bgalaxy\s+z\s*(?:flip|fold)\s*\d*\b/g,
    /\bgalaxy\s+tab\s+[a-z0-9+ -]{1,18}\b/g,

    /\bpixel\s+\d{1,2}(?:\s*(?:pro xl|pro|a|fold))?\b/g,

    /\b(?:redmi|poco|xiaomi)\s+[a-z0-9-]+(?:\s+[a-z0-9-]+){0,2}\b/g,

    /\bthinkpad\s+[a-z0-9-]+\b/g,
    /\bthinkbook\s+[a-z0-9-]+\b/g,
    /\bideapad\s+[a-z0-9-]+\b/g,
    /\byoga\s+[a-z0-9-]+\b/g,

    /\belitebook\s+[a-z0-9-]+\b/g,
    /\bprobook\s+[a-z0-9-]+\b/g,
    /\bzbook\s+[a-z0-9-]+\b/g,

    /\blatitude\s+\d{3,4}\b/g,
    /\bprecision\s+\d{3,4}\b/g,
    /\bxps\s+\d{2}\b/g,

    /\bvivobook\s+[a-z0-9-]+\b/g,
    /\bzenbook\s+[a-z0-9-]+\b/g,

    /\bmacbook\s+(?:air|pro)(?:\s+\d{2})?\b/g,

    /\bsurface\s+(?:laptop|pro|book)\s*\d*\b/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (match[0]) tokens.push(match[0]);
    }
  }

  /*
   * Também guarda códigos de modelo suficientemente específicos.
   * Exemplos: A36, S25, T14, T490S, X1C, IP16P.
   */
  const modelCodes =
    text.match(/\b[a-z]{0,4}\d{2,4}[a-z]{0,4}\b/g) || [];

  for (const code of modelCodes) {
    if (
      code.length >= 3 &&
      !/^(128gb|256gb|512gb|16gb|32gb|64gb|2024|2025|2026|5000mah)$/.test(
        code,
      )
    ) {
      tokens.push(code);
    }
  }

  return uniqueStrings(tokens);
}

function isAppleProduct(product: Product) {
  const text = recommendationText(product);
  return (
    normalize(product.brand) === "apple" ||
    /\biphone\b|\bipad\b|\bmacbook\b/.test(text)
  );
}

function isSamsungProduct(product: Product) {
  const text = recommendationText(product);
  return (
    normalize(product.brand) === "samsung" ||
    /\bsamsung\b|\bgalaxy\b/.test(text)
  );
}

function isAndroidPhoneProduct(product: Product) {
  const text = recommendationText(product);

  return (
    !isAppleProduct(product) &&
    /\bsmartphone\b|\bgalaxy\b|\bpixel\b|\bxiaomi\b|\bredmi\b|\bpoco\b|\bhuawei\b|\bhonor\b|\bmotorola\b|\boneplus\b|\bnothing phone\b/.test(
      text,
    )
  );
}

function hasForeignPhoneFamily(
  product: Product,
  candidateText: string,
): boolean {
  if (isAppleProduct(product)) {
    return /\bgalaxy\b|\bsamsung\b|\bpixel\b|\bxiaomi\b|\bredmi\b|\bpoco\b|\bhuawei\b|\bhonor\b|\bmotorola\b|\boneplus\b/.test(
      candidateText,
    );
  }

  if (isSamsungProduct(product)) {
    return /\biphone\b|\bipad\b|\bpixel\b|\bxiaomi\b|\bredmi\b|\bpoco\b|\bhuawei\b|\bhonor\b|\bmotorola\b|\boneplus\b/.test(
      candidateText,
    );
  }

  if (isAndroidPhoneProduct(product)) {
    return /\biphone\b|\bipad\b/.test(candidateText);
  }

  return false;
}

function isModelSpecificAccessory(text: string) {
  return /\b(case|cover|hülle|huelle|schutzhülle|schutzhulle|folio|glass|glas|schutzglas|schutzfolie|screen protector|privacy|displayfolie|batterie|battery|akku|ersatzakku)\b/.test(
    text,
  );
}

function isUsefulUniversalAccessory(text: string) {
  return /\b(charger|ladegerat|netzteil|usb[\s-]?c|usb|powerbank|power bank|halter|halterung|holder|stand|stander|kfz|auto halter|car holder|docking|dockingstation|dock|hub|adapter|kabel|cable|maus|mouse|tastatur|keyboard|headset|kopfhorer|earbuds|earphones|stylus|eingabestift)\b/.test(text);
}

function isBadGenericRecommendation(text: string) {
  return /\b(plastic cards?|kreditkartengrosse|anti-static project tray|project tray|sortieren von einzelteilen|dust blower|air blower|reinigungsset|reinigungskit|cleaning kit|cleaning set|werkzeug|tool kit|repair kit)\b/.test(
    text,
  );
}

function normalizePlusWords(value: string) {
  return normalize(value)
    .replace(/\+/g, " plus ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDeviceFamilies(text: string): string[] {
  const canonical = normalizePlusWords(text);
  const families: string[] = [];

  const patterns = [
    /\biphone\s+(?:se(?:\s*\d{4})?|\d{1,2})(?:\s+(?:pro max|pro|plus|mini|max))?\b/g,

    /\bipad(?:\s+(?:pro|air|mini))?(?:\s+\d{1,2}(?:\.\d)?)?(?:\s+\d{4})?\b/g,

    /\bgalaxy\s+s\d{2}(?:\s+(?:ultra|plus|fe))?\b/g,
    /\bgalaxy\s+a\d{2}\b/g,
    /\bgalaxy\s+z\s+(?:flip|fold)\s*\d*\b/g,
    /\bgalaxy\s+tab\s+(?:s|a)\d{1,2}(?:\s+(?:ultra|plus|fe))?\b/g,

    /\bpixel\s+\d{1,2}(?:\s+(?:pro xl|pro|a|fold))?\b/g,

    /\bthinkpad\s+[a-z0-9-]+(?:\s+g\d+)?\b/g,
    /\bthinkbook\s+[a-z0-9-]+(?:\s+g\d+)?\b/g,
    /\bideapad\s+[a-z0-9-]+\b/g,

    /\bmacbook\s+(?:air|pro)(?:\s+\d{2})?\b/g,

    /\bsurface\s+(?:laptop|pro)\s*\d*\b/g,
  ];

  for (const pattern of patterns) {
    const matches = canonical.match(pattern) || [];

    for (const match of matches) {
      families.push(
        match.replace(/\s+/g, " ").trim(),
      );
    }
  }

  return uniqueStrings(families);
}

function primaryDeviceFamily(product: Product) {
  return (
    extractDeviceFamilies(
      recommendationText(product),
    )[0] || ""
  );
}

function isPrimaryDeviceCandidate(candidate: Product) {
  const subcategory = normalize(candidate.subcategory);

  return [
    "smartphones",
    "tablets",
    "laptops",
    "desktop-pcs",
    "mini-pcs",
  ].includes(subcategory);
}

function isGamingSpecificAccessory(text: string) {
  return /\b(nintendo|switch(?:\s*2)?|playstation|ps4|ps5|xbox|gamepad|gaming controller|controller fur xbox|controller fuer xbox)\b/.test(
    text,
  );
}

function isAnalogOnlyAudioAccessory(text: string) {
  const analog =
    /\b(3[.,]5\s*mm|3[.,]5mm|klinke|aux)\b/.test(
      text,
    );

  const modern =
    /\b(usb[\s-]?c|bluetooth|wireless|kabellos|tws)\b/.test(
      text,
    );

  return analog && !modern;
}

function isModernIphoneProduct(product: Product) {
  if (!isAppleProduct(product)) {
    return false;
  }

  const text = recommendationText(product);
  const match = text.match(/\biphone\s+(\d{1,2})\b/);

  if (!match) {
    return false;
  }

  return Number(match[1]) >= 15;
}

function candidateMatchesProductFamily(
  product: Product,
  candidateText: string,
) {
  const productFamily = primaryDeviceFamily(product);

  if (!productFamily) {
    return false;
  }

  const candidateFamilies =
    extractDeviceFamilies(candidateText);

  if (candidateFamilies.includes(productFamily)) {
    return true;
  }

  /*
   * Alguns fornecedores escrevem:
   * Galaxy S26+ em vez de Galaxy S26 Plus.
   */
  const canonicalCandidate =
    normalizePlusWords(candidateText);

  const shortFamily =
    productFamily.replace(/^galaxy\s+/, "");

  if (
    productFamily.startsWith("galaxy ") &&
    canonicalCandidate.includes(shortFamily)
  ) {
    return true;
  }

  return false;
}

function modelSearchTerms(product: Product): string[] {
  const family = primaryDeviceFamily(product);

  if (!family) {
    const tokens = extractCompatibilityTokens(product);

    return tokens
      .filter((token) => token.length >= 5)
      .slice(0, 1);
  }

  const terms: string[] = [family];

  if (family.includes(" plus")) {
    terms.push(
      family.replace(/\s+plus\b/, "+"),
    );
  }

  if (family.startsWith("galaxy ")) {
    terms.push(
      family.replace(/^galaxy\s+/, ""),
    );
  }

  return uniqueStrings(terms).slice(0, 3);
}

function stableHash(value: string) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function recommendationScore(product: Product, candidate: Product) {
  const productText = recommendationText(product);
  const candidateText = recommendationText(candidate);

  if (!candidateText) {
    return -10000;
  }

  if (isBadGenericRecommendation(candidateText)) {
    return -10000;
  }

  if (hasForeignPhoneFamily(product, candidateText)) {
    return -10000;
  }

  const productSubcategory =
    normalize(product.subcategory);

  const mobileDevice =
    productSubcategory === "smartphones" ||
    productSubcategory === "tablets";

  /*
   * Nao queremos recomendar outro telefone/tablet/laptop
   * como se fosse um acessorio.
   */
  if (
    (
      productSubcategory === "smartphones" ||
      productSubcategory === "tablets" ||
      productSubcategory === "laptops"
    ) &&
    isPrimaryDeviceCandidate(candidate)
  ) {
    return -10000;
  }

  /*
   * Excluir acessórios claramente destinados a gaming/consolas
   * quando estamos num smartphone/tablet.
   */
  if (
    mobileDevice &&
    isGamingSpecificAccessory(candidateText)
  ) {
    return -10000;
  }

  /*
   * iPhone 15+ usa USB-C.
   * Nao recomendamos auscultadores exclusivamente 3.5 mm.
   */
  if (
    productSubcategory === "smartphones" &&
    isModernIphoneProduct(product) &&
    isAnalogOnlyAudioAccessory(candidateText)
  ) {
    return -10000;
  }

  const tokens =
    extractCompatibilityTokens(product);

  let exactMatches = 0;

  for (const token of tokens) {
    if (candidateText.includes(token)) {
      exactMatches += 1;
    }
  }

  const familyMatch =
    candidateMatchesProductFamily(
      product,
      candidateText,
    );

  const productFamily =
    primaryDeviceFamily(product);

  const candidateFamilies =
    extractDeviceFamilies(candidateText);

  /*
   * Capas, vidros, baterias, folios, etc.
   * têm de mencionar o modelo correto.
   *
   * Exemplo:
   * iPhone 17 != iPhone 17 Pro
   * Galaxy S26+ != Galaxy S26
   */
  if (isModelSpecificAccessory(candidateText)) {
    if (productFamily) {
      if (!familyMatch) {
        return -10000;
      }
    } else if (exactMatches === 0) {
      return -10000;
    }
  }

  /*
   * Se o candidato menciona explicitamente outra família
   * e é um artigo específico de modelo, fica bloqueado.
   */
  if (
    productFamily &&
    candidateFamilies.length > 0 &&
    !familyMatch &&
    isModelSpecificAccessory(candidateText)
  ) {
    return -10000;
  }

  let score = 0;

  /*
   * Prioridade máxima:
   * produto/acessório que menciona o modelo correto.
   */
  if (familyMatch) {
    score += 500;
  } else if (exactMatches > 0) {
    score += 180 + exactMatches * 30;
  }

  const productBrand = normalize(product.brand);

  if (
    productBrand &&
    candidateText.includes(productBrand)
  ) {
    score += 20;
  }

  /*
   * SMARTPHONES
   */
  if (productSubcategory === "smartphones") {
    if (
      isAppleProduct(product) &&
      /\bmagsafe\b/.test(candidateText)
    ) {
      score += 150;
    }

    if (
      /\b(qi2|wireless charger|wireless charging|kabelloses laden)\b/.test(
        candidateText,
      )
    ) {
      score += 110;
    }

    if (
      /\b(usb[\s-]?c|ladegerat|charger|netzteil|powerbank|power bank|kabel|cable)\b/.test(
        candidateText,
      )
    ) {
      score += 100;
    }

    if (
      /\b(halter|halterung|holder|kfz|car holder|auto halter)\b/.test(
        candidateText,
      )
    ) {
      score += 65;
    }

    if (
      /\b(headset|kopfhorer|earbuds|earphones)\b/.test(
        candidateText,
      )
    ) {
      if (
        /\b(usb[\s-]?c|bluetooth|wireless|kabellos|tws)\b/.test(
          candidateText,
        )
      ) {
        score += 80;
      } else {
        score += 15;
      }
    }

    /*
     * Em smartphones só entram recomendações
     * com um sinal de compatibilidade razoavelmente forte.
     */
    if (score < 50) {
      return -10000;
    }
  }

  /*
   * TABLETS
   */
  if (productSubcategory === "tablets") {
    if (
      /\b(usb[\s-]?c|ladegerat|charger|netzteil|powerbank|power bank|kabel|cable)\b/.test(
        candidateText,
      )
    ) {
      score += 90;
    }

    if (
      /\b(tastatur|keyboard|stylus|eingabestift|halter|halterung|holder|stand|stander)\b/.test(
        candidateText,
      )
    ) {
      score += 75;
    }

    if (
      /\b(headset|kopfhorer|earbuds|earphones|bluetooth|wireless|tws)\b/.test(
        candidateText,
      )
    ) {
      score += 55;
    }

    if (score < 50) {
      return -10000;
    }
  }

  /*
   * LAPTOPS
   */
  if (productSubcategory === "laptops") {
    if (
      /\b(dock|docking|dockingstation|maus|mouse|tastatur|keyboard|headset|kopfhorer|hub|usb[\s-]?c|adapter|kabel|cable|stand|stander)\b/.test(
        candidateText,
      )
    ) {
      score += 70;
    }
  }

  /*
   * Outras categorias:
   * cabos, adaptadores, docks, etc. continuam possíveis.
   */
  if (
    !mobileDevice &&
    productSubcategory !== "laptops" &&
    isUsefulUniversalAccessory(candidateText)
  ) {
    score += 40;
  }

  if (score <= 0) {
    return -10000;
  }

  if (
    candidate.inStock ||
    Number(candidate.stockQty || 0) > 0
  ) {
    score += 10;
  }

  /*
   * Pequena variacao deterministica.
   * Nao muda a qualidade da recomendacao,
   * apenas evita empates constantes.
   */
  score +=
    stableHash(
      String(product.sku || product.slug || "") +
        "-" +
        String(candidate.sku || candidate.slug || ""),
    ) % 7;

  return score;
}

type RecommendationBucket =
  | "case"
  | "screen"
  | "charger"
  | "powerbank"
  | "cable"
  | "mount"
  | "audio"
  | "input"
  | "dock"
  | "storage"
  | "other";

type RankedRecommendation = {
  candidate: Product;
  score: number;
};

function recommendationBucket(
  candidate: Product,
): RecommendationBucket {
  const text = recommendationText(candidate);

  /*
   * Capas / protecao exterior.
   */
  if (
    /\b(case|back cover|cover|bumper|folio|schutzhulle|schutz huille|smart cover)\b/.test(
      text,
    )
  ) {
    return "case";
  }

  /*
   * Vidros / peliculas / protecao de ecra.
   */
  if (
    /\b(tempered glass|schutzglas|panzerglas|second glass|displayschutz|screen protector|schutzfolie|displayfolie|privacy glass|privacy filter)\b/.test(
      text,
    )
  ) {
    return "screen";
  }

  /*
   * Powerbanks antes de charger para nao misturar os dois.
   */
  if (
    /\b(powerbank|power bank|akku pack|battery pack)\b/.test(
      text,
    )
  ) {
    return "powerbank";
  }

  /*
   * Carregadores / bases de carregamento.
   */
  if (
    /\b(charger|ladegerat|netzteil|ladestation|charging station|wireless charger|wireless charging|qi2|magsafe charger)\b/.test(
      text,
    )
  ) {
    return "charger";
  }

  /*
   * Cabos.
   */
  if (
    /\b(kabel|cable|ladekabel|charging cable|usb[\s-]?c cable|lightning cable)\b/.test(
      text,
    )
  ) {
    return "cable";
  }

  /*
   * Suportes.
   */
  if (
    /\b(halter|halterung|holder|mount|kfz halter|car holder|phone holder|tablet stand|laptop stand|stander)\b/.test(
      text,
    )
  ) {
    return "mount";
  }

  /*
   * Audio.
   */
  if (
    /\b(headset|kopfhorer|earbuds|earphones|in-ear|tws)\b/.test(
      text,
    )
  ) {
    return "audio";
  }

  /*
   * Teclados, ratos, canetas.
   */
  if (
    /\b(tastatur|keyboard|maus|mouse|stylus|eingabestift|pen)\b/.test(
      text,
    )
  ) {
    return "input";
  }

  /*
   * Docks / hubs.
   */
  if (
    /\b(dockingstation|docking station|dock|usb hub|hub)\b/.test(
      text,
    )
  ) {
    return "dock";
  }

  /*
   * Armazenamento.
   */
  if (
    /\b(ssd|externe ssd|external ssd|speicherkarte|memory card|microsd|micro sd)\b/.test(
      text,
    )
  ) {
    return "storage";
  }

  return "other";
}

function recommendationBucketOrder(
  product: Product,
): RecommendationBucket[] {
  const subcategory = normalize(product.subcategory);

  if (subcategory === "smartphones") {
    return [
      "case",
      "screen",
      "charger",
      "powerbank",
      "cable",
      "mount",
      "audio",
      "other",
    ];
  }

  if (subcategory === "tablets") {
    return [
      "case",
      "screen",
      "input",
      "charger",
      "cable",
      "mount",
      "audio",
      "other",
    ];
  }

  if (subcategory === "laptops") {
    return [
      "dock",
      "input",
      "mount",
      "charger",
      "cable",
      "audio",
      "storage",
      "case",
      "other",
    ];
  }

  return [
    "dock",
    "input",
    "charger",
    "cable",
    "mount",
    "audio",
    "storage",
    "other",
    "case",
    "screen",
    "powerbank",
  ];
}

function recommendationBucketCap(
  product: Product,
  bucket: RecommendationBucket,
) {
  const subcategory = normalize(product.subcategory);

  if (subcategory === "smartphones") {
    const caps: Record<RecommendationBucket, number> = {
      case: 2,
      screen: 2,
      charger: 1,
      powerbank: 1,
      cable: 1,
      mount: 1,
      audio: 1,
      input: 0,
      dock: 1,
      storage: 0,
      other: 1,
    };

    return caps[bucket];
  }

  if (subcategory === "tablets") {
    const caps: Record<RecommendationBucket, number> = {
      case: 2,
      screen: 1,
      charger: 1,
      powerbank: 1,
      cable: 1,
      mount: 1,
      audio: 1,
      input: 2,
      dock: 1,
      storage: 1,
      other: 1,
    };

    return caps[bucket];
  }

  if (subcategory === "laptops") {
    const caps: Record<RecommendationBucket, number> = {
      case: 1,
      screen: 1,
      charger: 1,
      powerbank: 0,
      cable: 1,
      mount: 1,
      audio: 1,
      input: 2,
      dock: 2,
      storage: 1,
      other: 1,
    };

    return caps[bucket];
  }

  return 2;
}

function diversifyRecommendations(
  product: Product,
  ranked: RankedRecommendation[],
  limit: number,
): Product[] {
  if (!ranked.length) {
    return [];
  }

  const wanted =
    Math.max(1, limit);

  const order =
    recommendationBucketOrder(product);

  const selected: RankedRecommendation[] = [];
  const selectedIds = new Set<string>();

  const bucketCounts = new Map<
    RecommendationBucket,
    number
  >();

  function candidateId(candidate: Product) {
    return String(
      candidate.slug ||
        candidate.sku ||
        "",
    );
  }

  function addItem(
    item: RankedRecommendation,
  ) {
    const id = candidateId(item.candidate);

    if (!id || selectedIds.has(id)) {
      return false;
    }

    const bucket =
      recommendationBucket(item.candidate);

    selected.push(item);
    selectedIds.add(id);

    bucketCounts.set(
      bucket,
      (bucketCounts.get(bucket) || 0) + 1,
    );

    return true;
  }

  /*
   * PRIMEIRA PASSAGEM:
   * tentar obter um produto de cada tipo relevante.
   *
   * Assim evitamos:
   * capa, capa, capa, capa, capa...
   */
  for (const bucket of order) {
    if (selected.length >= wanted) {
      break;
    }

    const item = ranked.find((entry) => {
      if (
        selectedIds.has(
          candidateId(entry.candidate),
        )
      ) {
        return false;
      }

      return (
        recommendationBucket(entry.candidate) ===
        bucket
      );
    });

    if (item) {
      addItem(item);
    }
  }

  /*
   * SEGUNDA PASSAGEM:
   * preencher os lugares restantes,
   * mas respeitando limites por tipo.
   *
   * A ordem original de score continua valida.
   */
  for (const item of ranked) {
    if (selected.length >= wanted) {
      break;
    }

    const id = candidateId(item.candidate);

    if (!id || selectedIds.has(id)) {
      continue;
    }

    const bucket =
      recommendationBucket(item.candidate);

    const current =
      bucketCounts.get(bucket) || 0;

    const cap =
      recommendationBucketCap(
        product,
        bucket,
      );

    if (current >= cap) {
      continue;
    }

    addItem(item);
  }

  /*
   * Nao enchemos a grelha artificialmente.
   * Se existirem apenas 5 recomendacoes realmente adequadas
   * e diversificadas, mostramos 5.
   */
  return selected
    .slice(0, wanted)
    .map((item) => item.candidate);
}

async function getComplementaryProducts(
  product: Product,
  limit = 8,
): Promise<Product[]> {
  const key = normalize(
    product.subcategory || product.category,
  );

  const targets =
    COMPLEMENTARY_TARGETS[key] || [];

  if (!targets.length) {
    return getRelatedProducts(product, limit);
  }

  /*
   * V3:
   * primeiro pesquisa especificamente pelo modelo.
   *
   * Exemplos:
   * iphone 17
   * galaxy s26 plus
   * thinkpad p16s
   *
   * Só depois procuramos acessórios genéricos.
   */
  const searchTerms =
    modelSearchTerms(product);

  const modelResults = await Promise.all(
    searchTerms.map(async (term) => {
      try {
        const response =
          await queryCatalogProducts({
            q: term,
            sort: "featured",
            limit: 48,
          });

        return response.products;
      } catch {
        return [] as Product[];
      }
    }),
  );

  const targetResults = await Promise.all(
    targets.map(async (target) => {
      try {
        const response =
          await queryCatalogProducts({
            category: target.category,
            subcategory: target.subcategory,
            sort: "featured",
            limit: 48,
          });

        return response.products;
      } catch {
        return [] as Product[];
      }
    }),
  );

  /*
   * Os resultados específicos do modelo ficam primeiro
   * no pool; depois entram os universais.
   */
  const allCandidates = [
    ...modelResults.flat(),
    ...targetResults.flat(),
  ];

  const seen = new Set<string>();

  const ranked = allCandidates
    .filter((candidate) => {
      const id = String(
        candidate.slug ||
          candidate.sku ||
          "",
      );

      if (!id) {
        return false;
      }

      if (
        candidate.slug === product.slug ||
        candidate.sku === product.sku
      ) {
        return false;
      }

      if (seen.has(id)) {
        return false;
      }

      seen.add(id);

      return true;
    })
    .map((candidate) => ({
      candidate,
      score: recommendationScore(
        product,
        candidate,
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const stockA =
        a.candidate.inStock ||
        Number(a.candidate.stockQty || 0) > 0
          ? 1
          : 0;

      const stockB =
        b.candidate.inStock ||
        Number(b.candidate.stockQty || 0) > 0
          ? 1
          : 0;

      if (stockB !== stockA) {
        return stockB - stockA;
      }

      return (
        Number(a.candidate.price || 0) -
        Number(b.candidate.price || 0)
      );
    });

  /*
   * Importante:
   * se só existirem 3 recomendações realmente boas,
   * mostramos 3.
   *
   * Não enchemos a grelha com lixo.
   */
  return diversifyRecommendations(
    product,
    ranked,
    limit,
  );
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    return notFound();
  }

  const productData = product as any;
  const currentSlug = getProductSlug(product);
  const productImages = getProductImages(product);

  const stockQty = getStockQty(product);
  const inStock = stockQty > 0 || Boolean(product.inStock);
  const price = Number(productData.price || 0);

  const [variantProducts, complementaryProducts] = await Promise.all([
    getProductVariants(product),
    getComplementaryProducts(product, 8),
  ]);

  const variantOptions = variantProducts
    .map((variantProduct) => {
      const slug = getProductSlug(variantProduct);
      const color = getVariantColor(variantProduct);

      return {
        slug,
        href: `/produkte/${slug}`,
        label: getVariantLabel(variantProduct),
        color,
        colorHex: colorHex(color),
        storage: normalizeCapacity(getVariantStorage(variantProduct)),
        ram: normalizeCapacity(getVariantRam(variantProduct)),
        price: formatPrice(Number((variantProduct as any).price || 0)),
        inStock:
          getStockQty(variantProduct) > 0 || Boolean(variantProduct.inStock),
        active: slug === currentSlug,
      };
    })
    .filter((option) => Boolean(option.slug));

  return (
    <main className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-sm text-neutral-500"
          >
            <Link href="/" className="transition hover:text-neutral-950">
              Startseite
            </Link>

            <span>/</span>

            <Link
              href="/produkte"
              className="transition hover:text-neutral-950"
            >
              Produkte
            </Link>

            {product.category ? (
              <>
                <span>/</span>
                <Link
                  href={`/produkte?category=${encodeURIComponent(
                    product.category,
                  )}`}
                  className="transition hover:text-neutral-950"
                >
                  {product.category}
                </Link>
              </>
            ) : null}

            <span>/</span>

            <span className="max-w-[280px] truncate font-semibold text-neutral-800">
              {product.title}
            </span>
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:py-8 lg:py-14">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start lg:gap-10">
          <div className="min-w-0">
            <ProductGallery title={product.title} images={productImages} />

            <div className="mt-6 rounded-[2rem] border border-neutral-200 bg-neutral-50 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-500">
                    Artikelnummer
                  </p>
                  <p className="mt-1 text-sm font-bold text-neutral-950">
                    {productData.internalNumber ||
                      product.sku ||
                      "Nicht angegeben"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-500">
                    EAN
                  </p>
                  <p className="mt-1 break-all text-sm font-bold text-neutral-950">
                    {productData.ean || "Nicht angegeben"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ProductBuyBox
            title={product.title}
            brand={product.brand}
            price={formatPrice(price)}
            stockQty={stockQty}
            inStock={inStock}
            merchandiseId={getMerchandiseId(product)}
            productHandle={
              productData.shopifyProductHandle ||
              productData.productHandle ||
              currentSlug
            }
            imageUrl={product.image ?? null}
            variants={variantOptions}
          />
        </div>
      </section>

      <ProductTrust />

      <ProductSpecs
        brand={product.brand}
        sku={product.sku}
        internalNumber={productData.internalNumber}
        ean={productData.ean}
        stockQty={stockQty}
        deliveryDate={productData.deliveryDate}
        warrantyMonths={productData.warrantyMonths}
        weight={productData.weight}
        category={product.category}
        subcategory={product.subcategory}
        description={product.description}
        description2={product.description2}
      />

            <ProductReviews productSlug={currentSlug} />

      <RelatedCarousel products={complementaryProducts} />
    </main>
  );
}
