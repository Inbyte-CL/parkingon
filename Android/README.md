# 📱 Parking On Street - App Android

App móvil para operadores de estacionamiento en la vía pública.

## 🎯 Estado Actual: FASE 1 COMPLETADA

### ✅ Lo que ya está hecho:

1. **Proyecto configurado** con Kotlin + Jetpack Compose
2. **Dependencias agregadas**:
   - Supabase SDK (Auth, Postgrest, Functions)
   - Navigation Compose
   - ViewModel + Coroutines
   - DataStore
   - Material 3 + Icons Extended

3. **Configuración base**:
   - `Constants.kt` con URLs y keys de Supabase
   - `SupabaseClient.kt` singleton configurado

4. **Modelos de datos completos**:
   - User, Shift, Session, Payment, Quote, Occupancy
   - Todos con serialización JSON

---

## 🚀 Por Dónde Comenzar

### **OPCIÓN A: Desarrollo Rápido (Recomendado)**
Crear los servicios y una pantalla de login funcional:

1. **PreferencesManager** (5 min) - Guardar token localmente
2. **AuthService** (10 min) - Login con Supabase
3. **LoginScreen + ViewModel** (30 min) - Primera pantalla funcional
4. **NavGraph** (10 min) - Navegación básica

**Resultado**: App que puede hacer login en ~1 hora

### **OPCIÓN B: Desarrollo Completo**
Seguir el plan completo en `PLAN-DESARROLLO.md`:

1. FASE 2: Todos los servicios (2 horas)
2. FASE 3: Todas las pantallas (4-6 horas)
3. Testing y ajustes (2 horas)

**Resultado**: MVP completo en ~8-10 horas

---

## 📂 Estructura Actual

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
│   └── remote/
│       └── SupabaseClient.kt ✅
├── ui/
│   └── theme/ ✅
└── MainActivity.kt ✅
```

---

## 🔗 Backend

El backend está **100% funcional** con 7 Edge Functions:

1. ✅ `open-shift`
2. ✅ `close-shift`
3. ✅ `create-session` (con validación de capacidad)
4. ✅ `close-session`
5. ✅ `create-quote`
6. ✅ `process-payment`
7. ✅ `get-parking-status`

**Supabase URL**: `https://mmqqrfvullrovstcykcj.supabase.co`

---

## 📖 Documentación

- **PLAN-DESARROLLO.md**: Plan completo con todas las fases
- **Backend docs**: Ver carpeta `../database/` y `../ESTADO-FINAL-PROYECTO.md`

---

## 🛠️ Comandos

```bash
# Sincronizar dependencias
./gradlew build

# Ejecutar en emulador
./gradlew installDebug

# Limpiar
./gradlew clean
```

---

## 👨‍💻 Próximo Paso

**Recomendación**: Empezar con la **OPCIÓN A** para tener algo funcional rápido.

¿Quieres que creemos los servicios básicos y la pantalla de login?
