# Ejemplos de Uso - Edge Functions

Este archivo contiene ejemplos prácticos de cómo usar cada Edge Function desde diferentes clientes.

## 🔑 Autenticación

Primero necesitas obtener un token de autenticación:

### Desde JavaScript/TypeScript:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mmqqrfvullrovstcykcj.supabase.co',
  'tu_anon_key'
)

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'juan.perez@inbyte.com',
  password: 'tu_password'
})

const token = data.session.access_token
```

### Desde Android (Kotlin):
```kotlin
val supabase = createSupabaseClient(
    supabaseUrl = "https://mmqqrfvullrovstcykcj.supabase.co",
    supabaseKey = "tu_anon_key"
) {
    install(Auth)
}

// Login
supabase.auth.signInWith(Email) {
    email = "juan.perez@inbyte.com"
    password = "tu_password"
}

val token = supabase.auth.currentSessionOrNull()?.accessToken
```

---

## 1️⃣ Abrir Turno

### JavaScript/TypeScript:
```typescript
const { data, error } = await supabase.functions.invoke('open-shift', {
  body: {
    parking_id: 'b0000000-0000-0000-0000-000000000001', // Zona Centro
    opening_cash: 500.00,
    notes: 'Turno matutino'
  }
})

console.log(data)
// {
//   success: true,
//   shift: { id: '...', opening_time: '...', status: 'open' },
//   parking: { name: 'Zona Centro', address: '...' }
// }
```

### Android (Kotlin):
```kotlin
val response = supabase.functions.invoke(
    function = "open-shift",
    body = buildJsonObject {
        put("parking_id", "b0000000-0000-0000-0000-000000000001")
        put("opening_cash", 500.00)
        put("notes", "Turno matutino")
    }
)

val shift = response.body<OpenShiftResponse>()
```

### cURL:
```bash
curl -X POST \
  'https://mmqqrfvullrovstcykcj.supabase.co/functions/v1/open-shift' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "parking_id": "b0000000-0000-0000-0000-000000000001",
    "opening_cash": 500.00,
    "notes": "Turno matutino"
  }'
```

---

## 2️⃣ Crear Sesión (Cliente estaciona)

### JavaScript/TypeScript:
```typescript
const { data, error } = await supabase.functions.invoke('create-session', {
  body: {
    plate: 'ABC 123',  // Se normalizará a "ABC123"
    parking_id: 'b0000000-0000-0000-0000-000000000001'
  }
})

console.log(data)
// {
//   success: true,
//   session: {
//     id: '...',
//     plate: 'ABC123',
//     entry_time: '2026-01-24T10:00:00Z',
//     status: 'open'
//   }
// }
```

### Android (Kotlin):
```kotlin
val response = supabase.functions.invoke(
    function = "create-session",
    body = buildJsonObject {
        put("plate", "ABC 123")
        put("parking_id", "b0000000-0000-0000-0000-000000000001")
    }
)

val session = response.body<CreateSessionResponse>()
Log.d("Session", "ID: ${session.session.id}, Plate: ${session.session.plate}")
```

### cURL:
```bash
curl -X POST \
  'https://mmqqrfvullrovstcykcj.supabase.co/functions/v1/create-session' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "plate": "ABC 123",
    "parking_id": "b0000000-0000-0000-0000-000000000001"
  }'
```

---

## 3️⃣ Crear Cotización (Cliente regresa)

### JavaScript/TypeScript:
```typescript
const { data, error } = await supabase.functions.invoke('create-quote', {
  body: {
    session_id: 'uuid-de-la-sesion'
  }
})

console.log(data)
// {
//   success: true,
//   quote: {
//     id: '...',
//     quoted_amount: 175.00,
//     expires_at: '2026-01-24T11:02:30Z',
//     status: 'active'
//   },
//   details: {
//     seconds_parked: 420,
//     minutes_charged: 7,
//     tariff_per_minute: 25.00,
//     amount: 175.00
//   }
// }
```

### Android (Kotlin):
```kotlin
val response = supabase.functions.invoke(
    function = "create-quote",
    body = buildJsonObject {
        put("session_id", sessionId)
    }
)

val quote = response.body<CreateQuoteResponse>()

// Mostrar al cliente
println("Monto a pagar: $${quote.quote.quoted_amount}")
println("Tiempo estacionado: ${quote.details.minutes_charged} minutos")
println("Expira en: ${quote.quote.expires_at}")
```

### cURL:
```bash
curl -X POST \
  'https://mmqqrfvullrovstcykcj.supabase.co/functions/v1/create-quote' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "uuid-de-la-sesion"
  }'
```

---

## 4️⃣ Procesar Pago

### JavaScript/TypeScript:
```typescript
const { data, error } = await supabase.functions.invoke('process-payment', {
  body: {
    quote_id: 'uuid-de-la-quote',
    payment_method: 'cash'  // 'cash', 'card', 'qr', 'transfer'
  }
})

