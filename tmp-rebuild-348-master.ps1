$ErrorActionPreference = "Stop"

$Root = "C:\Users\celso\Documents\Projetos\iumatec-site"

$PlanPath   = Join-Path $Root "integrations\alltron\out\shopify-price-reconcile\invalid-486-action-plan.csv"
$MasterPath = Join-Path $Root "integrations\alltron\out\iumatec-master-catalog.json"
$TargetPath = Join-Path $Root "integrations\alltron\out\iumatec-348-candidates.json"
$SyncPath   = Join-Path $Root "scripts\sync-master-shopify-348.mjs"

Write-Host "`n===== RECONSTRUIR 348 DO MASTER ATUAL =====" -ForegroundColor Cyan

$Plan = @(
    Import-Csv $PlanPath |
    Where-Object {
        "$($_.action)".Trim() -eq "CREATE_SHOPIFY_CANDIDATE"
    }
)

Write-Host "Plano CREATE: $($Plan.Count)"

if ($Plan.Count -ne 348) {
    throw "Esperados 348 no plano."
}

Write-Host "`nA carregar master atual..." -ForegroundColor Cyan

$Raw = [System.IO.File]::ReadAllText($MasterPath)
$Raw = $Raw.TrimStart([char]0xFEFF)
$Master = @($Raw | ConvertFrom-Json)

Write-Host "Master atual: $($Master.Count)"

$Index = @{}

foreach ($p in $Master) {

    $litm = "$($p.litm)".Trim()
    $sku  = "$($p.sku)".Trim()

    if (-not $litm -or -not $sku) {
        continue
    }

    $key = ($litm + "|" + $sku).ToUpperInvariant()

    if (-not $Index.ContainsKey($key)) {
        $Index[$key] = New-Object System.Collections.ArrayList
    }

    [void]$Index[$key].Add($p)
}

$Selected = New-Object System.Collections.ArrayList
$Missing  = New-Object System.Collections.ArrayList
$Multiple = New-Object System.Collections.ArrayList

foreach ($row in $Plan) {

    $litm = "$($row.litm)".Trim()
    $sku  = "$($row.currentSku)".Trim()

    if (-not $sku) {
        $sku = "$($row.supabaseSku)".Trim()
    }

    $key = ($litm + "|" + $sku).ToUpperInvariant()

    $matches = @()

    if ($Index.ContainsKey($key)) {
        $matches = @($Index[$key])
    }

    if ($matches.Count -eq 1) {
        [void]$Selected.Add($matches[0])
    }

    if ($matches.Count -eq 0) {
        [void]$Missing.Add(
            [PSCustomObject]@{
                litm = $litm
                sku  = $sku
            }
        )
    }

    if ($matches.Count -gt 1) {
        [void]$Multiple.Add(
            [PSCustomObject]@{
                litm    = $litm
                sku     = $sku
                matches = $matches.Count
            }
        )
    }
}

Write-Host "`n===== MATCH =====" -ForegroundColor Cyan
Write-Host "Selecionados : $($Selected.Count)"
Write-Host "Ausentes     : $($Missing.Count)"
Write-Host "Multiplos    : $($Multiple.Count)"

if ($Missing.Count -gt 0) {
    Write-Host "`nAUSENTES:" -ForegroundColor Red
    $Missing | Format-Table -AutoSize
}

if ($Multiple.Count -gt 0) {
    Write-Host "`nMULTIPLOS:" -ForegroundColor Red
    $Multiple | Format-Table -AutoSize
}

if ($Selected.Count -ne 348) {
    throw "NAO TEMOS 348 EXATOS. PARAR."
}

$Json = ConvertTo-Json -InputObject ([object[]]$Selected) -Depth 100

[System.IO.File]::WriteAllText(
    $TargetPath,
    $Json,
    (New-Object System.Text.UTF8Encoding($false))
)

$Check = [System.IO.File]::ReadAllText($TargetPath) | ConvertFrom-Json

Write-Host "`nJSON array : $($Check -is [System.Array])"
Write-Host "JSON count : $($Check.Count)"

if (-not ($Check -is [System.Array])) {
    throw "JSON nao e array."
}

if ($Check.Count -ne 348) {
    throw "JSON nao tem 348."
}

Write-Host "`n===== DRY RUN 5 / 348 =====" -ForegroundColor Cyan

$env:SYNC_DRY_RUN = "true"
$env:SYNC_MAX_PRODUCTS = "5"
$env:SYNC_CONCURRENCY = "1"

try {

    & node --env-file=.env.local $SyncPath

    $Code = $LASTEXITCODE
}
finally {

    Remove-Item Env:SYNC_DRY_RUN -ErrorAction SilentlyContinue
    Remove-Item Env:SYNC_MAX_PRODUCTS -ErrorAction SilentlyContinue
    Remove-Item Env:SYNC_CONCURRENCY -ErrorAction SilentlyContinue
}

Write-Host "`n===== RESULTADO =====" -ForegroundColor Cyan
Write-Host "EXIT CODE: $Code"

if ($Code -ne 0) {
    throw "DRY RUN FALHOU."
}

Write-Host "`nDRY RUN TERMINOU." -ForegroundColor Green
Write-Host "SHOPIFY NAO FOI ALTERADA." -ForegroundColor Green
