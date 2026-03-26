-- ============================================================================
-- VERIFICAR MEMBERSHIP Y CONFIGURACIÓN DEL USUARIO TEST
-- ============================================================================

-- 1. Verificar usuario en auth.users
SELECT 
    '1. Usuario en auth.users' as check_name,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email = 'test@inbyte.com';

-- 2. Verificar membership
SELECT 
    '2. Membership' as check_name,
    m.id,
    m.org_id,
    m.user_id,
    m.role,
    m.status,
    o.name as org_name
FROM memberships m
JOIN organizations o ON o.id = m.org_id
WHERE m.user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002';

-- 3. Probar get_user_org_id
SELECT 
    '3. get_user_org_id result' as check_name,
    get_user_org_id('9e52435a-dd5c-441b-9650-8ea3ec504002'::uuid) as org_id;

-- 4. Verificar parking
SELECT 
    '4. Parking verificado' as check_name,
    p.id,
    p.org_id,
    p.name,
    p.status
FROM parkings p
WHERE p.id = 'b0000000-0000-0000-0000-000000000001'
AND p.org_id = (SELECT get_user_org_id('9e52435a-dd5c-441b-9650-8ea3ec504002'::uuid))
AND p.status = 'active';

-- 5. Verificar turnos abiertos
SELECT 
    '5. Turnos abiertos del usuario' as check_name,
    COUNT(*) as count
FROM shifts
WHERE user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002'
AND status = 'open';
