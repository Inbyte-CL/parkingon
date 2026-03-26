-- Debug: Verificar configuración del usuario test@inbyte.com

-- 1. Verificar que el usuario existe
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email = 'test@inbyte.com';

-- 2. Verificar membership
SELECT 
    m.id,
    m.org_id,
    m.user_id,
    m.role,
    m.status,
    o.name as organization_name
FROM memberships m
JOIN organizations o ON o.id = m.org_id
WHERE m.user_id = (SELECT id FROM auth.users WHERE email = 'test@inbyte.com');

-- 3. Verificar si get_user_org_id funciona
SELECT get_user_org_id((SELECT id FROM auth.users WHERE email = 'test@inbyte.com')) as org_id;

-- 4. Ver todos los turnos (de cualquier usuario)
SELECT 
    s.id,
    s.status,
    u.email,
    s.opening_time,
    s.created_at
FROM shifts s
JOIN auth.users u ON u.id = s.user_id
ORDER BY s.created_at DESC
LIMIT 5;
