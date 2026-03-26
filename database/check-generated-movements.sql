-- Script para verificar movimientos generados en JIS Parking

-- 1. Contar sesiones por mes
SELECT 
    DATE_TRUNC('month', entry_time) as mes,
    COUNT(*) as total_sesiones,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as cerradas,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as abiertas
FROM sessions
WHERE org_id = (SELECT id FROM organizations WHERE slug = 'jis-parking')
GROUP BY DATE_TRUNC('month', entry_time)
ORDER BY mes;

-- 2. Verificar pagos asociados
SELECT 
    DATE_TRUNC('month', p.created_at) as mes,
    COUNT(*) as total_pagos,
    SUM(p.amount) as monto_total,
    COUNT(CASE WHEN p.payment_method = 'cash' THEN 1 END) as efectivo,
    COUNT(CASE WHEN p.payment_method = 'card' THEN 1 END) as tarjeta,
    COUNT(CASE WHEN p.payment_method = 'qr_payment' THEN 1 END) as qr
FROM payments p
JOIN sessions s ON p.session_id = s.id
WHERE s.org_id = (SELECT id FROM organizations WHERE slug = 'jis-parking')
GROUP BY DATE_TRUNC('month', p.created_at)
ORDER BY mes;

-- 3. Verificar sesiones sin pagos
SELECT 
    COUNT(*) as sesiones_sin_pago
FROM sessions s
LEFT JOIN payments p ON s.id = p.session_id AND p.status = 'completed'
WHERE s.org_id = (SELECT id FROM organizations WHERE slug = 'jis-parking')
  AND s.status = 'closed'
  AND p.id IS NULL;

-- 4. Verificar rangos de fechas
SELECT 
    MIN(entry_time) as primera_entrada,
    MAX(entry_time) as ultima_entrada,
    MIN(exit_time) as primera_salida,
    MAX(exit_time) as ultima_salida
FROM sessions
WHERE org_id = (SELECT id FROM organizations WHERE slug = 'jis-parking')
  AND status = 'closed';

-- 5. Verificar por operador
SELECT 
    m.display_name as operador,
    COUNT(s.id) as sesiones,
    COUNT(p.id) as pagos
FROM sessions s
JOIN memberships m ON s.created_by = m.user_id
LEFT JOIN payments p ON s.id = p.session_id AND p.status = 'completed'
WHERE s.org_id = (SELECT id FROM organizations WHERE slug = 'jis-parking')
GROUP BY m.display_name
ORDER BY sesiones DESC;

-- 6. Verificar por parking
SELECT 
    p.name as parking,
    COUNT(s.id) as sesiones,
    COUNT(pay.id) as pagos
FROM sessions s
JOIN parkings p ON s.parking_id = p.id
LEFT JOIN payments pay ON s.id = pay.session_id AND pay.status = 'completed'
WHERE s.org_id = (SELECT id FROM organizations WHERE slug = 'jis-parking')
GROUP BY p.name
ORDER BY sesiones DESC;

-- 7. Ver últimas 10 sesiones generadas
SELECT 
    s.id,
    s.plate,
    s.entry_time,
    s.exit_time,
    s.status,
    p.name as parking,
    m.display_name as operador,
    pay.amount,
    pay.payment_method
FROM sessions s
JOIN parkings p ON s.parking_id = p.id
JOIN memberships m ON s.created_by = m.user_id
LEFT JOIN payments pay ON s.id = pay.session_id AND pay.status = 'completed'
WHERE s.org_id = (SELECT id FROM organizations WHERE slug = 'jis-parking')
ORDER BY s.entry_time DESC
LIMIT 10;
