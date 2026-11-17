// IUMATEC - live risk reconciliation (READ ONLY; no Shopify/Supabase mutations).
// Requires a recent alltron-profit-audit/latest.json and products-to-review.csv.
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
import { isFinancialRiskHold } from "./iumatec-financial-risk-guard.mjs";

dotenv.config({ path: ".env.local" });
dotenv.config();

const root = process.cwd();
const auditDir = path.join(root, "integrations", "alltron", "out", "alltron-profit-audit");
const outDir = path.join(root, "integrations", "alltron", "out", "financial-risk-audit");
const audit = JSON.parse(fs.readFileSync(path.join(auditDir, "latest.json"), "utf8"));
const rows = parse(fs.readFileSync(path.join(auditDir, "products-to-review.csv"), "utf8"), {
  columns: true, delimiter: ";", bom: true, skip_empty_lines: true,
});

const domain = String(process.env.SHOPIFY_STORE_DOMAIN || "").trim();
const token = String(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "").trim();
const supabaseUrl = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const apiVersion = String(process.env.IUMATEC_SHOPIFY_STOCK_API_VERSION || process.env.SHOPIFY_ADMIN_API_VERSION || "2026-10");
const stop = (m) => { throw new Error("IUMATEC AUDITORIA PARADA: " + m); };
const money = (x) => { const n = Number(x); return Number.isFinite(n) ? n : null; };

if (process.argv.includes("--apply")) stop("Esta ferramenta e somente leitura.");
if (!domain || !token || !supabaseUrl || !supabaseKey) stop("Credenciais locais em falta. Nao as envies pelo chat.");
if (audit.mode !== "READ_ONLY_CURRENT_MARGIN_AUDIT" ||
    audit.safetyReady !== true || audit.externalWrites !== 0 ||
    audit.assumptions?.primaryScenario !== "vatRegistered" ||
    Number(audit.assumptions?.freeShippingFromGross) !== 99 ||
    Number(audit.validation?.productsWithCost) < 40000) {
  stop("Auditoria financeira nao valida. Corrigir e repetir a auditoria.");
}
const age = Date.now() - Date.parse(audit.generatedAt);
if (!(age >= 0 && age <= 2 * 60 * 60 * 1000)) {
  stop("Relatorio financeiro com mais de 2 horas. Repetir a auditoria Alltron antes deste teste.");
}
const risks = rows.filter((r) =>
  String(r.flags || "").split("|").includes("LOSS_VAT_REGISTERED") &&
  Number(r.stock_qty) > 0 && r.match_method === "catalog-key");
if (!risks.length || risks.length > 50) stop("Numero invulgar de artigos: " + risks.length);
if (new Set(risks.map((r) => r.catalog_key)).size !== risks.length) stop("Catalog keys repetidos.");

function variantId(raw) {
  const id = String(raw || "");
  if (/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(id)) return id;
  if (/^\d+$/.test(id)) return "gid://shopify/ProductVariant/" + id;
  return null;
}
async function supabaseRead(catalogKey) {
  const url = new URL(supabaseUrl + "/rest/v1/products");
  url.searchParams.set("select", "catalog_key,sku,price,stock_qty,in_stock,merchandise_id,shopify_variant_id,price_safety_status,financial_hold");
  url.searchParams.set("catalog_key", "eq." + catalogKey);
  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      ...(supabaseKey.startsWith("eyJ") ? { Authorization: "Bearer " + supabaseKey } : {}),
    },
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) stop("Supabase falhou: HTTP " + response.status);
  const products = await response.json();
  if (products.length !== 1) stop("Catalog key nao e unico: " + catalogKey);
  return products[0];
}
async function shopifyRead(ids) {
  const query = `query FinancialRiskVariants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id sku price inventoryPolicy inventoryQuantity
        inventoryItem {
          id tracked
          inventoryLevels(first: 50) {
            nodes {
              location { id }
              quantities(names: ["available"]) { name quantity }
            }
            pageInfo { hasNextPage }
          }
        }
      }
    }
  }`;
  const endpoint = "https://" + domain.replace(/^https?:\/\//, "").replace(/\/$/, "") +
    "/admin/api/" + apiVersion + "/graphql.json";
  const response = await fetch(endpoint, {
    method: "POST", signal: AbortSignal.timeout(40000),
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables: { ids } }),
  });
  if (!response.ok) stop("Shopify falhou: HTTP " + response.status);
  const body = await response.json();
  if (body.errors?.length) stop("Shopify GraphQL: " + JSON.stringify(body.errors).slice(0, 300));
  return body.data?.nodes || [];
}

