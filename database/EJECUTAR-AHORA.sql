-- ============================================================================
-- AGREGAR PARKING_ID A MEMBERSHIPS Y ASIGNAR PARKINGS
-- ============================================================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/mmqqrfvullrovstcykcj/sql/new
-- ============================================================================

-- PASO 1: Agregar columna parking_id
ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS parking_id UUID REFERENCES parkings(id) ON DELETE SET NULL;

-- PASO 2: Crear índice
CREATE INDEX IF NOT EXISTS idx_memberships_parking ON memberships(parking_id);

-- PASO 3: Comentario
COMMENT ON COLUMN memberships.parking_id IS 'Parking asignado al usuario (requerido para operadores)';

-- PASO 4: Asignar parkings a operadores usando sus emails
-- test@inbyte.com -> Zona Centro
UPDATE memberships m
SET parking_id = 'b0000000-0000-0000-0000-000000000001'
FROM auth.users u
WHERE m.user_id = u.id
AND u.email = 'test@inbyte.com';

-- juan.perez@inbyte.com -> Zona Centro
UPDATE memberships m
SET parking_id = 'b0000000-0000-0000-0000-000000000001'
FROM auth.users u
WHERE m.user_id = u.id
AND u.email = 'juan.perez@inbyte.com';

-- maria.garcia@inbyte.com -> Zona Norte
UPDATE memberships m
SET parking_id = 'b0000000-0000-0000-0000-000000000002'
FROM auth.users u
WHERE m.user_id = u.id
AND u.email = 'maria.garcia@inbyte.com';

-- carlos.lopez@inbyte.com -> Zona Sur
UPDATE memberships m
SET parking_id = 'b0000000-0000-0000-0000-000000000003'
FROM auth.users u
WHERE m.user_id = u.id
AND u.email = 'carlos.lopez@inbyte.com';

-- ana.martinez@inbyte.com -> Zona Centro
UPDATE memberships m
SET parking_id = 'b0000000-0000-0000-0000-000000000001'
FROM auth.users u
WHERE m.user_id = u.id
AND u.email = 'ana.martinez@inbyte.com';

-- PASO 5: Verificar asignaciones
SELECT 
    '✅ Parkings asignados correctamente' as status,
    u.email,
    m.role,
    COALESCE(p.name, '❌ Sin parking') as parking_asignado,
    p.address
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
LEFT JOIN parkings p ON p.id = m.parking_id
WHERE m.role = 'operador'
ORDER BY u.email;
