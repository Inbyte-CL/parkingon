-- Cerrar el turno de prueba que quedó abierto
UPDATE shifts
SET status = 'closed',
    closing_time = now(),
    closing_cash = opening_cash
WHERE id = '777134a6-09b2-4319-8c6e-8e6d1791182a';

-- Verificar
SELECT 
    id,
    status,
    opening_time,
    closing_time,
    opening_cash
FROM shifts
WHERE user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002'
ORDER BY opening_time DESC
LIMIT 5;
