import fs from "node:fs";
import path from "node:path";

const reports = {
  alltron: "integrations/alltron/out/alltron-supabase-sync/latest.json",
  shopify: "integrations/alltron/out/shopify-price-stock-sync/latest.json",
};
const kind = process.argv[2];
if (!Object.hasOwn(reports, kind)) {
  console.error("Usage: node scripts/assert-safe-audit-reports.mjs alltron|shopify");
  process.exit(2);
}
const reportPath = path.resolve(process.cwd(), reports[kind]);
if (!fs.existsSync(reportPath)) throw new Error(`Audit report missing: ${reportPath}`);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const issues = [];
const check = (condition, message) => { if (!condition) issues.push(message); };
const isZero = (field) => report[field] === 0;

check(report.mode === "audit", "mode must be audit");
check(Number.isInteger(report.selected) && report.selected > 0 && report.selected <= 25, "invalid selected count");
check(isZero("errors"), "errors must equal zero");

if (kind === "alltron") {
  check(report.safetyReady === true, "Alltron safetyReady must be true");
  check(Array.isArray(report.safetyFailures) && report.safetyFailures.length === 0, "Alltron safetyFailures is nonempty or missing");
  check(report.pricingPolicy?.priceWritesEnabled === false, "Alltron price writes must be disabled");
  check(report.pricingPolicy?.reactivationGate === "BLOCKED", "Alltron reactivation gate must be blocked");
  check(report.pricingPolicy?.protectedZeroCount === 269, "protected zero count must be 269");
  check(isZero("applied"), "Alltron applied must be zero");
  check(report.validation?.matched >= 40000, "Alltron matched rows below 40,000");
  console.log(`Alltron: ${report.validation?.matched ?? "unknown"} matched, ${report.validation?.stockChanges ?? "unknown"} pending stock changes`);
} else {
  check(report.source === "supabase.public.products", "Shopify source mismatch");
  check(report.protectedZeroCount === 269, "Shopify protected zero count must be 269");
  check(report.checked === report.selected, "not every selected Shopify variant was checked");
  check(report.notFound === 0, "Shopify variants not found");
  for (const field of ["pricesApplied", "stocksApplied", "inventoryActivated", "productDeletions", "priceFormulaRecalculations"]) {
    check(isZero(field), `${field} must equal zero`);
  }
  check(report.sourceValidation?.ambiguousVariants === 0, "ambiguous Shopify variants found");
  console.log(`Shopify: ${report.checked ?? "unknown"} checked, ${report.stocksWouldUpdate ?? "unknown"} stock differences`);
}

if (issues.length) {
  for (const issue of issues) console.error(`::error::IUMATEC SAFETY: ${issue}`);
  process.exit(1);
}
console.log(`IUMATEC ${kind.toUpperCase()} SAFE AUDIT PASSED: 0 changes applied.`);