import { isFinancialRiskHold } from "./iumatec-financial-risk-guard.mjs";

export const HOLD = "financial-risk-hold"; // legacy status: READ ONLY
export const RISK = "QUARENTENA_NECESSARIA";
const VALID_PRICE_STATUSES = new Set([
  "", "current-price-safe", "raised-to-protected-minimum",
]);

export function eligibleRiskRow(row) {
  return Boolean(row && row.status === RISK && row.priceMismatch === false &&
    row.shopifyPolicy === "DENY" && row.tracked === true &&
    Number.isInteger(row.locationCount) && row.locationCount >= 1 &&
    Number.isFinite(Number(row.currentPrice)) && Number(row.currentPrice) > 0 &&
    Number.isFinite(Number(row.estimatedLoss)) && Number(row.estimatedLoss) < 0 &&
    /^litm:\d+$/.test(String(row.catalogKey || "")));
}

export function validateInventory(variant) {
  if (!variant?.id || variant.inventoryPolicy !== "DENY" ||
      variant.inventoryItem?.tracked !== true || !variant.inventoryItem.id) {
    throw new Error("Politica de inventario insegura (requer tracked e DENY).");
  }
  const connection = variant.inventoryItem.inventoryLevels;
  if (!connection || connection.pageInfo?.hasNextPage !== false ||
      !Array.isArray(connection.nodes) || !connection.nodes.length) {
    throw new Error("Nao foi possivel validar TODAS as localizacoes de inventario.");
  }
  const levels = connection.nodes.map((l) => {
    const q = l?.quantities?.find((x) => x?.name === "available")?.quantity;
    if (!/^gid:\/\/shopify\/Location\/\d+$/.test(l?.location?.id || "") ||
        !Number.isInteger(q) || q < 0) {
      throw new Error("Quantidade/localizacao invalida; nenhuma escrita permitida.");
    }
    return { locationId: l.location.id, available: q };
  });
  if (new Set(levels.map((l) => l.locationId)).size !== levels.length) {
    throw new Error("Localizacoes repetidas; nenhuma escrita permitida.");
  }
  if (!Number.isInteger(variant.inventoryQuantity) ||
      variant.inventoryQuantity !== levels.reduce((s, l) => s + l.available, 0)) {
    throw new Error("Stock total da Shopify difere da soma das localizacoes.");
  }
  return levels;
}

export function shouldSkipAlreadyHeld(sb, levels) {
  return isFinancialRiskHold(sb) &&
    sb?.stock_qty !== null && sb?.stock_qty !== undefined &&
    Number(sb.stock_qty) === 0 && sb?.in_stock === false &&
    levels.every((l) => l.available === 0);
}

export function assertUnchangedSource(sb, variant, audit) {
  if (String(sb.catalog_key) !== audit.catalogKey ||
      Math.abs(Number(sb.price) - Number(audit.currentPrice)) > 0.011 ||
      Math.abs(Number(variant.price) - Number(audit.currentPrice)) > 0.011 ||
      !Number.isFinite(Number(sb.price))) {
    throw new Error("Preco/identidade mudaram desde a auditoria: repetir auditoria.");
  }
  if (isFinancialRiskHold(sb)) {
    if (Number(sb.stock_qty) !== 0 || sb.in_stock !== false) {
      throw new Error("Quarentena marcada mas stock Supabase positivo.");
    }
    return;
  }
  if (Number(sb.stock_qty) !== Number(audit.supabaseStock) ||
      Number(sb.stock_qty) < 0 || !Number.isInteger(Number(sb.stock_qty)) ||
      sb.in_stock !== true) {
    throw new Error("Stock Supabase mudou desde a auditoria: repetir auditoria.");
  }
  // Never overwrite the protective pricing state. Known pricing states are
  // independent from the persistent financial hold.
  if (sb.financial_hold !== false ||
      !VALID_PRICE_STATUSES.has(String(sb.price_safety_status ?? ""))) {
    throw new Error("Estado financeiro ou de preco inesperado. Rever manualmente.");
  }
}
