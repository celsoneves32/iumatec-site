param()

$ErrorActionPreference = "Stop"

$ROOT = "C:\Users\celso\Documents\Projetos\iumatec-site"
Set-Location $ROOT

$DOWNLOADS = Join-Path $ROOT "integrations\alltron\downloads"
$OUT       = Join-Path $ROOT "integrations\alltron\out"
$LOGDIR    = Join-Path $OUT "daily-automation"

New-Item -ItemType Directory -Force -Path $DOWNLOADS | Out-Null
New-Item -ItemType Directory -Force -Path $LOGDIR | Out-Null

$STAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$LOG   = Join-Path $LOGDIR "daily-$STAMP.log"

function Log($Text) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $Text"
    Write-Host $line
    Add-Content -Path $LOG -Value $line
}

function Fail($Text) {
    Log "FATAL: $Text"
    exit 1
}

function Run-Node {
    param(
        [string]$Label,
        [string[]]$Arguments
    )

    Log ""
    Log "================================================="
    Log $Label
    Log "================================================="

    & node @Arguments 2>&1 | Tee-Object -FilePath $LOG -Append

    if ($LASTEXITCODE -ne 0) {
        Fail "$Label falhou. Exit code: $LASTEXITCODE"
    }

    Log "$Label OK"
}

# --------------------------------------------------
# CARREGAR .env.local
# --------------------------------------------------

$envFile = Join-Path $ROOT ".env.local"

if (!(Test-Path $envFile)) {
    Fail ".env.local nao encontrado."
}

Get-Content $envFile | ForEach-Object {

    $line = $_.Trim()

    if (!$line) { return }
    if ($line.StartsWith("#")) { return }

    if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {

        $name  = $matches[1]
        $value = $matches[2].Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable(
            $name,
            $value,
            "Process"
        )
    }
}

if (!$env:ALLTRON_HOST) { Fail "ALLTRON_HOST nao definido." }
if (!$env:ALLTRON_USER) { Fail "ALLTRON_USER nao definido." }
if (!$env:ALLTRON_PASS) { Fail "ALLTRON_PASS nao definido." }

Log "================================================="
Log "IUMATEC DAILY ALLTRON PIPELINE"
Log "================================================="
Log "Projeto: $ROOT"
Log "Alltron host: $($env:ALLTRON_HOST)"
Log "Log: $LOG"

# --------------------------------------------------
# DOWNLOAD ATOMICO DOS 4 FEEDS ALLTRON
# --------------------------------------------------

$files = @(
    "ArtikeldatenV2.xml",
    "PreisdatenV2.xml",
    "alltron-bilder-urls.csv",
    "alltron-energielabels.xml"
)

$downloadMaxAttempts = 5

