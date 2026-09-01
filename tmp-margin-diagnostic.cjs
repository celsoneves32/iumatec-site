const fs = require("fs");

const FILE =
  "./integrations/alltron/out/iumatec-master-catalog.json";

const VAT = 0.081;
const PAYMENT_RATE = 0.0315;
const PAYMENT_FIXED = 0.35;
const SUPPLIER_SHIPPING_GROSS = 5.90;
const CUSTOMER_SHIPPING_GROSS = 9.90;
const FREE_SHIPPING_FROM = 49;

function n(v) {
  const x = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(x) ? x : 0;
}

function getCost(p) {
  const expr = n(p.expr);
  const inpr = n(p.inpr);

  if (expr > 0) return expr;
  if (inpr > 0) return inpr / (1 + VAT);

  return 0;
}

function calc(price, cost) {
  const customerShipping =
    price < FREE_SHIPPING_FROM
      ? CUSTOMER_SHIPPING_GROSS
      : 0;

  const gross = price + customerShipping;
  const netRevenue = gross / (1 + VAT);

  const supplierShipping =
    SUPPLIER_SHIPPING_GROSS / (1 + VAT);

  const payment =
    gross * PAYMENT_RATE + PAYMENT_FIXED;

  const profit =
    netRevenue -
    cost -
    supplierShipping -
    payment;

  const margin =
    netRevenue > 0
      ? profit / netRevenue
      : 0;

  return { profit, margin };
}

const data =
  JSON.parse(
    fs.readFileSync(FILE, "utf8")
      .replace(/^\uFEFF/, "")
  );

const stats = {
  sellable: 0,

  loss: 0,
  margin0to5: 0,
  margin5to10: 0,
  margin10to15: 0,
  margin15plus: 0,

  under49: 0,
  under49bad: 0,

  from49to60: 0,
  from49to60bad: 0,

  from60to100: 0,
  from60to100bad: 0,

  over100: 0,
  over100bad: 0
};

for (const p of data) {

  const stock = n(p.stockQty ?? p.stock);
  const price = n(p.price);
  const cost = getCost(p);

  if (
    stock <= 0 ||
    price <= 0 ||
    cost <= 0
  ) continue;

  stats.sellable++;

  const f = calc(price, cost);
  const m = f.margin * 100;

  if (f.profit < 0) {
    stats.loss++;
  }

  if (m < 5) {
    stats.margin0to5++;
  }
  else if (m < 10) {
    stats.margin5to10++;
  }
  else if (m < 15) {
    stats.margin10to15++;
  }
  else {
    stats.margin15plus++;
  }

  const bad =
    m < 10 ||
    f.profit < 2;

  if (price < 49) {

    stats.under49++;

    if (bad)
      stats.under49bad++;

  }
  else if (price < 60) {

    stats.from49to60++;

    if (bad)
      stats.from49to60bad++;

  }
  else if (price < 100) {

    stats.from60to100++;

    if (bad)
      stats.from60to100bad++;

  }
  else {

    stats.over100++;

    if (bad)
      stats.over100bad++;

  }
}

console.log("");
console.log("==========================================");
console.log(" DIAGNOSTICO FINAL DE MARGEM");
console.log("==========================================");
console.log("");

console.log("Produtos analisados       :", stats.sellable);
console.log("");
console.log("Com prejuizo              :", stats.loss);
console.log("Margem < 5%               :", stats.margin0to5);
console.log("Margem 5% a <10%          :", stats.margin5to10);
console.log("Margem 10% a <15%         :", stats.margin10to15);
console.log("Margem >=15%              :", stats.margin15plus);

console.log("");
console.log("===== POR FAIXA DE PRECO =====");

console.log(
  "< CHF 49       :",
  stats.under49,
  "| a corrigir:",
  stats.under49bad
);

console.log(
  "CHF 49 - 59.99 :",
  stats.from49to60,
  "| a corrigir:",
  stats.from49to60bad
);

console.log(
  "CHF 60 - 99.99 :",
  stats.from60to100,
  "| a corrigir:",
  stats.from60to100bad
);

console.log(
  ">= CHF 100     :",
  stats.over100,
  "| a corrigir:",
  stats.over100bad
);

console.log("");
console.log("NADA FOI ALTERADO.");
console.log("");

