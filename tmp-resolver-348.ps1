$ErrorActionPreference = "Stop"

$Root       = "C:\Users\celso\Documents\Projetos\iumatec-site"
$Target     = Join-Path $Root "integrations\alltron\out\iumatec-348-candidates.json"
$Original   = Join-Path $Root "integrations\alltron\out\iumatec-master-candidates.json"
$PlanPath   = Join-Path $Root "integrations\alltron\out\shopify-price-reconcile\invalid-486-action-plan.csv"
$SyncScript = Join-Path $Root "scripts\sync-master-shopify-348.mjs"
$LogPath    = Join-Path $Root "integrations\alltron\out\shopify-price-reconcile\dry-run-348-final.log"

function Find-Array348 {
    param($Value)

    if ($null -eq $Value) {
        return
    }

    if ($Value -is [System.Array]) {
        if ($Value.Count -eq 348) {
            $Value
            return
        }

        foreach ($item in $Value) {
            $result = @(Find-Array348 $item)
            if ($result.Count -eq 348) {
                $result
                return
            }
        }

        return
    }

    if ($Value -is [PSCustomObject]) {

        $props = @($Value.PSObject.Properties)

        $numeric = @(
            $props |
            Where-Object { $_.Name -match '^\d+$' }
        )

        if (
            $props.Count -eq 348 -and
            $numeric.Count -eq 348
        ) {
            $numeric |
                Sort-Object { [int]$_.Name } |
                ForEach-Object { $_.Value }

            return
        }

        foreach ($name in @(
            "products",
            "candidates",
            "items",
            "data",
            "value"
        )) {
            $prop = $Value.PSObject.Properties[$name]

            if ($null -ne $prop) {
                $result = @(Find-Array348 $prop.Value)

                if ($result.Count -eq 348) {
                    $result
                    return
                }
            }
        }

        foreach ($prop in $props) {
            $result = @(Find-Array348 $prop.Value)

            if ($result.Count -eq 348) {
                $result
                return
            }
        }
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   RECUPERAR EXATAMENTE OS 348" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$Items = @()

# ------------------------------------------------------------
# 1. TENTAR BACKUP
# ------------------------------------------------------------

$Backup = Get-ChildItem `
    (Join-Path $Root "integrations\alltron\out\iumatec-348-candidates.json.before-array-fix-*.json") `
    -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if ($Backup) {

    Write-Host "Backup encontrado:" -ForegroundColor Yellow
    Write-Host $Backup.FullName

    try {
        $raw = [System.IO.File]::ReadAllText($Backup.FullName)
        $raw = $raw.TrimStart([char]0xFEFF)

        $parsed = $raw | ConvertFrom-Json

        $Items = @(Find-Array348 $parsed)

        Write-Host "Recuperados do backup: $($Items.Count)"
    }
    catch {
        Write-Host "Backup nao pôde ser usado diretamente." -ForegroundColor Yellow
        $Items = @()
    }
}

# ------------------------------------------------------------
# 2. FALLBACK: RECONSTRUIR DO ORIGINAL 170505
# ------------------------------------------------------------

if ($Items.Count -ne 348) {

    Write-Host ""
    Write-Host "Backup nao deu 348. A reconstruir do ficheiro original..." -ForegroundColor Yellow

    if (-not (Test-Path $Original)) {
        throw "Ficheiro original iumatec-master-candidates.json nao encontrado."
    }

    if (-not (Test-Path $PlanPath)) {
        throw "Plano invalid-486-action-plan.csv nao encontrado."
    }

    $Plan = @(
        Import-Csv $PlanPath |
        Where-Object {
            "$($_.action)".Trim() -eq "CREATE_SHOPIFY_CANDIDATE"
        }
    )

    Write-Host "CREATE_SHOPIFY_CANDIDATE no plano: $($Plan.Count)"

    if ($Plan.Count -ne 348) {
        throw "Plano deveria ter 348 candidatos, mas tem $($Plan.Count)."
    }

    $Wanted = @{}

    foreach ($row in $Plan) {

        $litm = "$($row.litm)".Trim()
        $sku  = "$($row.currentSku)".Trim()

        if (-not $sku) {
            $sku = "$($row.supabaseSku)".Trim()
        }

        if ($litm -and $sku) {
            $key = ($litm + "|" + $sku).ToUpperInvariant()
            $Wanted[$key] = $true
        }
    }

    Write-Host "Chaves procuradas: $($Wanted.Count)"

    Write-Host "A carregar iumatec-master-candidates.json..." -ForegroundColor Cyan

    $OriginalRaw = [System.IO.File]::ReadAllText($Original)
    $OriginalRaw = $OriginalRaw.TrimStart([char]0xFEFF)
    $All = $OriginalRaw | ConvertFrom-Json

    Write-Host "Candidatos originais: $($All.Count)"

    $Items = @(
        foreach ($p in $All) {

            $litm = "$($p.litm)".Trim()
            $sku  = "$($p.sku)".Trim()

            if ($litm -and $sku) {

                $key = ($litm + "|" + $sku).ToUpperInvariant()

                if ($Wanted.ContainsKey($key)) {
                    $p
                }
            }
        }
    )

    Write-Host "Reconstruidos: $($Items.Count)" -ForegroundColor Green
}

# ------------------------------------------------------------
# 3. EXIGIR 348
# ------------------------------------------------------------

if ($Items.Count -ne 348) {
    throw "PARAR: foram obtidos $($Items.Count), deveriam ser exatamente 348."
}

# ------------------------------------------------------------
# 4. GRAVAR COMO ARRAY JSON UTF8 SEM BOM
# ------------------------------------------------------------

$Json = ConvertTo-Json -InputObject ([object[]]$Items) -Depth 100

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText(
    $Target,
    $Json,
    $Utf8NoBom
)

Write-Host ""
Write-Host "Ficheiro 348 gravado." -ForegroundColor Green

# ------------------------------------------------------------
# 5. VALIDACAO POWERSHELL
# ------------------------------------------------------------

$VerifyRaw = [System.IO.File]::ReadAllText($Target)
$Verify = $VerifyRaw | ConvertFrom-Json

Write-Host "Tipo PowerShell : $($Verify.GetType().FullName)"
Write-Host "Quantidade      : $($Verify.Count)"

if (-not ($Verify -is [System.Array])) {
    throw "ERRO: JSON final nao e array."
}

if ($Verify.Count -ne 348) {
    throw "ERRO: JSON final nao contém 348."
}

# ------------------------------------------------------------
# 6. DRY RUN REAL DE 5
# ------------------------------------------------------------

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "        DRY RUN REAL 5 / 348" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$env:SYNC_DRY_RUN = "true"
$env:SYNC_MAX_PRODUCTS = "5"
$env:SYNC_CONCURRENCY = "1"

try {

    $Output = @(
        & node --env-file=.env.local $SyncScript 2>&1 |
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
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "           VALIDACAO FINAL" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "Exit code        : $Code"
Write-Host "Candidates 348   : $($Text -match 'Candidates:\s*348')"
Write-Host "Pending 5        : $($Text -match 'Pending this run:\s*5')"
Write-Host "Successful 5     : $($Text -match 'Successful:\s*5')"
Write-Host "Errors 0         : $($Text -match 'Errors:\s*0')"

$OK = (
    $Code -eq 0 -and
    $Text -match 'Candidates:\s*348' -and
    $Text -match 'Pending this run:\s*5' -and
    $Text -match 'Successful:\s*5' -and
    $Text -match 'Errors:\s*0'
)

if (-not $OK) {
    throw "DRY RUN NAO PASSOU A VALIDACAO COMPLETA."
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "       DRY RUN 348 VALIDADO 100%" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "348 candidatos confirmados." -ForegroundColor Green
Write-Host "5/5 simulados com sucesso." -ForegroundColor Green
Write-Host "0 erros." -ForegroundColor Green
Write-Host "SHOPIFY NAO FOI ALTERADA." -ForegroundColor Green
Write-Host ""
Write-Host "A seguir podemos criar os 5 reais." -ForegroundColor Cyan
