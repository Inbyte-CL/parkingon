-- ============================================================================
-- AGREGAR PARKING_ID A MEMBERSHIPS
-- ============================================================================
-- Los operadores necesitan tener un parking asignado para poder abrir turnos
-- ============================================================================

-- 1. Agregar columna parking_id a memberships
ALTER TABLE memberships
ADD COLUMN parking_id UUID REFERENCES parkings(id) ON DELETE SET NULL;

-- 2. Crear índice para mejorar performance
CREATE INDEX idx_memberships_parking ON memberships(parking_id);

-- 3. Comentario
COMMENT ON COLUMN memberships.parking_id IS 'Parking asignado al usuario (requerido para operadores)';

-- 4. Asignar parkings a operadores usando sus emails
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

-- 5. Verificar estructura actualizada
SELECT 
    '✅ Columna parking_id agregada' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'memberships'
AND column_name = 'parking_id';

-- 6. Verificar asignaciones
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

-- 7. Ver todos los memberships con sus parkings asignados
SELECT 
    '📋 Todos los memberships' as info,
    u.email,
    o.name as organizacion,
    m.role,
    COALESCE(p.name, 'Sin parking asignado') as parking,
    m.status
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
JOIN organizations o ON o.id = m.org_id
LEFT JOIN parkings p ON p.id = m.parking_id
ORDER BY o.name, u.email;
