# Edge Functions - Parking On Street

Este directorio contiene las Edge Functions (funciones serverless) que implementan la lógica de negocio del sistema de estacionamiento.

## 📋 Funciones Disponibles

### 1. `create-session`
**Propósito:** Crear una nueva sesión de estacionamiento

**Endpoint:** `POST /functions/v1/create-session`

**Body:**
```json
{
  "plate": "ABC123",
  "parking_id": "uuid-del-parking"
}
```

**Validaciones:**
- ✅ Operador debe tener turno abierto
- ✅ Turno debe ser del mismo parking
- ✅ No debe existir sesión abierta para la misma patente en el mismo parking
- ✅ Normaliza la patente automáticamente

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "plate": "ABC123",
    "entry_time": "2026-01-24T10:00:00Z",
    "status": "open"
  },
  "message": "Sesión creada exitosamente"
}
```

---

### 2. `close-session`
**Propósito:** Cerrar una sesión sin procesar pago

**Endpoint:** `POST /functions/v1/close-session`

**Body:**
```json
{
  "session_id": "uuid-de-la-sesion"
}
```

**Validaciones:**
- ✅ La sesión debe existir y estar abierta
- ✅ El operador debe tener turno abierto

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "status": "closed",
    "exit_time": "2026-01-24T11:00:00Z"
  },
  "message": "Sesión cerrada exitosamente"
}
```

---

### 3. `create-quote`
**Propósito:** Crear una cotización que "congela" el monto a pagar

**Endpoint:** `POST /functions/v1/create-quote`

**Body:**
```json
{
  "session_id": "uuid-de-la-sesion"
}
```

**Lógica de Cálculo:**
```
monto_total = ceil(segundos_estacionado / 60) × tarifa_por_minuto

Donde:
- ceil() = redondeo hacia arriba (cobrar por minuto iniciado)
- 1 segundo = 1 minuto cobrado
- 1 minuto 30 segundos = 2 minutos cobrados
```

**TTL:** 150 segundos (2.5 minutos)

**Validaciones:**
- ✅ La sesión debe existir y estar abierta
- ✅ No debe existir una quote activa para esta sesión
- ✅ Debe existir tarifa activa para el parking

**Response:**
```json
{
  "success": true,
  "quote": {
    "id": "uuid",
    "quoted_amount": 175.00,
    "expires_at": "2026-01-24T11:02:30Z",
    "status": "active"
  },
  "details": {
    "plate": "ABC123",
    "seconds_parked": 420,
    "minutes_charged": 7,
    "tariff_per_minute": 25.00,
    "amount": 175.00
  },
  "message": "Cotización creada exitosamente"
}
```

---

### 4. `process-payment`
**Propósito:** Procesar un pago usando una quote activa

**Endpoint:** `POST /functions/v1/process-payment`

**Body:**
```json
{
  "quote_id": "uuid-de-la-quote",
  "payment_method": "cash"
}
```

**Métodos de Pago:**
- `cash` - Efectivo
- `card` - Tarjeta
- `qr` - Código QR
- `transfer` - Transferencia

