const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();

const OUT = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out"
);

const TARGET = path.join(
  OUT,
  "iumatec-348-candidates.json"
);

const SYNC = path.join(
  ROOT,
  "scripts",
  "sync-master-shopify-348.mjs"
);

const STATE_DIR = path.join(
  OUT,
  "shopify-master-sync-348"
);

function stamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

function readArray(file) {
  try {
    const raw = fs
      .readFileSync(file, "utf8")
      .replace(/^\uFEFF/, "");

    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

console.log("");
console.log("==========================================");
console.log(" PROCURAR COPIA VALIDA DOS 348");
console.log("==========================================");

const candidates = fs
  .readdirSync(OUT)
  .filter(name =>
    name.startsWith("iumatec-348-candidates.json")
  )
  .map(name => {
    const full = path.join(OUT, name);
    const arr = readArray(full);
    const stat = fs.statSync(full);

    return {
      name,
      full,
      count: arr ? arr.length : -1,
      modified: stat.mtime,
      mtimeMs: stat.mtimeMs,
      arr
    };
  })
  .sort((a, b) => b.mtimeMs - a.mtimeMs);

console.table(
  candidates.map(x => ({
    ficheiro: x.name,
    count: x.count,
    modified: x.modified.toISOString()
  }))
);

const valid = candidates.find(x => x.count === 348);

if (!valid) {
  throw new Error(
    "PARAR: nao encontrei nenhuma copia com exatamente 348."
  );
}

console.log("");
console.log("Fonte escolhida:");
console.log(valid.full);
console.log("Count:", valid.count);

//
// Criar nova cópia em memória.
// Não modificar a fonte/backup.
//
const recovered = valid.arr.map(product => {
  const copy = structuredClone(product);

  // Estes 348 passaram pela auditoria como candidatos
  // que nao devem ser excluidos pelo filtro antigo.
  copy.alreadyLinkedToShopify = false;

  return copy;
});

if (recovered.length !== 348) {
  throw new Error("PARAR: recuperacao nao tem 348.");
}

const skuSet = new Set(
  recovered.map(p =>
    String(p.sku ?? "")
      .trim()
      .toUpperCase()
  )
);

if (skuSet.size !== 348) {
  throw new Error(
    `PARAR: apenas ${skuSet.size} SKUs unicos.`
  );
}

//
// Backup do target atual, mesmo que esteja com 1.
//
if (fs.existsSync(TARGET)) {
  const backup =
    TARGET + `.before-recover-${stamp()}.json`;

  fs.copyFileSync(TARGET, backup);

  console.log("");
  console.log("Backup do target atual:");
  console.log(backup);
}

//
// Gravar os 348.
//
fs.writeFileSync(
  TARGET,
  JSON.stringify(recovered, null, 2),
  "utf8"
);

//
// Reler obrigatoriamente.
//
const check = readArray(TARGET);

console.log("");
console.log("==========================================");
console.log(" VALIDACAO ANTES DO DRY RUN");
console.log("==========================================");

console.log("Array       :", Array.isArray(check));
console.log("Count       :", check?.length);
console.log("SKUs unicos :", new Set(
  check.map(p =>
    String(p.sku ?? "")
      .trim()
      .toUpperCase()
  )
).size);

const linked = check.filter(
  p => p.alreadyLinkedToShopify === true
).length;

console.log("Linked true :", linked);

if (!check || check.length !== 348) {
  throw new Error(
    "PARAR: target nao ficou com 348."
  );
}

if (linked !== 0) {
  throw new Error(
    "PARAR: existem candidatos ainda marcados linked."
  );
}

//
// Isolar state do teste.
//
if (fs.existsSync(STATE_DIR)) {
  const stateBackup = path.join(
    OUT,
    `shopify-master-sync-348-before-test-${stamp()}`
  );

  fs.renameSync(
    STATE_DIR,
    stateBackup
  );

  console.log("");
  console.log("State anterior preservado:");
  console.log(stateBackup);
}

console.log("");
console.log("==========================================");
console.log(" DRY RUN CONTROLADO: 5 / 348");
console.log("==========================================");
console.log("");

const result = spawnSync(
  process.execPath,
  [
    "--env-file=.env.local",
    SYNC
  ],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      SYNC_DRY_RUN: "true",
      SYNC_MAX_PRODUCTS: "5",
      SYNC_CONCURRENCY: "1"
    },
    encoding: "utf8"
  }
);

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

const output =
  String(result.stdout || "") +
  "\n" +
  String(result.stderr || "");

const tests = {
  exitCode0:
    result.status === 0,

  candidates348:
    /Candidates:\s*348/i.test(output),

  pending5:
    /Pending this run:\s*5/i.test(output),

  dryRunTrue:
    /Dry run:\s*true/i.test(output),

  successful5:
    /Successful:\s*5/i.test(output),

  errors0:
    /Errors:\s*0/i.test(output)
};

console.log("");
console.log("==========================================");
console.log(" VALIDACAO AUTOMATICA");
console.log("==========================================");

console.table(tests);

const passed = Object
  .values(tests)
  .every(Boolean);

if (!passed) {
  throw new Error(
    "PARAR: DRY RUN ainda nao passou todos os controlos."
  );
}

console.log("");
console.log("==========================================");
console.log("       DRY RUN 348 VALIDADO 100%");
console.log("==========================================");
console.log("");
console.log("Candidates : 348");
console.log("Testados   : 5");
console.log("Successful : 5");
console.log("Errors     : 0");
console.log("");
console.log("SHOPIFY NAO FOI ALTERADA.");
console.log("SUPABASE NAO FOI ALTERADO.");
console.log("");
console.log("PROXIMO PASSO: 5 PRODUTOS REAIS.");
