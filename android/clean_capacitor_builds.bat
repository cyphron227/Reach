@echo off
for /d %%i in ("c:\Users\cyphr\Documents\Company2Code\reach\node_modules\@capacitor\*") do (
    if exist "%%i\android\build" rmdir /s /q "%%i\android\build" 2>nul
)
for /d %%i in ("c:\Users\cyphr\Documents\Company2Code\reach\node_modules\@capacitor-community\*") do (
    if exist "%%i\android\build" rmdir /s /q "%%i\android\build" 2>nul
)
echo Done
