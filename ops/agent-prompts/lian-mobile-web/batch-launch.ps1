param(
  [Parameter(Mandatory=$true)][string]$TaskFile,
  [Parameter(Mandatory=$true)][string]$SystemPromptFile,
  [string]$Repo = 'F:\26.3.13\lian-current\lian-mobile-web',
  [string]$WorktreeRoot = 'F:\26.3.13\lian-current\lian-mobile-web.worktrees',
  [string]$LogDir = 'F:\26.3.13\llm_io_logs',
  [string]$ClaudeExe = 'C:\Users\LENOVO\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe',
  [string]$Runner,
  [switch]$SkipMainUpdate,
  [switch]$ResetCleanWorktrees
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (!$Runner) {
  $Runner = Join-Path $PSScriptRoot 'run-claude-print.ps1'
}

if (!(Test-Path -LiteralPath $TaskFile)) { throw "Task file not found: $TaskFile" }
if (!(Test-Path -LiteralPath $SystemPromptFile)) { throw "System prompt file not found: $SystemPromptFile" }
if (!(Test-Path -LiteralPath $ClaudeExe)) { throw "Claude exe not found: $ClaudeExe" }
if (!(Test-Path -LiteralPath $Runner)) { throw "Runner not found: $Runner" }

New-Item -ItemType Directory -Force $WorktreeRoot | Out-Null
New-Item -ItemType Directory -Force $LogDir | Out-Null

if (!$SkipMainUpdate) {
  git -C $Repo fetch origin
  git -C $Repo checkout main
  git -C $Repo pull --ff-only
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$latestPath = Join-Path $LogDir 'claude-batch-latest.txt'
try {
  Set-Content -LiteralPath $latestPath -Value $stamp -Encoding UTF8
} catch {
  Write-Warning "Could not update ${latestPath}: $($_.Exception.Message)"
}

$systemSnapshot = Join-Path $LogDir "claude-system-$stamp.txt"
Copy-Item -LiteralPath $SystemPromptFile -Destination $systemSnapshot -Force

$tasks = Get-Content -LiteralPath $TaskFile -Raw | ConvertFrom-Json
$started = @()

foreach ($task in $tasks) {
  $name = [string]$task.name
  $wtName = [string]$task.wt
  $branch = [string]$task.branch
  $prompt = [string]$task.prompt
  if (!$name -or !$wtName -or !$branch -or !$prompt) {
    throw "Task entry missing name/wt/branch/prompt"
  }

  $wtPath = Join-Path $WorktreeRoot $wtName
  if (!(Test-Path -LiteralPath $wtPath)) {
    git -C $Repo show-ref --verify --quiet "refs/heads/$branch"
    $localExists = $LASTEXITCODE -eq 0
    git -C $Repo show-ref --verify --quiet "refs/remotes/origin/$branch"
    $remoteExists = $LASTEXITCODE -eq 0

    if ($localExists) {
      git -C $Repo worktree add $wtPath $branch
    } elseif ($remoteExists) {
      git -C $Repo worktree add -b $branch $wtPath "origin/$branch"
    } else {
      git -C $Repo worktree add -b $branch $wtPath origin/main
    }
  } else {
    $currentBranch = git -C $wtPath branch --show-current
    if ($currentBranch -ne $branch) {
      throw "Worktree $wtPath is on branch '$currentBranch', expected '$branch'"
    }

    $dirty = git -C $wtPath status --porcelain
    if ($dirty) {
      throw "Worktree $wtPath is dirty. Clean or commit it before launching.`n$dirty"
    }

    if ($ResetCleanWorktrees) {
      git -C $wtPath fetch origin
      git -C $wtPath reset --hard origin/main
      git -C $wtPath clean -fd
    }
  }

  $promptPath = Join-Path $LogDir "claude-$name-$stamp.prompt.txt"
  $outPath = Join-Path $LogDir "claude-$name-$stamp.out.log"
  $errPath = Join-Path $LogDir "claude-$name-$stamp.err.log"
  Set-Content -LiteralPath $promptPath -Value $prompt -Encoding UTF8

  $args = @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Runner,
    '-Exe', $ClaudeExe,
    '-PromptPath', $promptPath,
    '-StdoutPath', $outPath,
    '-StderrPath', $errPath,
    '-SystemPromptPath', $systemSnapshot
  )
  $proc = Start-Process -FilePath 'powershell.exe' -ArgumentList $args -WorkingDirectory $wtPath -WindowStyle Hidden -PassThru
  $started += [pscustomobject]@{
    Name = $name
    Pid = $proc.Id
    Worktree = $wtPath
    Branch = $branch
    Out = $outPath
    Err = $errPath
  }
}

$started | Format-Table -AutoSize
