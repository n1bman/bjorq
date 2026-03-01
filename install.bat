@echo off
echo Installing bjorQ Dashboard server dependencies...
cd server
call npm install --omit=dev
cd ..
echo Done! Run start.bat to launch.
pause
