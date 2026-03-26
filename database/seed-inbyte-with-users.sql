-- ============================================================================
-- PARKING ON STREET - SEED INBYTE CON USUARIOS REALES
-- Versión: 0.1.5
-- ============================================================================

-- ⚠️ IMPORTANTE: REEMPLAZAR LOS UUIDs ANTES DE EJECUTAR
-- Crea los usuarios en Authentication → Users primero
-- Luego reemplaza los UUIDs aquí con los reales

-- ============================================================================
-- CONFIGURACIÓN DE UUIDs (REEMPLAZAR CON LOS REALES)
-- ============================================================================

-- Copiar los UUIDs de Supabase Auth y reemplazar aquí:
DO $$
DECLARE
    -- REEMPLAZAR ESTOS UUIDs CON LOS REALES DE SUPABASE AUTH
    uuid_admin UUID := 'REEMPLAZAR-CON-UUID-ADMIN';
    uuid_juan UUID := 'REEMPLAZAR-CON-UUID-JUAN';
    uuid_maria UUID := 'REEMPLAZAR-CON-UUID-MARIA';
    uuid_carlos UUID := 'REEMPLAZAR-CON-UUID-CARLOS';
    uuid_ana UUID := 'REEMPLAZAR-CON-UUID-ANA';
    
    org_id UUID := 'a0000000-0000-0000-0000-000000000001';
    parking_centro UUID := 'b0000000-0000-0000-0000-000000000001';
    parking_norte UUID := 'b0000000-0000-0000-0000-000000000002';
    parking_sur UUID := 'b0000000-0000-0000-0000-000000000003';
