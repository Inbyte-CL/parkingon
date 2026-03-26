-- ============================================================================
-- ⚠️ EJECUTA ESTO AHORA EN SUPABASE SQL EDITOR
-- ============================================================================
-- URL: https://supabase.com/dashboard/project/mmqqrfvullrovstcykcj/sql/new
-- ============================================================================

-- Asignar Zona Centro al usuario test@inbyte.com
UPDATE memberships
SET parking_id = 'b0000000-0000-0000-0000-000000000001'
WHERE user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002'
AND org_id = 'a0000000-0000-0000-0000-000000000001';

-- Verificar que se asignó correctamente
SELECT 
    '✅ Parking asignado correctamente' as status,
    u.email,
    m.role,
    p.name as parking_asignado,
    p.address,
    m.parking_id
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
JOIN parkings p ON p.id = m.parking_id
WHERE m.user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002';
