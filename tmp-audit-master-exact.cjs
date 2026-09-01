const fs = require("fs");
const path = require("path");

const FILE = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-master-catalog.json"
);

const MIN_MARGIN = 0.10;
const MIN_PROFIT = 2.00;

const PAYMENT_RATE = 0.02;
const PAYMENT_FIXED = 0.30;

const FREE_SHIPPING_FROM = 49;
const SHIPPING_RESERVE = 5.90;

function n(v) {
  const x = Number(
    String(v ?? "")
      .trim()
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  return Number.isFinite(x) ? x : 0;
}

function vatRate(p) {
  let v = n(p.vat);

  if (!(v > 0)) {
    return 0.081;
  }

  if (v > 1) {
    v = v / 100;
  }

  return v;
}

console.log("");
console.log("==============================================");
console.log(" AUDITORIA EXATA DA FORMULA DO MASTER");
console.log("==============================================");
console.log("");
console.log("READ ONLY - NADA SERA ALTERADO");
console.log("");

const master = JSON.parse(
  fs.readFileSync(FILE, "utf8")
    .replace(/^\uFEFF/, "")
);

let analisados = 0;
let perdas = 0;
let abaixoMargem = 0;
let abaixoLucro = 0;
let problemas = 0;

let piorMargem = Infinity;

const worst = [];

for (const p of master) {

  const price = n(p.price);
  const costNet = n(p.expr);
  const stock = n(
    p.stock ??
    p.stockQty ??
    p.stock_qty
  );

  if (
    !(price > 0) ||
    !(costNet > 0) ||
    !(stock > 0)
  ) {
    continue;
  }

  analisados++;

  const vat = vatRate(p);

  const shipping =
    price >= FREE_SHIPPING_FROM
      ? SHIPPING_RESERVE
      : 0;

  const revenueNet =
    price / (1 + vat);

  const payment =
    price * PAYMENT_RATE +
    PAYMENT_FIXED;

  const profit =
    revenueNet -
    costNet -
    shipping -
    payment;

  const margin =
    revenueNet > 0
      ? profit / revenueNet
      : 0;

  const marginPct =
    margin * 100;

  if (profit < 0) {
    perdas++;
  }

  if (margin < MIN_MARGIN - 0.000001) {
    abaixoMargem++;
  }

  if (profit < MIN_PROFIT - 0.000001) {
    abaixoLucro++;
  }

  if (
    margin < MIN_MARGIN - 0.000001 ||
    profit < MIN_PROFIT - 0.000001
  ) {

    problemas++;

    worst.push({
      litm:
        p.litm ??
        "",

      sku:
        p.sku ??
        p.alltronSku ??
        "",

      stock,

      price:
        Number(price.toFixed(2)),

      expr:
        Number(costNet.toFixed(2)),

      shipping:
        Number(shipping.toFixed(2)),

      profit:
        Number(profit.toFixed(2)),

      marginPct:
        Number(marginPct.toFixed(4))
    });
  }

  if (marginPct < piorMargem) {
    piorMargem = marginPct;
  }
}

worst.sort(
  (a, b) =>
    a.marginPct -
    b.marginPct
);

console.log("Produtos no master :", master.length);
console.log("Vendaveis analisados:", analisados);
console.log("");

console.log("Com prejuizo        :", perdas);
console.log("Margem < 10%        :", abaixoMargem);
console.log("Lucro < CHF 2       :", abaixoLucro);
console.log("Total com problema  :", problemas);

console.log("");
console.log(
  "Pior margem encontrada:",
  Number(piorMargem.toFixed(4)),
  "%"
);

if (worst.length) {
  console.log("");
  console.log("===== PIORES =====");
  console.table(
    worst.slice(0, 20)
  );
}

console.log("");
console.log("==============================================");

if (
  perdas === 0 &&
  abaixoMargem === 0 &&
  abaixoLucro === 0
) {

  console.log(" FORMULA / MARGEM: 100% OK");
  console.log("==============================================");
  console.log("");
  console.log("Todos os produtos vendaveis respeitam:");
  console.log("- margem liquida >= 10%");
  console.log("- lucro liquido >= CHF 2.00");
  console.log("- pagamento 2% + CHF 0.30");
  console.log("- reserva transporte CHF 5.90 acima de CHF 49");
}
else {
  console.log(" EXISTEM CASOS A INVESTIGAR");
  console.log("==============================================");
}

console.log("");
console.log("NADA FOI ALTERADO.");
console.log("");
