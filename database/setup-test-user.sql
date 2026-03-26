-- ============================================================================
-- SETUP TEST USER: test@inbyte.com
-- UUID: 9e52435a-dd5c-441b-9650-8ea3ec504002
-- ============================================================================
-- Ejecuta esto en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/mmqqrfvullrovstcykcj/sql/new

-- 1. Confirmar email del usuario test
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'test@inbyte.com';

-- 2. Agregar membership a Inbyte (operador) con parking asignado
INSERT INTO memberships (org_id, user_id, parking_id, role, status)
VALUES (
    'a0000000-0000-0000-0000-000000000001', -- Inbyte org
    '9e52435a-dd5c-441b-9650-8ea3ec504002', -- test@inbyte.com
    'b0000000-0000-0000-0000-000000000001', -- Zona Centro
    'operador',
    'active'
)
ON CONFLICT (org_id, user_id) DO UPDATE SET
    parking_id = 'b0000000-0000-0000-0000-000000000001',
    role = 'operador',
    status = 'active';

-- 3. Verificar setup completo
SELECT 
    '✅ Usuario configurado' as status,
    u.id as user_id,
    u.email,
    u.email_confirmed_at,
    m.org_id,
    o.name as org_name,
    m.role,
    m.status as membership_status
FROM auth.users u
LEFT JOIN memberships m ON m.user_id = u.id
LEFT JOIN organizations o ON o.id = m.org_id
WHERE u.email = 'test@inbyte.com';

-- 4. Verificar get_user_org_id
SELECT 
    '✅ get_user_org_id funciona' as status,
    get_user_org_id('9e52435a-dd5c-441b-9650-8ea3ec504002'::uuid) as org_id;

-- 5. Verificar parkings disponibles
SELECT 
    '✅ Parkings disponibles' as status,
    id as parking_id,
    name,
    address,
    status
FROM parkings
WHERE org_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY name;
