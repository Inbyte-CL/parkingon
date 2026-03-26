-- ============================================================================
-- PARKING ON STREET - CLEANUP SCRIPT
-- Versión: 0.1.5
-- Descripción: Scripts de limpieza y mantenimiento
-- ============================================================================

-- ============================================================================
-- JOB 1: LIMPIAR QUOTES EXPIRADOS/USADOS (Ejecutar diariamente)
-- ============================================================================

-- Eliminar quotes expirados o usados con más de 7 días
DELETE FROM payment_quotes
WHERE status IN ('expired', 'used')
AND created_at < now() - interval '7 days';

-- Verificar resultado
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Quotes eliminados: %', deleted_count;
END $$;

-- ============================================================================
-- JOB 2: MARCAR QUOTES EXPIRADOS (Ejecutar cada hora)
-- ============================================================================

-- Marcar como expired los quotes activos que pasaron su expires_at
UPDATE payment_quotes
SET status = 'expired'
WHERE status = 'active'
AND expires_at < now();

-- Verificar resultado
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Quotes marcados como expirados: %', updated_count;
END $$;

-- ============================================================================
-- QUERY: SESIONES ANTIGUAS ABIERTAS (Para alertas)
-- ============================================================================

-- Sesiones abiertas > 12 horas (WARNING)
SELECT 
    s.id,
    s.plate,
    s.entry_time,
    EXTRACT(EPOCH FROM (now() - s.entry_time))/3600 as hours_open,
    p.name as parking_name,
    o.name as org_name,
    'WARNING' as alert_level
FROM sessions s
JOIN parkings p ON s.parking_id = p.id
JOIN organizations o ON s.org_id = o.id
WHERE s.status = 'open'
AND s.entry_time < now() - interval '12 hours'
AND s.entry_time >= now() - interval '24 hours'

UNION ALL

-- Sesiones abiertas > 24 horas (CRITICAL)
SELECT 
    s.id,
    s.plate,
    s.entry_time,
    EXTRACT(EPOCH FROM (now() - s.entry_time))/3600 as hours_open,
    p.name as parking_name,
    o.name as org_name,
    'CRITICAL' as alert_level
FROM sessions s
JOIN parkings p ON s.parking_id = p.id
JOIN organizations o ON s.org_id = o.id
WHERE s.status = 'open'
AND s.entry_time < now() - interval '24 hours'

ORDER BY hours_open DESC;

-- ============================================================================
-- QUERY: TURNOS ABIERTOS POR MÁS DE 24 HORAS
-- ============================================================================

SELECT 
    sh.id,
    sh.opening_time,
    EXTRACT(EPOCH FROM (now() - sh.opening_time))/3600 as hours_open,
    u.email as operator_email,
    p.name as parking_name,
    o.name as org_name
FROM shifts sh
JOIN auth.users u ON sh.user_id = u.id
JOIN parkings p ON sh.parking_id = p.id
JOIN organizations o ON sh.org_id = o.id
WHERE sh.status = 'open'
AND sh.opening_time < now() - interval '24 hours'
ORDER BY hours_open DESC;

-- ============================================================================
-- QUERY: DIFERENCIAS EN CIERRES DE TURNO
-- ============================================================================

-- Turnos cerrados con diferencias significativas (> $100)
SELECT 
    sh.id,
    sh.closing_time,
    u.email as operator_email,
    p.name as parking_name,
    sh.opening_cash,
    sh.cash_sales,
    sh.expected_cash_drawer,
    sh.closing_cash,
    sh.difference,
    sh.notes
FROM shifts sh
JOIN auth.users u ON sh.user_id = u.id
JOIN parkings p ON sh.parking_id = p.id
WHERE sh.status = 'closed'
AND ABS(sh.difference) > 100
AND sh.closing_time > now() - interval '7 days'
ORDER BY ABS(sh.difference) DESC;

-- ============================================================================
-- QUERY: ESTADÍSTICAS GENERALES
-- ============================================================================

-- Resumen por organización (últimos 7 días)
SELECT 
    o.name as organization,
    COUNT(DISTINCT sh.id) as total_shifts,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN s.status = 'open' THEN s.id END) as open_sessions,
    COUNT(DISTINCT p.id) as total_payments,
    COALESCE(SUM(p.amount), 0) as total_revenue
FROM organizations o
LEFT JOIN shifts sh ON o.id = sh.org_id AND sh.created_at > now() - interval '7 days'
LEFT JOIN sessions s ON o.id = s.org_id AND s.created_at > now() - interval '7 days'
LEFT JOIN payments p ON o.id = p.org_id AND p.created_at > now() - interval '7 days'
GROUP BY o.id, o.name
ORDER BY total_revenue DESC;

-- ============================================================================
-- MANTENIMIENTO: VACUUM Y ANALYZE
-- ============================================================================

-- Ejecutar periódicamente para optimizar performance
-- VACUUM ANALYZE organizations;
-- VACUUM ANALYZE memberships;
-- VACUUM ANALYZE parkings;
-- VACUUM ANALYZE tariffs;
-- VACUUM ANALYZE shifts;
-- VACUUM ANALYZE sessions;
-- VACUUM ANALYZE payment_quotes;
-- VACUUM ANALYZE payments;
-- VACUUM ANALYZE audit_logs;

-- ============================================================================
-- RESET COMPLETO (SOLO DESARROLLO - CUIDADO)
-- ============================================================================

-- DESCOMENTAR SOLO SI QUIERES BORRAR TODO
/*
-- Eliminar todas las tablas en orden inverso (por foreign keys)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payment_quotes CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS tariffs CASCADE;
DROP TABLE IF EXISTS parkings CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS normalize_plate(TEXT);
DROP FUNCTION IF EXISTS get_user_org_id();
DROP FUNCTION IF EXISTS get_user_active_parking();
DROP FUNCTION IF EXISTS get_active_tariff(UUID, UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS is_superadmin();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS normalize_plate_trigger();

-- Eliminar tipos
DROP TYPE IF EXISTS status_type;
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS shift_status;
DROP TYPE IF EXISTS session_status;
DROP TYPE IF EXISTS payment_method_type;
DROP TYPE IF EXISTS payment_status_type;
DROP TYPE IF EXISTS quote_status_type;

-- Luego ejecutar schema.sql nuevamente
*/

-- ============================================================================
-- FIN DEL CLEANUP SCRIPT
-- ============================================================================
