# Funcionalidad de Capacidad y Ocupación de Parkings

## 📋 Descripción

Esta funcionalidad permite gestionar la capacidad de cada parking y monitorear la ocupación en tiempo real, mostrando cuántos espacios están ocupados vs disponibles.

## 🎯 Características

### 1. Capacidad por Parking
- Cada parking puede tener una capacidad definida (`total_spaces`)
- La capacidad es opcional (NULL = capacidad ilimitada)
- Se valida que sea un número positivo

### 2. Cálculo de Ocupación en Tiempo Real
- **Ocupados**: Cuenta de sesiones con `status = 'open'`
- **Disponibles**: `total_spaces - ocupados`
- **Porcentaje**: `(ocupados / total_spaces) × 100`

### 3. Validación Automática
- Al crear una sesión, se verifica si hay espacios disponibles
- Si el parking está lleno, se rechaza la creación de la sesión
- Mensaje claro con información de ocupación

### 4. Estados de Disponibilidad
- **`unlimited`**: Sin capacidad definida
- **`available`**: < 50% ocupado
- **`moderate`**: 50-90% ocupado
- **`almost_full`**: 90-100% ocupado
- **`full`**: 100% ocupado

## 📊 Estructura de Datos

### Campo Agregado a `parkings`

```sql
ALTER TABLE parkings 
ADD COLUMN total_spaces INTEGER CHECK (total_spaces IS NULL OR total_spaces > 0);
```

## 🔧 Funciones SQL Creadas

### 1. `get_parking_occupancy(p_parking_id UUID)`
Obtiene la ocupación de un parking específico.

**Retorna:**
```typescript
{
  parking_id: UUID
  parking_name: string
  total_spaces: number | null
  occupied_spaces: number
  available_spaces: number | null
  occupancy_percentage: number | null
}
```

### 2. `get_org_parkings_occupancy(p_org_id UUID)`
Obtiene la ocupación de todos los parkings de una organización.

**Retorna:** Array del mismo tipo que `get_parking_occupancy`

### 3. Vista `parking_occupancy_realtime`
Vista SQL para monitoreo en tiempo real con estado de disponibilidad.

## 🚀 Edge Function: `get-parking-status`

### Endpoint
```
POST/GET https://[PROJECT].supabase.co/functions/v1/get-parking-status
```

### Autenticación
```
Authorization: Bearer [USER_TOKEN]
```

### Parámetros

#### Obtener un parking específico:
```json
{
  "parking_id": "uuid-del-parking"
}
```

O como query parameter:
```
GET /get-parking-status?parking_id=uuid-del-parking
```

#### Obtener todos los parkings de la organización:
No enviar `parking_id`

### Respuesta - Parking Específico

```json
{
  "success": true,
  "parking": {
    "parking_id": "b0000000-0000-0000-0000-000000000001",
    "parking_name": "Zona Centro",
    "total_spaces": 50,
    "occupied_spaces": 12,
    "available_spaces": 38,
    "occupancy_percentage": 24.00
  }
}
```

### Respuesta - Todos los Parkings

```json
{
  "success": true,
  "parkings": [
    {
      "parking_id": "b0000000-0000-0000-0000-000000000001",
      "parking_name": "Zona Centro",
      "total_spaces": 50,
      "occupied_spaces": 12,
      "available_spaces": 38,
      "occupancy_percentage": 24.00,
      "status": "active"
    },
    {
      "parking_id": "b0000000-0000-0000-0000-000000000002",
      "parking_name": "Zona Norte",
      "total_spaces": 30,
      "occupied_spaces": 28,
      "available_spaces": 2,
      "occupancy_percentage": 93.33,
      "status": "active"
    }
  ],
  "summary": {
    "total_parkings": 2,
    "total_spaces": 80,
    "total_occupied": 40,
    "total_available": 40
  }
}
```

## 🔄 Integración con `create-session`

La función `create-session` ahora valida automáticamente la capacidad:

### Comportamiento
1. Antes de crear una sesión, consulta `get_parking_occupancy`
2. Si `available_spaces <= 0`, rechaza la sesión
3. Retorna error 400 con información de ocupación

### Respuesta de Error (Parking Lleno)

```json
{
  "error": "Parking lleno. No hay espacios disponibles.",
  "occupancy": {
    "total_spaces": 50,
    "occupied_spaces": 50,
    "available_spaces": 0,
    "occupancy_percentage": 100.00
  }
}
```

## 📱 Ejemplos de Uso

### JavaScript/TypeScript

```typescript
// Obtener estado de un parking específico
const { data, error } = await supabase.functions.invoke('get-parking-status', {
  body: { parking_id: 'uuid-del-parking' }
})

// Obtener todos los parkings
const { data, error } = await supabase.functions.invoke('get-parking-status')

console.log(`Ocupación: ${data.parking.occupied_spaces}/${data.parking.total_spaces}`)
console.log(`Disponibles: ${data.parking.available_spaces}`)
console.log(`Porcentaje: ${data.parking.occupancy_percentage}%`)
```

### Android (Kotlin)

```kotlin
// Obtener estado de un parking
val client = createClient(supabaseUrl, supabaseKey)
val response = client.functions.invoke(
    "get-parking-status",
    body = mapOf("parking_id" to parkingId)
)

val parking = response.data["parking"] as Map<String, Any>
val occupied = parking["occupied_spaces"] as Int
val total = parking["total_spaces"] as Int
val available = parking["available_spaces"] as Int

// Mostrar en UI
binding.tvOccupancy.text = "$occupied/$total espacios ocupados"
binding.tvAvailable.text = "$available espacios disponibles"
```

### cURL

