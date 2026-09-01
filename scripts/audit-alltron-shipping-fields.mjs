import fs from "fs";
import path from "path";
import iconv from "iconv-lite";
import { XMLParser } from "fast-xml-parser";

const ROOT = process.cwd();
const INPUT = path.join(
  ROOT,
  "integrations",
  "alltron",
  "downloads",
  "ArtikeldatenV2.xml",
);
const OUTPUT = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "alltron-shipping-fields-audit.json",
);

const VALUE_PATTERN =
  /\b(sperrgut|spedition|stückgut|stueckgut|palett(?:e|en)?|fracht|cargo|freight|bulky|oversi[sz]ed|grossgerät|grossgeraet|schwertransport)\b/i;
const KEY_PATTERN =
  /(ship|shipping|freight|delivery|transport|carrier|logistic|versand|liefer|spedition|sperr|fracht|gewicht|weight|dimension|length|width|height|pallet)/i;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
  trimValues: true,
});

function clean(value) {
  return String(value ?? "").trim();
}

function decodeXml(buffer) {
  const header = buffer
    .subarray(0, Math.min(buffer.length, 500))
    .toString("ascii");
  const encoding =
    header.match(/encoding=["']([^"']+)["']/i)?.[1] || "";

  if (/1252|windows-1252/i.test(encoding)) {
    return iconv.decode(buffer, "windows-1252");
  }
  if (/8859-1|latin1/i.test(encoding)) {
    return iconv.decode(buffer, "iso-8859-1");
  }
  return iconv.decode(buffer, "utf8");
}

function findProductArray(node, depth = 0) {
  if (!node || typeof node !== "object" || depth > 8) return null;

  for (const [key, value] of Object.entries(node)) {
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      value.some(
        (item) =>
          item &&
          typeof item === "object" &&
          ("LITM" in item || "part_number" in item),
      )
    ) {
      return { key, items: value };
    }
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === "object") {
      const found = findProductArray(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function identity(product) {
  return {
    litm: clean(product?.LITM),
    sku: clean(product?.part_number?.LITT),
    internalNumber: clean(product?.part_number?.MITM),
    ean: clean(product?.part_number?.EITM),
    title: clean(product?.part_description?.DESC),
  };
}

function inspect(node, currentPath, matches) {
  if (!node || typeof node !== "object") return;

  for (const [key, value] of Object.entries(node)) {
    const nextPath = currentPath ? `${currentPath}.${key}` : key;

    if (value && typeof value === "object") {
      inspect(value, nextPath, matches);
      continue;
    }

    const text = clean(value);
    if (!text) continue;

    const reason = [];
    if (KEY_PATTERN.test(key)) reason.push("field-name");
    if (VALUE_PATTERN.test(text)) reason.push("field-value");

    if (reason.length) {
      matches.push({
        path: nextPath,
        value: text.slice(0, 500),
        reason,
      });
    }
  }
}

if (!fs.existsSync(INPUT)) {
  throw new Error(`Missing input file: ${INPUT}`);
}

console.log("Reading:", INPUT);
const xml = decodeXml(fs.readFileSync(INPUT));
const data = parser.parse(xml);
const found = findProductArray(data);

if (!found) {
  throw new Error("Could not locate the Alltron product array in the XML.");
}

const fieldSummary = new Map();
const positiveProducts = [];
let productsWithCandidateFields = 0;

for (const product of found.items) {
  const matches = [];
  inspect(product, "", matches);
  if (!matches.length) continue;

  productsWithCandidateFields += 1;
  let hasExplicitShippingValue = false;

  for (const match of matches) {
    const summaryKey = `${match.path}\u0000${match.value}`;
    const previous = fieldSummary.get(summaryKey) || {
      path: match.path,
      value: match.value,
      reason: match.reason,
      count: 0,
      sampleProducts: [],
    };
    previous.count += 1;
    if (previous.sampleProducts.length < 5) {
      previous.sampleProducts.push(identity(product));
    }
    fieldSummary.set(summaryKey, previous);

    if (match.reason.includes("field-value")) {
      hasExplicitShippingValue = true;
    }
  }

  if (hasExplicitShippingValue && positiveProducts.length < 100) {
    positiveProducts.push({
      ...identity(product),
      matches: matches.filter((item) =>
        item.reason.includes("field-value"),
      ),
    });
  }
}

const candidateFields = [...fieldSummary.values()].sort(
  (a, b) => b.count - a.count || a.path.localeCompare(b.path),
);

const report = {
  generatedAt: new Date().toISOString(),
  input: path.relative(ROOT, INPUT),
  productArrayKey: found.key,
  totalProducts: found.items.length,
  productsWithCandidateFields,
  productsWithExplicitShippingTerms: positiveProducts.length,
  note:
    "The explicit-products list is capped at 100 samples. Review candidateFields to identify the authoritative Alltron shipping field.",
  searchedTerms: VALUE_PATTERN.source,
  candidateFields,
  explicitProductSamples: positiveProducts,
  shopifyChanges: "NONE",
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2), "utf8");

console.log("");
console.log("Total products:", report.totalProducts);
console.log(
  "Products with candidate fields:",
  report.productsWithCandidateFields,
);
console.log(
  "Explicit Sperrgut/Spedition samples:",
  report.productsWithExplicitShippingTerms,
);
console.log("Candidate field/value pairs:", report.candidateFields.length);
console.log("Report:", OUTPUT);
console.log("Shopify changes: NONE");
