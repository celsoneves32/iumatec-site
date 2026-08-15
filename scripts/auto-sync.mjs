import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const ALL = ARGS.includes("--all");
const LIMIT_ARG = ARGS.find((arg) => arg.startsWith("--limit="));
const LOCK_PATH = path.join(os.tmpdir(), "iumatec-safe-shopify-sync.lock");
const LOG_DIR = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-stock-sync",
);
const LOG_PATH = path.join(LOG_DIR, "auto-sync.log");
const MAX_LOCK_AGE_MS = 8 * 60 * 60 * 1_000;

function appendLog(message) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const line = `[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(LOG_PATH, `${line}\n`, "utf8");
  console.log(line);
}

function acquireLock() {
  if (fs.existsSync(LOCK_PATH)) {
    const age = Date.now() - fs.statSync(LOCK_PATH).mtimeMs;
    if (age < MAX_LOCK_AGE_MS) {
      appendLog("Execução ignorada: existe outra sincronização ativa.");
      return false;
    }
    fs.unlinkSync(LOCK_PATH);
    appendLog("Lock antigo removido.");
  }
  fs.writeFileSync(
    LOCK_PATH,
    JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    { flag: "wx" },
  );
  return true;
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);
  } catch (error) {
    appendLog(`Aviso ao remover lock: ${error?.message || error}`);
  }
}

function runSync() {
  const script = path.join(ROOT, "scripts", "sync-shopify-price-stock.mjs");
  const childArgs = [script];

  if (APPLY) {
    childArgs.push("--apply");
    if (ALL || !LIMIT_ARG) {
      childArgs.push("--all", "--confirm=IUMATEC-SUPABASE-SOURCE");
    } else {
      childArgs.push(LIMIT_ARG);
    }
  } else {
    childArgs.push("--dry-run", LIMIT_ARG || "--limit=25");
  }

  return new Promise((resolve, reject) => {
    appendLog(`Comando: node ${childArgs.slice(1).join(" ")}`);
    const child = spawn(process.execPath, childArgs, {
      cwd: ROOT,
      env: process.env,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(
        new Error(
          signal
            ? `Sincronização terminou com sinal ${signal}`
            : `Sincronização terminou com código ${code}`,
        ),
      );
    });
  });
}

if (!acquireLock()) process.exit(0);

try {
  appendLog(`Sincronização iniciada em modo ${APPLY ? "APPLY" : "AUDIT"}.`);
  await runSync();
  appendLog("Sincronização concluída sem erros.");
} catch (error) {
  appendLog(`Sincronização falhou: ${error?.message || error}`);
  process.exitCode = 1;
} finally {
  releaseLock();
}
