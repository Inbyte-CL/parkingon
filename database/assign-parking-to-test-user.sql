-- ============================================================================
-- ASIGNAR PARKING AL USUARIO TEST
-- ============================================================================
-- El usuario test@inbyte.com necesita tener un parking_id asignado
-- para poder abrir turnos
-- ============================================================================

-- 1. Ver parkings disponibles de Inbyte
SELECT 
    '📍 Parkings disponibles' as info,
    id as parking_id,
    name,
    address
FROM parkings
WHERE org_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY name;

-- 2. Actualizar membership para asignar Zona Centro al usuario test
UPDATE memberships
SET parking_id = 'b0000000-0000-0000-0000-000000000001' -- Zona Centro
WHERE user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002'
AND org_id = 'a0000000-0000-0000-0000-000000000001';

-- 3. Verificar que se asignó correctamente
SELECT 
    '✅ Parking asignado' as status,
    u.email,
    m.role,
    p.name as parking_asignado,
    p.address,
    m.status
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
JOIN parkings p ON p.id = m.parking_id
WHERE m.user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002';
