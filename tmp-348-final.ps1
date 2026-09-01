$ErrorActionPreference = "Stop"

$Root = "C:\Users\celso\Documents\Projetos\iumatec-site"

$PlanPath = Join-Path $Root "integrations\alltron\out\shopify-price-reconcile\invalid-486-action-plan.csv"
$SourcePath = Join-Path $Root "integrations\alltron\out\iumatec-master-candidates.json"
$TargetPath = Join-Path $Root "integrations\alltron\out\iumatec-348-candidates.json"
$SyncPath = Join-Path $Root "scripts\sync-master-shopify-348.mjs"
$LogPath = Join-Path $Root "integrations\alltron\out\shopify-price-reconcile\dry-run-348-final.log"

Write-Host ""
Write-Host "===== RECONSTRUIR 348 =====" -ForegroundColor Cyan

$Plan = @(
    Import-Csv $PlanPath |
    Where-Object {
        "$($_.action)".Trim() -eq "CREATE_SHOPIFY_CANDIDATE"
    }
)

if ($Plan.Count -ne 348) {
    throw "Plano deveria ter 348 CREATE_SHOPIFY_CANDIDATE. Encontrados: $($Plan.Count)"
}

Write-Host "Plano CREATE: $($Plan.Count)" -ForegroundColor Green

$Raw = [System.IO.File]::ReadAllText($SourcePath)
$Raw = $Raw.TrimStart([char]0xFEFF)
$MasterCandidates = @($Raw | ConvertFrom-Json)

Write-Host "Candidates origem: $($MasterCandidates.Count)"

$ByExact = @{}
$ByLitm = @{}

foreach ($p in $MasterCandidates) {

    $litm = "$($p.litm)".Trim()
    $sku  = "$($p.sku)".Trim()

    if (-not $litm) {
        continue
    }

    if ($sku) {
        $exactKey = ($litm + "|" + $sku).ToUpperInvariant()

        if (-not $ByExact.ContainsKey($exactKey)) {
            $ByExact[$exactKey] = $p
        }
    }

    if (-not $ByLitm.ContainsKey($litm)) {
        $ByLitm[$litm] = New-Object System.Collections.ArrayList
    }

    [void]$ByLitm[$litm].Add($p)
}

$Selected = New-Object System.Collections.ArrayList
$Fallback = New-Object System.Collections.ArrayList
$Unresolved = New-Object System.Collections.ArrayList

foreach ($row in $Plan) {

    $litm = "$($row.litm)".Trim()
    $sku = "$($row.currentSku)".Trim()

    if (-not $sku) {
        $sku = "$($row.supabaseSku)".Trim()
    }

    $key = ($litm + "|" + $sku).ToUpperInvariant()

    # 1. Match normal LITM + SKU
    if ($ByExact.ContainsKey($key)) {

        [void]$Selected.Add($ByExact[$key])
        continue
    }

    # 2. SKU mudou: procurar apenas pelo mesmo LITM
    $litmMatches = @()

    if ($ByLitm.ContainsKey($litm)) {
        $litmMatches = @($ByLitm[$litm])
    }

    if ($litmMatches.Count -eq 1) {

        # clone para não alterar o ficheiro original
        $clone = $litmMatches[0] |
            ConvertTo-Json -Depth 100 |
            ConvertFrom-Json

        $oldSku = "$($clone.sku)".Trim()

        $clone.sku = $sku

        [void]$Selected.Add($clone)

        [void]$Fallback.Add(
            [PSCustomObject]@{
                litm       = $litm
                oldSku     = $oldSku
                currentSku = $sku
            }
        )

        continue
    }

    [void]$Unresolved.Add(
        [PSCustomObject]@{
            litm       = $litm
            currentSku = $sku
            matches    = $litmMatches.Count
        }
    )
}

Write-Host ""
Write-Host "===== RESULTADO MATCH =====" -ForegroundColor Cyan
Write-Host "Selecionados : $($Selected.Count)"
Write-Host "SKU fallback : $($Fallback.Count)"
Write-Host "Nao resolvidos: $($Unresolved.Count)"

if ($Fallback.Count -gt 0) {

    Write-Host ""
    Write-Host "===== SKUS ALTERADOS RECUPERADOS =====" -ForegroundColor Yellow

    $Fallback |
        Format-Table litm,oldSku,currentSku -AutoSize
}

if ($Unresolved.Count -gt 0) {

    Write-Host ""
    $Unresolved | Format-Table -AutoSize

    throw "Ainda existem candidatos nao resolvidos."
}

if ($Selected.Count -ne 348) {
    throw "Esperados 348. Obtidos: $($Selected.Count)"
}

# impedir LITM duplicado acidental
$UniqueLitm = @(
    $Selected |
    ForEach-Object { "$($_.litm)".Trim() } |
    Sort-Object -Unique
)

if ($UniqueLitm.Count -ne 348) {
    throw "Foram encontrados LITM duplicados no conjunto final."
}

Write-Host ""
Write-Host "348/348 RECONSTRUIDOS." -ForegroundColor Green

# JSON array UTF-8 sem BOM
$Json = ConvertTo-Json -InputObject ([object[]]$Selected) -Depth 100

[System.IO.File]::WriteAllText(
    $TargetPath,
    $Json,
    (New-Object System.Text.UTF8Encoding($false))
)

# reler e validar
$CheckRaw = [System.IO.File]::ReadAllText($TargetPath)
$Check = $CheckRaw | ConvertFrom-Json

Write-Host "JSON array : $($Check -is [System.Array])"
Write-Host "JSON count : $($Check.Count)"

if (-not ($Check -is [System.Array])) {
    throw "Ficheiro final nao e array."
}

if ($Check.Count -ne 348) {
    throw "Ficheiro final nao contém 348."
}

Write-Host ""
Write-Host "===== DRY RUN 5 / 348 =====" -ForegroundColor Cyan

$env:SYNC_DRY_RUN = "true"
$env:SYNC_MAX_PRODUCTS = "5"
$env:SYNC_CONCURRENCY = "1"

try {

    $Output = @(
        & node --env-file=.env.local $SyncPath 2>&1 |
        Tee-Object -FilePath $LogPath
    )

    $Code = $LASTEXITCODE
}
finally {

    Remove-Item Env:SYNC_DRY_RUN -ErrorAction SilentlyContinue
    Remove-Item Env:SYNC_MAX_PRODUCTS -ErrorAction SilentlyContinue
    Remove-Item Env:SYNC_CONCURRENCY -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "===== FIM =====" -ForegroundColor Cyan
Write-Host "EXIT CODE: $Code"

if ($Code -ne 0) {
    throw "DRY RUN FALHOU."
}

Write-Host "DRY RUN TERMINOU SEM ERRO." -ForegroundColor Green
Write-Host "SHOPIFY NAO FOI ALTERADA." -ForegroundColor Green
