@echo off
cd /d %~dp0
set "PATH=C:\Program Files\nodejs;%PATH%"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo Starting frontend at http://localhost:3000
call npm run dev
pause