BEGIN
    -- ========================================================================
    -- PASO 1: ORGANIZACIÓN
    -- ========================================================================
    INSERT INTO organizations (id, name, slug, status) VALUES
        (org_id, 'Inbyte Parking Solutions', 'inbyte', 'active')
    ON CONFLICT (id) DO NOTHING;

    -- ========================================================================
    -- PASO 2: PARKINGS
    -- ========================================================================
    INSERT INTO parkings (id, org_id, name, address, status) VALUES
        (parking_centro, org_id, 'Zona Centro', 'Av. Corrientes 1234, Centro', 'active'),
        (parking_norte, org_id, 'Zona Norte', 'Calle Belgrano 5678, Norte', 'active'),
        (parking_sur, org_id, 'Zona Sur', 'Av. San Martín 9012, Sur', 'active')
    ON CONFLICT (id) DO NOTHING;

    -- ========================================================================
    -- PASO 3: TARIFAS
    -- ========================================================================
    INSERT INTO tariffs (org_id, parking_id, price_per_minute, valid_from, valid_until) VALUES
        (org_id, parking_centro, 25.00, '2026-01-01 00:00:00+00', NULL),
        (org_id, parking_norte, 20.00, '2026-01-01 00:00:00+00', NULL),
        (org_id, parking_sur, 15.00, '2026-01-01 00:00:00+00', NULL),
        (org_id, NULL, 18.00, '2026-01-01 00:00:00+00', NULL);

    -- ========================================================================
    -- PASO 4: MEMBERSHIPS
    -- ========================================================================
    INSERT INTO memberships (org_id, user_id, role, status) VALUES
        (org_id, uuid_admin, 'admin_empresa', 'active'),
        (org_id, uuid_juan, 'operador', 'active'),
        (org_id, uuid_maria, 'operador', 'active'),
        (org_id, uuid_carlos, 'operador', 'active'),
        (org_id, uuid_ana, 'operador', 'active')
    ON CONFLICT (org_id, user_id) DO NOTHING;

    -- ========================================================================
    -- PASO 5: TURNOS
    -- ========================================================================
    
    -- Turno ABIERTO - Juan en Centro
    INSERT INTO shifts (id, org_id, user_id, parking_id, status, opening_time, opening_cash) VALUES
        ('s0000000-0000-0000-0000-000000000001', org_id, uuid_juan, parking_centro, 'open', now() - interval '3 hours', 500.00)
    ON CONFLICT (id) DO NOTHING;

    -- Turno ABIERTO - María en Norte
    INSERT INTO shifts (id, org_id, user_id, parking_id, status, opening_time, opening_cash) VALUES
        ('s0000000-0000-0000-0000-000000000002', org_id, uuid_maria, parking_norte, 'open', now() - interval '2 hours', 300.00)
    ON CONFLICT (id) DO NOTHING;

    -- Turno CERRADO - Juan ayer
    INSERT INTO shifts (
        id, org_id, user_id, parking_id, status,
        opening_time, closing_time,
        opening_cash, closing_cash, cash_sales, expected_cash_drawer, difference, notes
    ) VALUES (
        's0000000-0000-0000-0000-000000000010', org_id, uuid_juan, parking_centro, 'closed',
        now() - interval '1 day' - interval '8 hours', now() - interval '1 day',
        500.00, 12450.00, 11950.00, 12450.00, 0.00, 'Cierre normal, sin diferencias'
    ) ON CONFLICT (id) DO NOTHING;

    -- ========================================================================
    -- PASO 6: SESIONES
    -- ========================================================================
    
    -- Sesiones ABIERTAS (turno de Juan)
    INSERT INTO sessions (id, org_id, parking_id, shift_id, plate, session_code, status, entry_time, created_by) VALUES
        ('e0000000-0000-0000-0000-000000000001', org_id, parking_centro, 's0000000-0000-0000-0000-000000000001', 'ABC123', 'qr-abc123-001', 'open', now() - interval '45 minutes', uuid_juan),
        ('e0000000-0000-0000-0000-000000000002', org_id, parking_centro, 's0000000-0000-0000-0000-000000000001', 'XYZ789', 'qr-xyz789-002', 'open', now() - interval '30 minutes', uuid_juan),
        ('e0000000-0000-0000-0000-000000000003', org_id, parking_centro, 's0000000-0000-0000-0000-000000000001', 'DEF456', 'qr-def456-003', 'open', now() - interval '15 minutes', uuid_juan)
    ON CONFLICT (id) DO NOTHING;

    -- Sesiones ABIERTAS (turno de María)
    INSERT INTO sessions (id, org_id, parking_id, shift_id, plate, session_code, status, entry_time, created_by) VALUES
        ('e0000000-0000-0000-0000-000000000005', org_id, parking_norte, 's0000000-0000-0000-0000-000000000002', 'JKL012', 'qr-jkl012-005', 'open', now() - interval '1 hour', uuid_maria),
        ('e0000000-0000-0000-0000-000000000006', org_id, parking_norte, 's0000000-0000-0000-0000-000000000002', 'MNO345', 'qr-mno345-006', 'open', now() - interval '20 minutes', uuid_maria)
    ON CONFLICT (id) DO NOTHING;

    -- Sesiones CERRADAS (turno de ayer)
    INSERT INTO sessions (id, org_id, parking_id, shift_id, plate, session_code, status, entry_time, exit_time, created_by) VALUES
        ('e0000000-0000-0000-0000-000000000100', org_id, parking_centro, 's0000000-0000-0000-0000-000000000010', 'AAA111', 'qr-aaa111-100', 'closed', now() - interval '1 day' - interval '7 hours', now() - interval '1 day' - interval '6 hours', uuid_juan),
        ('e0000000-0000-0000-0000-000000000101', org_id, parking_centro, 's0000000-0000-0000-0000-000000000010', 'BBB222', 'qr-bbb222-101', 'closed', now() - interval '1 day' - interval '6 hours', now() - interval '1 day' - interval '5 hours 30 minutes', uuid_juan)
    ON CONFLICT (id) DO NOTHING;

    -- ========================================================================
    -- PASO 7: PAYMENT QUOTES
    -- ========================================================================
    
    -- Quote ACTIVO para ABC123
    INSERT INTO payment_quotes (
        quote_id, org_id, session_id, parking_id, created_by,
        exit_time_locked, minutes_locked, tariff_applied, amount_locked,
        expires_at, status
    ) VALUES (
        'q0000000-0000-0000-0000-000000000001', org_id, 'e0000000-0000-0000-0000-000000000001', parking_centro, uuid_juan,
        now(), 45, 25.00, 1125.00, now() + interval '2 minutes', 'active'
    ) ON CONFLICT (quote_id) DO NOTHING;

    -- Quotes USADOS para sesiones cerradas
    INSERT INTO payment_quotes (quote_id, org_id, session_id, parking_id, created_by, exit_time_locked, minutes_locked, tariff_applied, amount_locked, expires_at, status) VALUES
        ('q0000000-0000-0000-0000-000000000100', org_id, 'e0000000-0000-0000-0000-000000000100', parking_centro, uuid_juan, now() - interval '1 day' - interval '6 hours', 60, 25.00, 1500.00, now() - interval '1 day' - interval '6 hours' + interval '2 minutes', 'used'),
        ('q0000000-0000-0000-0000-000000000101', org_id, 'e0000000-0000-0000-0000-000000000101', parking_centro, uuid_juan, now() - interval '1 day' - interval '5 hours 30 minutes', 30, 25.00, 750.00, now() - interval '1 day' - interval '5 hours 28 minutes', 'used')
    ON CONFLICT (quote_id) DO NOTHING;

    -- ========================================================================
    -- PASO 8: PAYMENTS
    -- ========================================================================
    
    INSERT INTO payments (id, org_id, session_id, shift_id, quote_id, amount, minutes, exit_time_locked, tariff_applied, payment_method, status, created_by) VALUES
        ('p0000000-0000-0000-0000-000000000100', org_id, 'e0000000-0000-0000-0000-000000000100', 's0000000-0000-0000-0000-000000000010', 'q0000000-0000-0000-0000-000000000100', 1500.00, 60, now() - interval '1 day' - interval '6 hours', 25.00, 'cash', 'completed', uuid_juan),
        ('p0000000-0000-0000-0000-000000000101', org_id, 'e0000000-0000-0000-0000-000000000101', 's0000000-0000-0000-0000-000000000010', 'q0000000-0000-0000-0000-000000000101', 750.00, 30, now() - interval '1 day' - interval '5 hours 30 minutes', 25.00, 'cash', 'completed', uuid_juan)
    ON CONFLICT (id) DO NOTHING;

    -- ========================================================================
    -- PASO 9: AUDIT LOGS
    -- ========================================================================
    
    INSERT INTO audit_logs (org_id, user_id, action, entity_type, entity_id, metadata) VALUES
        (org_id, NULL, 'system.initialized', 'organization', org_id, '{"company": "Inbyte Parking Solutions", "version": "0.1.5"}'::jsonb),
        (org_id, uuid_admin, 'organization.created', 'organization', org_id, '{"name": "Inbyte Parking Solutions", "slug": "inbyte"}'::jsonb),
        (org_id, uuid_juan, 'shift.opened', 'shift', 's0000000-0000-0000-0000-000000000001', '{"parking_id": "b0000000-0000-0000-0000-000000000001", "opening_cash": 500.00}'::jsonb),
        (org_id, uuid_maria, 'shift.opened', 'shift', 's0000000-0000-0000-0000-000000000002', '{"parking_id": "b0000000-0000-0000-0000-000000000002", "opening_cash": 300.00}'::jsonb)
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- RESUMEN
    -- ========================================================================
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INBYTE - DATOS CREADOS EXITOSAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organización: Inbyte Parking Solutions';
    RAISE NOTICE 'Parkings: 3 (Centro, Norte, Sur)';
    RAISE NOTICE 'Tarifas: 4';
    RAISE NOTICE 'Usuarios: 5';
    RAISE NOTICE 'Turnos abiertos: 2 (Juan en Centro, María en Norte)';
    RAISE NOTICE 'Sesiones abiertas: 5';
    RAISE NOTICE 'Sesiones cerradas: 2 (con pagos)';
    RAISE NOTICE '========================================';
END $$;
