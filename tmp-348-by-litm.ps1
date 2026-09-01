$ErrorActionPreference = "Stop"

$Root = "C:\Users\celso\Documents\Projetos\iumatec-site"

$PlanPath   = Join-Path $Root "integrations\alltron\out\shopify-price-reconcile\invalid-486-action-plan.csv"
$MasterPath = Join-Path $Root "integrations\alltron\out\iumatec-master-catalog.json"
$TargetPath = Join-Path $Root "integrations\alltron\out\iumatec-348-candidates.json"
$SyncPath   = Join-Path $Root "scripts\sync-master-shopify-348.mjs"
$LogPath    = Join-Path $Root "integrations\alltron\out\shopify-price-reconcile\dry-run-348-by-litm.log"

function Get-ProductLitm {
    param($Product)

    $v = "$($Product.litm)".Trim()

    if ($v) {
        return $v
    }

    $v = "$($Product.alltronSku)".Trim()

    if ($v -match '^\d+$') {
        return $v
    }

    $v = "$($Product.catalogKey)".Trim()

    if ($v -match '^litm:(\d+)$') {
        return $Matches[1]
    }

    return ""
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   RECONSTRUIR 348 PELO LITM ESTAVEL" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$Plan = @(
    Import-Csv $PlanPath |
    Where-Object {
        "$($_.action)".Trim() -eq "CREATE_SHOPIFY_CANDIDATE"
    }
)

Write-Host "Plano CREATE : $($Plan.Count)"

if ($Plan.Count -ne 348) {
    throw "ERRO: plano nao contém exatamente 348 CREATE_SHOPIFY_CANDIDATE."
}

Write-Host ""
Write-Host "A carregar master atual..." -ForegroundColor Cyan

$Raw = [System.IO.File]::ReadAllText($MasterPath)
$Raw = $Raw.TrimStart([char]0xFEFF)
$Master = @($Raw | ConvertFrom-Json)

Write-Host "Master carregado : $($Master.Count)"

Write-Host ""
Write-Host "A indexar por LITM..." -ForegroundColor Cyan

$ByLitm = @{}

foreach ($p in $Master) {

    $litm = Get-ProductLitm $p

    if (-not $litm) {
        continue
    }

    if (-not $ByLitm.ContainsKey($litm)) {
        $ByLitm[$litm] = New-Object System.Collections.ArrayList
    }

    [void]$ByLitm[$litm].Add($p)
}

Write-Host "LITMs indexados : $($ByLitm.Count)"

$Selected  = New-Object System.Collections.ArrayList
$Missing   = New-Object System.Collections.ArrayList
$Ambiguous = New-Object System.Collections.ArrayList
$SkuChanged = New-Object System.Collections.ArrayList

