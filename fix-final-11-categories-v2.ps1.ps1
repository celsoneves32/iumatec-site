$ErrorActionPreference = "Stop"

$project = Get-Location
$target = Join-Path $project "scripts\reorganize-supabase-categories.mjs"

if (-not (Test-Path $target)) {
    throw "Nao encontrei: $target"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$target.backup-before-final-11-v2-$stamp"
Copy-Item $target $backup -Force

Write-Host "Backup criado: $backup" -ForegroundColor Cyan

$raw = [System.IO.File]::ReadAllText($target)

if ($raw.Contains("// IUMATEC PRIORITY EDGE CASES V2")) {
    Write-Host "As regras V2 ja existem. Nada foi duplicado." -ForegroundColor Yellow
    exit 0
}

# O patch anterior procurava o comentario // COMPUTER.
# Esta versao usa uma ancora real dentro de mapProduct(), por isso funciona
# mesmo que os comentarios tenham sido alterados/removidos.
$anchor = '  const title = txt(p.title);'

if (-not $raw.Contains($anchor)) {
    throw "Ancora 'const title = txt(p.title);' nao encontrada. O ficheiro nao foi alterado."
}

$insert = @'

  // IUMATEC PRIORITY EDGE CASES V2
  // Regras especificas avaliadas antes das regras gerais.
  // So definem category/subcategory.
  const tPriority = norm(title);

  // 1) Toners / consumiveis de impressora
  if (containsAny(tPriority, [
    "toner", "tonerkartusche", "toner cartridge"
  ]))
    return ["Office & Business", "Drucker & Scanner", "priority-title"];

  // 2) Cabos de rede / patch cables
  if (containsAny(tPriority, [
    "patchkabel", "netzwerkkabel", "ethernet cable"
  ]))
    return ["Netzwerk", "Kabel & Adapter", "priority-title"];

  // 3) USB/USB-C para serial RS-232
  if (
    containsAny(tPriority, ["rs-232", "rs232"]) &&
    containsAny(tPriority, ["usb", "usb-c", "type-c", "adapter"])
  )
    return ["Peripherie", "Kabel & Adapter", "priority-title"];

  // 4) HDD docks / clonadores / caixas SATA
  if (containsAny(tPriority, [
    "hdd dock", "hdd-dock", "dock/klon", "hdd klon",
    "sata hdd", "hdd docking"
  ]))
    return ["Datenspeicher", "Storage", "priority-title"];

  // 5) USB/Type-C para RJ45 / Gigabit LAN
  if (
    containsAny(tPriority, ["rj45", "gigabit lan"]) &&
    containsAny(tPriority, ["usb", "usb-c", "type-c"])
  )
    return ["Netzwerk", "Kabel & Adapter", "priority-title"];

  // 6) Alarmes / detetores moveis
  if (containsAny(tPriority, [
    "alarmeingang", "alarmmelder", "mobiler melder",
    "cm-guard", "cm4000"
  ]))
    return ["Smart Home", "Sicherheit", "priority-title"];
'@

$raw = $raw.Replace($anchor, $anchor + $insert)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $raw, $utf8NoBom)

Write-Host "Regras finais V2 inseridas." -ForegroundColor Green
Write-Host "A verificar sintaxe..." -ForegroundColor Cyan

& node --check $target
if ($LASTEXITCODE -ne 0) {
    Copy-Item $backup $target -Force
    throw "Falhou o node --check. O backup foi restaurado automaticamente."
}

Write-Host ""
Write-Host "OK: sintaxe valida." -ForegroundColor Green
Write-Host ""
Write-Host "Execute agora SOMENTE o DRY RUN:" -ForegroundColor Cyan
Write-Host 'npx @dotenvx/dotenvx run -f .env.local -- node .\scripts\reorganize-supabase-categories.mjs'
Write-Host ""
Write-Host "Nao use --apply ainda." -ForegroundColor Yellow