**Validaciones:**
- ✅ Debe existir una quote activa y no expirada
- ✅ La sesión debe estar abierta
- ✅ Si el pago es en efectivo, actualiza `cash_sales` del turno
- ✅ Cierra la sesión automáticamente

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "uuid",
    "amount": 175.00,
    "payment_method": "cash",
    "status": "completed"
  },
  "session": {
    "id": "uuid",
    "status": "paid",
    "exit_time": "2026-01-24T11:00:00Z"
  },
  "message": "Pago procesado exitosamente"
}
```

---

### 5. `open-shift`
**Propósito:** Abrir un nuevo turno para un operador

**Endpoint:** `POST /functions/v1/open-shift`

**Body:**
```json
{
  "parking_id": "uuid-del-parking",
  "opening_cash": 500.00,
  "notes": "Turno matutino"
}
```

**Validaciones:**
- ✅ El operador no debe tener otro turno abierto
- ✅ El parking debe existir y estar activo
- ✅ `opening_cash` debe ser un número positivo

**Response:**
```json
{
  "success": true,
  "shift": {
    "id": "uuid",
    "opening_time": "2026-01-24T08:00:00Z",
    "opening_cash": 500.00,
    "status": "open"
  },
  "parking": {
    "id": "uuid",
    "name": "Zona Centro",
    "address": "Av. Corrientes 1234"
  },
  "message": "Turno abierto exitosamente"
}
```

---

### 6. `close-shift`
**Propósito:** Cerrar el turno actual del operador

**Endpoint:** `POST /functions/v1/close-shift`

**Body:**
```json
{
  "closing_cash": 12450.00,
  "notes": "Cierre normal"
}
```

**Validaciones:**
- ✅ El operador debe tener un turno abierto
- ✅ No debe haber sesiones abiertas en el turno
- ✅ Calcula automáticamente la diferencia de caja

**Cálculo Automático:**
```
expected_cash_drawer = opening_cash + cash_sales
difference = closing_cash - expected_cash_drawer
```

**Response:**
```json
{
  "success": true,
  "shift": {
    "id": "uuid",
    "status": "closed",
    "closing_time": "2026-01-24T16:00:00Z"
  },
  "summary": {
    "opening_cash": 500.00,
    "closing_cash": 12450.00,
    "cash_sales": 11950.00,
    "expected_cash_drawer": 12450.00,
    "difference": 0.00,
    "difference_status": "exact",
    "total_payments": 11950.00,
    "payments_by_method": {
      "cash": 11950.00,
      "card": 0.00,
      "qr": 0.00,
      "transfer": 0.00
    },
    "total_sessions": 478
  },
  "message": "Turno cerrado exitosamente"
}
```

---

## 🚀 Desplegar Funciones

### Desplegar todas las funciones:
```bash
supabase functions deploy
```

### Desplegar una función específica:
```bash
supabase functions deploy create-session
```

---

## 🧪 Probar Localmente

### Iniciar servidor local:
```bash
supabase functions serve
```

### Probar una función:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/create-session' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"plate":"ABC123","parking_id":"uuid-del-parking"}'
```

---

## 🔐 Autenticación

Todas las funciones requieren autenticación mediante token JWT en el header:

```
Authorization: Bearer <token>
```

El token se obtiene al hacer login con Supabase Auth.

---

## 📊 Flujo Completo de Operación

### 1. Operador abre turno
```
POST /open-shift
→ Turno abierto
```

### 2. Cliente estaciona
```
POST /create-session
→ Sesión creada (entry_time registrado)
```

### 3. Cliente regresa a pagar
```
POST /create-quote
→ Cotización generada (monto congelado por 2.5 min)
```

### 4. Cliente paga
```
POST /process-payment
→ Pago procesado, sesión cerrada, cash_sales actualizado
```

### 5. Operador cierra turno
```
POST /close-shift
→ Turno cerrado, diferencia de caja calculada
```

---

## 🛡️ Seguridad

- ✅ Todas las funciones validan el token JWT
- ✅ Usan `service_role_key` para bypassear RLS cuando es necesario
- ✅ Validan que el operador tenga turno abierto
- ✅ Registran todas las operaciones en `audit_logs`
- ✅ Normalizan patentes automáticamente
- ✅ Previenen sesiones duplicadas
- ✅ Previenen turnos duplicados

---

## 📝 Variables de Entorno

Las funciones usan automáticamente estas variables:

- `SUPABASE_URL` - URL del proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Key con permisos totales
- `SUPABASE_ANON_KEY` - Key pública (para el cliente)

Estas se configuran automáticamente al deployar.

---

## 🐛 Debugging

Ver logs en tiempo real:

```bash
supabase functions logs create-session --follow
```

Ver logs de todas las funciones:

```bash
supabase functions logs --follow
```

---

## 📚 Documentación Adicional

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Deploy Docs](https://deno.com/deploy/docs)
- MVP v0.1.5: `docs/MVP-v0.1-Definicion.md`
- Diccionario de Datos: `docs/Diccionario-de-Datos.md`
