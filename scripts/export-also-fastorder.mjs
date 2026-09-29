import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function text(value) {
  return String(value ?? "").trim();
}

function integer(value) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? Math.max(0, Math.trunc(parsed))
    : 0;
}

function argValue(name) {
  const prefix = `${name}=`;

  const found =
    process.argv
      .slice(2)
      .find((arg) =>
        arg.startsWith(prefix),
      );

  return found
    ? found.slice(prefix.length).trim()
    : "";
}

const INPUT_FILE =
  path.resolve(
    ROOT,
    argValue("--input") ||
      path.join(
        "integrations",
        "orders",
        "out",
        "also-fastorder-source.json",
      ),
  );

const OUTPUT_DIRECTORY =
  path.resolve(
    ROOT,
    argValue("--output-dir") ||
      path.join(
        "integrations",
        "orders",
        "out",
        "also-fastorder",
      ),
  );

if (!fs.existsSync(INPUT_FILE)) {
  throw new Error(
    `Input file not found: ${INPUT_FILE}`,
  );
}

const sourceRaw =
  fs.readFileSync(
    INPUT_FILE,
    "utf8",
  ).replace(/^\uFEFF/, "");

const source =
  JSON.parse(sourceRaw);

function collectOrders(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    Array.isArray(value?.executionOrders)
  ) {
    return value.executionOrders;
  }

  if (
    Array.isArray(value?.orders)
  ) {
    return value.orders;
  }

  return [value];
}

const candidates =
  collectOrders(source);

const rows = [];
const exportedOrders = [];
const errors = [];

for (
  const candidate of candidates
) {
  const adapter =
    candidate?.supplierAdapter ||
    candidate;

  const supplier =
    text(
      adapter?.supplier ||
      candidate?.supplier,
    ).toLowerCase();

  if (supplier !== "also") {
    continue;
  }

  const status =
    text(
      adapter?.status ||
      candidate?.executionStatus ||
      candidate?.status,
    );

  if (
    status !==
    "READY_FOR_ALSO_DRY_RUN"
  ) {
    errors.push(
      `${
        text(
          adapter?.purchaseOrderRef ||
          candidate?.purchaseOrderRef,
        ) || "unknown-order"
      }:invalid-status:${status || "none"}`,
    );

    continue;
  }

  const items =
    Array.isArray(adapter?.items)
      ? adapter.items
      : [];

  const orderRows = [];

  for (const item of items) {
    const lineNumber =
      item?.lineNumber ?? "?";

    const ean =
      text(item?.ean);

    const quantity =
      integer(item?.quantity);

    /*
     * Enquanto não existir um catálogo/feed
     * oficial ALSO na IUMATEC, usamos EAN.
     *
     * Não usamos LITM:
     * LITM pertence à Alltron.
     */
    if (!ean) {
      errors.push(
        `${
          text(
            adapter?.purchaseOrderRef,
          ) || "unknown-order"
        }:item-${lineNumber}:missing-ean`,
      );

      continue;
    }

    if (quantity <= 0) {
      errors.push(
        `${
          text(
            adapter?.purchaseOrderRef,
          ) || "unknown-order"
        }:item-${lineNumber}:invalid-quantity`,
      );

      continue;
    }

    orderRows.push({
      ean,
      quantity,
    });
  }

  if (!orderRows.length) {
    continue;
  }

  rows.push(...orderRows);

  exportedOrders.push({
    purchaseOrderRef:
      text(
        adapter?.purchaseOrderRef,
      ),

    itemCount:
      orderRows.length,

    unitCount:
      orderRows.reduce(
        (sum, row) =>
          sum + row.quantity,
        0,
      ),
  });
}

if (errors.length) {
  throw new Error(
    `ALSO FastOrder export blocked:\n${errors.join(
      "\n",
    )}`,
  );
}

if (!rows.length) {
  throw new Error(
    "No READY_FOR_ALSO_DRY_RUN orders with valid EANs found.",
  );
}

fs.mkdirSync(
  OUTPUT_DIRECTORY,
  { recursive: true },
);

/*
 * CSV:
 * coluna 1 = EAN
 * coluna 2 = Menge
 * sem cabeçalho
 */
const csv =
  rows
    .map(
      (row) =>
        `${row.ean};${row.quantity}`,
    )
    .join("\r\n") +
  "\r\n";

/*
 * TXT para Copy/Paste:
 * EAN <TAB> Menge
 */
const copyPaste =
  rows
    .map(
      (row) =>
        `${row.ean}\t${row.quantity}`,
    )
    .join("\r\n") +
  "\r\n";

const csvFile =
  path.join(
    OUTPUT_DIRECTORY,
    "also-fastorder.csv",
  );

const txtFile =
  path.join(
    OUTPUT_DIRECTORY,
    "also-fastorder-copy-paste.txt",
  );

const reportFile =
  path.join(
    OUTPUT_DIRECTORY,
    "also-fastorder-report.json",
  );

fs.writeFileSync(
  csvFile,
  csv,
  "utf8",
);

fs.writeFileSync(
  txtFile,
  copyPaste,
  "utf8",
);

fs.writeFileSync(
  reportFile,
  JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt:
        new Date().toISOString(),

      mode:
        "MANUAL_ALSO_FASTORDER_EXPORT",

      identifier:
        "EAN",

      safety: {
        supplierSubmission: false,
        networkCalls: false,
        browserAutomation: false,
        paymentActions: false,
      },

      orders:
        exportedOrders,

      rowCount:
        rows.length,

      files: {
        csv: csvFile,
        copyPaste: txtFile,
      },
    },
    null,
    2,
  ),
  "utf8",
);

console.log(
  "========== ALSO FASTORDER ==========",
);

console.log(
  `Orders: ${exportedOrders.length}`,
);

console.log(
  `Rows: ${rows.length}`,
);

console.log(
  `CSV: ${csvFile}`,
);

console.log(
  `Copy/Paste: ${txtFile}`,
);

console.log(
  "Supplier submission: DISABLED",
);
