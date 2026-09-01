param(
    [string]$ProjectRoot = "$env:USERPROFILE\Documents\Projetos\iumatec-site",
    [string]$PcfFolder = "$env:USERPROFILE\Desktop\icecat-pcfs",
    [switch]$Apply
)

$ErrorActionPreference = "Stop"

$nodeScript = Join-Path $ProjectRoot "scripts\enrich-icecat-images-supabase.mjs"
if (!(Test-Path $nodeScript)) {
    throw "Nao encontrei: $nodeScript"
}

if (!(Test-Path $PcfFolder)) {
    throw "Nao encontrei a pasta PCF: $PcfFolder"
}

$files = Get-ChildItem -Path $PcfFolder -File -Filter "*.csv" |
    Where-Object { $_.Name -match 'DE_CH' } |
    Sort-Object Name

if ($files.Count -eq 0) {
    throw "Nao encontrei ficheiros CSV DE_CH em: $PcfFolder"
}

Set-Location $ProjectRoot

Write-Host ""
Write-Host "========== IUMATEC ICECAT - TODOS OS PCF ==========" -ForegroundColor Cyan
Write-Host "Projeto: $ProjectRoot"
Write-Host "Pasta PCF: $PcfFolder"
Write-Host ("Modo: " + $(if ($Apply) { "APPLY" } else { "DRY RUN" }))
Write-Host "Ficheiros encontrados: $($files.Count)"
Write-Host ""

$summary = @()

foreach ($file in $files) {
    Write-Host "----------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "A processar: $($file.Name)" -ForegroundColor Yellow

    $argsList = @(
        $nodeScript,
        "--pcf", $file.FullName
    )

    if ($Apply) {
        $argsList += "--apply"
    }

    & node @argsList

    $exit = $LASTEXITCODE
    $summary += [pscustomobject]@{
        File = $file.Name
        ExitCode = $exit
        Status = if ($exit -eq 0) { "OK" } else { "ERRO" }
    }

    if ($exit -ne 0) {
        Write-Host "ERRO neste ficheiro. Processo interrompido." -ForegroundColor Red
        break
    }
}

Write-Host ""
Write-Host "==================== RESUMO ========================" -ForegroundColor Cyan
$summary | Format-Table -AutoSize

if (-not $Apply) {
    Write-Host ""
    Write-Host "DRY RUN concluido. Nenhuma alteracao foi feita." -ForegroundColor Green
    Write-Host "Se todos os ficheiros deram OK, execute novamente com -Apply." -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "APPLY concluido para os ficheiros processados." -ForegroundColor Green
}
