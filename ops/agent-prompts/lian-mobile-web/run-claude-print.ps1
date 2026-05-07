param(
  [Parameter(Mandatory=$true)][string]$Exe,
  [Parameter(Mandatory=$true)][string]$PromptPath,
  [Parameter(Mandatory=$true)][string]$StdoutPath,
  [Parameter(Mandatory=$true)][string]$StderrPath,
  [Parameter(Mandatory=$true)][string]$SystemPromptPath
)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$prompt = Get-Content -LiteralPath $PromptPath -Raw
$systemPrompt = Get-Content -LiteralPath $SystemPromptPath -Raw

"[START] $(Get-Date -Format o)" | Set-Content -LiteralPath $StdoutPath -Encoding UTF8
"workdir=$(Get-Location)" | Add-Content -LiteralPath $StdoutPath -Encoding UTF8
"branch=$(git branch --show-current)" | Add-Content -LiteralPath $StdoutPath -Encoding UTF8

$output = & $Exe --print --permission-mode bypassPermissions --append-system-prompt $systemPrompt $prompt 2>&1
$exitCode = $LASTEXITCODE
if ($output) {
  $output | Out-File -LiteralPath $StdoutPath -Append -Encoding UTF8
}
if (!(Test-Path -LiteralPath $StderrPath)) {
  New-Item -ItemType File -Path $StderrPath | Out-Null
}

$donePath = $StdoutPath -replace '\.out\.log$', '.done.txt'
if ($donePath -eq $StdoutPath) {
  $donePath = "$StdoutPath.done.txt"
}
Set-Content -LiteralPath $donePath -Value "exit=$exitCode finished=$(Get-Date -Format o)" -Encoding UTF8
exit $exitCode
