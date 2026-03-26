-- ============================================================================
-- CERRAR TURNO ABIERTO DE UN USUARIO ESPECÍFICO
-- ============================================================================
-- Reemplaza 'operador1@inbyte.com' con el email del usuario que tiene el problema
-- ============================================================================

-- Cerrar turno abierto del usuario
UPDATE shifts
SET 
    status = 'closed',
    closing_time = now(),
    closing_cash = COALESCE(opening_cash, 0) + COALESCE((
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE shift_id = shifts.id
        AND status = 'completed'
        AND method = 'cash'
    ), 0),
    cash_sales = COALESCE((
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE shift_id = shifts.id
        AND status = 'completed'
        AND payment_method = 'cash'
    ), 0),
    expected_cash_drawer = COALESCE(opening_cash, 0) + COALESCE((
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE shift_id = shifts.id
        AND status = 'completed'
        AND payment_method = 'cash'
    ), 0),
    difference = 0,
    notes = COALESCE(notes, '') || ' [Cerrado automáticamente por cambio de organización/parking]'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'operador1@inbyte.com')
AND status = 'open';

-- Verificar que se cerró
SELECT 
    '✅ Turno cerrado' as status,
    s.id,
    u.email,
    s.status,
    s.opening_time,
    s.closing_time,
    s.opening_cash,
    s.closing_cash
FROM shifts s
JOIN auth.users u ON u.id = s.user_id
WHERE u.email = 'operador1@inbyte.com'
ORDER BY s.created_at DESC
LIMIT 1;
