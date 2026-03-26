# Plan de Desarrollo - App Android Parking On Street

## 📱 Información del Proyecto

**Package:** `com.inbyte.street`  
**Min SDK:** 24 (Android 7.0+)  
**Target SDK:** 36  
**Lenguaje:** Kotlin 2.0.21  
**UI:** Jetpack Compose + Material 3

---

## ✅ FASE 1: Setup y Configuración (COMPLETADO)

### 1.1 Dependencias Agregadas
- ✅ **Supabase SDK** (3.0.2)
  - `postgrest-kt` - Base de datos
  - `auth-kt` - Autenticación
  - `functions-kt` - Edge Functions
- ✅ **Ktor Client** (3.0.3) - Cliente HTTP para Supabase
- ✅ **Navigation Compose** (2.8.5) - Navegación entre pantallas
- ✅ **ViewModel Compose** (2.10.0) - Arquitectura MVVM
- ✅ **Coroutines** (1.9.0) - Programación asíncrona
- ✅ **DataStore** (1.1.1) - Almacenamiento local de preferencias
- ✅ **Material Icons Extended** (1.7.6) - Iconos adicionales

### 1.2 Archivos de Configuración Creados
- ✅ `core/Constants.kt` - Constantes globales (URLs, keys, nombres de funciones)
- ✅ `data/remote/SupabaseClient.kt` - Cliente Supabase singleton

### 1.3 Modelos de Datos Creados
- ✅ `data/model/User.kt` - Usuario
- ✅ `data/model/Shift.kt` - Turno + Request/Response
- ✅ `data/model/Session.kt` - Sesión + Request/Response
- ✅ `data/model/Payment.kt` - Quote, Payment, Occupancy + Request/Response

---

## 🔄 FASE 2: Capa de Datos (SIGUIENTE)

### 2.1 Servicios a Crear

#### `data/remote/AuthService.kt`
```kotlin
class AuthService {
    suspend fun login(email: String, password: String): Result<User>
    suspend fun logout(): Result<Unit>
    suspend fun getCurrentUser(): User?
}
```

#### `data/remote/ShiftService.kt`
```kotlin
class ShiftService {
    suspend fun openShift(initialCash: Double, notes: String?): Result<OpenShiftResponse>
    suspend fun closeShift(closingCash: Double, notes: String?): Result<CloseShiftResponse>
    suspend fun getActiveShift(): Result<Shift?>
}
```

#### `data/remote/SessionService.kt`
```kotlin
class SessionService {
    suspend fun createSession(plate: String): Result<CreateSessionResponse>
    suspend fun closeSession(sessionId: String): Result<CloseSessionResponse>
    suspend fun getActiveSessions(shiftId: String): Result<List<Session>>
}
```

#### `data/remote/PaymentService.kt`
```kotlin
class PaymentService {
    suspend fun createQuote(sessionId: String): Result<CreateQuoteResponse>
    suspend fun processPayment(quoteId: String, method: String): Result<ProcessPaymentResponse>
    suspend fun getParkingOccupancy(parkingId: String?): Result<ParkingStatusResponse>
}
```

### 2.2 Repository Pattern (Opcional pero recomendado)
```kotlin
class ParkingRepository(
    private val authService: AuthService,
    private val shiftService: ShiftService,
    private val sessionService: SessionService,
    private val paymentService: PaymentService
)
```

### 2.3 DataStore Manager
```kotlin
class PreferencesManager(context: Context) {
    suspend fun saveToken(token: String)
    suspend fun getToken(): String?
    suspend fun saveActiveShiftId(shiftId: String)
    suspend fun getActiveShiftId(): String?
    suspend fun clear()
}
```

---

## 🎨 FASE 3: UI/UX (DESPUÉS DE FASE 2)

### 3.1 Navegación
```kotlin
sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Home : Screen("home")
    object OpenShift : Screen("open_shift")
    object CreateSession : Screen("create_session")
    object ActiveSessions : Screen("active_sessions")
    object CreateQuote : Screen("create_quote/{sessionId}")
    object ProcessPayment : Screen("process_payment/{quoteId}")
    object CloseShift : Screen("close_shift")
}
```

### 3.2 Pantallas a Crear

#### 1. `ui/screens/LoginScreen.kt`
- Input: Email, Password
- Botón: Iniciar Sesión
- Navegación: → HomeScreen

#### 2. `ui/screens/HomeScreen.kt`
- Mostrar ocupación del parking
- Botón: Abrir Turno (si no hay turno activo)
- Botón: Crear Sesión (si hay turno activo)
- Botón: Ver Sesiones Activas
- Botón: Cerrar Turno

#### 3. `ui/screens/OpenShiftScreen.kt`
- Input: Efectivo inicial
- Input: Notas (opcional)
- Botón: Abrir Turno
- Navegación: → HomeScreen

#### 4. `ui/screens/CreateSessionScreen.kt`
- Input: Patente (manual o escáner)
- Mostrar ocupación actual
- Botón: Crear Sesión
- Navegación: → ActiveSessionsScreen

#### 5. `ui/screens/ActiveSessionsScreen.kt`
- Lista de sesiones activas del turno
- Cada item: Patente, Hora entrada, Tiempo transcurrido
- Botón por sesión: Generar Quote
- Navegación: → CreateQuoteScreen

#### 6. `ui/screens/CreateQuoteScreen.kt`
- Mostrar: Patente, Minutos, Tarifa, Monto
- Countdown: Tiempo restante del quote
- Botón: Procesar Pago
- Navegación: → ProcessPaymentScreen

