$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$running = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'electron.exe' -and
    $_.CommandLine -like "*$projectDir*" -and
    $_.CommandLine -like "*electron.exe* ."
  } |
  Select-Object -First 1

if ($running) {
  $shell = New-Object -ComObject WScript.Shell
  $null = $shell.AppActivate([int]$running.ProcessId)
  exit
}

Set-Location $projectDir
if (-not (Test-Path "node_modules")) {
  npm install
}
npm run electron:dev
