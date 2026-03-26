-- Debug: Verificar datos para open-shift
-- Usuario test: 9e52435a-dd5c-441b-9650-8ea3ec504002

-- 1. Verificar get_user_org_id
SELECT 'get_user_org_id result:' as test, get_user_org_id('9e52435a-dd5c-441b-9650-8ea3ec504002'::uuid) as org_id;

-- 2. Verificar membership
SELECT 'Membership:' as test, * FROM memberships WHERE user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002';

-- 3. Verificar parkings de la org
SELECT 'Parkings:' as test, id, name, org_id, status FROM parkings WHERE org_id = (SELECT get_user_org_id('9e52435a-dd5c-441b-9650-8ea3ec504002'::uuid));

-- 4. Verificar si existe el parking específico
SELECT 'Parking específico:' as test, * FROM parkings WHERE id = 'b0000000-0000-0000-0000-000000000001';

-- 5. Verificar turnos abiertos del usuario
SELECT 'Turnos abiertos:' as test, * FROM shifts WHERE user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002' AND status = 'open';
