# 🚀 INSTRUCCIONES PARA INSTALAR EN SUPABASE

Guía paso a paso para crear la base de datos en Supabase.

---

## 📋 PRE-REQUISITOS

1. ✅ Cuenta en [Supabase](https://supabase.com)
2. ✅ Proyecto creado en Supabase
3. ✅ Acceso al SQL Editor del proyecto

---

## 🎯 PASO 1: ACCEDER AL SQL EDITOR

1. Ir a [app.supabase.com](https://app.supabase.com)
2. Seleccionar tu proyecto
3. En el menú lateral, ir a **SQL Editor**
4. Click en **New Query**

---

## 🎯 PASO 2: EJECUTAR SCHEMA

1. Abrir el archivo `database/schema.sql`
2. Copiar **TODO** el contenido (Ctrl+A, Ctrl+C)
3. Pegar en el SQL Editor de Supabase
4. Click en **Run** (o Ctrl+Enter)
5. Esperar a que termine (puede tomar 10-30 segundos)

### ✅ Verificación

Deberías ver un mensaje al final:

```
Schema Parking On Street v0.1.5 instalado correctamente
Tablas creadas: 10
Funciones helper: 5
RLS habilitado en todas las tablas
```

Si hay errores, revisar:
- ¿Copiaste TODO el contenido?
- ¿El proyecto es nuevo o ya tiene tablas?
- ¿Hay conflictos de nombres?

---

## 🎯 PASO 3: VERIFICAR INSTALACIÓN

Ejecutar este query en el SQL Editor:

```sql
-- Ver tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Deberías ver 10 tablas:
- audit_logs
- memberships
- organizations
- parkings
- payment_quotes
- payments
- sessions
- shifts
- tariffs
- zones

---

## 🎯 PASO 4: VERIFICAR FUNCIONES

```sql
-- Ver funciones creadas
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

Deberías ver 5 funciones:
- get_active_tariff
- get_user_active_parking
- get_user_org_id
- is_superadmin
- normalize_plate

---

## 🎯 PASO 5: VERIFICAR RLS

```sql
-- Ver políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Deberías ver múltiples políticas (una o más por tabla).

---

## 🎯 PASO 6: INSERTAR DATOS DE PRUEBA (OPCIONAL)

Solo para desarrollo/testing:

1. Abrir `database/seed.sql`
2. Copiar el contenido
3. Pegar en SQL Editor
4. Click en **Run**

**IMPORTANTE:** Antes de ejecutar seed.sql, necesitas:

1. Crear usuarios en **Authentication** de Supabase
2. Copiar los `user_id` generados
3. Reemplazar los IDs de ejemplo en seed.sql
4. Descomentar las secciones de memberships, shifts, etc.

---

## 🎯 PASO 7: CREAR PRIMER USUARIO ADMIN

### Opción A: Desde Supabase Dashboard

1. Ir a **Authentication** → **Users**
2. Click en **Add user**
3. Ingresar:
   - Email: `admin@tuempresa.com`
   - Password: `Admin123!`
   - Email Confirm: ✅
4. Click en **Create user**
5. Copiar el `user_id` generado

### Opción B: Desde SQL (después de crear en Auth)

```sql
-- Reemplazar los UUIDs con los reales
INSERT INTO organizations (id, name, slug, status) VALUES
    ('org-uuid-aqui', 'Mi Empresa', 'mi-empresa', 'active');

INSERT INTO memberships (org_id, user_id, role, status) VALUES
    ('org-uuid-aqui', 'user-uuid-aqui', 'admin_empresa', 'active');
```

---

## 🎯 PASO 8: CREAR PARKING Y TARIFA

```sql
-- Reemplazar org-uuid-aqui con tu org_id
INSERT INTO parkings (org_id, name, address, status) VALUES
    ('org-uuid-aqui', 'Zona Centro', 'Calle Principal 123', 'active');

-- Obtener el parking_id generado y usarlo aquí
INSERT INTO tariffs (org_id, parking_id, price_per_minute, valid_from) VALUES
    ('org-uuid-aqui', 'parking-uuid-aqui', 25.00, now());
```

---

## 🎯 PASO 9: PROBAR FUNCIONES

### Probar normalización de patente

```sql
SELECT normalize_plate('AB-CD 12') as result;
-- Debe retornar: ABCD12
```

### Probar búsqueda de tarifa

```sql
-- Reemplazar con tus UUIDs
SELECT * FROM get_active_tariff(
    'org-uuid-aqui',
    'parking-uuid-aqui',
    now()
);
```

---

## 🎯 PASO 10: CONFIGURAR SUPERADMIN (OPCIONAL)

Para dar acceso total a un usuario:

1. Ir a **Authentication** → **Users**
2. Click en el usuario
3. En **User Metadata**, agregar:

```json
{
  "is_superadmin": true
}
```

4. Guardar

Ahora ese usuario tendrá acceso a todas las organizaciones.

---

## 🔧 MANTENIMIENTO

### Job de Limpieza de Quotes

Crear un **Edge Function** o **Cron Job** que ejecute diariamente:

```sql
-- Limpiar quotes expirados/usados > 7 días
DELETE FROM payment_quotes
WHERE status IN ('expired', 'used')
AND created_at < now() - interval '7 days';

-- Marcar quotes expirados
UPDATE payment_quotes
SET status = 'expired'
WHERE status = 'active'
AND expires_at < now();
```

### Supabase Cron (si está disponible)

```sql
-- En SQL Editor
SELECT cron.schedule(
    'cleanup-quotes',
    '0 2 * * *', -- Diariamente a las 2 AM
    $$
    DELETE FROM payment_quotes
    WHERE status IN ('expired', 'used')
    AND created_at < now() - interval '7 days';
    $$
);
```

---

## 🐛 TROUBLESHOOTING

### Error: "relation already exists"

**Causa:** Ya ejecutaste el schema antes.

**Solución:**
1. Si es desarrollo: ejecutar `cleanup.sql` (sección RESET)
2. Si es producción: crear migraciones incrementales

### Error: "permission denied"

**Causa:** Usuario sin permisos suficientes.

**Solución:**
- Verificar que estás usando el usuario `postgres` en Supabase
- Verificar que RLS no está bloqueando

### Error: "function does not exist"

**Causa:** Las funciones no se crearon correctamente.

**Solución:**
- Ejecutar solo la sección de funciones de `schema.sql`
- Verificar que no hay errores de sintaxis

### Queries muy lentas

**Solución:**
```sql
-- Ejecutar ANALYZE en todas las tablas
ANALYZE organizations;
ANALYZE memberships;
ANALYZE parkings;
ANALYZE shifts;
ANALYZE sessions;
ANALYZE payment_quotes;
ANALYZE payments;
ANALYZE audit_logs;
```

---

## 📊 QUERIES ÚTILES

### Ver todas las organizaciones

```sql
SELECT * FROM organizations;
```

### Ver usuarios por organización

```sql
SELECT 
    o.name as organization,
    u.email,
    m.role,
    m.status
FROM memberships m
JOIN organizations o ON m.org_id = o.id
JOIN auth.users u ON m.user_id = u.id
ORDER BY o.name, u.email;
```

### Ver sesiones abiertas

```sql
SELECT 
    s.plate,
    s.entry_time,
    EXTRACT(EPOCH FROM (now() - s.entry_time))/60 as minutes_parked,
    p.name as parking,
    o.name as organization
FROM sessions s
JOIN parkings p ON s.parking_id = p.id
JOIN organizations o ON s.org_id = o.id
WHERE s.status = 'open'
ORDER BY s.entry_time;
```

### Ver turnos abiertos

```sql
SELECT 
    u.email as operator,
    p.name as parking,
    sh.opening_time,
    sh.opening_cash,
    o.name as organization
FROM shifts sh
JOIN auth.users u ON sh.user_id = u.id
JOIN parkings p ON sh.parking_id = p.id
JOIN organizations o ON sh.org_id = o.id
WHERE sh.status = 'open'
ORDER BY sh.opening_time;
```

### Reporte de recaudación (últimos 7 días)

```sql
SELECT 
    o.name as organization,
    p.name as parking,
    COUNT(pay.id) as total_payments,
    SUM(pay.amount) as total_revenue,
    AVG(pay.minutes) as avg_minutes,
    AVG(pay.amount) as avg_amount
FROM payments pay
JOIN organizations o ON pay.org_id = o.id
JOIN sessions s ON pay.session_id = s.id
JOIN parkings p ON s.parking_id = p.id
WHERE pay.created_at > now() - interval '7 days'
GROUP BY o.id, o.name, p.id, p.name
ORDER BY total_revenue DESC;
```

---

## ✅ CHECKLIST FINAL

Antes de pasar a desarrollo:

- [ ] Schema ejecutado sin errores
- [ ] 10 tablas creadas
- [ ] 5 funciones creadas
- [ ] RLS habilitado en todas las tablas
- [ ] Al menos 1 organización creada
- [ ] Al menos 1 usuario admin creado
- [ ] Al menos 1 parking creado
- [ ] Al menos 1 tarifa configurada
- [ ] Funciones probadas (normalize_plate, get_active_tariff)
- [ ] Job de limpieza configurado (opcional pero recomendado)

---

## 📞 SOPORTE

Si tienes problemas:

1. Revisar logs en Supabase Dashboard → Logs
2. Revisar `docs/MVP-v0.1-Definicion.md` para entender el modelo
3. Revisar `docs/Diccionario-de-Datos.md` para referencia de campos
4. Ejecutar queries de verificación de este documento

---

**¡Listo!** Tu base de datos está configurada y lista para desarrollo.

**Siguiente paso:** Crear Edge Functions o API para las operaciones (crear sesión, cobrar, etc.)

---

**Versión:** 0.1.5  
**Última actualización:** 24 de Enero 2026
