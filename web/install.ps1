# Script para instalar dependencias del proyecto web
# Ejecutar: .\install.ps1

Write-Host "🔍 Verificando Node.js..." -ForegroundColor Cyan

# Intentar encontrar Node.js en ubicaciones comunes
$nodePaths = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:ProgramFiles(x86)\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe"
)

$nodeFound = $false
$nodePath = $null

foreach ($path in $nodePaths) {
    if (Test-Path $path) {
        $nodePath = $path
        $nodeFound = $true
        Write-Host "✅ Node.js encontrado en: $path" -ForegroundColor Green
        break
    }
}

if (-not $nodeFound) {
    Write-Host "❌ Node.js no encontrado. Por favor:" -ForegroundColor Red
    Write-Host "   1. Instala Node.js desde https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "   2. Reinicia PowerShell/CMD después de instalar" -ForegroundColor Yellow
    Write-Host "   3. Verifica con: node --version" -ForegroundColor Yellow
    exit 1
}

# Verificar versión
$nodeVersion = & $nodePath --version
Write-Host "📦 Versión de Node.js: $nodeVersion" -ForegroundColor Cyan

# Encontrar npm
$npmPath = $nodePath -replace "node.exe", "npm.cmd"
if (-not (Test-Path $npmPath)) {
    $npmPath = $nodePath -replace "node.exe", "npm.exe"
}

if (-not (Test-Path $npmPath)) {
    Write-Host "❌ npm no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Instalando dependencias..." -ForegroundColor Cyan
Write-Host ""

# Ejecutar npm install
& $npmPath install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Dependencias instaladas correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "   1. Copia .env.local.example a .env.local" -ForegroundColor Yellow
    Write-Host "   2. Edita .env.local con tus credenciales de Supabase" -ForegroundColor Yellow
    Write-Host "   3. Ejecuta: npm run dev" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
    exit 1
}
