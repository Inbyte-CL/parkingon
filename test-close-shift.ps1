$token = Get-Content -Path "TOKEN.txt" -Raw
$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}
$body = @{
    closing_cash = 550.00
    notes = "Cierre de turno de prueba"
} | ConvertTo-Json

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "CERRANDO TURNO" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Caja inicial: $500.00" -ForegroundColor Yellow
Write-Host "Ventas cash: $50.00" -ForegroundColor Yellow
Write-Host "Esperado: $550.00" -ForegroundColor Yellow
Write-Host "Caja final: $550.00" -ForegroundColor Yellow
Write-Host "Diferencia esperada: $0.00`n" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri 'https://mmqqrfvullrovstcykcj.supabase.co/functions/v1/close-shift' -Method Post -Headers $headers -Body $body -UseBasicParsing
    $closeData = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ STATUS:" $response.StatusCode -ForegroundColor Green
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "TURNO CERRADO EXITOSAMENTE" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Shift ID:" $closeData.shift.id -ForegroundColor Cyan
    Write-Host "Status:" $closeData.shift.status -ForegroundColor Cyan
    Write-Host "Cash Sales:" $closeData.shift.cash_sales -ForegroundColor Cyan
    Write-Host "Expected Cash:" $closeData.shift.expected_cash_drawer -ForegroundColor Cyan
    Write-Host "Closing Cash:" $closeData.shift.closing_cash -ForegroundColor Cyan
    Write-Host "Diferencia:" $closeData.shift.difference -ForegroundColor Cyan
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "ESTADÍSTICAS" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    $closeData.statistics | ConvertTo-Json -Depth 5
    
} catch {
    Write-Host "❌ ERROR:" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $errorBody = $reader.ReadToEnd()
    Write-Host $errorBody -ForegroundColor Red
}
