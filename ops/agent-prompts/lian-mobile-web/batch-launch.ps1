param(
  [Parameter(Mandatory=$true)][string]$TaskFile,
  [Parameter(Mandatory=$true)][string]$SystemPromptFile,
  [string]$Repo = 'F:\26.3.13\lian-current\lian-mobile-web',
  [string]$WorktreeRoot = 'F:\26.3.13\lian-current\lian-mobile-web.worktrees',
  [string]$LogDir = 'F:\26.3.13\llm_io_logs',
  [string]$ClaudeExe = 'C:\Users\LENOVO\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe',
  [string]$Runner,
  [string]$Monitor,
  [switch]$SkipMainUpdate,
  [switch]$ResetCleanWorktrees,
  [switch]$AllowSameConflictGroup,
  [switch]$Wait,
  [switch]$LaunchMonitor,
  [int]$MonitorPollSeconds = 20,
  [int]$MonitorTimeoutMinutes = 0,
  [switch]$AuditOnComplete,
  [string]$RepoFullName
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (!$Runner) {
  $Runner = Join-Path $PSScriptRoot 'run-claude-print.ps1'
}
if (!$Monitor) {
  $Monitor = Join-Path $PSScriptRoot 'wait-claude-batch.ps1'
}

if (!(Test-Path -LiteralPath $TaskFile)) { throw "Task file not found: $TaskFile" }
if (!(Test-Path -LiteralPath $SystemPromptFile)) { throw "System prompt file not found: $SystemPromptFile" }
if (!(Test-Path -LiteralPath $ClaudeExe)) { throw "Claude exe not found: $ClaudeExe" }
if (!(Test-Path -LiteralPath $Runner)) { throw "Runner not found: $Runner" }
if (($Wait -or $LaunchMonitor) -and !(Test-Path -LiteralPath $Monitor)) { throw "Monitor not found: $Monitor" }

function ConvertTo-StringArray {
  param($Value)
  if ($null -eq $Value) { return @() }
  if ($Value -is [System.Array]) { return @($Value | ForEach-Object { [string]$_ }) }
  return @([string]$Value)
}

function Format-ControlList {
  param([string[]]$Items)
  if (!$Items -or $Items.Count -eq 0) { return '- none' }
  return (($Items | ForEach-Object { "- $_" }) -join "`n")
}

New-Item -ItemType Directory -Force $WorktreeRoot | Out-Null
New-Item -ItemType Directory -Force $LogDir | Out-Null

if (!$SkipMainUpdate) {
  git -C $Repo fetch origin
  git -C $Repo checkout main
  git -C $Repo pull --ff-only
}

$rawTasks = Get-Content -LiteralPath $TaskFile -Raw | ConvertFrom-Json
$tasks = @($rawTasks)
if ($tasks.Count -eq 0) { throw "Task file has no tasks: $TaskFile" }

if (!$AllowSameConflictGroup) {
  $groups = @{}
  foreach ($task in $tasks) {
    $type = if ($task.type) { [string]$task.type } else { 'unspecified' }
    $group = if ($task.conflictGroup) { [string]$task.conflictGroup } else { 'unspecified' }
    if ($type -in @('review', 'planner')) { continue }
    if ($group -eq 'docs' -or $group -eq 'review' -or $group -eq 'planning') { continue }
    if (!$groups.ContainsKey($group)) { $groups[$group] = @() }
    $groups[$group] += [string]$task.name
  }
  $conflicts = $groups.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 }
  if ($conflicts) {
    $lines = $conflicts | ForEach-Object { "$($_.Key): $($_.Value -join ', ')" }
    throw "Multiple non-doc tasks share the same conflictGroup. Run them serially or pass -AllowSameConflictGroup.`n$($lines -join "`n")"
  }
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

$started = @()
$preflight = @()
$manifestTasks = @()

foreach ($task in $tasks) {
  $name = [string]$task.name
  $wtName = [string]$task.wt
  $branch = [string]$task.branch
  $prompt = [string]$task.prompt
  if (!$name -or !$wtName -or !$branch -or !$prompt) {
    throw "Task entry missing name/wt/branch/prompt"
  }

  $type = if ($task.type) { [string]$task.type } else { 'unspecified' }
  $risk = if ($task.risk) { [string]$task.risk } else { 'unspecified' }
  $conflictGroup = if ($task.conflictGroup) { [string]$task.conflictGroup } else { 'unspecified' }
  $allowedFiles = ConvertTo-StringArray $task.allowedFiles
  $forbiddenFiles = ConvertTo-StringArray $task.forbiddenFiles
  $validation = ConvertTo-StringArray $task.validation
  $issues = ConvertTo-StringArray $task.issues
  $targetIssue = if ($task.targetIssue) { [string]$task.targetIssue } else { '' }
  $targetPr = if ($task.targetPr) { [string]$task.targetPr } else { '' }

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
  $donePath = Join-Path $LogDir "claude-$name-$stamp.done.txt"
  $metaPath = Join-Path $LogDir "claude-$name-$stamp.meta.json"

  $controlAppendix = @"

---
CONTROL APPENDIX (launcher generated)
Task type: $type
Risk: $risk
Conflict group: $conflictGroup
Target issue: $targetIssue
Target PR: $targetPr
Issues: $($issues -join ', ')
Allowed files:
$(Format-ControlList $allowedFiles)
Forbidden files:
$(Format-ControlList $forbiddenFiles)
Validation commands:
$(Format-ControlList $validation)
Use these boundaries as hard constraints. If the requested fix requires files outside allowedFiles, stop and explain the blocker instead of making an unbounded change.
"@

  Set-Content -LiteralPath $promptPath -Value ($prompt + $controlAppendix) -Encoding UTF8

  $meta = [pscustomobject]@{
    name = $name
    type = $type
    risk = $risk
    conflictGroup = $conflictGroup
    worktree = $wtPath
    branch = $branch
    targetIssue = $targetIssue
    targetPr = $targetPr
    issues = $issues
    allowedFiles = $allowedFiles
    forbiddenFiles = $forbiddenFiles
    validation = $validation
    promptPath = $promptPath
    stdoutPath = $outPath
    stderrPath = $errPath
    donePath = $donePath
    systemPromptPath = $systemSnapshot
    stamp = $stamp
  }
  $meta | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $metaPath -Encoding UTF8

  $preflight += [pscustomobject]@{
    Name = $name
    Type = $type
    Risk = $risk
    ConflictGroup = $conflictGroup
    Branch = $branch
    Worktree = $wtPath
    AllowedFiles = $allowedFiles.Count
    ForbiddenFiles = $forbiddenFiles.Count
    Validation = $validation.Count
  }

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
    Done = $donePath
    Meta = $metaPath
  }
  $manifestTasks += [pscustomobject]@{
    name = $name
    pid = $proc.Id
    type = $type
    risk = $risk
    conflictGroup = $conflictGroup
    worktree = $wtPath
    branch = $branch
    allowedFiles = $allowedFiles
    forbiddenFiles = $forbiddenFiles
    validation = $validation
    promptPath = $promptPath
    stdoutPath = $outPath
    stderrPath = $errPath
    donePath = $donePath
    metaPath = $metaPath
  }
}

$manifestPath = Join-Path $LogDir "claude-batch-$stamp.manifest.json"
[pscustomobject]@{
  stamp = $stamp
  createdAt = Get-Date -Format o
  repo = $Repo
  worktreeRoot = $WorktreeRoot
  logDir = $LogDir
  taskFile = $TaskFile
  systemPromptFile = $SystemPromptFile
  systemPromptSnapshot = $systemSnapshot
  runner = $Runner
  tasks = $manifestTasks
} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

"`n===== PREFLIGHT ====="
$preflight | Format-Table -AutoSize
"`n===== STARTED ====="
$started | Format-Table -AutoSize
"`nSTAMP=$stamp"
"MANIFEST=$manifestPath"

if ($LaunchMonitor) {
  $monitorArgs = @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Monitor,
    '-ManifestPath', $manifestPath,
    '-PollSeconds', $MonitorPollSeconds,
    '-TimeoutMinutes', $MonitorTimeoutMinutes
  )
  if ($AuditOnComplete) { $monitorArgs += '-AuditOnComplete' }
  if ($RepoFullName) { $monitorArgs += @('-RepoFullName', $RepoFullName) }
  $monitorProc = Start-Process -FilePath 'powershell.exe' -ArgumentList $monitorArgs -WindowStyle Hidden -PassThru
  "MONITOR_PID=$($monitorProc.Id)"
}

if ($Wait) {
  $waitArgs = @('-ManifestPath', $manifestPath, '-PollSeconds', $MonitorPollSeconds, '-TimeoutMinutes', $MonitorTimeoutMinutes)
  if ($AuditOnComplete) { $waitArgs += '-AuditOnComplete' }
  if ($RepoFullName) { $waitArgs += @('-RepoFullName', $RepoFullName) }
  & $Monitor @waitArgs
}
