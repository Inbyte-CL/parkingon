-- ============================================================================
-- CERRAR TURNOS ABIERTOS HUÉRFANOS
-- ============================================================================
-- Este script cierra turnos abiertos que quedaron huérfanos después de
-- cambiar la organización o parking de un usuario
-- ============================================================================

-- Opción 1: Cerrar todos los turnos abiertos de un usuario específico
-- (Reemplaza 'USER_EMAIL' con el email del usuario)
/*
UPDATE shifts
SET 
    status = 'closed',
    closing_time = now(),
    closing_cash = COALESCE(opening_cash, 0),
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
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'USER_EMAIL')
AND status = 'open';
*/

-- Opción 2: Cerrar todos los turnos abiertos de todos los usuarios
-- (Útil para limpiar turnos huérfanos después de cambios masivos)
UPDATE shifts
SET 
    status = 'closed',
    closing_time = now(),
    closing_cash = COALESCE(opening_cash, 0),
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
WHERE status = 'open';

-- Verificar turnos cerrados
SELECT 
    '✅ Turnos cerrados' as status,
    COUNT(*) as total_cerrados
FROM shifts
WHERE status = 'closed'
AND closing_time >= now() - interval '1 minute';

-- Verificar que no queden turnos abiertos
SELECT 
    '🔍 Turnos abiertos restantes' as status,
    s.id,
    u.email,
    s.parking_id,
    s.opening_time,
    s.opening_cash
FROM shifts s
JOIN auth.users u ON u.id = s.user_id
WHERE s.status = 'open'
ORDER BY s.opening_time DESC;
