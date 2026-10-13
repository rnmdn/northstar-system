param([int]$PreviousServerProcessId = 0)
$ErrorActionPreference = 'Stop'
$taskProject = Split-Path -Parent $PSScriptRoot
$taskNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
if (-not (Test-Path -LiteralPath $taskNode)) { $taskNode = (Get-Command node -ErrorAction Stop).Source }
Set-Location -LiteralPath $taskProject
Write-Host 'NorthStar: connect Gemini grading' -ForegroundColor Cyan
Write-Host 'Paste your Gemini API key below. Input is hidden. It will be saved encrypted for this Windows account.'
$taskSecret = Read-Host 'Gemini API key' -AsSecureString
$taskCredential = [System.Net.NetworkCredential]::new('', $taskSecret)
if ([string]::IsNullOrWhiteSpace($taskCredential.Password)) { throw 'No key entered. The current server was left running.' }
$taskKeyValue = $taskCredential.Password.Trim()
if ($taskKeyValue -notmatch '^[\x21-\x7e]+$') { throw 'The key contains invalid characters. Copy only the API key from Google AI Studio and run this launcher again.' }
$env:GEMINI_API_KEY = $taskKeyValue
$taskKeyValue = $null
$taskCredential = $null
$taskKeyDirectory = if ($env:ASTRA_DATA_DIR) { [System.IO.Path]::GetFullPath($env:ASTRA_DATA_DIR) } else { Join-Path $taskProject '.astra-data' }
[System.IO.Directory]::CreateDirectory($taskKeyDirectory) | Out-Null
$taskSecret | ConvertFrom-SecureString | Set-Content -LiteralPath (Join-Path $taskKeyDirectory 'gemini-key.dpapi') -Encoding ascii
$taskSecret.Dispose()
try {
  $taskListeners = @(Get-NetTCPConnection -LocalPort 8766 -State Listen -ErrorAction SilentlyContinue)
  foreach ($taskListener in $taskListeners) {
    $taskExisting = Get-CimInstance Win32_Process -Filter "ProcessId = $($taskListener.OwningProcess)"
    if ($PreviousServerProcessId -gt 0 -and $taskExisting.ProcessId -eq $PreviousServerProcessId -and $taskExisting.Name -eq 'node.exe' -and $taskExisting.CommandLine -match 'server\.js') {
      Stop-Process -Id $taskExisting.ProcessId -ErrorAction Stop
      Wait-Process -Id $taskExisting.ProcessId -Timeout 10 -ErrorAction SilentlyContinue
    } else {
      throw 'Another process is using port 8766. Stop that server, then run this launcher again.'
    }
  }
  Write-Host 'Starting NorthStar with the key connected. Keep this window open.' -ForegroundColor Green
  & $taskNode (Join-Path $taskProject 'server.js')
} finally {
  Remove-Item Env:GEMINI_API_KEY -ErrorAction SilentlyContinue
}
