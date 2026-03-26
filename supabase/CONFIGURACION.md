# Configuración de Edge Functions

Este documento explica cómo configurar y deployar las Edge Functions en tu proyecto Supabase.

## 📋 Requisitos Previos

- ✅ Supabase CLI instalado (ya lo tienes)
- ✅ Cuenta en Supabase con proyecto creado
- ✅ Base de datos configurada con el schema correcto

---

## 🔐 1. Conectar con tu Proyecto Supabase

### Obtener Project Reference ID

1. Ve a tu proyecto en Supabase: https://mmqqrfvullrovstcykcj.supabase.co
2. Ve a **Settings** → **General**
3. Copia el **Reference ID** (ejemplo: `mmqqrfvullrovstcykcj`)

### Hacer Login en Supabase CLI

```bash
supabase login
```

Esto abrirá tu navegador para autenticarte.

### Vincular tu proyecto local con Supabase

```bash
supabase link --project-ref mmqqrfvullrovstcykcj
```

Cuando te pida la contraseña de la base de datos, usa la que configuraste al crear el proyecto.

---

## 🚀 2. Deployar las Funciones

### Opción A: Deployar todas las funciones

```bash
# Desde la raíz del proyecto
cd C:\dev\ParkingOnStreet

# Deployar todas
supabase functions deploy
```

### Opción B: Deployar una función específica

```bash
supabase functions deploy create-session
```

### Opción C: Usar el script de PowerShell

```powershell
cd C:\dev\ParkingOnStreet\supabase
.\deploy-functions.ps1
```

---

## 🔑 3. Configurar Variables de Entorno (Opcional)

Las Edge Functions usan automáticamente estas variables:

- `SUPABASE_URL` - Se configura automáticamente
- `SUPABASE_SERVICE_ROLE_KEY` - Se configura automáticamente
- `SUPABASE_ANON_KEY` - Se configura automáticamente

Si necesitas agregar variables personalizadas:

```bash
supabase secrets set MY_SECRET_KEY=value
```

---

## 🧪 4. Probar las Funciones

### Desde Supabase Dashboard

1. Ve a **Edge Functions** en el menú lateral
2. Selecciona una función (ej: `create-session`)
3. Click en **Invoke Function**
4. Agrega el body JSON:
   ```json
   {
     "plate": "ABC123",
     "parking_id": "b0000000-0000-0000-0000-000000000001"
   }
   ```
5. Click en **Send Request**

### Desde cURL

```bash
curl -X POST \
  'https://mmqqrfvullrovstcykcj.supabase.co/functions/v1/create-session' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "plate": "ABC123",
    "parking_id": "b0000000-0000-0000-0000-000000000001"
  }'
```

### Desde tu App Android

```kotlin
val supabase = createSupabaseClient(
    supabaseUrl = "https://mmqqrfvullrovstcykcj.supabase.co",
    supabaseKey = "tu_anon_key"
)

val response = supabase.functions.invoke(
    function = "create-session",
    body = buildJsonObject {
        put("plate", "ABC123")
        put("parking_id", "b0000000-0000-0000-0000-000000000001")
    }
)
```

---

## 📊 5. Ver Logs

### Ver logs en tiempo real

```bash
# Todos los logs
supabase functions logs --follow

# Logs de una función específica
supabase functions logs create-session --follow
```

### Ver logs en Supabase Dashboard

1. Ve a **Edge Functions**
2. Selecciona una función
3. Click en **Logs**

---

## 🔄 6. Actualizar Funciones

Cuando hagas cambios en el código:

```bash
# 1. Editar el archivo
code supabase\functions\create-session\index.ts

# 2. Deployar de nuevo
supabase functions deploy create-session
```

Los cambios se aplican inmediatamente.

---

## 🛡️ 7. Seguridad

### Configurar CORS (ya está configurado)

Todas las funciones ya tienen CORS configurado para permitir requests desde cualquier origen:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

Si quieres restringir a dominios específicos:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://tu-dominio.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### Autenticación

Todas las funciones requieren un token JWT válido:

```
Authorization: Bearer <token>
```

El token se obtiene al hacer login con Supabase Auth.

---

## 📱 8. Integración con Android

