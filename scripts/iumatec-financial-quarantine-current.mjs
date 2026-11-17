// IUMATEC — QUARENTENA FINANCEIRA CONTROLADA (LOTE DINAMICO VALIDADO)
// Sem --apply: realiza novo preflight LIVE e zero alterações externas.
// Com --apply + --confirm: coloca stock a zero em TODAS as localizacoes Shopify
// (CAS, DENY e tracked), verifica, e marca o artigo no Supabase com stock zero.
// Em falha nao repoe stock automaticamente: imprimir estado e pedir intervencao.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
import { validateInventory, shouldSkipAlreadyHeld,
  assertUnchangedSource } from "./iumatec-financial-quarantine-policy.mjs";
import { isFinancialRiskHold } from "./iumatec-financial-risk-guard.mjs";
import { validateRiskBatch } from "./iumatec-financial-batch-policy.mjs";

dotenv.config({ path: ".env.local" });
dotenv.config();

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const confirm = args.find(x => x.startsWith("--confirm="))?.slice(10) || "";
if (args.some(x => x !== "--apply" && !/^--confirm=IUMATEC-\d{1,2}-[a-f0-9]{16}$/.test(x)) ||
    new Set(args.filter(x => x.startsWith("--confirm="))).size > 1 ||
    (args.includes("--apply") && !confirm) ||
    (!apply && confirm)) {
  throw new Error("Argumentos invalidos. Usa sem argumentos para auditoria (0 escritas).");
}
const root = process.cwd();
const auditDir = path.join(root, "integrations", "alltron", "out", "alltron-profit-audit");
const financialPath = path.join(root, "integrations", "alltron", "out", "financial-risk-audit", "latest.json");
const outputDir = path.join(root, "integrations", "alltron", "out", "financial-quarantine");
const domain = String(process.env.SHOPIFY_STORE_DOMAIN || "").trim()
  .replace(/^https?:\/\//, "").replace(/\/$/, "");
const token = String(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "").trim();
const shopVersion = String(process.env.IUMATEC_SHOPIFY_STOCK_API_VERSION || process.env.SHOPIFY_ADMIN_API_VERSION || "2026-10");
const url = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const stop = message => { throw new Error("IUMATEC QUARENTENA STOP: " + message); };
const near = (a, b) => Math.abs(Number(a) - Number(b)) <= 0.011;
if (!domain || !token || !url || !key) stop("Credenciais locais em falta. Nao enviar ao chat.");
if (!/^\d{4}-\d{2}$/.test(shopVersion)) stop("Versao Shopify invalida.");
if (!fs.existsSync(financialPath)) stop("Falta auditoria financeira da Etapa 1.");
const audit = JSON.parse(fs.readFileSync(path.join(auditDir, "latest.json"), "utf8"));
const financial = JSON.parse(fs.readFileSync(financialPath, "utf8"));
const csv = parse(fs.readFileSync(path.join(auditDir, "products-to-review.csv"), "utf8"), {
  columns: true, delimiter: ";", bom: true, skip_empty_lines: true,
});
const fresh = date => {
  const age = Date.now() - Date.parse(date);
  return Number.isFinite(age) && age >= 0 && age < 2 * 60 * 60 * 1000;
};
if (audit.mode !== "READ_ONLY_CURRENT_MARGIN_AUDIT" || !audit.safetyReady ||
    audit.externalWrites !== 0 || audit.assumptions?.primaryScenario !== "vatRegistered" ||
    Number(audit.assumptions?.freeShippingFromGross) !== 99 ||
    Number(audit.validation?.productsWithCost) < 40000 || !fresh(audit.generatedAt)) {
  stop("Auditoria Alltron invalida/antiga: repetir com AUDIT_FREE_SHIPPING_FROM=99.");
}
// The batch count is derived from the CURRENT financial reports, never a
// fixed historical "15". It must be exactly the same set in BOTH reports.
const batch = validateRiskBatch({ financial, csv, auditGeneratedAt: audit.generatedAt });
const { riskCount, auditedRows, signature } = batch;
const expectedConfirm = `IUMATEC-${riskCount}-${signature}`;
if (apply && (confirm !== expectedConfirm ||
    process.env.IUMATEC_FINANCIAL_QUARANTINE_APPROVED !== "SIM")) {
  stop("APPLY bloqueado: assinaturas do lote ou aprovacao nao coincidem. Fazer preflight novamente.");
}

const apiEndpoint = `https://${domain}/admin/api/${shopVersion}/graphql.json`;
const sbHeaders = { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}),
  "Content-Type": "application/json" };