console.log(data)
// {
//   success: true,
//   payment: {
//     id: '...',
//     amount: 175.00,
//     payment_method: 'cash',
//     status: 'completed'
//   },
//   session: {
//     status: 'paid',
//     exit_time: '2026-01-24T11:00:00Z'
//   }
// }
```

### Android (Kotlin):
```kotlin
// Mostrar opciones de pago al operador
val paymentMethod = when (selectedOption) {
    0 -> "cash"
    1 -> "card"
    2 -> "qr"
    3 -> "transfer"
    else -> "cash"
}

val response = supabase.functions.invoke(
    function = "process-payment",
    body = buildJsonObject {
        put("quote_id", quoteId)
        put("payment_method", paymentMethod)
    }
)

val payment = response.body<ProcessPaymentResponse>()

// Mostrar recibo
showReceipt(payment)
```

### cURL:
```bash
curl -X POST \
  'https://mmqqrfvullrovstcykcj.supabase.co/functions/v1/process-payment' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "quote_id": "uuid-de-la-quote",
    "payment_method": "cash"
  }'
```

---

## 5️⃣ Cerrar Sesión (sin pago)

### JavaScript/TypeScript:
```typescript
// Usar solo si el cliente no regresó a pagar
const { data, error } = await supabase.functions.invoke('close-session', {
  body: {
    session_id: 'uuid-de-la-sesion'
  }
})

console.log(data)
// {
//   success: true,
//   session: {
//     id: '...',
//     status: 'closed',
//     exit_time: '2026-01-24T11:00:00Z'
//   }
// }
```

### Android (Kotlin):
```kotlin
val response = supabase.functions.invoke(
    function = "close-session",
    body = buildJsonObject {
        put("session_id", sessionId)
    }
)

val session = response.body<CloseSessionResponse>()
```

### cURL:
```bash
curl -X POST \
  'https://mmqqrfvullrovstcykcj.supabase.co/functions/v1/close-session' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "uuid-de-la-sesion"
  }'
```

---

## 6️⃣ Cerrar Turno

### JavaScript/TypeScript:
```typescript
const { data, error } = await supabase.functions.invoke('close-shift', {
  body: {
    closing_cash: 12450.00,
    notes: 'Cierre normal, sin diferencias'
  }
})

console.log(data)
// {
//   success: true,
//   shift: { status: 'closed', closing_time: '...' },
//   summary: {
//     opening_cash: 500.00,
//     closing_cash: 12450.00,
//     cash_sales: 11950.00,
//     difference: 0.00,
//     difference_status: 'exact',
//     total_payments: 11950.00,
//     total_sessions: 478
//   }
// }
```

### Android (Kotlin):
```kotlin
val response = supabase.functions.invoke(
    function = "close-shift",
    body = buildJsonObject {
        put("closing_cash", closingCash)
        put("notes", "Cierre normal")
    }
)

val closeShift = response.body<CloseShiftResponse>()

// Mostrar resumen
showShiftSummary(closeShift.summary)
```

### cURL:
```bash
curl -X POST \
  'https://mmqqrfvullrovstcykcj.supabase.co/functions/v1/close-shift' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "closing_cash": 12450.00,
    "notes": "Cierre normal"
  }'
```

---

## 🔄 Flujo Completo de Ejemplo

```typescript
// 1. Operador abre turno (08:00 AM)
const shift = await supabase.functions.invoke('open-shift', {
  body: {
    parking_id: 'b0000000-0000-0000-0000-000000000001',
    opening_cash: 500.00
  }
})

// 2. Cliente ABC123 estaciona (10:00 AM)
const session1 = await supabase.functions.invoke('create-session', {
  body: {
    plate: 'ABC123',
    parking_id: 'b0000000-0000-0000-0000-000000000001'
  }
})

// 3. Cliente ABC123 regresa a pagar (10:07 AM - 7 minutos después)
const quote1 = await supabase.functions.invoke('create-quote', {
  body: { session_id: session1.data.session.id }
})
// → Monto: $175 (7 minutos × $25)

// 4. Cliente paga en efectivo
const payment1 = await supabase.functions.invoke('process-payment', {
  body: {
    quote_id: quote1.data.quote.id,
    payment_method: 'cash'
  }
})

// 5. Cliente XYZ789 estaciona (11:00 AM)
const session2 = await supabase.functions.invoke('create-session', {
  body: {
    plate: 'XYZ789',
    parking_id: 'b0000000-0000-0000-0000-000000000001'
  }
})

// 6. Cliente XYZ789 regresa (13:15 PM - 2 horas 15 min después)
const quote2 = await supabase.functions.invoke('create-quote', {
  body: { session_id: session2.data.session.id }
})
// → Monto: $3,375 (135 minutos × $25)

