# Script para deployar todas las Edge Functions a Supabase
# Uso: .\deploy-functions.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying Edge Functions to Supabase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "supabase\config.toml")) {
    Write-Host "Error: Debes ejecutar este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Lista de funciones a deployar
$functions = @(
    "create-session",
    "close-session",
    "create-quote",
    "process-payment",
    "open-shift",
    "close-shift"
)

Write-Host "Funciones a deployar:" -ForegroundColor Yellow
foreach ($func in $functions) {
    Write-Host "  - $func" -ForegroundColor White
}
Write-Host ""

# Preguntar confirmación
$confirm = Read-Host "¿Deseas continuar? (s/n)"
if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "Deploy cancelado" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Iniciando deploy..." -ForegroundColor Green
Write-Host ""

# Deployar cada función
$success = 0
$failed = 0

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Yellow
    
    try {
        supabase functions deploy $func
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $func deployed successfully" -ForegroundColor Green
            $success++
        } else {
            Write-Host "  ✗ $func failed to deploy" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "  ✗ Error deploying $func : $_" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
}

# Resumen
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Success: $success" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "¡Todas las funciones se deployaron exitosamente! 🎉" -ForegroundColor Green
} else {
    Write-Host "Algunas funciones fallaron. Revisa los errores arriba." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Para ver los logs:" -ForegroundColor Cyan
Write-Host "  supabase functions logs --follow" -ForegroundColor White
Write-Host ""
