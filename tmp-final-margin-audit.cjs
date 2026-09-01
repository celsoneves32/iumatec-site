const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const MASTER = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-catalog.json"
);

const BUILD = path.join(
  ROOT,
  "scripts",
  "build-master-catalog.mjs"
);

// ============================================================
// PARÂMETROS FINANCEIROS IUMATEC
// ============================================================

const VAT = 0.081;

const PAYMENT_RATE = 0.0315;
const PAYMENT_FIXED = 0.35;

const SUPPLIER_SHIPPING_GROSS = 5.90;
const CUSTOMER_SHIPPING_GROSS = 9.90;
const FREE_SHIPPING_FROM = 49.00;

const MIN_MARGIN = 0.10;
const TARGET_MARGIN = 0.15;
const MIN_PROFIT = 2.00;

function n(value) {
  const x = Number(
    String(value ?? "")
      .replace(",", ".")
      .trim()
  );

  return Number.isFinite(x) ? x : 0;
}

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundUp05(value) {
  return Math.ceil((value - 1e-9) * 20) / 20;
}

function customerShipping(price) {
  return price < FREE_SHIPPING_FROM
    ? CUSTOMER_SHIPPING_GROSS
    : 0;
}

function purchaseNet(product) {

  const expr = n(product.expr);
  const inpr = n(product.inpr);

  if (expr > 0) {
    return {
      value: expr,
      source: "EXPR"
    };
  }

  if (inpr > 0) {
    return {
      value: inpr / (1 + VAT),
      source: "INPR_NET_FALLBACK"
    };
  }

  return {
    value: 0,
    source: "MISSING"
  };
}

function financials(price, costNet) {

  const shippingGross =
    customerShipping(price);

  const grossCollected =
    price + shippingGross;

  const revenueNet =
    grossCollected / (1 + VAT);

  const supplierShippingNet =
    SUPPLIER_SHIPPING_GROSS /
    (1 + VAT);

  const paymentFee =
    grossCollected * PAYMENT_RATE +
    PAYMENT_FIXED;

  const profit =
    revenueNet -
    costNet -
    supplierShippingNet -
    paymentFee;

  const margin =
    revenueNet > 0
      ? profit / revenueNet
      : -Infinity;

  return {
    shippingGross,
    grossCollected,
    revenueNet,
    supplierShippingNet,
    paymentFee,
    profit,
    margin
  };
}

// ============================================================
// ENCONTRAR PREÇO MÍNIMO POR PROCURA DE CHF 0.05
// Isto evita problemas com a passagem dos portes grátis CHF 49.
// ============================================================

function minimumSafePrice(costNet, marginTarget) {

  if (!(costNet > 0)) {
    return null;
  }

  // limite superior inicial
  let high =
    Math.max(
      10,
      costNet * 1.5
    );

  function passes(price) {

    const f =
      financials(price, costNet);

    return (
      f.profit >= MIN_PROFIT &&
      f.margin >= marginTarget
    );
  }

  while (!passes(high)) {

    high *= 1.5;

    if (high > 1000000) {
      throw new Error(
        `Nao foi possivel resolver preco minimo para custo ${costNet}`
      );
    }
  }

  // Procurar diretamente em incrementos de CHF 0.05
  let low = 0;

  for (let i = 0; i < 80; i++) {

    const mid =
      (low + high) / 2;

    if (passes(mid)) {
      high = mid;
    }
    else {
      low = mid;
    }
  }

  let result =
    roundUp05(high);

  // proteção final contra arredondamento
  while (!passes(result)) {
    result =
      money(result + 0.05);
  }

  return money(result);
}

// ============================================================
// INÍCIO
// ============================================================

console.log("");
console.log("================================================");
console.log(" VERIFICACAO FINAL FORMULA / MARGEM IUMATEC");
console.log("================================================");
console.log("");
console.log("MODO: READ ONLY");
console.log("SHOPIFY: NAO ALTERADA");
console.log("SUPABASE: NAO ALTERADO");
console.log("");

if (!fs.existsSync(MASTER)) {
  throw new Error(
    "iumatec-master-catalog.json nao encontrado."
  );
}

console.log("===== FORMULA =====");
console.log(`IVA                         : ${(VAT * 100).toFixed(1)}%`);
console.log(`Pagamento                   : ${(PAYMENT_RATE * 100).toFixed(2)}% + CHF ${PAYMENT_FIXED.toFixed(2)}`);
console.log(`Transporte fornecedor bruto : CHF ${SUPPLIER_SHIPPING_GROSS.toFixed(2)}`);
console.log(`Portes cliente < CHF 49     : CHF ${CUSTOMER_SHIPPING_GROSS.toFixed(2)}`);
console.log(`Portes gratis desde         : CHF ${FREE_SHIPPING_FROM.toFixed(2)}`);
console.log(`Margem minima               : ${(MIN_MARGIN * 100).toFixed(0)}%`);
console.log(`Margem objetivo             : ${(TARGET_MARGIN * 100).toFixed(0)}%`);
console.log(`Lucro minimo                : CHF ${MIN_PROFIT.toFixed(2)}`);
console.log("Custo                       : EXPR net / INPR fallback");
console.log("");

// ============================================================
// MOSTRAR IMPLEMENTAÇÃO ATUAL DO BUILD
// ============================================================

