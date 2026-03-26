-- Verificar turnos activos del usuario test
SELECT 
    '🔍 Turnos del usuario test@inbyte.com' as info,
    id,
    status,
    opening_time,
    closing_time,
    opening_cash,
    closing_cash
FROM shifts
WHERE user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002'
ORDER BY opening_time DESC
LIMIT 10;

-- Ver si hay algún turno abierto
SELECT 
    '🔓 Turnos ABIERTOS' as info,
    COUNT(*) as total_abiertos
FROM shifts
WHERE user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002'
AND status = 'open';