function variantId(value) {
  const str = String(value || "");
  if (/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(str)) return str;
  if (/^\d+$/.test(str)) return "gid://shopify/ProductVariant/" + str;
  return null;
}
async function sbRead(catalogKey) {
  const endpoint = new URL(`${url}/rest/v1/products`);
  endpoint.searchParams.set("select", "catalog_key,sku,price,stock_qty,in_stock,merchandise_id,shopify_variant_id,price_safety_status,financial_hold");
  endpoint.searchParams.set("catalog_key", "eq." + catalogKey);
  const response = await fetch(endpoint, { headers: sbHeaders, signal: AbortSignal.timeout(25000) });
  if (!response.ok) stop("Supabase GET HTTP " + response.status);
  const data = await response.json();
  if (!Array.isArray(data) || data.length !== 1) stop("Catalog key nao unico: " + catalogKey);
  return data[0];
}
async function shopify(query, variables) {
  const response = await fetch(apiEndpoint, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) stop("Shopify HTTP " + response.status);
  const data = await response.json();
  if (data.errors?.length) stop("Shopify GraphQL: " + data.errors.map(e => e.message).join("; ").slice(0,500));
  return data.data;
}
const variantQuery = `query($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on ProductVariant {
      id sku price inventoryPolicy inventoryQuantity
      inventoryItem { id tracked inventoryLevels(first: 100) {
        nodes { location { id } quantities(names: ["available"]) { name quantity } }
        pageInfo { hasNextPage }
      } }
    }
  }
}`;
async function variantRead(id) {
  const data = await shopify(variantQuery, { ids: [id] });
  const v = data?.nodes?.[0];
  if (!v || v.id !== id) stop("ID de variante mudou/desapareceu.");
  return v;
}
const changeMutation = `mutation($input: InventorySetQuantitiesInput!, $idempotencyKey: String!) {
  inventorySetQuantities(input: $input) @idempotent(key: $idempotencyKey) {
    inventoryAdjustmentGroup { reason changes { name delta } }
    userErrors { code field message }
  }
}`;
async function setLocationZero(inventoryItemId, locationId, expected) {
  if (!Number.isInteger(expected) || expected <= 0) stop("CAS esperado nao positivo.");
  const data = await shopify(changeMutation, {
    idempotencyKey: randomUUID(),
    input: { name: "available", reason: "correction", quantities: [{
      inventoryItemId, locationId, quantity: 0, changeFromQuantity: expected,
    }] },
  });
  const result = data?.inventorySetQuantities;
  if (!result || result.userErrors?.length || !result.inventoryAdjustmentGroup) {
    stop("Shopify recusou alteracao CAS: " + JSON.stringify(result?.userErrors || []).slice(0,400));
  }
}
async function patchSupabase(sb) {
  const endpoint = new URL(`${url}/rest/v1/products`);
  endpoint.searchParams.set("catalog_key", "eq." + sb.catalog_key);
  endpoint.searchParams.set("price", "eq." + sb.price);
  endpoint.searchParams.set("stock_qty", "eq." + sb.stock_qty);
  endpoint.searchParams.set("in_stock", "eq.true");
  endpoint.searchParams.set("price_safety_status", sb.price_safety_status == null ? "is.null" : "eq." + sb.price_safety_status);
  endpoint.searchParams.set("financial_hold", "eq.false");
  const response = await fetch(endpoint, {
    method: "PATCH", headers: { ...sbHeaders, Prefer: "return=representation" },
    // Do not modify price_safety_status: it belongs to the pricing system.
    body: JSON.stringify({ stock_qty: 0, in_stock: false, financial_hold: true }),
    signal: AbortSignal.timeout(35000),
  });
  if (!response.ok) stop("PATCH Supabase HTTP " + response.status + ": " + (await response.text()).slice(0,240));
  const data = await response.json();
  if (!Array.isArray(data) || data.length !== 1 ||
      data[0].financial_hold !== true ||
      data[0].price_safety_status !== sb.price_safety_status ||
      Number(data[0].stock_qty) !== 0 || data[0].in_stock !== false) {
    stop("PATCH Supabase sem confirmacao exata. Verificacao manual obrigatoria.");
  }
}
const found = [];
for (const audited of auditedRows) {
  const sb = await sbRead(audited.catalogKey);
  const id = variantId(sb.merchandise_id || sb.shopify_variant_id);
  if (!id) stop("ID Shopify nao identificado: " + audited.catalogKey);
  const sh = await variantRead(id);
  const levels = validateInventory(sh);
  assertUnchangedSource(sb, sh, audited);
  if (!shouldSkipAlreadyHeld(sb, levels) &&
      (isFinancialRiskHold(sb) ||
       sh.inventoryQuantity !== Number(audited.shopifyInventoryQuantity) ||
       levels.length !== Number(audited.locationCount) ||
       levels.reduce((s, l) => s + l.available, 0) !== Number(audited.shopifyTotalAvailable))) {
    stop("Stock/politica mudou desde a auditoria: " + audited.catalogKey);
  }
  found.push({ audit: audited, sb, sh, levels, variantId: id });
}
if (new Set(found.map(x => x.variantId)).size !== riskCount) stop("Duas linhas apontam para a mesma variante Shopify.");
console.log(`IUMATEC QUARENTENA | preflight LIVE verificado em ${riskCount} artigos | assinatura ${signature}`);
console.table(found.map(x => ({ catalogKey: x.audit.catalogKey, riskCHF: x.audit.estimatedLoss,
  priceCHF: x.audit.currentPrice, supabaseStock: x.sb.stock_qty,
  shopifyStock: x.sh.inventoryQuantity, locations: x.levels.length, policy: x.sh.inventoryPolicy })));
