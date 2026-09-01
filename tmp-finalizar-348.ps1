$ErrorActionPreference = "Stop"

$Target = ".\integrations\alltron\out\iumatec-348-candidates.json"

Write-Host "`n===== RECUPERAR OS 348 =====" -ForegroundColor Cyan

$Backup = Get-ChildItem `
    ".\integrations\alltron\out\iumatec-348-candidates.json.before-array-fix-*.json" `
    -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $Backup) {
    throw "Nao encontrei o backup before-array-fix. PARAR."
}

Write-Host "Backup usado: $($Backup.FullName)" -ForegroundColor Yellow

$BackupPath = $Backup.FullName
$TargetPath = (Resolve-Path $Target).Path

node -e @"
const fs = require("fs");

const source = process.argv[1];
const target = process.argv[2];

let raw = fs.readFileSync(source,"utf8").replace(/^\uFEFF/,"");
const data = JSON.parse(raw);

let arr;

if (Array.isArray(data)) {
  arr = data;
} else if (Array.isArray(data.products)) {
  arr = data.products;
} else if (Array.isArray(data.candidates)) {
  arr = data.candidates;
} else if (Array.isArray(data.items)) {
  arr = data.items;
} else {
  const keys = Object.keys(data);

  if (keys.length === 348) {
    arr = keys
      .sort((a,b) => Number(a)-Number(b))
      .map(k => data[k]);
  }
}

if (!Array.isArray(arr)) {
  throw new Error("Nao consegui transformar backup em array.");
}

console.log("Recuperados:", arr.length);

if (arr.length !== 348) {
  throw new Error("Esperados 348; encontrados " + arr.length);
}

fs.writeFileSync(target, JSON.stringify(arr,null,2), "utf8");

const check = JSON.parse(fs.readFileSync(target,"utf8"));

console.log("Array final:", Array.isArray(check));
console.log("Candidates final:", check.length);

if (!Array.isArray(check) || check.length !== 348) {
  throw new Error("Validacao final falhou.");
}
"@ $BackupPath $TargetPath

if ($LASTEXITCODE -ne 0) {
    throw "RECUPERACAO DOS 348 FALHOU."
}

Write-Host "`n===== DRY RUN DE 5 =====" -ForegroundColor Cyan

$env:SYNC_DRY_RUN = "true"
$env:SYNC_MAX_PRODUCTS = "5"
$env:SYNC_CONCURRENCY = "1"

node --env-file=.env.local ".\scripts\sync-master-shopify-348.mjs"

$Code = $LASTEXITCODE

Remove-Item Env:SYNC_DRY_RUN -ErrorAction SilentlyContinue
Remove-Item Env:SYNC_MAX_PRODUCTS -ErrorAction SilentlyContinue
Remove-Item Env:SYNC_CONCURRENCY -ErrorAction SilentlyContinue

Write-Host "`n===== RESULTADO =====" -ForegroundColor Cyan
Write-Host "EXIT CODE: $Code"

if ($Code -ne 0) {
    throw "DRY RUN FALHOU."
}

Write-Host "DRY RUN TERMINOU SEM ERRO." -ForegroundColor Green
Write-Host "SHOPIFY NAO FOI ALTERADA." -ForegroundColor Green
