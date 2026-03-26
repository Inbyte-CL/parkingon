# 📱 Instalación de la App Android

## ✅ Lo que está implementado

### Sistema de Autenticación Completo
- ✅ Login con email/password
- ✅ Validación de campos
- ✅ Manejo de errores amigable
- ✅ Guardado de sesión (DataStore)
- ✅ Logout
- ✅ UI moderna y profesional

### Pantallas Creadas
1. **LoginScreen** - Pantalla de inicio de sesión con diseño moderno
2. **HomeScreen** - Pantalla principal (temporal, muestra éxito de login)

---

## 🔧 Requisitos Previos

1. **Android Studio** instalado (opcional, solo para desarrollo)
2. **ADB (Android Debug Bridge)** instalado y en PATH
3. **Dispositivo Android** conectado por USB o **Emulador** ejecutándose
4. **Depuración USB** habilitada en el dispositivo

---

## 📦 Instalación Rápida

### Opción 1: Script Automático (Recomendado)

```powershell
cd C:\dev\ParkingOnStreet\Android
.\install-apk.ps1
```

Este script:
1. Limpia builds anteriores
2. Compila la APK en modo Debug
3. Verifica dispositivos conectados
4. Instala la APK automáticamente

---

### Opción 2: Manual

```powershell
# 1. Ir a la carpeta del proyecto
cd C:\dev\ParkingOnStreet\Android

# 2. Limpiar (opcional)
.\gradlew.bat clean

# 3. Compilar APK
.\gradlew.bat assembleDebug

# 4. Verificar dispositivos
adb devices

# 5. Instalar APK
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

---

## 🔍 Verificar Dispositivos Conectados

```powershell
adb devices
```

**Salida esperada:**
```
List of devices attached
ABC123XYZ       device
```

Si no aparece ningún dispositivo:
- Verifica que el cable USB esté conectado
- Habilita "Depuración USB" en Opciones de Desarrollador
- Acepta el diálogo de autorización en el dispositivo

---

## 🧪 Probar la App

### Credenciales de Prueba

```
Email: test@inbyte.com
Password: Test123456
```

### Flujo de Prueba

1. **Abrir la app** "Inbyte Street"
2. **Ver la pantalla de login** con diseño moderno
3. **Ingresar credenciales** de prueba
4. **Presionar "Iniciar Sesión"**
5. **Ver pantalla Home** con mensaje de éxito
6. **Cerrar sesión** con el botón superior derecho

---

## 🎨 Características de la UI

### Diseño Moderno
- ✅ Material Design 3
- ✅ Colores dinámicos
- ✅ Animaciones suaves
- ✅ Iconos intuitivos
- ✅ Feedback visual inmediato

### Experiencia de Usuario
- ✅ Validación en tiempo real
- ✅ Mensajes de error claros
- ✅ Loading states
- ✅ Teclado optimizado (Next/Done)
- ✅ Mostrar/ocultar contraseña
- ✅ Credenciales de prueba visibles

---

## 🐛 Solución de Problemas

### Error: "adb no se reconoce como comando"

**Solución:** Instalar Android SDK Platform Tools

```powershell
# Descargar desde:
# https://developer.android.com/studio/releases/platform-tools

# O instalar con Chocolatey:
choco install adb
```

### Error: "No devices/emulators found"

**Solución:**
1. Conectar dispositivo por USB
2. Habilitar "Depuración USB" en el dispositivo
3. Aceptar el diálogo de autorización
4. Ejecutar `adb devices` para verificar

### Error de compilación: "SDK not found"

**Solución:**
1. Instalar Android Studio
2. Abrir el proyecto en Android Studio
3. Dejar que descargue el SDK automáticamente
4. O configurar `ANDROID_HOME` en variables de entorno

### App se cierra al abrir

**Solución:**
1. Ver logs con: `adb logcat | Select-String "inbyte"`
2. Verificar que el dispositivo tenga conexión a Internet
3. Verificar que las credenciales sean correctas

---

## 📊 Estructura del Código

```
app/src/main/java/com/inbyte/street/
├── core/
│   └── Constants.kt                    # Configuración de Supabase
├── data/
│   ├── local/
│   │   └── PreferencesManager.kt       # Almacenamiento local
│   ├── model/
│   │   ├── User.kt                     # Modelos de datos
│   │   ├── Shift.kt
│   │   ├── Session.kt
│   │   └── Payment.kt
│   └── remote/
│       ├── SupabaseClient.kt           # Cliente Supabase
│       └── AuthService.kt              # Servicio de autenticación
├── ui/
│   ├── navigation/
│   │   ├── Screen.kt                   # Definición de rutas
│   │   └── NavGraph.kt                 # Grafo de navegación
│   ├── screens/
│   │   ├── LoginScreen.kt              # Pantalla de login
│   │   └── HomeScreen.kt               # Pantalla principal
│   ├── viewmodel/
│   │   └── AuthViewModel.kt            # ViewModel de auth
│   └── theme/                          # Tema Material 3
└── MainActivity.kt                     # Activity principal
```

---

## 🚀 Próximos Pasos

Una vez que confirmes que el login funciona:

1. **Gestión de Turnos** (open-shift, close-shift)
2. **Crear Sesiones** (registrar entrada de vehículos)
3. **Procesar Pagos** (quotes y payments)
4. **Ver Ocupación** (capacidad en tiempo real)

---

## 📝 Notas Técnicas

- **Min SDK:** 24 (Android 7.0+)
- **Target SDK:** 36
- **Lenguaje:** Kotlin 2.0.21
- **UI Framework:** Jetpack Compose
- **Arquitectura:** MVVM
- **Backend:** Supabase (Auth + Edge Functions)
- **Almacenamiento:** DataStore (preferencias encriptadas)

---

## 🔗 Backend

**URL:** `https://mmqqrfvullrovstcykcj.supabase.co`

**Edge Functions disponibles:**
- ✅ open-shift
- ✅ close-shift
- ✅ create-session
- ✅ close-session
- ✅ create-quote
- ✅ process-payment
- ✅ get-parking-status

---

**¿Listo para probar? Ejecuta el script de instalación!**

```powershell
.\install-apk.ps1
```
