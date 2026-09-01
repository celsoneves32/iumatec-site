$ErrorActionPreference = "Stop"

$Page = ".\app\page.tsx"

if (-not (Test-Path $Page)) {
    throw "app\page.tsx nao encontrado. Execute este script na raiz de iumatec-site."
}

$Text = Get-Content $Page -Raw

$Import = 'import HomeCategoryGrid from "@/components/HomeCategoryGrid";'

if ($Text -notmatch [regex]::Escape($Import)) {
    $Anchor = 'import HomepageCarousel from "@/components/HomepageCarousel";'
    if ($Text -notmatch [regex]::Escape($Anchor)) {
        throw "Nao encontrei o import de HomepageCarousel em app\page.tsx."
    }

    $Text = $Text.Replace(
        $Anchor,
        "$Anchor`r`n$Import"
    )
}

$Pattern = '(?s)<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">\s*\{categoryTiles\.map\(\(tile\) => \(\s*<CategoryTile\s+key=\{tile\.title\}\s+\{\.\.\.tile\}\s*/>\s*\)\)\}\s*</div>'

if ($Text -match $Pattern) {
    $Text = [regex]::Replace(
        $Text,
        $Pattern,
        '<HomeCategoryGrid />',
        1
    )
}
else {
    # Compatibilidade com a versao compacta do page.tsx.
    $Old = @'
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {categoryTiles.map((tile) => (
            <CategoryTile key={tile.title} {...tile} />
          ))}
        </div>
'@

    if ($Text.Contains($Old)) {
        $Text = $Text.Replace(
            $Old,
            "        <HomeCategoryGrid />`r`n"
        )
    }
    elseif ($Text -notmatch '<HomeCategoryGrid\s*/>') {
        throw "Nao consegui localizar automaticamente a grelha Shop by Category. Nenhuma alteracao foi gravada."
    }
}

Set-Content $Page $Text -Encoding UTF8

Write-Host ""
Write-Host "OK: HomeCategoryGrid integrado em app\page.tsx" -ForegroundColor Green
Write-Host "Mobile abre diretamente Smartphones." -ForegroundColor Green
Write-Host ""
Write-Host "Agora execute: npm run dev" -ForegroundColor Cyan
