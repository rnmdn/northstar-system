$ErrorActionPreference = 'Stop'
$taskEncrypted = Get-Content -LiteralPath $env:ASTRA_AI_KEY_FILE -Raw
$taskSecret = ConvertTo-SecureString -String $taskEncrypted.Trim()
try {
  $taskCredential = [System.Net.NetworkCredential]::new('', $taskSecret)
  [Console]::Write($taskCredential.Password)
} finally {
  $taskSecret.Dispose()
  $taskCredential = $null
}
