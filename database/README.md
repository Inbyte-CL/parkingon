# DATABASE - PARKING ON STREET

Scripts SQL para crear y gestionar la base de datos en Supabase.

---

## 📁 Archivos

- **`schema.sql`**: Schema completo (tablas, índices, funciones, RLS)
- **`seed.sql`**: Datos de ejemplo para desarrollo
- **`migrations/`**: Migraciones futuras

---

## 🚀 Instalación en Supabase

### Opción 1: SQL Editor (Recomendado)

1. Ir a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navegar a **SQL Editor**
3. Crear una nueva query
4. Copiar y pegar el contenido de `schema.sql`
5. Ejecutar (Run)
6. Verificar que aparezca el mensaje de éxito

### Opción 2: CLI de Supabase

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref <tu-project-ref>

# Ejecutar schema
supabase db push
```

---

## 📊 Estructura Creada

### Tablas (10)
1. `organizations` - Empresas/municipalidades
2. `memberships` - Usuarios en empresas
3. `parkings` - Zonas de estacionamiento
4. `zones` - Sub-zonas (opcional)
5. `tariffs` - Tarifas configurables
6. `shifts` - Turnos de operadores
7. `sessions` - Sesiones de estacionamiento
8. `payment_quotes` - Quotes temporales
9. `payments` - Pagos
10. `audit_logs` - Auditoría

### ENUMs (7)
- `status_type`
- `user_role`
- `shift_status`
- `session_status`
- `payment_method_type`
- `payment_status_type`
- `quote_status_type`

### Funciones Helper (5)
- `normalize_plate(TEXT)` - Normalizar patentes
- `get_user_org_id()` - Obtener org del usuario
- `get_user_active_parking()` - Obtener parking activo
- `get_active_tariff()` - Buscar tarifa vigente
- `is_superadmin()` - Verificar superadmin

### Triggers (2)
- Auto-actualizar `updated_at`
- Auto-normalizar `plate`

### RLS Policies
- Todas las tablas con RLS habilitado
- Políticas por `org_id`
- Políticas adicionales por `parking_id` para operadores
- Superadmin con acceso total

---

## 🧪 Datos de Ejemplo

Para insertar datos de prueba, ejecutar `seed.sql`:

```bash
# En SQL Editor de Supabase
# Copiar y pegar seed.sql
```

---

## ✅ Verificación

Después de ejecutar el schema, verificar:

```sql
-- Ver tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Ver funciones
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Ver políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 🔄 Migraciones Futuras

Para cambios futuros, crear archivos en `migrations/`:

```
migrations/
  001_add_field_to_sessions.sql
  002_add_new_payment_method.sql
```

---

## 🛠️ Comandos Útiles

### Resetear Base de Datos (CUIDADO)

```sql
-- Eliminar todas las tablas
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Luego ejecutar schema.sql nuevamente
```

### Backup

```bash
# Usando Supabase CLI
supabase db dump -f backup.sql
```

### Restore

```bash
# Usando Supabase CLI
supabase db reset
psql -h <host> -U postgres -d postgres -f backup.sql
```

---

## 📝 Notas Importantes

1. **RLS Habilitado**: Todas las tablas tienen RLS. Los usuarios solo ven datos de su organización.

2. **Normalización Automática**: Las patentes se normalizan automáticamente al insertar/actualizar.

3. **Superadmin**: Se identifica con metadata `is_superadmin: true` en el JWT de Supabase Auth.

4. **Quotes TTL**: Los quotes expiran en 2-3 minutos. Crear job para limpieza periódica.

5. **Constraints UNIQUE Parciales**: Usan `WHERE` para validaciones específicas (ej: solo 1 turno abierto por usuario).

---

## 🔐 Seguridad

- ✅ RLS habilitado en todas las tablas
- ✅ Funciones con `SECURITY DEFINER` para acceso controlado
- ✅ Constraints para validar integridad de datos
- ✅ Foreign keys con `ON DELETE` apropiados
- ✅ Checks para validar rangos numéricos

---

## 📞 Soporte

Para dudas sobre el schema, revisar:
- `docs/MVP-v0.1-Definicion.md` - Definición completa del MVP
- `docs/Diccionario-de-Datos.md` - Diccionario de datos

---

**Versión:** 0.1.5  
**Última actualización:** 24 de Enero 2026
