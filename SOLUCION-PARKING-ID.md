# 🔧 Solución: Agregar parking_id a memberships

## ❌ Problema

La tabla `memberships` no tenía la columna `parking_id`, que es necesaria para que los operadores puedan abrir turnos.

## ✅ Solución

### Paso 1: Ejecutar SQL en Supabase

**URL:** https://supabase.com/dashboard/project/mmqqrfvullrovstcykcj/sql/new

**Copia y pega todo este SQL:**

```sql
-- 1. Agregar columna parking_id
ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS parking_id UUID REFERENCES parkings(id) ON DELETE SET NULL;

-- 2. Crear índice
CREATE INDEX IF NOT EXISTS idx_memberships_parking ON memberships(parking_id);

-- 3. Comentario
COMMENT ON COLUMN memberships.parking_id IS 'Parking asignado al usuario (requerido para operadores)';

-- 4. Asignar parkings a operadores usando emails
-- test@inbyte.com -> Zona Centro
UPDATE memberships m
SET parking_id = 'b0000000-0000-0000-0000-000000000001'
FROM auth.users u
WHERE m.user_id = u.id AND u.email = 'test@inbyte.com';

-- juan.perez@inbyte.com -> Zona Centro
UPDATE memberships m
SET parking_id = 'b0000000-0000-0000-0000-000000000001'
FROM auth.users u
WHERE m.user_id = u.id AND u.email = 'juan.perez@inbyte.com';

-- maria.garcia@inbyte.com -> Zona Norte
UPDATE memberships m
SET parking_id = 'b0000000-0000-0000-0000-000000000002'
FROM auth.users u
WHERE m.user_id = u.id AND u.email = 'maria.garcia@inbyte.com';

-- carlos.lopez@inbyte.com -> Zona Sur
UPDATE memberships m
SET parking_id = 'b0000000-0000-0000-0000-000000000003'
FROM auth.users u
WHERE m.user_id = u.id AND u.email = 'carlos.lopez@inbyte.com';

-- ana.martinez@inbyte.com -> Zona Centro
UPDATE memberships m
SET parking_id = 'b0000000-0000-0000-0000-000000000001'
FROM auth.users u
WHERE m.user_id = u.id AND u.email = 'ana.martinez@inbyte.com';

-- 5. Verificar asignaciones
SELECT 
    '✅ Parkings asignados' as status,
    u.email,
    m.role,
    COALESCE(p.name, '❌ Sin parking') as parking_asignado,
    p.address
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
LEFT JOIN parkings p ON p.id = m.parking_id
WHERE m.role = 'operador'
ORDER BY u.email;
```

### Paso 2: Verificar Resultado

Deberías ver algo como:

| status | email | role | parking_asignado | address |
|--------|-------|------|------------------|---------|
| ✅ Parkings asignados | ana.martinez@inbyte.com | operador | Zona Centro | Av. Corrientes 1234 |
| ✅ Parkings asignados | carlos.lopez@inbyte.com | operador | Zona Sur | Av. Rivadavia 5678 |
| ✅ Parkings asignados | juan.perez@inbyte.com | operador | Zona Centro | Av. Corrientes 1234 |
| ✅ Parkings asignados | maria.garcia@inbyte.com | operador | Zona Norte | Av. Cabildo 9012 |
| ✅ Parkings asignados | test@inbyte.com | operador | Zona Centro | Av. Corrientes 1234 |

### Paso 3: Probar en la App

1. Abre la app en tu dispositivo
2. Haz login con `test@inbyte.com` / `Test123!`
3. Presiona "Abrir Turno"
4. Ingresa efectivo inicial (ej: 1000)
5. Presiona "Abrir Turno"
6. **Debería funcionar correctamente** ✅

## 📁 Archivos

- ✅ `database/EJECUTAR-AHORA.sql` - SQL listo para copiar y pegar
- ✅ `database/add-parking-to-memberships.sql` - Migración completa
- ✅ `database/schema.sql` - Schema actualizado
- ✅ `database/seed-inbyte.sql` - Seeds actualizados

## 🎯 Próximos Pasos

Una vez que funcione abrir turnos:
1. ✅ Probar cerrar turno
2. Implementar crear sesión (registrar entrada de auto)
3. Implementar crear quote y procesar pago
4. Ver sesiones activas

---

**¡Ejecuta el SQL de `database/EJECUTAR-AHORA.sql` y prueba la app!** 🚀
