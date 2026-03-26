-- Verificar métodos de pago en la tabla payments
SELECT 
    payment_method,
    COUNT(*) as cantidad,
    SUM(amount) as total_monto
FROM payments
WHERE status = 'completed'
GROUP BY payment_method
ORDER BY cantidad DESC;

-- Ver algunos ejemplos de pagos con sus métodos
SELECT 
    p.id,
    p.session_id,
    p.amount,
    p.payment_method,
    p.status,
    p.created_at,
    s.plate,
    s.entry_time,
    s.exit_time
FROM payments p
JOIN sessions s ON s.id = p.session_id
WHERE p.status = 'completed'
ORDER BY p.created_at DESC
LIMIT 20;