// 7. Cliente paga con tarjeta
const payment2 = await supabase.functions.invoke('process-payment', {
  body: {
    quote_id: quote2.data.quote.id,
    payment_method: 'card'
  }
})

// 8. Operador cierra turno (16:00 PM)
const closedShift = await supabase.functions.invoke('close-shift', {
  body: {
    closing_cash: 675.00,  // $500 inicial + $175 de ABC123
    notes: 'Cierre normal'
  }
})
// → Diferencia: $0 (exacto)
```

---

## ⚠️ Manejo de Errores

### Error: Turno no abierto
```json
{
  "error": "No tienes un turno abierto. Debes abrir un turno antes de crear sesiones."
}
```

### Error: Sesión duplicada
```json
{
  "error": "Ya existe una sesión abierta para esta patente en este parking",
  "existing_session": {
    "id": "...",
    "entry_time": "2026-01-24T10:00:00Z"
  }
}
```

### Error: Quote expirada
```json
{
  "error": "La cotización ha expirado. Por favor, genera una nueva cotización.",
  "expired_at": "2026-01-24T11:02:30Z"
}
```

### Error: Sesiones abiertas al cerrar turno
```json
{
  "error": "No puedes cerrar el turno con sesiones abiertas.",
  "open_sessions_count": 3,
  "open_sessions": [
    { "id": "...", "plate": "ABC123", "entry_time": "..." },
    { "id": "...", "plate": "XYZ789", "entry_time": "..." }
  ]
}
```

---

## 🧪 Testing

Para probar las funciones localmente:

```bash
# 1. Iniciar Supabase local
supabase start

# 2. Servir las funciones
supabase functions serve

# 3. Probar con cURL
curl -X POST 'http://localhost:54321/functions/v1/create-session' \
  -H 'Authorization: Bearer YOUR_LOCAL_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"plate":"ABC123","parking_id":"..."}'
```

---

## 📱 Ejemplo Completo para Android

```kotlin
class ParkingViewModel : ViewModel() {
    private val supabase = createSupabaseClient(...)
    
    // Abrir turno
    suspend fun openShift(parkingId: String, openingCash: Double) {
        try {
            val response = supabase.functions.invoke(
                function = "open-shift",
                body = buildJsonObject {
                    put("parking_id", parkingId)
                    put("opening_cash", openingCash)
                }
            )
            
            val result = response.body<OpenShiftResponse>()
            _shiftState.value = ShiftState.Open(result.shift)
            
        } catch (e: Exception) {
            _error.value = e.message
        }
    }
    
    // Crear sesión
    suspend fun createSession(plate: String, parkingId: String) {
        try {
            val response = supabase.functions.invoke(
                function = "create-session",
                body = buildJsonObject {
                    put("plate", plate)
                    put("parking_id", parkingId)
                }
            )
            
            val result = response.body<CreateSessionResponse>()
            _sessionCreated.value = result.session
            
        } catch (e: Exception) {
            _error.value = e.message
        }
    }
    
    // Crear cotización y procesar pago
    suspend fun processPayment(sessionId: String, paymentMethod: String) {
        try {
            // 1. Crear quote
            val quoteResponse = supabase.functions.invoke(
                function = "create-quote",
                body = buildJsonObject {
                    put("session_id", sessionId)
                }
            )
            
            val quote = quoteResponse.body<CreateQuoteResponse>()
            _quoteAmount.value = quote.quote.quoted_amount
            
            // 2. Mostrar al operador y confirmar
            // ...
            
            // 3. Procesar pago
            val paymentResponse = supabase.functions.invoke(
                function = "process-payment",
                body = buildJsonObject {
                    put("quote_id", quote.quote.id)
                    put("payment_method", paymentMethod)
                }
            )
            
            val payment = paymentResponse.body<ProcessPaymentResponse>()
            _paymentCompleted.value = payment
            
        } catch (e: Exception) {
            _error.value = e.message
        }
    }
}
```

---

## 📊 Data Classes para Android

```kotlin
@Serializable
data class OpenShiftResponse(
    val success: Boolean,
    val shift: Shift,
    val parking: Parking,
    val message: String
)

@Serializable
data class CreateSessionResponse(
    val success: Boolean,
    val session: Session,
    val message: String
)

@Serializable
data class CreateQuoteResponse(
    val success: Boolean,
    val quote: Quote,
    val details: QuoteDetails,
    val message: String
)

@Serializable
data class ProcessPaymentResponse(
    val success: Boolean,
    val payment: Payment,
    val session: Session,
    val message: String
)

@Serializable
data class CloseShiftResponse(
    val success: Boolean,
    val shift: Shift,
    val summary: ShiftSummary,
    val message: String
)
```