foreach ($file in $files) {

    Log ""
    Log "Downloading Alltron: $file"

    $destination = Join-Path $DOWNLOADS $file
    $temporary   = "$destination.part"
    $url         = "ftps://$($env:ALLTRON_HOST):990/dataexport/$file"
    $downloadOk  = $false

    for ($attempt = 1; $attempt -le $downloadMaxAttempts; $attempt++) {

        if (Test-Path $temporary) {
            Remove-Item $temporary -Force
        }

        Log "Download attempt $attempt/$downloadMaxAttempts : $file"

        & curl.exe `
            --fail `
            --show-error `
            --silent `
            --ssl-reqd `
            --connect-timeout 30 `
            --max-time 1800 `
            --user "$($env:ALLTRON_USER):$($env:ALLTRON_PASS)" `
            $url `
            --output $temporary

        if ($LASTEXITCODE -eq 0 -and (Test-Path $temporary)) {

            $size = (Get-Item $temporary).Length

            if ($size -ge 100000) {
                $downloadOk = $true
                break
            }

            Log "Download suspeito: $file ($size bytes)"
        }
        else {
            Log "Download attempt $attempt falhou: $file (curl exit $LASTEXITCODE)"
        }

        if ($attempt -lt $downloadMaxAttempts) {
            $waitSeconds = [Math]::Min(60, 10 * $attempt)
            Log "Retry em $waitSeconds segundos..."
            Start-Sleep -Seconds $waitSeconds
        }
    }

    if (!$downloadOk) {
        if (Test-Path $temporary) {
            Remove-Item $temporary -Force
        }

        # --------------------------------------------------
        # FALLBACK SEGURO PARA CACHE ALLTRON
        # --------------------------------------------------
        $cacheMaxAgeHours = 36

        if (!(Test-Path $destination)) {
            Fail "Download falhou e nao existe cache local: $file"
        }

        $cachedFile = Get-Item $destination
        $cachedSize = $cachedFile.Length
        $cachedAgeHours = ((Get-Date) - $cachedFile.LastWriteTime).TotalHours

        if ($cachedSize -lt 100000) {
            Fail "Download falhou e cache local e demasiado pequeno: $file ($cachedSize bytes)"
        }

        if ($cachedAgeHours -gt $cacheMaxAgeHours) {
            Fail "Download falhou e cache local expirou: $file ($([Math]::Round($cachedAgeHours,2)) horas)"
        }

        Log "WARNING: download Alltron indisponivel para $file"
        Log "Fallback: usando cache local valida"
        Log "Cache: $destination"
        Log "Cache age: $([Math]::Round($cachedAgeHours,2)) horas"
        Log "Cache size: $cachedSize bytes"
    }

    if ($downloadOk) {
        $size = (Get-Item $temporary).Length
        Move-Item $temporary $destination -Force
        Log "Download OK: $file - $size bytes"
    }
    else {
        $size = (Get-Item $destination).Length
        Log "Cache OK: $file - $size bytes"
    }
}

# --------------------------------------------------
# VERIFICACAO DOS FEEDS
# --------------------------------------------------

foreach ($file in $files) {

    $path = Join-Path $DOWNLOADS $file

    if (!(Test-Path $path)) {
        Fail "Feed obrigatorio em falta: $file"
    }

    $item = Get-Item $path
    Log "$($item.Name) | $($item.Length) bytes | $($item.LastWriteTime)"
}

# --------------------------------------------------
# 1. CRIAR TECH CATALOG A PARTIR DOS FEEDS NOVOS
# --------------------------------------------------

Run-Node `
    "STEP 1 - PARSE ALLTRON PRODUCTS" `
    @(
        "--env-file=.env.local",
        ".\scripts\parseAlltronProducts.mjs"
    )

# --------------------------------------------------
# --------------------------------------------------
# 2. RECONSTRUIR MASTER / ALSO FAIL-SAFE
# --------------------------------------------------

# --------------------------------------------------
# ALSO SFTP DAILY DOWNLOAD
# Falha de download nao mata imediatamente o pipeline;
# a validacao de freshness decide se a cache pode ser usada.
# --------------------------------------------------

Log ""
Log "ALSO SFTP: attempting daily refresh"

& powershell.exe `
    -NoProfile `
    -ExecutionPolicy Bypass `
    -File ".\scripts\download-also-pricelist.ps1" `
    2>&1 | Tee-Object -FilePath $LOG -Append

$alsoDownloadExit = $LASTEXITCODE

if ($alsoDownloadExit -eq 0) {
    Log "ALSO SFTP refresh: OK"
}
else {
    Log "WARNING: ALSO SFTP refresh falhou; validar cache local existente"
}
$ALSO_RAW_DIR = Join-Path $ROOT "integrations\also\raw\pricelist-current"
$ALSO_OVERLAY = Join-Path $ROOT "integrations\also\out\also-safe-supplier-overlay.json"
$ALSO_MAX_AGE_HOURS = 36

$alsoRaw = $null
$alsoRawFresh = $false
$alsoReason = ""

if (Test-Path $ALSO_RAW_DIR) {
    $alsoRaw = Get-ChildItem $ALSO_RAW_DIR -File -Filter "*.txt" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

if (!$alsoRaw) {
    $alsoReason = "raw-pricelist-missing"
}
else {
    $rawAgeHours = ((Get-Date) - $alsoRaw.LastWriteTime).TotalHours

    if ($rawAgeHours -le $ALSO_MAX_AGE_HOURS) {
        $alsoRawFresh = $true
        $alsoReason = "raw-fresh"
    }
    else {
        $alsoReason = "raw-stale"
    }
}

# FASE A: master preliminar SEM ALSO
$env:IUMATEC_ALSO_ENABLED = "false"
Log "ALSO preliminary master: DISABLED ($alsoReason)"

Run-Node `
    "STEP 2A - BUILD PRELIMINARY MASTER WITHOUT ALSO" `
    @(
        "--env-file=.env.local",
        ".\scripts\build-master-catalog.mjs"
    )

if ($alsoRawFresh) {
    Log "ALSO raw fresh: rebuilding supplier artifacts"

    $env:ALSO_PRICELIST_FILE = $alsoRaw.FullName

    Run-Node `
        "STEP 2B1 - BUILD ALSO PURCHASE SNAPSHOT" `
        @(
            "--env-file=.env.local",
            ".\scripts\build-also-purchase-snapshot.mjs"
        )

    Run-Node `
        "STEP 2B2 - BUILD ALSO MPN INDEX" `
        @(
            "--env-file=.env.local",
            ".\scripts\build-also-mpn-index.mjs"
        )

    Run-Node `
        "STEP 2B3 - BUILD ALSO SAFE OVERLAY" `
        @(
            "--env-file=.env.local",
            ".\scripts\build-also-safe-supplier-overlay.mjs"
        )

    Remove-Item Env:ALSO_PRICELIST_FILE -ErrorAction SilentlyContinue

    if (!(Test-Path $ALSO_OVERLAY)) {
        Fail "ALSO overlay nao foi criado."
    }

    $alsoOverlayItem = Get-Item $ALSO_OVERLAY

    if ($alsoOverlayItem.LastWriteTime -lt $alsoRaw.LastWriteTime) {
        Fail "ALSO overlay continua mais antigo que a pricelist."
    }

    # FASE B: master final COM overlay recem-gerado
    $env:IUMATEC_ALSO_ENABLED = "true"
    Log "ALSO final master: ENABLED"

    Run-Node `
        "STEP 2C - BUILD FINAL MASTER WITH ALSO" `
        @(
            "--env-file=.env.local",
            ".\scripts\build-master-catalog.mjs"
        )
}
else {
    Log "ALSO final master: DISABLED ($alsoReason)"
}

Remove-Item Env:IUMATEC_ALSO_ENABLED -ErrorAction SilentlyContinue
Remove-Item Env:ALSO_PRICELIST_FILE -ErrorAction SilentlyContinue
# 3. ATUALIZAR STOCK ALLTRON -> SUPABASE
# PRECOS DESTE SCRIPT ESTAO DESATIVADOS
# --------------------------------------------------

Run-Node `
    "STEP 3 - ALLTRON STOCK -> SUPABASE" `
    @(
        "--env-file=.env.local",
        ".\scripts\sync-alltron-price-stock-to-supabase.mjs",
        "--price-source=.\integrations\alltron\downloads\PreisdatenV2.xml",
        "--article-source=.\integrations\alltron\downloads\ArtikeldatenV2.xml",
        "--apply",
        "--all",
        "--confirm=IUMATEC-ALLTRON-SOURCE"
    )

# --------------------------------------------------
# 3B. ALSO SELECTED STOCK -> SUPABASE
# ONLY WHEN ALSO IS FRESH/ENABLED
# PRICE WRITES: DISABLED
# --------------------------------------------------

if ($alsoRawFresh) {
    Run-Node `
        "STEP 3B - ALSO SELECTED STOCK -> SUPABASE" `
        @(
            "--env-file=.env.local",
            ".\scripts\sync-master-selected-stock-to-supabase.mjs",
            "--apply",
            "--all",
            "--confirm=IUMATEC-ALSO-STOCK"
        )
}
else {
    Log "STEP 3B - ALSO STOCK SKIPPED ($alsoReason)"
}

# --------------------------------------------------
# 4. PRECO AUTOMATICO DESATIVADO
# Os preços ficam para auditoria/manual até limpeza
# das identidades legacy do Supabase.
# --------------------------------------------------

Log ""

Run-Node `
    "STEP 4 - SAFE ACTIVE PRICE FLOOR -> SUPABASE + SHOPIFY" `
    @(
        "--env-file=.env.local",
        ".\scripts\safe-active-price-sync.mjs",
        "--apply",
        "--confirm=IUMATEC-SAFE-ACTIVE-PRICE"
    )

Log "STEP 5 - AUTOMATIC PRICE DECREASES DISABLED (INCREASE-ONLY POLICY)"

# --------------------------------------------------
# 5A. SUPABASE STOCK -> SHOPIFY
# STOCK ONLY - PRECO NAO E ALTERADO
# --------------------------------------------------

Run-Node `
    "STEP 5A - SUPABASE STOCK -> SHOPIFY" `
    @(
        "--env-file=.env.local",
        ".\scripts\sync-shopify-price-stock.mjs",
        "--apply",
        "--all",
        "--stock-only",
        "--confirm=IUMATEC-SUPABASE-SOURCE"
    )
# TERMINADO
# --------------------------------------------------

Log ""
Log "================================================="
Log "IUMATEC DAILY PIPELINE COMPLETED SUCCESSFULLY"
Log "================================================="
Log "Alltron feeds: OK"
Log "Master catalog: OK"
Log "Stock Supabase: OK"
Log "Safe active margin prices: OK"
Log "Shopify safe price increases: OK"
Log "================================================="

exit 0

