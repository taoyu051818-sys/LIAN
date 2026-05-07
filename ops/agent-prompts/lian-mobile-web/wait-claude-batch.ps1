param(
  [Parameter(Mandatory=$true)][string]$ManifestPath,
  [int]$PollSeconds = 20,
  [int]$TimeoutMinutes = 0,
  [switch]$AuditOnComplete,
  [string]$AuditScript,
  [string]$RepoFullName
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (!(Test-Path -LiteralPath $ManifestPath)) {
  throw "Manifest not found: $ManifestPath"
}

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json

if (!$manifest.stamp) { throw "Manifest missing stamp" }
if (!$manifest.logDir) { throw "Manifest missing logDir" }
if (!$manifest.repo) { throw "Manifest missing repo" }
if (!$manifest.tasks) { throw "Manifest missing tasks" }

$tasks = @($manifest.tasks)
$totalTasks = $tasks.Count
$stamp = [string]$manifest.stamp
$logDir = [string]$manifest.logDir

if (!$AuditScript) {
  $AuditScript = Join-Path $PSScriptRoot 'audit-claude-batch.ps1'
}

$deadline = $null
if ($TimeoutMinutes -gt 0) {
  $deadline = (Get-Date).AddMinutes($TimeoutMinutes)
}

Write-Host "Waiting for $totalTasks tasks (stamp=$stamp, poll=${PollSeconds}s)"
if ($deadline) {
  Write-Host "Timeout: $TimeoutMinutes minutes (deadline: $($deadline.ToString('HH:mm:ss')))"
}

$doneTasks = @{}

while ($true) {
  $completed = 0
  $newlyDone = @()

  foreach ($task in $tasks) {
    $taskName = [string]$task.name
    if ($doneTasks.ContainsKey($taskName)) {
      $completed++
      continue
    }
    $donePath = [string]$task.donePath
    if ($donePath -and (Test-Path -LiteralPath $donePath)) {
      $doneTasks[$taskName] = $true
      $completed++
      $newlyDone += $taskName
    }
  }

  $ts = Get-Date -Format 'HH:mm:ss'
  $remaining = @($tasks | Where-Object { !$doneTasks.ContainsKey([string]$_.name) } | ForEach-Object { [string]$_.name })

  if ($newlyDone.Count -gt 0) {
    Write-Host "[$ts] done $completed/$totalTasks : $($newlyDone -join ', ')"
  } else {
    Write-Host "[$ts] done $completed/$totalTasks"
  }

  if ($completed -eq $totalTasks) {
    break
  }

  if ($deadline -and (Get-Date) -ge $deadline) {
    Write-Host "Timeout reached. Missing: $($remaining -join ', ')"
    $timedOut = $true
    break
  }

  Start-Sleep -Seconds $PollSeconds
}

Write-Host "`n===== WAIT SUMMARY ====="

$results = @()
foreach ($task in $tasks) {
  $taskName = [string]$task.name
  $donePath = [string]$task.donePath
  $stdoutPath = [string]$task.stdoutPath
  $stderrPath = [string]$task.stderrPath
  $metaPath = [string]$task.metaPath
  $worktree = [string]$task.worktree
  $branch = [string]$task.branch

  $exitCode = -1
  $doneContent = ''
  if ($donePath -and (Test-Path -LiteralPath $donePath)) {
    $doneContent = Get-Content -LiteralPath $donePath -Raw
    if ($doneContent -match 'exit[=:]\s*(\d+)') {
      $exitCode = [int]$Matches[1]
    }
  }

  $result = [pscustomobject]@{
    task = $taskName
    branch = $branch
    worktree = $worktree
    done = ($donePath -and (Test-Path -LiteralPath $donePath))
    exitCode = $exitCode
    stdoutPath = $stdoutPath
    stderrPath = $stderrPath
    metaPath = $metaPath
    donePath = $donePath
  }
  $results += $result
}

$results | Format-Table -AutoSize

$waitSummaryPath = Join-Path $logDir "claude-batch-$stamp.wait-summary.json"
[pscustomobject]@{
  stamp = $stamp
  manifestPath = $ManifestPath
  completedAt = Get-Date -Format o
  timedOut = [bool]$timedOut
  totalTasks = $totalTasks
  passedTasks = @($results | Where-Object { $_.exitCode -eq 0 }).Count
  failedTasks = @($results | Where-Object { $_.exitCode -ne 0 }).Count
  results = $results
} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $waitSummaryPath -Encoding UTF8

Write-Host "WROTE=$waitSummaryPath"

$allPassed = -not $timedOut -and ($results | Where-Object { $_.exitCode -ne 0 }).Count -eq 0

if ($AuditOnComplete -and (Test-Path -LiteralPath $AuditScript)) {
  Write-Host "`nRunning audit..."
  $auditArgs = @('-ManifestPath', $ManifestPath)
  if ($RepoFullName) { $auditArgs += @('-RepoFullName', $RepoFullName) }
  & $AuditScript @auditArgs
  $auditExit = $LASTEXITCODE
  if ($auditExit -ne 0) {
    Write-Host "Audit failed (exit=$auditExit)"
    exit $auditExit
  }
}

if (-not $allPassed) {
  if ($timedOut) {
    Write-Host "FAILED: timed out waiting for tasks"
  } else {
    Write-Host "FAILED: some tasks exited non-zero"
  }
  exit 1
}

Write-Host "ALL PASSED"
exit 0