if (fs.existsSync(BUILD)) {

  console.log("===== FORMULA EXISTENTE NO BUILD =====");

  const lines =
    fs.readFileSync(BUILD, "utf8")
      .split(/\r?\n/);

  const re =
    /(margin|vat|mwst|payment|shipping|minimumsafe|priceRule|expr|inpr|purchaseCost|free.shipping|0\.0315|0\.081|5\.9|9\.9)/i;

  const matches =
    lines
      .map((line, index) => ({
        line: index + 1,
        text: line.trim()
      }))
      .filter(x =>
        re.test(x.text)
      );

  matches
    .slice(0, 120)
    .forEach(x => {
      console.log(
        `${String(x.line).padStart(4)} | ${x.text}`
      );
    });

  console.log("");
}

// ============================================================
// CARREGAR MASTER
// ============================================================

console.log("A carregar master...");

const raw =
  fs.readFileSync(MASTER, "utf8")
    .replace(/^\uFEFF/, "");

const products =
  JSON.parse(raw);

if (!Array.isArray(products)) {
  throw new Error(
    "Master nao e um array."
  );
}

console.log(
  `Master carregado: ${products.length} produtos`
);

console.log("");

// ============================================================
// AUDITORIA
// ============================================================

let stockPositive = 0;
let validPrice = 0;
let withCost = 0;
let exprCost = 0;
let inprFallback = 0;
let missingCost = 0;

let losses = 0;
let belowMinProfit = 0;
let below10 = 0;
let between10and15 = 0;
let atLeast15 = 0;

let belowCalculatedSafe = 0;

const review = [];
const missing = [];

for (const p of products) {

  const stock =
    n(p.stockQty ?? p.stock);

  if (stock <= 0) {
    continue;
  }

  stockPositive++;

  const price =
    n(p.price);

  if (!(price > 0)) {
    continue;
  }

  validPrice++;

  const cost =
    purchaseNet(p);

  if (!(cost.value > 0)) {

    missingCost++;

    missing.push({
      litm: p.litm,
      sku: p.sku,
      title: p.title,
      price,
      stock
    });

    continue;
  }

  withCost++;

  if (cost.source === "EXPR") {
    exprCost++;
  }
  else {
    inprFallback++;
  }

  const f =
    financials(
      price,
      cost.value
    );

  const min10 =
    minimumSafePrice(
      cost.value,
      MIN_MARGIN
    );

  const min15 =
    minimumSafePrice(
      cost.value,
      TARGET_MARGIN
    );

  if (f.profit < 0) {
    losses++;
  }

  if (f.profit < MIN_PROFIT) {
    belowMinProfit++;
  }

  if (f.margin < MIN_MARGIN) {
    below10++;
  }
  else if (f.margin < TARGET_MARGIN) {
    between10and15++;
  }
  else {
    atLeast15++;
  }

  if (
    min10 !== null &&
    price + 0.001 < min10
  ) {
    belowCalculatedSafe++;
  }

  if (
    f.margin < MIN_MARGIN ||
    f.profit < MIN_PROFIT
  ) {

    review.push({
      litm: p.litm,
      sku: p.sku,
      stock,
      price: money(price),
      ecpr: money(n(p.ecpr)),
      expr: money(n(p.expr)),
      inpr: money(n(p.inpr)),
      costSource: cost.source,
      costNet: money(cost.value),
      profit: money(f.profit),
      marginPct: money(f.margin * 100),
      min10,
      min15,
      increaseTo10:
        money(
          Math.max(
            0,
            min10 - price
          )
        )
    });
  }
}

// ============================================================
// RESULTADO
// ============================================================

review.sort(
  (a, b) =>
    a.profit - b.profit
);

console.log("================================================");
console.log(" RESULTADO FINANCEIRO ATUAL");
console.log("================================================");

console.log(`Master total                : ${products.length}`);
console.log(`Com stock > 0               : ${stockPositive}`);
console.log(`Com preco > 0               : ${validPrice}`);
console.log(`Com custo valido            : ${withCost}`);
console.log(`Custo via EXPR              : ${exprCost}`);
console.log(`Fallback via INPR           : ${inprFallback}`);
console.log(`Sem custo                   : ${missingCost}`);
console.log("");

console.log(`Com PREJUIZO                : ${losses}`);
console.log(`Lucro abaixo de CHF 2       : ${belowMinProfit}`);
console.log(`Margem abaixo de 10%        : ${below10}`);
console.log(`Margem 10% ate <15%         : ${between10and15}`);
console.log(`Margem >=15%                : ${atLeast15}`);
console.log(`Preco abaixo minimo seguro  : ${belowCalculatedSafe}`);

console.log("");

console.log("===== 20 PIORES PRODUTOS COM STOCK =====");

console.table(
  review
    .slice(0, 20)
);

if (missing.length > 0) {

  console.log("");
  console.log("===== SEM CUSTO =====");

  console.table(
    missing.slice(0, 20)
  );
}

console.log("");
console.log("================================================");

if (
  losses === 0 &&
  belowMinProfit === 0 &&
  below10 === 0 &&
  missingCost === 0
) {

  console.log(
    " FORMULA / MARGEM: 100% OK"
  );

  console.log(
    " Nenhum produto vendavel abaixo de 10%."
  );

}
else {

  console.log(
    " EXISTEM PRODUTOS A CORRIGIR"
  );

  console.log(
    ` Candidatos para correcao: ${review.length}`
  );
}

console.log("================================================");
console.log("");
console.log("NADA FOI ALTERADO.");
console.log("NAO FOI FEITO APPLY.");
console.log("");

