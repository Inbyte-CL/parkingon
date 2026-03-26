# Pruebas de Edge Functions

## 🔑 Tus Keys de Supabase

**Project URL:** `https://mmqqrfvullrovstcykcj.supabase.co`

**Anon Key (pública):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tcXFyZnZ1bGxyb3ZzdGN5a2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMjI4MzYsImV4cCI6MjA4NDc5ODgzNn0.7Dg6tcKkxdM0AHU7b6HnlbKTY8yBXPh2CD9P1uHs3FQ
```

---

## 🧪 Cómo Probar las Funciones

### IMPORTANTE: Primero debes hacer LOGIN

Las funciones requieren un **token de usuario autenticado**, no solo el anon key.

### Paso 1: Hacer Login y Obtener Token

Usa el **SQL Editor** en Supabase para obtener un token de prueba:

1. Ve a: https://supabase.com/dashboard/project/mmqqrfvullrovstcykcj/sql/new
2. Pega este SQL:

```sql
-- Obtener token de autenticación para juan.perez@inbyte.com
SELECT 
    id,
    email,
    raw_user_meta_data
FROM auth.users
WHERE email = 'juan.perez@inbyte.com';
```

3. Copia el `id` del usuario (UUID)

### Paso 2: Generar Token de Prueba

Desde el Dashboard de Supabase:

1. Ve a **Authentication** → **Users**
2. Click en el usuario `juan.perez@inbyte.com`
3. En la parte superior derecha, verás un botón **"Generate access token"**
4. Copia ese token

**O usa este método alternativo:**

En el SQL Editor, ejecuta:

```sql
-- Crear un token temporal de prueba (válido por 1 hora)
SELECT 
    auth.sign(
        json_build_object(
            'sub', id::text,
            'email', email,
            'role', 'authenticated',
            'aud', 'authenticated',
            'exp', extract(epoch from now() + interval '1 hour')::integer
        ),
        'tu-jwt-secret'
    ) as access_token
FROM auth.users
WHERE email = 'juan.perez@inbyte.com';
```

---

## 📝 Ejemplos de Prueba

### 1. Abrir Turno

**En el Dashboard de Supabase:**

1. Ve a **Edge Functions** → `open-shift`
2. Click en **"Invoke Function"**
3. Pega este JSON:

```json
{
  "parking_id": "b0000000-0000-0000-0000-000000000001",
  "opening_cash": 500.00,
  "notes": "Turno de prueba"
}
```

4. En **Headers**, agrega:
   - Key: `Authorization`
   - Value: `Bearer TU_TOKEN_AQUI` (reemplaza con el token del Paso 2)

5. Click **"Send Request"**

**Respuesta esperada:**
```json
{
  "success": true,
  "shift": {
    "id": "uuid-generado",
    "opening_time": "2026-01-24T...",
    "opening_cash": 500.00,
    "status": "open"
  },
  "parking": {
    "name": "Zona Centro",
    "address": "Av. Corrientes 1234, Centro"
  },
  "message": "Turno abierto exitosamente"
}
```

---

### 2. Crear Sesión

```json
{
  "plate": "ABC 123",
  "parking_id": "b0000000-0000-0000-0000-000000000001"
}
```

---

### 3. Crear Cotización

```json
{
  "session_id": "uuid-de-la-sesion-creada"
}
```

---

### 4. Procesar Pago

```json
{
  "quote_id": "uuid-de-la-quote-creada",
  "payment_method": "cash"
}
```

---

### 5. Cerrar Turno

```json
{
  "closing_cash": 12450.00,
  "notes": "Cierre de prueba"
}
```

---

## 🔧 Método Alternativo: Usar Postman/Insomnia

### Configuración:

**URL Base:** `https://mmqqrfvullrovstcykcj.supabase.co/functions/v1/`

**Headers comunes:**
```
Authorization: Bearer TU_TOKEN_DE_USUARIO
Content-Type: application/json
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tcXFyZnZ1bGxyb3ZzdGN5a2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMjI4MzYsImV4cCI6MjA4NDc5ODgzNn0.7Dg6tcKkxdM0AHU7b6HnlbKTY8yBXPh2CD9P1uHs3FQ
```

---

## ⚠️ Errores Comunes

### Error 401: Invalid token
- **Causa:** No estás usando un token de usuario autenticado
- **Solución:** Sigue el Paso 1 y 2 arriba para obtener un token válido

### Error 400: No tienes un turno abierto
- **Causa:** Intentas crear una sesión sin tener un turno abierto
- **Solución:** Primero llama a `open-shift`

### Error 400: Ya tienes un turno abierto
- **Causa:** Intentas abrir un turno cuando ya tienes uno abierto
- **Solución:** Primero cierra el turno actual con `close-shift`

---

## 🎯 Flujo de Prueba Completo

1. **Login** → Obtener token de usuario
2. **open-shift** → Abrir turno
3. **create-session** → Crear sesión (cliente estaciona)
4. **create-quote** → Generar cotización (cliente regresa)
5. **process-payment** → Procesar pago
6. **close-shift** → Cerrar turno

---

## 📚 Documentación Adicional

- Ejemplos completos: `supabase/functions/EJEMPLOS.md`
- Configuración: `supabase/CONFIGURACION.md`
- MVP: `docs/MVP-v0.1-Definicion.md`
