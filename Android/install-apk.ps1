# Script para compilar e instalar la APK en dispositivo Android

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PARKING ON STREET - BUILD & INSTALL" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Limpiar build anterior
Write-Host "1. Limpiando build anterior..." -ForegroundColor Yellow
.\gradlew.bat clean

# 2. Compilar APK Debug
Write-Host "`n2. Compilando APK Debug..." -ForegroundColor Yellow
.\gradlew.bat assembleDebug

# 3. Verificar que se creó la APK
$apkPath = "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    Write-Host "`n✅ APK compilada exitosamente" -ForegroundColor Green
    Write-Host "   Ubicación: $apkPath" -ForegroundColor Gray
    
    # 4. Verificar dispositivos conectados
    Write-Host "`n3. Verificando dispositivos conectados..." -ForegroundColor Yellow
    $devices = adb devices
    Write-Host $devices
    
    # 5. Instalar APK
    Write-Host "`n4. Instalando APK en dispositivo..." -ForegroundColor Yellow
    adb install -r $apkPath
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "✅ INSTALACIÓN COMPLETADA" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "`nAbre la app 'Inbyte Street' en tu dispositivo" -ForegroundColor White
    
} else {
    Write-Host "`n❌ ERROR: No se pudo compilar la APK" -ForegroundColor Red
    Write-Host "   Revisa los errores de compilación arriba" -ForegroundColor Yellow
}