const checked = [];
for (const candidate of risks) {
  const sb = await supabaseRead(candidate.catalog_key);
  const id = variantId(sb.merchandise_id || sb.shopify_variant_id);
  if (!id) stop("Variante Shopify sem ID: " + candidate.catalog_key);
  const [sh] = await shopifyRead([id]);
  if (!sh || sh.id !== id) stop("Variante nao encontrada: " + candidate.catalog_key);
  const levels = sh.inventoryItem?.inventoryLevels;
  const locations = levels?.nodes || [];
  const total = locations.reduce((sum, level) => sum +
    Number(level.quantities?.find(q => q.name === "available")?.quantity || 0), 0);
  const mismatch = money(sb.price) === null || money(sh.price) === null ||
    Math.abs(Number(sb.price) - Number(candidate.current_price_gross)) > 0.011 ||
    Math.abs(Number(sb.price) - Number(sh.price)) > 0.011;
  const validatedAmounts = locations.map(l => l.quantities?.find(q => q.name === "available")?.quantity);
  const inventoryUncertain = sh.inventoryPolicy !== "DENY" ||
    sh.inventoryItem?.tracked !== true ||
    levels?.pageInfo?.hasNextPage !== false || locations.length === 0 ||
    validatedAmounts.some(q => !Number.isInteger(q) || q < 0) ||
    !Number.isInteger(sh.inventoryQuantity) || sh.inventoryQuantity !== total ||
    new Set(locations.map(l => l.location?.id)).size !== locations.length;
  const alreadyHeld = isFinancialRiskHold(sb);
  const inconsistentHold = alreadyHeld &&
    (sb.stock_qty === null || Number(sb.stock_qty) !== 0 || sb.in_stock !== false);
  const status = mismatch || inventoryUncertain || inconsistentHold ? "REVER_MANUALMENTE" :
    total > 0 || Number(sb.stock_qty) > 0 || sb.in_stock === true || !alreadyHeld ?
      "QUARENTENA_NECESSARIA" : "PROTEGIDO";
  checked.push({
    catalogKey: candidate.catalog_key,
    currentPrice: money(sb.price),
    purchaseNet: money(candidate.expr_purchase_net),
    minimumPrice10: money(candidate.registered_minimum_10),
    estimatedLoss: money(candidate.registered_profit),
    supabaseStock: Number(sb.stock_qty),
    shopifyTotalAvailable: total,
    shopifyInventoryQuantity: sh.inventoryQuantity,
    shopifyPolicy: sh.inventoryPolicy,
    tracked: sh.inventoryItem?.tracked === true,
    locationCount: locations.length, priceMismatch: mismatch,
    alreadyHeld, priceSafetyStatus: sb.price_safety_status,
    financialHold: sb.financial_hold, status,
  });
}
const summary = {
  generatedAt: new Date().toISOString(), mode: "AUDIT_ONLY", externalWrites: 0,
  auditGeneratedAt: audit.generatedAt, inspected: checked.length,
  quarantineNeeded: checked.filter(x => x.status === "QUARENTENA_NECESSARIA").length,
  manualReview: checked.filter(x => x.status === "REVER_MANUALMENTE").length,
  protected: checked.filter(x => x.status === "PROTEGIDO").length,
  rows: checked,
};
fs.mkdirSync(outDir, { recursive: true });
const output = path.join(outDir, "latest.json");
fs.writeFileSync(output, JSON.stringify(summary, null, 2));
console.log("IUMATEC | AUDITORIA FINANCEIRA SHOPIFY + SUPABASE | 0 ALTERACOES");
console.table(checked.map((r) => ({
  catalogKey: r.catalogKey, loss: r.estimatedLoss,
  shopifyPolicy: r.shopifyPolicy, tracked: r.tracked,
  shopifyStock: r.shopifyTotalAvailable, status: r.status,
})));
console.log("RESUMO:", {
  analisados: summary.inspected,
  quarantineNeeded: summary.quarantineNeeded,
  manualReview: summary.manualReview,
  protected: summary.protected,
});
console.log("Relatorio:", output);
