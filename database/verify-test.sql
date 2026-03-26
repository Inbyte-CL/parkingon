-- Verificar que el turno se creó correctamente
-- Ejecuta esto en el SQL Editor: https://supabase.com/dashboard/project/mmqqrfvullrovstcykcj/sql/new

-- 1. Ver el turno recién creado
SELECT 
    s.id,
    s.status,
    s.opening_time,
    s.opening_cash,
    s.notes,
    u.email as operador,
    p.name as parking,
    o.name as organizacion
FROM shifts s
JOIN auth.users u ON u.id = s.user_id
JOIN parkings p ON p.id = s.parking_id
JOIN organizations o ON o.id = s.org_id
WHERE s.user_id = (SELECT id FROM auth.users WHERE email = 'test@inbyte.com')
ORDER BY s.created_at DESC
LIMIT 1;

-- 2. Ver todos los turnos del usuario test
SELECT 
    id,
    status,
    opening_time,
    opening_cash,
    closing_time,
    closing_cash,
    difference,
    notes,
    created_at
FROM shifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@inbyte.com')
ORDER BY created_at DESC;

-- 3. Ver audit logs relacionados
SELECT 
    action,
    entity_type,
    metadata,
    created_at
FROM audit_logs
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@inbyte.com')
ORDER BY created_at DESC
LIMIT 5;
