@echo off
echo Limpiando cache de Expo y Metro...

REM Eliminar carpeta .expo
if exist ".expo" (
    echo Eliminando .expo...
    rmdir /s /q ".expo"
)

REM Eliminar cache de node_modules
if exist "node_modules\.cache" (
    echo Eliminando node_modules\.cache...
    rmdir /s /q "node_modules\.cache"
)

REM Eliminar cache de Metro en temp
echo Eliminando cache de Metro...
del /q "%LOCALAPPDATA%\Temp\metro-*" 2>nul
del /q "%LOCALAPPDATA%\Temp\haste-map-*" 2>nul

REM Eliminar cache de watchman si existe
if exist "%LOCALAPPDATA%\.watchman" (
    echo Eliminando cache de watchman...
    rmdir /s /q "%LOCALAPPDATA%\.watchman"
)

echo.
echo Cache limpiado! Ahora ejecuta: npx expo start
echo.
pause
