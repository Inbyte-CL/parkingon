-- ============================================================================
-- FIX: Actualizar estado de sesión a 'paid'
-- ============================================================================
-- La sesión debería haberse cerrado automáticamente al procesar el pago,
-- pero por alguna razón no se actualizó. Este script lo corrige manualmente.
-- ============================================================================

UPDATE sessions
SET 
    status = 'closed',
    exit_time = now(),
    updated_at = now()
WHERE id = '5e7e2f8f-bf9f-413b-8d9e-5e557bb9632e'
AND status = 'open';

-- Verificar
SELECT 
    'Sesión actualizada' as status,
    id,
    plate,
    status,
    entry_time,
    exit_time
FROM sessions
WHERE id = '5e7e2f8f-bf9f-413b-8d9e-5e557bb9632e';
