# ===============================
# CONFIG
# ===============================
$projectRoot = "C:\Users\mstev\ELO-APP-V2\revs_v2"
$downloadsPath = "$env:USERPROFILE\Downloads"
$apkName = "revs_app.apk"
$apkDest = "$downloadsPath\$apkName"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ===============================
# SPINNER FUNCTION (CLI STYLE)
# ===============================
function Run-WithSpinner {
    param (
        [string]$message,
        [scriptblock]$task
    )

    $spinner = @("|", "/", "-", "\")
    $i = 0

    $job = Start-Job $task

    while ($job.State -eq "Running") {
        Write-Host -NoNewline "`r$message $($spinner[$i % $spinner.Length])"
        Start-Sleep -Milliseconds 120
        $i++
    }

    Receive-Job $job | Out-Null
    Remove-Job $job

    Write-Host "`r$message DONE      " -ForegroundColor Green
}

# ===============================
# STEP 1: BUNDLE
# ===============================
Write-Host "[1/5] Bundling React Native app..."

Run-WithSpinner "Bundling..." {
    npx react-native bundle `
      --platform android `
      --dev false `
      --entry-file index.js `
      --bundle-output android/app/src/main/assets/index.android.bundle `
      --assets-dest android/app/src/main/res
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Bundle failed" -ForegroundColor Red
    exit 1
}

# ===============================
# STEP 2: BUILD APK
# ===============================
Write-Host "[2/5] Building APK..."

Set-Location "$projectRoot\android"

Run-WithSpinner "Building APK..." {
    ./gradlew assembleDebug
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Gradle build failed" -ForegroundColor Red
    exit 1
}

# ===============================
# STEP 3: LOCATE APK
# ===============================
Write-Host "[3/5] Locating APK..."

$apkSource = Get-ChildItem `
  -Path "$projectRoot\android\app\build\outputs\apk\debug" `
  -Filter "app-arm64-v8a-debug.apk" -Recurse |
  Select-Object -First 1

if (-not $apkSource) {
    Write-Host "APK not found" -ForegroundColor Red
    exit 1
}

Write-Host "Found APK: $($apkSource.FullName)" -ForegroundColor Green

# ===============================
# STEP 4: COPY APK
# ===============================
Write-Host "[4/5] Copying APK..."

if (Test-Path $apkDest) {
    Remove-Item $apkDest -Force
}

Copy-Item $apkSource.FullName $apkDest

Write-Host "Saved as: $apkDest" -ForegroundColor Green

# ===============================
# STEP 5: UPLOAD (REAL PROGRESS)
# ===============================
Write-Host "[5/5] Uploading APK (real progress below)..."

# curl.exe is important (Windows built-in curl alias conflicts)
curl.exe -# -X POST "https://maretext.backend.sbs/api/files/upload" `
  -H "Content-Type: multipart/form-data" `
  -F "file=@$apkDest"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nUpload successful" -ForegroundColor Green
} else {
    Write-Host "`nUpload failed" -ForegroundColor Red
}