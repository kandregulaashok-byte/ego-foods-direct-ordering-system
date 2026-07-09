$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$shell = New-Object -ComObject WScript.Shell
$window = Get-Process electron -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowTitle -like '*Kitchen OS*' } |
  Select-Object -First 1

if ($window) {
  $null = $shell.AppActivate($window.MainWindowTitle)
  exit
}

$running = Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*$projectDir*" -and $_.Name -in @('electron.exe', 'node.exe') } |
  Select-Object -First 1

if ($running) { exit }

Set-Location $projectDir
if (-not (Test-Path "node_modules")) {
  npm install
}
npm run electron:dev
