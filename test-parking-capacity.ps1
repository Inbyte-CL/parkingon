$token = Get-Content -Path "TOKEN.txt" -Raw
$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: FUNCIONALIDAD DE CAPACIDAD" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Obtener estado de todos los parkings
Write-Host "1. Obteniendo estado de todos los parkings..." -ForegroundColor Yellow

$response = Invoke-RestMethod `
    -Uri 'https://mmqqrfvullrovstcykcj.supabase.co/functions/v1/get-parking-status' `
    -Method Post `
    -Headers $headers `
    -Body '{}'

Write-Host "✅ Respuesta exitosa`n" -ForegroundColor Green

# Mostrar resumen
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMEN GENERAL" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total parkings: $($response.summary.total_parkings)"
Write-Host "Espacios totales: $($response.summary.total_spaces)"
Write-Host "Ocupados: $($response.summary.total_occupied)"
Write-Host "Disponibles: $($response.summary.total_available)"

# Mostrar cada parking
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DETALLE POR PARKING" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

foreach ($parking in $response.parkings) {
    Write-Host "`n📍 $($parking.parking_name)" -ForegroundColor Cyan
    Write-Host "   ID: $($parking.parking_id)" -ForegroundColor Gray
    Write-Host "   Capacidad total: $($parking.total_spaces)" -ForegroundColor White
    Write-Host "   Ocupados: $($parking.occupied_spaces)" -ForegroundColor Yellow
    Write-Host "   Disponibles: $($parking.available_spaces)" -ForegroundColor Green
    Write-Host "   Ocupación: $($parking.occupancy_percentage)%" -ForegroundColor White
    Write-Host "   Status: $($parking.status)" -ForegroundColor Gray
    
    # Indicador visual
    $percentage = $parking.occupancy_percentage
    if ($percentage -eq $null) {
        Write-Host "   🔵 Sin límite de capacidad" -ForegroundColor Blue
    } elseif ($percentage -ge 100) {
        Write-Host "   🔴 LLENO" -ForegroundColor Red
    } elseif ($percentage -ge 90) {
        Write-Host "   🟠 CASI LLENO" -ForegroundColor DarkYellow
    } elseif ($percentage -ge 50) {
        Write-Host "   🟡 OCUPACIÓN MODERADA" -ForegroundColor Yellow
    } else {
        Write-Host "   🟢 DISPONIBLE" -ForegroundColor Green
    }
}

# 2. Obtener estado de un parking específico
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "2. Obteniendo estado de parking específico..." -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

$firstParkingId = $response.parkings[0].parking_id
$body = @{ parking_id = $firstParkingId } | ConvertTo-Json
$specificResponse = Invoke-RestMethod `
    -Uri 'https://mmqqrfvullrovstcykcj.supabase.co/functions/v1/get-parking-status' `
    -Method Post `
    -Headers $headers `
    -Body $body

Write-Host "✅ Parking: $($specificResponse.parking.parking_name)" -ForegroundColor Green
Write-Host "   Ocupación: $($specificResponse.parking.occupied_spaces)/$($specificResponse.parking.total_spaces)" -ForegroundColor White
Write-Host "   Disponibles: $($specificResponse.parking.available_spaces)" -ForegroundColor Green
Write-Host "   Porcentaje: $($specificResponse.parking.occupancy_percentage)%" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ TESTS COMPLETADOS EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
