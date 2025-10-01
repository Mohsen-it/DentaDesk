@echo off
chcp 65001 >nul
title DentaDesk - مولد مفاتيح الترخيص

echo.
echo ╔════════════════════════════════════════════╗
echo ║     DentaDesk - مولد مفاتيح الترخيص      ║
echo ╚════════════════════════════════════════════╝
echo.

:: التحقق من وجود Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ خطأ: Node.js غير مثبت!
    echo.
    echo الرجاء تثبيت Node.js من:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: التحقق من وجود node_modules
if not exist "node_modules" (
    echo 📦 جاري تثبيت الحزم المطلوبة...
    echo.
    call npm install
    echo.
    if %errorlevel% neq 0 (
        echo ❌ فشل في تثبيت الحزم!
        pause
        exit /b 1
    )
    echo ✅ تم تثبيت الحزم بنجاح!
    echo.
)

:: تشغيل التطبيق
echo 🚀 جاري تشغيل التطبيق...
echo.
call npm start

if %errorlevel% neq 0 (
    echo.
    echo ❌ حدث خطأ في تشغيل التطبيق!
    pause
    exit /b 1
)

