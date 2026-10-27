import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const RAW_DIR = path.join(
  ROOT,
  "integrations",
  "also",
  "raw",
  "pricelist-current",
);

const OUT_DIR = path.join(
  ROOT,
  "integrations",
  "also",
  "out",
);

const OUT_FILE = path.join(
  OUT_DIR,
  "also-purchase-snapshot.json",
);

function findPricelist() {
  if (process.env.ALSO_PRICELIST_FILE) {
    return path.resolve(process.env.ALSO_PRICELIST_FILE);
  }

  if (!fs.existsSync(RAW_DIR)) {
    throw new Error(
      `Diretorio ALSO nao encontrado: ${RAW_DIR}`,
    );
  }

  const files = fs
    .readdirSync(RAW_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".txt"),
    )
    .map((entry) =>
      path.join(RAW_DIR, entry.name),
    );

  if (files.length !== 1) {
    throw new Error(
      `Esperava exatamente 1 TXT em ${RAW_DIR}; encontrei ${files.length}.`,
    );
  }

  return files[0];
}

function clean(value) {
  return String(value ?? "").trim();
}

function parseStock(value) {
  const parsed = Number.parseInt(clean(value), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseMoney(value) {
  const parsed = Number(clean(value));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

const inputFile = findPricelist();
const stat = fs.statSync(inputFile);

fs.mkdirSync(OUT_DIR, {
  recursive: true,
});

const byProductId = {};
const duplicateProductIds = [];
const missingMpnProductIds = [];

let totalLines = 0;
let indexed = 0;
let available = 0;
let unavailable = 0;
let invalidRows = 0;
let missingMpn = 0;

const stream = fs.createReadStream(
  inputFile,
  {
    encoding: "utf8",
  },
);

const rl = readline.createInterface({
  input: stream,
  crlfDelay: Infinity,
});

for await (const rawLine of rl) {
  const line = rawLine.replace(/^\uFEFF/, "");

  if (!line.trim()) {
    continue;
  }

  totalLines++;

  const columns = line.split("\t");

  if (columns.length !== 4) {
    invalidRows++;
    continue;
  }

  const productId = clean(columns[0]);
  const manufacturerPartNumber =
    clean(columns[1]);

  const stock = parseStock(columns[2]);
  const costNet = parseMoney(columns[3]);

  if (
    !productId ||
    stock === null ||
    costNet === null
  ) {
    invalidRows++;
    continue;
  }

  if (byProductId[productId]) {
    duplicateProductIds.push(productId);
    continue;
  }

  if (!manufacturerPartNumber) {
    missingMpn++;
    missingMpnProductIds.push(productId);
  }

  const isAvailable =
    stock > 0 &&
    costNet > 0;

  if (isAvailable) {
    available++;
  } else {
    unavailable++;
  }

  byProductId[productId] = {
    productId,
    manufacturerPartNumber:
      manufacturerPartNumber || null,
    stock,
    costNet,
    available: isAvailable,
  };

  indexed++;
}

const snapshot = {
  schemaVersion: 1,

  generatedAt:
    new Date().toISOString(),

  supplier: "also",

  source: {
    file: path.relative(ROOT, inputFile),
    size: stat.size,
    mtimeMs: stat.mtimeMs,
  },

  summary: {
    totalLines,
    indexed,
    available,
    unavailable,
    invalidRows,
    missingMpn,
    duplicateProductIds:
      duplicateProductIds.length,
  },

  missingMpnProductIds,
  duplicateProductIds,

  byProductId,
};

fs.writeFileSync(
  OUT_FILE,
  `${JSON.stringify(snapshot, null, 2)}\n`,
  "utf8",
);

console.log(
  "\n========== ALSO PURCHASE SNAPSHOT ==========",
);

console.log(
  `Source: ${path.relative(ROOT, inputFile)}`,
);

console.log(
  `Total lines: ${totalLines}`,
);

console.log(
  `Indexed: ${indexed}`,
);

console.log(
  `Available: ${available}`,
);

console.log(
  `Unavailable: ${unavailable}`,
);

console.log(
  `Invalid rows: ${invalidRows}`,
);

console.log(
  `Missing MPN: ${missingMpn}`,
);

console.log(
  `Duplicate ProductID: ${duplicateProductIds.length}`,
);

console.log(
  `Output: ${path.relative(ROOT, OUT_FILE)}`,
);

console.log(
  "============================================\n",
);
