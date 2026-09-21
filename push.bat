@echo off
cd /d C:\rynixtech\PC-Migration\rynixtech.github.io

echo.
echo ==============================
echo        RYNIX GIT PUSH
echo ==============================
echo.

git status

echo.
set /p msg="Enter commit message: "

if "%msg%"=="" set msg="Update website"

echo.
echo Commit message: %msg%
echo.

choice /C YN /M "Commit and push these changes?"

if errorlevel 2 (
    echo.
    echo Cancelled. Nothing was committed or pushed.
    pause
    exit /b 0
)

git add -A
git commit -m "%msg%"

if errorlevel 1 (
    echo.
    echo Commit failed. Nothing was pushed.
    pause
    exit /b 1
)

git push origin migration-clean

echo.
echo ==============================
echo        PUSH COMPLETE
echo ==============================
echo.

git status

pause