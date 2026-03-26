-- ============================================================================
-- PARKING ON STREET - SEED INBYTE (3 USUARIOS)
-- Versión: 0.1.5
-- ============================================================================

-- Usuarios reales de Supabase Auth:
-- 1. admin@inbyte.com          → 1c7993f2-667e-45e6-a8b5-583ddd823f69
-- 2. juan.perez@inbyte.com     → caa0f83e-e922-4470-9b00-0ebe5fd51b27
-- 3. maria.garcia@inbyte.com   → d708cad4-ba8d-4d8f-965d-e3445fe168d6

DO $$
DECLARE
    -- UUIDs reales de Supabase Auth
    v_uuid_admin UUID := '1c7993f2-667e-45e6-a8b5-583ddd823f69';
    v_uuid_juan UUID := 'caa0f83e-e922-4470-9b00-0ebe5fd51b27';
    v_uuid_maria UUID := 'd708cad4-ba8d-4d8f-965d-e3445fe168d6';
    
    v_org_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_parking_centro UUID := 'b0000000-0000-0000-0000-000000000001';
    v_parking_norte UUID := 'b0000000-0000-0000-0000-000000000002';
    v_parking_sur UUID := 'b0000000-0000-0000-0000-000000000003';
BEGIN
    -- ========================================================================
    -- PASO 1: ORGANIZACIÓN (ya existe, pero por si acaso)
    -- ========================================================================
    INSERT INTO organizations (id, name, slug, status) VALUES
        (v_org_id, 'Inbyte Parking Solutions', 'inbyte', 'active')
    ON CONFLICT (id) DO NOTHING;

    -- ========================================================================
    -- PASO 2: PARKINGS (ya existen, pero por si acaso)
    -- ========================================================================
    INSERT INTO parkings (id, org_id, name, address, status) VALUES
        (v_parking_centro, v_org_id, 'Zona Centro', 'Av. Corrientes 1234, Centro', 'active'),
        (v_parking_norte, v_org_id, 'Zona Norte', 'Calle Belgrano 5678, Norte', 'active'),
        (v_parking_sur, v_org_id, 'Zona Sur', 'Av. San Martín 9012, Sur', 'active')
    ON CONFLICT (id) DO NOTHING;

    -- ========================================================================
    -- PASO 3: TARIFAS (ya existen, pero por si acaso)
    -- ========================================================================
    INSERT INTO tariffs (org_id, parking_id, price_per_minute, valid_from, valid_until) VALUES
        (v_org_id, v_parking_centro, 25.00, '2026-01-01 00:00:00+00', NULL),
        (v_org_id, v_parking_norte, 20.00, '2026-01-01 00:00:00+00', NULL),
        (v_org_id, v_parking_sur, 15.00, '2026-01-01 00:00:00+00', NULL),
        (v_org_id, NULL, 18.00, '2026-01-01 00:00:00+00', NULL)
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- PASO 4: MEMBERSHIPS (NUEVO)
    -- ========================================================================
    INSERT INTO memberships (org_id, user_id, role, status) VALUES
        (v_org_id, v_uuid_admin, 'admin_empresa', 'active'),
        (v_org_id, v_uuid_juan, 'operador', 'active'),
        (v_org_id, v_uuid_maria, 'operador', 'active')
    ON CONFLICT (org_id, user_id) DO NOTHING;

    -- ========================================================================
    -- PASO 5: TURNOS
    -- ========================================================================
    
    -- Turno ABIERTO - Juan en Centro
    INSERT INTO shifts (org_id, user_id, parking_id, status, opening_time, opening_cash) VALUES
        (v_org_id, v_uuid_juan, v_parking_centro, 'open', now() - interval '3 hours', 500.00);

    -- Turno ABIERTO - María en Norte
    INSERT INTO shifts (org_id, user_id, parking_id, status, opening_time, opening_cash) VALUES
        (v_org_id, v_uuid_maria, v_parking_norte, 'open', now() - interval '2 hours', 300.00);

    -- Turno CERRADO - Juan ayer
    INSERT INTO shifts (
        org_id, user_id, parking_id, status,
        opening_time, closing_time,
        opening_cash, closing_cash, cash_sales, expected_cash_drawer, difference, notes
    ) VALUES (
        v_org_id, v_uuid_juan, v_parking_centro, 'closed',
        now() - interval '1 day' - interval '8 hours', now() - interval '1 day',
        500.00, 12450.00, 11950.00, 12450.00, 0.00, 'Cierre normal, sin diferencias'
    );

    -- Turno CERRADO - María hace 2 días
    INSERT INTO shifts (
        org_id, user_id, parking_id, status,
        opening_time, closing_time,
        opening_cash, closing_cash, cash_sales, expected_cash_drawer, difference, notes
    ) VALUES (
        v_org_id, v_uuid_maria, v_parking_norte, 'closed',
        now() - interval '2 days' - interval '8 hours', now() - interval '2 days',
        300.00, 8300.00, 8000.00, 8300.00, 0.00, 'Cierre normal'
    );

    -- ========================================================================
    -- PASO 6: AUDIT LOGS BÁSICOS
    -- ========================================================================
    
    INSERT INTO audit_logs (org_id, user_id, action, entity_type, entity_id, metadata) VALUES
        (v_org_id, NULL, 'system.initialized', 'organization', v_org_id, '{"company": "Inbyte Parking Solutions", "version": "0.1.5"}'::jsonb),
        (v_org_id, v_uuid_admin, 'organization.created', 'organization', v_org_id, '{"name": "Inbyte Parking Solutions", "slug": "inbyte"}'::jsonb),
        (v_org_id, v_uuid_admin, 'parking.created', 'parking', v_parking_centro, '{"name": "Zona Centro", "address": "Av. Corrientes 1234"}'::jsonb),
        (v_org_id, v_uuid_admin, 'parking.created', 'parking', v_parking_norte, '{"name": "Zona Norte", "address": "Calle Belgrano 5678"}'::jsonb)
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- RESUMEN
    -- ========================================================================
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INBYTE - DATOS BÁSICOS CREADOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organización: Inbyte Parking Solutions';
    RAISE NOTICE 'Parkings: 3 (Centro, Norte, Sur)';
    RAISE NOTICE 'Tarifas: 4';
    RAISE NOTICE 'Usuarios: 3 (Admin, Juan, María)';
    RAISE NOTICE 'Turnos: 4 (2 abiertos, 2 cerrados)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Base de datos lista para usar!';
    RAISE NOTICE '========================================';
END $$;
