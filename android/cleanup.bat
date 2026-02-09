@echo off
echo Cleaning Capacitor build directories...

for /d %%i in ("c:\Users\cyphr\Documents\Company2Code\reach\node_modules\@capacitor\*") do (
    if exist "%%i\android\build" (
        rmdir /s /q "%%i\android\build" 2>nul
        echo Removed: %%i\android\build
    )
)

for /d %%i in ("c:\Users\cyphr\Documents\Company2Code\reach\node_modules\@capacitor-community\*") do (
    if exist "%%i\android\build" (
        rmdir /s /q "%%i\android\build" 2>nul
        echo Removed: %%i\android\build
    )
)

if exist "c:\Users\cyphr\Documents\Company2Code\reach\android\app\build" (
    rmdir /s /q "c:\Users\cyphr\Documents\Company2Code\reach\android\app\build" 2>nul
    echo Removed: android\app\build
)
if exist "c:\Users\cyphr\Documents\Company2Code\reach\android\build" (
    rmdir /s /q "c:\Users\cyphr\Documents\Company2Code\reach\android\build" 2>nul
    echo Removed: android\build
)
if exist "c:\Users\cyphr\Documents\Company2Code\reach\android\.gradle" (
    rmdir /s /q "c:\Users\cyphr\Documents\Company2Code\reach\android\.gradle" 2>nul
    echo Removed: android\.gradle
)

echo Cleanup complete
