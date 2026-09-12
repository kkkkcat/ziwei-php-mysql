$ErrorActionPreference = 'Stop'

$Repo = 'https://github.com/kkkkcat/ziwei-php-mysql.git'
$Branch = 'main'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$WorkRoot = Join-Path $env:TEMP 'ziwei-php-mysql-push'

Write-Host '=== Ziwei PHP MySQL -> GitHub ===' -ForegroundColor Cyan
Write-Host "Source: $ProjectRoot"
Write-Host "Target: $Repo"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host ''
    Write-Host '找不到 Git。請先安裝 Git for Windows：' -ForegroundColor Yellow
    Write-Host 'https://git-scm.com/download/win'
    Write-Host '安裝後重新雙擊 PUSH-TO-GITHUB.bat。'
    Read-Host '按 Enter 結束'
    exit 1
}

if (Test-Path $WorkRoot) {
    Remove-Item $WorkRoot -Recurse -Force
}

Write-Host ''
Write-Host '[1/5] 下載 GitHub 現有 repository...'
git clone --branch $Branch $Repo $WorkRoot
if ($LASTEXITCODE -ne 0) { throw 'git clone 失敗。請確認網路與 GitHub 登入。' }

Write-Host '[2/5] 複製完整專案...'
$excludeDirs = @('.git')
$excludeFiles = @('.env')

# robocopy 的 0-7 都是成功/有差異，8 以上才是錯誤。
$roboArgs = @(
    $ProjectRoot,
    $WorkRoot,
    '/MIR',
    '/XD', (Join-Path $ProjectRoot '.git'),
    '/XF', (Join-Path $ProjectRoot '.env'),
    '/R:2', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP'
)
& robocopy @roboArgs | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy 失敗，exit code=$LASTEXITCODE" }

Set-Location $WorkRoot

Write-Host '[3/5] 檢查變更...'
git add -A
$status = git status --porcelain
if (-not $status) {
    Write-Host 'GitHub 已經是最新版本，沒有需要上傳的檔案。' -ForegroundColor Green
    Write-Host "Repo: https://github.com/kkkkcat/ziwei-php-mysql"
    Read-Host '按 Enter 結束'
    exit 0
}

git status --short

Write-Host '[4/5] 建立 commit...'
$version = (Get-Content (Join-Path $WorkRoot 'VERSION') -Raw).Trim()
$commitMessage = "Upload Ziwei PHP MySQL v$version"
git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) { throw 'git commit 失敗。' }

Write-Host '[5/5] 推送到 GitHub main...'
git push origin $Branch
if ($LASTEXITCODE -ne 0) {
    throw 'git push 失敗。若跳出 GitHub 登入視窗，請完成登入後再執行一次。'
}

Write-Host ''
Write-Host '完成：完整專案已推送到 GitHub。' -ForegroundColor Green
Write-Host 'https://github.com/kkkkcat/ziwei-php-mysql'
Write-Host ''
Read-Host '按 Enter 結束'
