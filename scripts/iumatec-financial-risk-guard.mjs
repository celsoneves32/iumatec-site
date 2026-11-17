// Fail-closed guard for an explicitly approved financial-risk hold.
// A loss flag in an audit is NOT itself a persistent hold.
export const FINANCIAL_RISK_HOLD_STATUS = "financial-risk-hold";

export function isFinancialRiskHold(row) {
  // financial_hold is independent of the existing pricing protection system.
  // Keep recognising any legacy hold value, should one exist in the database.
  return row?.financial_hold === true ||
    String(row?.price_safety_status || "").trim().toLowerCase() ===
      FINANCIAL_RISK_HOLD_STATUS;
}

export function assertFinancialRiskHoldZero(row) {
  if (!isFinancialRiskHold(row)) return;
  if (row?.stock_qty === null || row?.stock_qty === undefined ||
      String(row.stock_qty).trim() === "" ||
      !Number.isFinite(Number(row.stock_qty)) || Number(row.stock_qty) !== 0 ||
      row?.in_stock !== false) {
    throw new Error(
      "IUMATEC FINANCIAL SAFETY: held product is sellable in Supabase: " +
      String(row?.catalog_key || "unknown"),
    );
  }
}