foreach ($row in $Plan) {

    $litm = "$($row.litm)".Trim()

    $wantedSku = "$($row.currentSku)".Trim()

    if (-not $wantedSku) {
        $wantedSku = "$($row.supabaseSku)".Trim()
    }

    $matches = @()

    if ($ByLitm.ContainsKey($litm)) {
        $matches = @($ByLitm[$litm])
    }

    if ($matches.Count -eq 0) {

        [void]$Missing.Add(
            [PSCustomObject]@{
                litm = $litm
                sku  = $wantedSku
            }
        )

        continue
    }

    if ($matches.Count -gt 1) {

        [void]$Ambiguous.Add(
            [PSCustomObject]@{
                litm    = $litm
                sku     = $wantedSku
                matches = $matches.Count
            }
        )

        continue
    }

    $product = $matches[0]

    # clone
    $clone = $product |
        ConvertTo-Json -Depth 100 |
        ConvertFrom-Json

    $oldSku = "$($clone.sku)".Trim()

    if ($oldSku -ne $wantedSku) {

        [void]$SkuChanged.Add(
            [PSCustomObject]@{
                litm       = $litm
                masterSku  = $oldSku
                currentSku = $wantedSku
            }
        )
    }

    if ($clone.PSObject.Properties["sku"]) {
        $clone.sku = $wantedSku
    }

    if (-not $clone.PSObject.Properties["sku"]) {
        $clone | Add-Member NoteProperty sku $wantedSku
    }

    if (-not $clone.PSObject.Properties["litm"]) {
        $clone | Add-Member NoteProperty litm $litm
    }

    [void]$Selected.Add($clone)
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "              RESULTADO MATCH" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

Write-Host "Selecionados : $($Selected.Count)"
Write-Host "Ausentes     : $($Missing.Count)"
Write-Host "Ambiguos     : $($Ambiguous.Count)"
Write-Host "SKU ajustado : $($SkuChanged.Count)"

if ($Missing.Count -gt 0) {

    Write-Host ""
    Write-Host "AUSENTES:" -ForegroundColor Red

    $Missing |
        Select-Object -First 30 |
        Format-Table -AutoSize
}

if ($Ambiguous.Count -gt 0) {

    Write-Host ""
    Write-Host "AMBIGUOS:" -ForegroundColor Red

    $Ambiguous |
        Select-Object -First 30 |
        Format-Table -AutoSize
}

if ($SkuChanged.Count -gt 0) {

    Write-Host ""
    Write-Host "SKU DIFERENTE NO MASTER / PLANO:" -ForegroundColor Yellow

    $SkuChanged |
        Select-Object -First 30 |
        Format-Table -AutoSize
}

if ($Missing.Count -ne 0) {
    throw "PARAR: ainda existem LITMs ausentes."
}

if ($Ambiguous.Count -ne 0) {
    throw "PARAR: existem LITMs ambiguos."
}

if ($Selected.Count -ne 348) {
    throw "PARAR: deveriam existir 348 produtos finais."
}

$UniqueLitm = @(
    $Selected |
    ForEach-Object { "$(Get-ProductLitm $_)".Trim() } |
    Sort-Object -Unique
)

if ($UniqueLitm.Count -ne 348) {
    throw "PARAR: os 348 nao possuem LITM unico."
}

Write-Host ""
Write-Host "348 / 348 IDENTIFICADOS." -ForegroundColor Green

# ---------------------------------------------------------
# Gravar JSON correto
# ---------------------------------------------------------

$Json = ConvertTo-Json -InputObject ([object[]]$Selected) -Depth 100

[System.IO.File]::WriteAllText(
    $TargetPath,
    $Json,
    (New-Object System.Text.UTF8Encoding($false))
)

$VerifyRaw = [System.IO.File]::ReadAllText($TargetPath)
$Verify = $VerifyRaw | ConvertFrom-Json

Write-Host ""
Write-Host "JSON array : $($Verify -is [System.Array])"
Write-Host "JSON count : $($Verify.Count)"

if (-not ($Verify -is [System.Array])) {
    throw "PARAR: JSON final nao e array."
}

if ($Verify.Count -ne 348) {
    throw "PARAR: JSON final nao tem 348."
}

# ---------------------------------------------------------
# DRY RUN 5
# ---------------------------------------------------------

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "             DRY RUN 5 / 348" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

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

$Text = $Output -join "`n"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "             CONTROLO FINAL" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

Write-Host "Exit code      : $Code"
Write-Host "Candidates 348 : $($Text -match 'Candidates:\s*348')"
Write-Host "Pending 5      : $($Text -match 'Pending this run:\s*5')"
Write-Host "Successful 5   : $($Text -match 'Successful:\s*5')"
Write-Host "Errors 0       : $($Text -match 'Errors:\s*0')"

$Passed = (
    $Code -eq 0 -and
    $Text -match 'Candidates:\s*348' -and
    $Text -match 'Pending this run:\s*5' -and
    $Text -match 'Successful:\s*5' -and
    $Text -match 'Errors:\s*0'
)

if (-not $Passed) {
    throw "DRY RUN NAO PASSOU A VALIDACAO COMPLETA."
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "        DRY RUN VALIDADO 100%" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "348 candidatos corretos." -ForegroundColor Green
Write-Host "5/5 simulados." -ForegroundColor Green
Write-Host "0 erros." -ForegroundColor Green
Write-Host "SHOPIFY NAO FOI ALTERADA." -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMO PASSO: 5 PRODUTOS REAIS." -ForegroundColor Cyan
