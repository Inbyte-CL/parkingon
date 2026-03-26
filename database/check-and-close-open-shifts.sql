-- Verificar turnos abiertos para el usuario test
SELECT 
    s.id,
    s.user_id,
    u.email,
    s.parking_id,
    p.name as parking_name,
    s.status,
    s.opening_time,
    s.opening_cash,
    s.created_at
FROM shifts s
JOIN auth.users u ON u.id = s.user_id
LEFT JOIN parkings p ON p.id = s.parking_id
WHERE u.email = 'test@inbyte.com'
AND s.status = 'open'
ORDER BY s.opening_time DESC;

-- Si hay turnos abiertos, cerrarlos
UPDATE shifts
SET 
    status = 'closed',
    closing_time = now(),
    closing_cash = opening_cash,
    difference = 0,
    updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@inbyte.com')
AND status = 'open';

-- Verificar que se cerraron
SELECT 
    '✅ Turnos cerrados' as status,
    COUNT(*) as turnos_cerrados
FROM shifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@inbyte.com')
AND status = 'closed'
AND closing_time > now() - interval '5 minutes';