fs.mkdirSync(outputDir, { recursive: true });
const state = { generatedAt: new Date().toISOString(), mode: apply ? "APPLY" : "AUDIT",
  externalWrites: 0, checked: found.length, auditSignature: signature, done: [], errors: [] };
function save() {
  fs.writeFileSync(path.join(outputDir, "latest.json"), JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2));
}
save();
if (!apply) {
  console.log("AUDITORIA CONCLUIDA: ZERO escritas. Lote assinado para revisao.");
  console.log("CONFIRMACAO A REVER:", expectedConfirm);
  console.log("NAO executar --apply antes de confirmar que as sincronizacoes nao reativam estes artigos.");
} else {
  for (const item of found) {
    const catalogKey = item.audit.catalogKey;
    try {
      const freshSb = await sbRead(catalogKey);
      const freshSh = await variantRead(item.variantId);
      const freshLevels = validateInventory(freshSh);
      assertUnchangedSource(freshSb, freshSh, item.audit);
      if (!shouldSkipAlreadyHeld(freshSb, freshLevels)) {
        if (freshSh.inventoryQuantity !== item.sh.inventoryQuantity ||
          freshLevels.length !== item.levels.length ||
          freshLevels.some(l => !item.levels.some(p => p.locationId === l.locationId && p.available === l.available))) {
          stop("Concorrencia: stock mudou depois do preflight: " + catalogKey);
        }
        for (const level of freshLevels) {
          if (level.available > 0) {
            await setLocationZero(freshSh.inventoryItem.id, level.locationId, level.available);
            state.externalWrites++;
            save(); // Persist progress after every Shopify inventory write.
          }
        }
        const verified = await variantRead(item.variantId);
        if (validateInventory(verified).some(l => l.available !== 0) || verified.inventoryQuantity !== 0) {
          stop("Shopify ainda tem stock. Supabase nao foi alterado: " + catalogKey);
        }
        if (!isFinancialRiskHold(freshSb)) {
          await patchSupabase(freshSb);
          state.externalWrites++;
          save();
        }
      }
      const verifiedSb = await sbRead(catalogKey);
      const verifiedSh = await variantRead(item.variantId);
      if (!shouldSkipAlreadyHeld(verifiedSb, validateInventory(verifiedSh)) || verifiedSh.inventoryQuantity !== 0) {
        stop("Verificacao final falhou: " + catalogKey);
      }
      state.done.push({ catalogKey, status: "PROTEGIDO" });
      console.log("PROTEGIDO", catalogKey);
      save();
    } catch (error) {
      state.errors.push({ catalogKey, message: String(error.message || error) });
      save();
      console.error("FALHA/REVISAO MANUAL", catalogKey, String(error.message || error));
      console.error("NAO ativar stock nem repetir apply automaticamente. Enviar o relatorio sem secrets.");
      process.exitCode = 1;
      break;
    }
  }
  console.log(`CONCLUIDO: ${state.done.length}/${riskCount} protegidos; erros ${state.errors.length}; escritas ${state.externalWrites}`);
  save();
}
console.log("Relatorio:", path.join(outputDir, "latest.json"));
