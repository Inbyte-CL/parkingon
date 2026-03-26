-- ============================================================================
-- VERIFICAR TURNO CREADO
-- ============================================================================

-- 1. Ver el turno creado
SELECT 
    '✅ Turno creado' as check_name,
    s.id,
    s.status,
    s.opening_time,
    s.opening_cash,
    s.expected_cash_drawer,
    u.email as operator_email,
    p.name as parking_name
FROM shifts s
JOIN auth.users u ON u.id = s.user_id
JOIN parkings p ON p.id = s.parking_id
WHERE s.user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002'
ORDER BY s.opening_time DESC
LIMIT 1;

-- 2. Ver audit log
SELECT 
    '✅ Audit log registrado' as check_name,
    a.action,
    a.entity_type,
    a.metadata,
    a.created_at,
    u.email as user_email
FROM audit_logs a
JOIN auth.users u ON u.id = a.user_id
WHERE a.user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002'
AND a.action = 'shift.opened'
ORDER BY a.created_at DESC
LIMIT 1;
