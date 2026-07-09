@echo off
setlocal
cd /d "%~dp0"
title Kitchen OS - Ego Foods

if not exist node_modules (
  echo Installing Kitchen OS dependencies...
  call npm install
)

echo Starting Kitchen OS dashboard...
call npm run electron:dev

pause