```bash
# Obtener un parking específico
curl -X POST \
  'https://[PROJECT].supabase.co/functions/v1/get-parking-status' \
  -H 'Authorization: Bearer [TOKEN]' \
  -H 'Content-Type: application/json' \
  -d '{"parking_id":"b0000000-0000-0000-0000-000000000001"}'

# Obtener todos los parkings
curl -X POST \
  'https://[PROJECT].supabase.co/functions/v1/get-parking-status' \
  -H 'Authorization: Bearer [TOKEN]' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### PowerShell

```powershell
$token = Get-Content -Path "TOKEN.txt" -Raw
$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

# Obtener todos los parkings
$response = Invoke-RestMethod `
    -Uri 'https://[PROJECT].supabase.co/functions/v1/get-parking-status' `
    -Method Post `
    -Headers $headers `
    -Body '{}'

# Mostrar resumen
Write-Host "Total parkings: $($response.summary.total_parkings)"
Write-Host "Espacios totales: $($response.summary.total_spaces)"
Write-Host "Ocupados: $($response.summary.total_occupied)"
Write-Host "Disponibles: $($response.summary.total_available)"

# Mostrar cada parking
foreach ($parking in $response.parkings) {
    Write-Host "`n$($parking.parking_name):"
    Write-Host "  Ocupación: $($parking.occupied_spaces)/$($parking.total_spaces)"
    Write-Host "  Disponibles: $($parking.available_spaces)"
    Write-Host "  Porcentaje: $($parking.occupancy_percentage)%"
}
```

## 🗄️ Consultas SQL Directas

### Ver ocupación en tiempo real

```sql
SELECT * FROM parking_occupancy_realtime
WHERE org_id = 'tu-org-id'
ORDER BY occupancy_percentage DESC;
```

### Actualizar capacidad de un parking

```sql
UPDATE parkings 
SET total_spaces = 100 
WHERE id = 'parking-id';
```

### Ver parkings llenos

```sql
SELECT * FROM parking_occupancy_realtime
WHERE availability_status = 'full';
```

### Ver parkings casi llenos

```sql
SELECT * FROM parking_occupancy_realtime
WHERE availability_status IN ('almost_full', 'full')
ORDER BY occupancy_percentage DESC;
```

## 📋 Instalación

### 1. Ejecutar Script SQL

```bash
# En Supabase SQL Editor
# Ejecutar: database/add-parking-capacity.sql
```

### 2. Desplegar Edge Function

```bash
supabase functions deploy get-parking-status --no-verify-jwt
```

### 3. Redesplegar create-session (con validación)

```bash
supabase functions deploy create-session --no-verify-jwt
```

## ⚙️ Configuración

### Deshabilitar Validación de Capacidad

Si quieres que `create-session` NO valide la capacidad, simplemente comenta o elimina la sección de validación en el código (líneas 139-159).

### Capacidad Ilimitada

Para parkings sin límite de capacidad, simplemente deja `total_spaces` como `NULL`:

```sql
UPDATE parkings 
SET total_spaces = NULL 
WHERE id = 'parking-id';
```

## 🎨 UI/UX Recomendaciones

### Colores por Estado
- **available** (< 50%): Verde 🟢
- **moderate** (50-90%): Amarillo 🟡
- **almost_full** (90-100%): Naranja 🟠
- **full** (100%): Rojo 🔴
- **unlimited**: Azul 🔵

### Iconos
- 🅿️ Parking
- 🚗 Vehículo
- ✅ Disponible
- ⚠️ Casi lleno
- 🚫 Lleno

### Actualización en Tiempo Real
- Refrescar cada 30-60 segundos
- Usar WebSockets/Realtime de Supabase para updates instantáneos
- Mostrar timestamp de última actualización

## 🔐 Seguridad

- ✅ Autenticación requerida (Bearer token)
- ✅ Solo usuarios autenticados pueden consultar
- ✅ Solo se muestran parkings de la organización del usuario
- ✅ RLS activo en tabla `parkings`

## 📊 Métricas y Reportes

### Dashboard Sugerido
1. **Ocupación actual** por parking
2. **Tendencias** de ocupación por hora/día
3. **Picos de ocupación** históricos
4. **Tiempo promedio** de estacionamiento
5. **Ingresos** por parking

### Queries Útiles

```sql
-- Ocupación promedio por hora del día
SELECT 
    EXTRACT(HOUR FROM entry_time) as hour,
    COUNT(*) as sessions,
    AVG(EXTRACT(EPOCH FROM (COALESCE(exit_time, NOW()) - entry_time))/60) as avg_minutes
FROM sessions
WHERE parking_id = 'parking-id'
AND entry_time > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;

-- Parkings más utilizados
SELECT 
    p.name,
    COUNT(s.id) as total_sessions,
    SUM(CASE WHEN s.status = 'open' THEN 1 ELSE 0 END) as currently_open
FROM parkings p
LEFT JOIN sessions s ON s.parking_id = p.id
WHERE p.org_id = 'org-id'
GROUP BY p.id, p.name
ORDER BY total_sessions DESC;
```

## ✅ Testing

Ver script de testing en: `test-parking-capacity.ps1`

## 📝 Notas

- La ocupación se calcula en tiempo real basándose en sesiones con `status = 'open'`
- Las sesiones cerradas (`status = 'closed'`) NO cuentan para la ocupación
- Si un parking no tiene `total_spaces` definido, se considera de capacidad ilimitada
- La validación de capacidad es opcional y puede deshabilitarse

## 🚀 Próximas Mejoras

1. **Reservas**: Permitir reservar espacios con anticipación
2. **Notificaciones**: Alertar cuando un parking esté casi lleno
3. **Histórico**: Guardar snapshots de ocupación para análisis
4. **Predicción**: ML para predecir ocupación futura
5. **Prioridades**: Espacios reservados para discapacitados, eléctricos, etc.
