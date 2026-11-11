import fs from "node:fs";
import path from "node:path";

export function loadProtectedZeroKeys(root = process.cwd()) {
  const file = path.join(root, "integrations", "alltron", "config", "protected-zero-269.json");
  if (!fs.existsSync(file)) throw new Error("IUMATEC SAFETY: lista protected-zero-269.json em falta");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const keys = manifest.catalogKeys;
  if (manifest.version !== 1 || !Array.isArray(keys) ||
      keys.length !== 269 ||
      !keys.every(k => /^litm:\d+$/.test(k)) ||
      new Set(keys).size !== 269) {
    throw new Error("IUMATEC SAFETY: lista dos 269 incompleta ou invalida");
  }
  return new Set(keys);
}

export function isBlockedReactivation(current, desired) {
  return (current === 0 || current === null) && typeof desired === "number" && desired > 0;
}
