-- ============================================================================
-- VERIFICAR ESTADO ACTUAL DEL SISTEMA
-- ============================================================================

-- 1. Turno actual
SELECT 
    '1. Turno' as check_name,
    s.id,
    s.status,
    s.opening_cash,
    s.cash_sales,
    s.expected_cash_drawer,
    u.email as operator
FROM shifts s
JOIN auth.users u ON u.id = s.user_id
WHERE s.user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002'
ORDER BY s.opening_time DESC
LIMIT 1;

-- 2. Sesiones del turno
SELECT 
    '2. Sesiones' as check_name,
    id,
    plate,
    session_code,
    status,
    entry_time,
    exit_time
FROM sessions
WHERE shift_id = '85c0df3d-4077-413c-9536-1f058eb57eb4'
ORDER BY entry_time DESC;

-- 3. Quotes
SELECT 
    '3. Quotes' as check_name,
    quote_id,
    session_id,
    amount_locked,
    status,
    expires_at
FROM payment_quotes
WHERE session_id = '5e7e2f8f-bf9f-413b-8d9e-5e557bb9632e'
ORDER BY created_at DESC;

-- 4. Pagos
SELECT 
    '4. Pagos' as check_name,
    id,
    session_id,
    amount,
    payment_method,
    status,
    created_at
FROM payments
WHERE session_id = '5e7e2f8f-bf9f-413b-8d9e-5e557bb9632e'
ORDER BY created_at DESC;
