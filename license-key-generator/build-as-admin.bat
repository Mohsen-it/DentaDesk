@echo off
chcp 65001 >nul
title DentaDesk - بناء التطبيق (يتطلب صلاحيات المسؤول)

:: التحقق من صلاحيات المسؤول
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"

:: إذا لم تكن هناك صلاحيات، طلب التشغيل كمسؤول
if '%errorlevel%' NEQ '0' (
    echo.
    echo ══════════════════════════════════════════════════════
    echo    يتطلب هذا السكريبت صلاحيات المسؤول
    echo    Administrator privileges required
    echo ══════════════════════════════════════════════════════
    echo.
    echo    سيتم طلب صلاحيات المسؤول...
    echo.
    goto UACPrompt
) else (
    goto gotAdmin
)

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║    DentaDesk - License Generator Build Tool           ║
echo ║    أداة بناء مولد مفاتيح الترخيص                     ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo 🔍 التحقق من المتطلبات...
echo.

:: التحقق من Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ خطأ: Node.js غير مثبت!
    echo.
    pause
    exit /b 1
)

:: التحقق من node_modules
if not exist "node_modules" (
    echo 📦 تثبيت الحزم المطلوبة...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ فشل في تثبيت الحزم!
        pause
        exit /b 1
    )
)

echo ✅ جميع المتطلبات متوفرة
echo.
echo 🏗️  جاري بناء التطبيق...
echo    This may take several minutes...
echo.

:: بناء التطبيق
call npm run dist:win

if %errorlevel% neq 0 (
    echo.
    echo ❌ فشل في بناء التطبيق!
    echo.
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║              ✅ تم بناء التطبيق بنجاح!                ║
echo ║         Build completed successfully!                  ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo 📂 الملفات المولدة في مجلد: dist\
echo    Output files in folder: dist\
echo.

pause