### Agregar dependencias

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.github.jan-tennert.supabase:postgrest-kt:2.0.0")
    implementation("io.github.jan-tennert.supabase:functions-kt:2.0.0")
    implementation("io.github.jan-tennert.supabase:auth-kt:2.0.0")
}
```

### Configurar Supabase Client

```kotlin
val supabase = createSupabaseClient(
    supabaseUrl = "https://mmqqrfvullrovstcykcj.supabase.co",
    supabaseKey = "tu_anon_key"
) {
    install(Auth)
    install(Functions)
}
```

### Llamar a las funciones

```kotlin
// Login primero
supabase.auth.signInWith(Email) {
    email = "juan.perez@inbyte.com"
    password = "password"
}

// Luego llamar a las funciones
val response = supabase.functions.invoke(
    function = "create-session",
    body = buildJsonObject {
        put("plate", "ABC123")
        put("parking_id", parkingId)
    }
)

val session = response.body<CreateSessionResponse>()
```

---

## 🐛 9. Troubleshooting

### Error: "Function not found"

```bash
# Verificar que la función esté deployada
supabase functions list

# Re-deployar
supabase functions deploy create-session
```

### Error: "Invalid token"

- Verifica que el usuario esté autenticado
- Verifica que el token no haya expirado
- Verifica que estés usando el header correcto: `Authorization: Bearer <token>`

### Error: "No tienes un turno abierto"

- El operador debe abrir un turno antes de crear sesiones
- Llamar a `open-shift` primero

### Error: "Ya existe una sesión abierta"

- Verificar si hay una sesión duplicada en la base de datos
- Cerrar o cobrar la sesión existente primero

---

## 📚 10. Recursos Adicionales

### Documentación

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Deploy Docs](https://deno.com/deploy/docs)
- README de funciones: `supabase/functions/README.md`
- Ejemplos de uso: `supabase/functions/EJEMPLOS.md`

### Archivos del Proyecto

```
ParkingOnStreet/
├── database/
│   ├── schema.sql              ← Schema de la base de datos
│   ├── seed-inbyte-3users.sql  ← Datos de prueba
│   └── INSTRUCCIONES-SUPABASE.md
├── docs/
│   ├── MVP-v0.1-Definicion.md  ← Reglas de negocio
│   └── Diccionario-de-Datos.md ← Documentación de tablas
└── supabase/
    ├── functions/
    │   ├── create-session/
    │   ├── close-session/
    │   ├── create-quote/
    │   ├── process-payment/
    │   ├── open-shift/
    │   ├── close-shift/
    │   ├── README.md           ← Documentación de funciones
    │   └── EJEMPLOS.md         ← Ejemplos de uso
    ├── config.toml             ← Configuración de Supabase
    ├── deploy-functions.ps1    ← Script de deploy
    └── CONFIGURACION.md        ← Este archivo
```

---

## ✅ Checklist de Deploy

- [ ] Supabase CLI instalado
- [ ] Login en Supabase CLI (`supabase login`)
- [ ] Proyecto vinculado (`supabase link`)
- [ ] Base de datos configurada con `schema.sql`
- [ ] Datos de prueba insertados con `seed-inbyte-3users.sql`
- [ ] Funciones deployadas (`supabase functions deploy`)
- [ ] Funciones probadas desde Dashboard o cURL
- [ ] Integración con Android configurada
- [ ] Logs verificados (`supabase functions logs`)

---

## 🎯 Próximos Pasos

1. ✅ **Backend completo** (Base de datos + Edge Functions)
2. 🔄 **Desarrollar App Android** (interfaz para operadores)
3. 🔄 **Desarrollar Web Admin** (panel de administración)
4. 🔄 **Testing y QA**
5. 🔄 **Deploy a producción**

---

## 💡 Tips

- **Desarrollo local**: Usa `supabase start` para correr Supabase localmente
- **Testing**: Siempre prueba las funciones antes de deployar
- **Logs**: Monitorea los logs para detectar errores
- **Versioning**: Usa Git para versionar tus cambios
- **Backup**: Siempre haz backup de tu base de datos antes de cambios grandes

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: `supabase functions logs --follow`
2. Verifica la documentación oficial de Supabase
3. Revisa los ejemplos en `EJEMPLOS.md`
4. Verifica que el schema de la base de datos esté correcto

---

¡Listo! Tu backend está completamente configurado y funcionando. 🚀
