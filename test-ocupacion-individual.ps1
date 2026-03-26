$token = Get-Content -Path "TOKEN.txt" -Raw
$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "OCUPACIÓN INDIVIDUAL POR PARKING" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

$response = Invoke-RestMethod `
    -Uri 'https://mmqqrfvullrovstcykcj.supabase.co/functions/v1/get-parking-status' `
    -Method Post `
    -Headers $headers `
    -Body '{}'

foreach ($p in $response.parkings) {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📍 $($p.parking_name)" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  ID: $($p.parking_id)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  📊 CAPACIDAD" -ForegroundColor Yellow
    Write-Host "     Total: $($p.total_spaces) espacios" -ForegroundColor White
    Write-Host ""
    Write-Host "  🚗 OCUPACIÓN ACTUAL" -ForegroundColor Yellow
    Write-Host "     Ocupados: $($p.occupied_spaces) espacios" -ForegroundColor Red
    Write-Host "     Disponibles: $($p.available_spaces) espacios" -ForegroundColor Green
    Write-Host "     Porcentaje: $($p.occupancy_percentage)%" -ForegroundColor White
    Write-Host ""
    
    $pct = $p.occupancy_percentage
    if ($pct -ge 100) {
        Write-Host "  🔴 ESTADO: LLENO - NO HAY ESPACIOS" -ForegroundColor Red
    } elseif ($pct -ge 90) {
        Write-Host "  🟠 ESTADO: CASI LLENO - Solo $($p.available_spaces) espacios" -ForegroundColor DarkYellow
    } elseif ($pct -ge 50) {
        Write-Host "  🟡 ESTADO: OCUPACIÓN MODERADA" -ForegroundColor Yellow
    } else {
        Write-Host "  🟢 ESTADO: DISPONIBLE - $($p.available_spaces) espacios libres" -ForegroundColor Green
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ CONSULTA COMPLETADA" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
