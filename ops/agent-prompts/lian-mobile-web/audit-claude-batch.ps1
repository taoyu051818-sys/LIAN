param(
  [Parameter(Mandatory=$true)][string]$ManifestPath,
  [string]$RepoFullName,
  [switch]$SkipPrChecks,
  [switch]$Strict
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Test-BoundaryMatch {
  param([string]$FilePath, [string[]]$Patterns)
  $normFile = $FilePath -replace '\\', '/'
  foreach ($pat in $Patterns) {
    $normPat = $pat -replace '\\', '/'
    if ($normPat -like '**/*') {
      $dirPat = $normPat -replace '/\*\*$', ''
      if ($normFile -like "$dirPat/*" -or $normFile -eq $dirPat) { return $true }
    }
    if ($normFile -like $normPat) { return $true }
    if ($normFile -eq $normPat) { return $true }
  }
  return $false
}

function Test-DocsBoundaryViolation {
  param([string[]]$ChangedFiles)
  $docForbidden = @('src/**', 'server.js', 'data/**', 'package.json', 'package-lock.json')
  foreach ($f in $ChangedFiles) {
    $norm = $f -replace '\\', '/'
    if ($norm -like 'src/*' -or $norm -like 'src/**') { return $true }
    if ($norm -eq 'server.js') { return $true }
    if ($norm -like 'data/*' -or $norm -like 'data/**') { return $true }
    if ($norm -eq 'package.json') { return $true }
    if ($norm -eq 'package-lock.json') { return $true }
  }
  return $false
}

function Get-GhPrUrl {
  param([string]$Branch, [string]$Repo)
  try {
    $ghExe = Get-Command gh -ErrorAction SilentlyContinue
    if (!$ghExe) { return $null }
    $prJson = gh pr list --head $Branch --repo $Repo --json url,number,state 2>&1
    if ($LASTEXITCODE -ne 0) { return $null }
    $prs = $prJson | ConvertFrom-Json
    if ($prs.Count -gt 0) { return $prs[0].url }
    return $null
  } catch {
    return $null
  }
}

if (!(Test-Path -LiteralPath $ManifestPath)) {
  throw "Manifest not found: $ManifestPath"
}

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json

if (!$manifest.stamp) { throw "Manifest missing stamp" }
if (!$manifest.logDir) { throw "Manifest missing logDir" }
if (!$manifest.tasks) { throw "Manifest missing tasks" }

$stamp = [string]$manifest.stamp
$logDir = [string]$manifest.logDir
$tasks = @($manifest.tasks)

Write-Host "Auditing $tasks.Count tasks (stamp=$stamp)"

$hasGh = [bool](Get-Command gh -ErrorAction SilentlyContinue)
$auditResults = @()

foreach ($task in $tasks) {
  $taskName = [string]$task.name
  $taskType = if ($task.type) { [string]$task.type } else { 'unspecified' }
  $branch = [string]$task.branch
  $worktree = [string]$task.worktree
  $donePath = [string]$task.donePath
  $stdoutPath = [string]$task.stdoutPath
  $stderrPath = [string]$task.stderrPath
  $metaPath = [string]$task.metaPath
  $allowedFiles = @($task.allowedFiles | ForEach-Object { [string]$_ })
  $forbiddenFiles = @($task.forbiddenFiles | ForEach-Object { [string]$_ })

  $exitCode = -1
  $doneExists = $donePath -and (Test-Path -LiteralPath $donePath)
  $stderrLines = @()
  $stderrLength = 0
  $stdoutExists = $stdoutPath -and (Test-Path -LiteralPath $stdoutPath)
  $stderrExists = $stderrPath -and (Test-Path -LiteralPath $stderrPath)
  $metaExists = $metaPath -and (Test-Path -LiteralPath $metaPath)
  $worktreeExists = $worktree -and (Test-Path -LiteralPath $worktree)
  $isDirty = $false
  $commitsAhead = 0
  $changedFiles = @()
  $forbiddenTouched = @()
  $allowedViolation = $false
  $docsViolation = $false
  $prUrl = $null
  $prExpected = $false
  $prMissing = $false
  $issues = @()

  if ($doneExists) {
    $doneContent = Get-Content -LiteralPath $donePath -Raw
    if ($doneContent -match 'exit[=:]\s*(\d+)') {
      $exitCode = [int]$Matches[1]
    }
  } else {
    $issues += 'done file missing'
  }

  if ($stderrExists) {
    $stderrContent = Get-Content -LiteralPath $stderrPath -ErrorAction SilentlyContinue
    $stderrLines = @($stderrContent)
    $stderrLength = $stderrLines.Count
  }

  if (!$stdoutExists) { $issues += 'stdout missing' }
  if (!$metaExists) { $issues += 'meta missing' }

  if ($worktreeExists) {
    $dirty = git -C $worktree status --porcelain 2>&1
    $isDirty = [bool]$dirty

    $ahead = git -C $worktree rev-list --count origin/main..HEAD 2>&1
    if ($ahead -match '^\d+$') { $commitsAhead = [int]$ahead }

    $diffOut = git -C $worktree diff --name-only origin/main...HEAD 2>&1
    $changedFiles = @($diffOut | Where-Object { $_.Trim() -ne '' })
  } else {
    $issues += 'worktree missing'
  }

  if ($forbiddenFiles.Count -gt 0) {
    foreach ($cf in $changedFiles) {
      if (Test-BoundaryMatch -FilePath $cf -Patterns $forbiddenFiles) {
        $forbiddenTouched += $cf
      }
    }
  }

  if ($allowedFiles.Count -gt 0) {
    foreach ($cf in $changedFiles) {
      if (!(Test-BoundaryMatch -FilePath $cf -Patterns $allowedFiles)) {
        $allowedViolation = $true
        break
      }
    }
  }

  if ($taskType -eq 'docs') {
    if (Test-DocsBoundaryViolation -ChangedFiles $changedFiles) {
      $docsViolation = $true
    }
  }

  if ($taskType -in @('review', 'planner')) {
    if ($changedFiles.Count -gt 0 -and $allowedFiles.Count -eq 0) {
      $allowedViolation = $true
    }
  }

  $prExpected = -not ($taskType -in @('review', 'planner', 'docs'))
  if ($prExpected -and !$SkipPrChecks -and $hasGh -and $RepoFullName) {
    $prUrl = Get-GhPrUrl -Branch $branch -Repo $RepoFullName
    if (!$prUrl) { $prMissing = $true }
  } elseif ($taskType -eq 'docs' -and !$SkipPrChecks -and $hasGh -and $RepoFullName) {
    $prUrl = Get-GhPrUrl -Branch $branch -Repo $RepoFullName
  }

  $pass = $true
  if (!$doneExists) { $pass = $false }
  if ($exitCode -ne 0) { $pass = $false }
  if ($isDirty -and $Strict) { $pass = $false }
  if ($forbiddenTouched.Count -gt 0) { $pass = $false }
  if ($allowedViolation) { $pass = $false }
  if ($docsViolation) { $pass = $false }
  if ($prMissing) { $pass = $false }

  $auditResults += [pscustomobject]@{
    task = $taskName
    type = $taskType
    exitCode = $exitCode
    doneExists = $doneExists
    dirty = $isDirty
    commitsAhead = $commitsAhead
    changedFiles = $changedFiles
    forbiddenTouched = $forbiddenTouched
    allowedViolation = $allowedViolation
    docsViolation = $docsViolation
    prUrl = $prUrl
    prExpected = $prExpected
    prMissing = $prMissing
    stderrLength = $stderrLength
    stderrLastLines = if ($stderrLines.Count -gt 3) { $stderrLines[-3..-1] } else { $stderrLines }
    issues = $issues
    pass = $pass
  }
}

Write-Host "`n===== AUDIT TABLE ====="
$tableRows = $auditResults | ForEach-Object {
  $status = if ($_.pass) { 'PASS' } else { 'FAIL' }
  $dirtyFlag = if ($_.dirty) { 'DIRTY' } else { 'clean' }
  $boundaryFlag = if ($_.forbiddenTouched.Count -gt 0) { 'FORBIDDEN' } elseif ($_.allowedViolation) { 'OUTSIDE' } elseif ($_.docsViolation) { 'DOCS-BOUND' } else { 'ok' }
  $prFlag = if ($_.prUrl) { $_.prUrl } elseif ($_.prMissing) { 'MISSING' } else { '-' }
  [pscustomobject]@{
    task = $_.task
    exit = $_.exitCode
    dirty = $dirtyFlag
    boundary = $boundaryFlag
    pr = $prFlag
    status = $status
  }
}
$tableRows | Format-Table -AutoSize

$summaryPath = Join-Path $logDir "claude-batch-$stamp.audit-summary.json"
[pscustomobject]@{
  stamp = $stamp
  manifestPath = $ManifestPath
  auditedAt = Get-Date -Format o
  repoFullName = $RepoFullName
  totalTasks = $auditResults.Count
  passedTasks = @($auditResults | Where-Object { $_.pass }).Count
  failedTasks = @($auditResults | Where-Object { !$_.pass }).Count
  results = $auditResults
} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $summaryPath -Encoding UTF8
Write-Host "WROTE=$summaryPath"

$mdPath = Join-Path $logDir "claude-batch-$stamp.audit-summary.md"
$mdLines = @("# Audit Summary", "", "stamp: $stamp", "manifest: $ManifestPath", "date: $(Get-Date -Format o)", "", "## Results", "", "| task | exit | dirty | boundary | pr | status |", "|------|------|-------|----------|-----|--------|")
foreach ($r in $tableRows) {
  $mdLines += "| $($r.task) | $($r.exit) | $($r.dirty) | $($r.boundary) | $($r.pr) | $($r.status) |"
}
$mdLines += ""
$mdLines | Set-Content -LiteralPath $mdPath -Encoding UTF8
Write-Host "WROTE=$mdPath"

$allPassed = ($auditResults | Where-Object { !$_.pass }).Count -eq 0
if ($allPassed) {
  Write-Host "`nAUDIT PASSED"
  exit 0
} else {
  $failedNames = ($auditResults | Where-Object { !$_.pass } | ForEach-Object { $_.task }) -join ', '
  Write-Host "`nAUDIT FAILED: $failedNames"
  exit 1
}