#### 7. `ui/screens/ProcessPaymentScreen.kt`
- Mostrar: Monto a cobrar
- Botones: Efectivo / Tarjeta
- Confirmación
- Navegación: → ActiveSessionsScreen

#### 8. `ui/screens/CloseShiftScreen.kt`
- Input: Efectivo de cierre
- Input: Notas (opcional)
- Mostrar: Resumen del turno
- Botón: Cerrar Turno
- Navegación: → HomeScreen

### 3.3 ViewModels a Crear
- `AuthViewModel`
- `ShiftViewModel`
- `SessionViewModel`
- `PaymentViewModel`

### 3.4 Componentes Reutilizables
- `LoadingButton.kt`
- `ErrorDialog.kt`
- `OccupancyCard.kt`
- `SessionCard.kt`
- `QuoteTimer.kt`

---

## 📊 Estructura de Carpetas Final

```
app/src/main/java/com/inbyte/street/
├── core/
│   └── Constants.kt ✅
├── data/
│   ├── model/
│   │   ├── User.kt ✅
│   │   ├── Shift.kt ✅
│   │   ├── Session.kt ✅
│   │   └── Payment.kt ✅
│   ├── remote/
│   │   ├── SupabaseClient.kt ✅
│   │   ├── AuthService.kt ⏳
│   │   ├── ShiftService.kt ⏳
│   │   ├── SessionService.kt ⏳
│   │   └── PaymentService.kt ⏳
│   ├── local/
│   │   └── PreferencesManager.kt ⏳
│   └── repository/
│       └── ParkingRepository.kt ⏳ (opcional)
├── ui/
│   ├── screens/
│   │   ├── LoginScreen.kt ⏳
│   │   ├── HomeScreen.kt ⏳
│   │   ├── OpenShiftScreen.kt ⏳
│   │   ├── CreateSessionScreen.kt ⏳
│   │   ├── ActiveSessionsScreen.kt ⏳
│   │   ├── CreateQuoteScreen.kt ⏳
│   │   ├── ProcessPaymentScreen.kt ⏳
│   │   └── CloseShiftScreen.kt ⏳
│   ├── viewmodel/
│   │   ├── AuthViewModel.kt ⏳
│   │   ├── ShiftViewModel.kt ⏳
│   │   ├── SessionViewModel.kt ⏳
│   │   └── PaymentViewModel.kt ⏳
│   ├── components/
│   │   ├── LoadingButton.kt ⏳
│   │   ├── ErrorDialog.kt ⏳
│   │   ├── OccupancyCard.kt ⏳
│   │   ├── SessionCard.kt ⏳
│   │   └── QuoteTimer.kt ⏳
│   ├── navigation/
│   │   └── NavGraph.kt ⏳
│   └── theme/
│       ├── Color.kt ✅
│       ├── Theme.kt ✅
│       └── Type.kt ✅
└── MainActivity.kt ✅

✅ = Completado
⏳ = Pendiente
```

---

## 🎯 Próximos Pasos Inmediatos

### 1. Crear PreferencesManager (5 min)
```kotlin
// Para guardar token y estado de sesión
```

### 2. Crear AuthService (10 min)
```kotlin
// Login, logout, getCurrentUser
```

### 3. Crear ShiftService (15 min)
```kotlin
// openShift, closeShift, getActiveShift
```

### 4. Crear SessionService (15 min)
```kotlin
// createSession, closeSession, getActiveSessions
```

### 5. Crear PaymentService (15 min)
```kotlin
// createQuote, processPayment, getParkingOccupancy
```

### 6. Crear NavGraph (10 min)
```kotlin
// Definir navegación entre pantallas
```

### 7. Crear LoginScreen + AuthViewModel (30 min)
```kotlin
// Primera pantalla funcional
```

---

## 🔧 Comandos Útiles

### Sincronizar Gradle
```bash
./gradlew build
```

### Ejecutar en Emulador
```bash
./gradlew installDebug
```

### Limpiar Build
```bash
./gradlew clean
```

---

## 📝 Notas Importantes

1. **Autenticación**: El token se guarda en DataStore y se usa en todas las llamadas
2. **Edge Functions**: Todas las operaciones críticas van por Edge Functions (no por Postgrest directo)
3. **Manejo de Errores**: Usar `Result<T>` para encapsular éxito/error
4. **Coroutines**: Todas las llamadas de red deben ser `suspend fun`
5. **UI State**: Usar `StateFlow` en ViewModels para estados reactivos

---

## 🚀 Tiempo Estimado por Fase

- **FASE 1 (Setup)**: ✅ Completado
- **FASE 2 (Servicios)**: ~2 horas
- **FASE 3 (UI básica)**: ~4-6 horas
- **Testing y ajustes**: ~2 horas

**Total MVP**: ~8-10 horas de desarrollo

---

## 📞 Endpoints del Backend

Todos funcionando y testeados:

1. ✅ `open-shift` - Abrir turno
2. ✅ `close-shift` - Cerrar turno
3. ✅ `create-session` - Crear sesión (con validación de capacidad)
4. ✅ `close-session` - Cerrar sesión sin pago
5. ✅ `create-quote` - Generar quote
6. ✅ `process-payment` - Procesar pago
7. ✅ `get-parking-status` - Consultar ocupación

---

**¿Listo para continuar con la FASE 2?**
