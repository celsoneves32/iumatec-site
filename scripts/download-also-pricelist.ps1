param()

$ErrorActionPreference = "Stop"

$ROOT = Split-Path -Parent $PSScriptRoot

$HOST_NAME = "ftpconnectch.also.com"
$PORT = 22

$CREDENTIAL_FILE = Join-Path `
    $env:LOCALAPPDATA `
    "IUMATEC\also-sftp-credential.xml"

$RAW_ROOT = Join-Path `
    $ROOT `
    "integrations\also\raw"

$CURRENT_DIR = Join-Path `
    $RAW_ROOT `
    "pricelist-current"

$STOCK_DIR = Join-Path `
    $RAW_ROOT `
    "stock-current"

$ARCHIVE_DIR = Join-Path `
    $RAW_ROOT `
    "archive"

$OUT_DIR = Join-Path `
    $ROOT `
    "integrations\also\out"

$REPORT_FILE = Join-Path `
    $OUT_DIR `
    "also-sftp-download-latest.json"

$REMOTE_PRICE = "pricelist-1.txt.zip"
$REMOTE_STOCK = "stock.txt"

foreach ($dir in @(
    $CURRENT_DIR,
    $STOCK_DIR,
    $ARCHIVE_DIR,
    $OUT_DIR
)) {
    New-Item `
        -ItemType Directory `
        -Force `
        -Path $dir |
        Out-Null
}

if (!(Test-Path $CREDENTIAL_FILE)) {
    throw "ALSO SFTP credential not found: $CREDENTIAL_FILE"
}

$sftpCommand = Get-Command `
    "sftp.exe" `
    -ErrorAction Stop

$credential = Import-Clixml `
    -Path $CREDENTIAL_FILE

if (!($credential -is [PSCredential])) {
    throw "Invalid ALSO SFTP credential."
}

$plainPassword = `
    $credential.GetNetworkCredential().Password

if (!$plainPassword) {
    throw "ALSO SFTP password missing."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$tempDir = Join-Path `
    $env:TEMP `
    "iumatec-also-$stamp-$PID"

New-Item `
    -ItemType Directory `
    -Force `
    -Path $tempDir |
    Out-Null

$askpassFile = Join-Path `
    $tempDir `
    "also-askpass.cmd"

$batchFile = Join-Path `
    $tempDir `
    "also-sftp-batch.txt"

$downloadZip = Join-Path `
    $tempDir `
    $REMOTE_PRICE

$downloadStock = Join-Path `
    $tempDir `
    $REMOTE_STOCK

$expandDir = Join-Path `
    $tempDir `
    "expanded"

try {

    $env:IUMATEC_ALSO_SFTP_PASS = $plainPassword

    $askpassText =
        '@echo off' + "`r`n" +
        'powershell.exe -NoProfile -Command "[Console]::Out.Write($env:IUMATEC_ALSO_SFTP_PASS)"' +
        "`r`n"

    [System.IO.File]::WriteAllText(
        $askpassFile,
        $askpassText,
        [System.Text.Encoding]::ASCII
    )

    $tempSftpPath = `
        $tempDir.Replace("\", "/")

    $batchText = @(
        "lcd `"$tempSftpPath`""
        "get -p $REMOTE_PRICE"
        "get -p $REMOTE_STOCK"
        "bye"
    ) -join "`r`n"

    [System.IO.File]::WriteAllText(
        $batchFile,
        $batchText,
        [System.Text.Encoding]::ASCII
    )

    $env:SSH_ASKPASS = $askpassFile
    $env:SSH_ASKPASS_REQUIRE = "force"
    $env:DISPLAY = "1"

    Write-Host ""
    Write-Host "=== ALSO SFTP DOWNLOAD ==="
    Write-Host "Host: $HOST_NAME"
    Write-Host "User: $($credential.UserName)"
    Write-Host ""

    $sftpOutput = & $sftpCommand.Source `
        -oBatchMode=no `
        -oStrictHostKeyChecking=yes `
        -oConnectTimeout=30 `
        -P $PORT `
        -b $batchFile `
        "$($credential.UserName)@$HOST_NAME" `
        2>&1

    $sftpExit = $LASTEXITCODE

    $sftpOutput |
        ForEach-Object {
            Write-Host $_
        }

    if ($sftpExit -ne 0) {
        throw "SFTP failed with exit code $sftpExit"
    }

    if (!(Test-Path $downloadZip)) {
        throw "Pricelist ZIP was not downloaded."
    }

    if (!(Test-Path $downloadStock)) {
        throw "stock.txt was not downloaded."
    }

    $zipSize = (Get-Item $downloadZip).Length
    $stockSize = (Get-Item $downloadStock).Length

    if ($zipSize -lt 100000) {
        throw "Pricelist ZIP suspiciously small: $zipSize bytes"
    }

    if ($stockSize -lt 100000) {
        throw "stock.txt suspiciously small: $stockSize bytes"
    }

    New-Item `
        -ItemType Directory `
        -Force `
        -Path $expandDir |
        Out-Null

    Expand-Archive `
        -Path $downloadZip `
        -DestinationPath $expandDir `
        -Force

    $priceFiles = @(
        Get-ChildItem `
            -Path $expandDir `
            -File `
            -Filter "*.txt"
    )

    if ($priceFiles.Count -ne 1) {
        throw "Expected exactly 1 TXT in ZIP; found $($priceFiles.Count)"
    }

    $newPriceFile = $priceFiles[0]

    if ($newPriceFile.Length -lt 100000) {
        throw "Extracted pricelist suspiciously small: $($newPriceFile.Length)"
    }

    $sample = Get-Content `
        -Path $newPriceFile.FullName `
        -TotalCount 20

    if (!($sample -match "`t")) {
        throw "Extracted pricelist is not tab-delimited."
    }

    # Archive previous pricelist
    Get-ChildItem `
        -Path $CURRENT_DIR `
        -File `
        -Filter "*.txt" `
        -ErrorAction SilentlyContinue |
        ForEach-Object {

            Copy-Item `
                $_.FullName `
                (Join-Path `
                    $ARCHIVE_DIR `
                    "$stamp-$($_.Name)"
                ) `
                -Force
        }

    # Publish new pricelist atomically
    $targetPrice = Join-Path `
        $CURRENT_DIR `
        $newPriceFile.Name

    $targetPriceNew = `
        "$targetPrice.new"

    Copy-Item `
        $newPriceFile.FullName `
        $targetPriceNew `
        -Force

    Get-ChildItem `
        -Path $CURRENT_DIR `
        -File `
        -Filter "*.txt" `
        -ErrorAction SilentlyContinue |
        Remove-Item -Force

    Move-Item `
        $targetPriceNew `
        $targetPrice `
        -Force

    # Keep latest ZIP
    Copy-Item `
        $downloadZip `
        (Join-Path $RAW_ROOT $REMOTE_PRICE) `
        -Force

    # Publish stock.txt atomically
    $targetStock = Join-Path `
        $STOCK_DIR `
        "stock.txt"

    $targetStockNew = `
        "$targetStock.new"

    Copy-Item `
        $downloadStock `
        $targetStockNew `
        -Force

    Move-Item `
        $targetStockNew `
        $targetStock `
        -Force

    $report = [ordered]@{
        downloadedAt = (Get-Date).ToString("o")
        result = "PASS"
        host = $HOST_NAME
        port = $PORT
        pricelist = [ordered]@{
            file = $newPriceFile.Name
            zipBytes = $zipSize
            bytes = (Get-Item $targetPrice).Length
            localPath = $targetPrice
        }
        stock = [ordered]@{
            file = "stock.txt"
            bytes = (Get-Item $targetStock).Length
            localPath = $targetStock
        }
    }

    $json = $report |
        ConvertTo-Json -Depth 8

    [System.IO.File]::WriteAllText(
        $REPORT_FILE,
        $json,
        [System.Text.UTF8Encoding]::new($false)
    )

    Write-Host ""
    Write-Host "=========================================="
    Write-Host "ALSO SFTP DOWNLOAD: PASS"
    Write-Host "Pricelist: $targetPrice"
    Write-Host "Stock:     $targetStock"
    Write-Host "Report:    $REPORT_FILE"
    Write-Host "=========================================="
}
finally {

    Remove-Item Env:SSH_ASKPASS `
        -ErrorAction SilentlyContinue

    Remove-Item Env:SSH_ASKPASS_REQUIRE `
        -ErrorAction SilentlyContinue

    Remove-Item Env:DISPLAY `
        -ErrorAction SilentlyContinue

    Remove-Item Env:IUMATEC_ALSO_SFTP_PASS `
        -ErrorAction SilentlyContinue

    $plainPassword = $null

    if (Test-Path $tempDir) {
        Remove-Item `
            $tempDir `
            -Recurse `
            -Force `
            -ErrorAction SilentlyContinue
    }
}