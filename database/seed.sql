-- ============================================================================
-- PARKING ON STREET - SEED DATA
-- Versión: 0.1.5
-- Descripción: Datos de ejemplo para desarrollo y testing
-- ============================================================================

-- IMPORTANTE: Este script es solo para desarrollo/testing
-- NO ejecutar en producción

-- ============================================================================
-- PASO 1: CREAR ORGANIZACIÓN DE PRUEBA
-- ============================================================================

INSERT INTO organizations (id, name, slug, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Municipalidad de Rosario', 'rosario', 'active'),
    ('22222222-2222-2222-2222-222222222222', 'Municipalidad de Córdoba', 'cordoba', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PASO 2: CREAR USUARIOS DE PRUEBA (Requiere Supabase Auth)
-- ============================================================================

-- Nota: Los usuarios deben crearse primero en Supabase Auth
-- Aquí solo creamos las memberships asumiendo que los usuarios existen

-- Usuario 1: Admin de Rosario
-- Email: admin@rosario.com
-- Password: Admin123!
-- user_id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa (reemplazar con ID real)

-- Usuario 2: Operador de Rosario
-- Email: operador1@rosario.com
-- Password: Operador123!
-- user_id: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb (reemplazar con ID real)

-- Usuario 3: Operador 2 de Rosario
-- Email: operador2@rosario.com
-- Password: Operador123!
-- user_id: cccccccc-cccc-cccc-cccc-cccccccccccc (reemplazar con ID real)

-- Memberships (comentar si los usuarios no existen aún)
/*
INSERT INTO memberships (org_id, user_id, role, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin_empresa', 'active'),
    ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'operador', 'active'),
    ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'operador', 'active')
ON CONFLICT (org_id, user_id) DO NOTHING;
*/

-- ============================================================================
-- PASO 3: CREAR PARKINGS
-- ============================================================================

INSERT INTO parkings (id, org_id, name, address, status) VALUES
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Zona Centro', 'Calle Corrientes 1234, Rosario', 'active'),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Zona Periférica', 'Av. Pellegrini 5678, Rosario', 'active'),
    ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Zona Centro', 'Calle San Martín 100, Córdoba', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PASO 4: CREAR TARIFAS
-- ============================================================================

-- Tarifa para Zona Centro (específica)
INSERT INTO tariffs (org_id, parking_id, price_per_minute, valid_from, valid_until) VALUES
    ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 25.00, '2026-01-01 00:00:00+00', NULL);

-- Tarifa para Zona Periférica (específica)
INSERT INTO tariffs (org_id, parking_id, price_per_minute, valid_from, valid_until) VALUES
    ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 15.00, '2026-01-01 00:00:00+00', NULL);

-- Tarifa default para Rosario (parking_id = NULL)
INSERT INTO tariffs (org_id, parking_id, price_per_minute, valid_from, valid_until) VALUES
    ('11111111-1111-1111-1111-111111111111', NULL, 20.00, '2026-01-01 00:00:00+00', NULL);

-- Tarifa para Córdoba
INSERT INTO tariffs (org_id, parking_id, price_per_minute, valid_from, valid_until) VALUES
    ('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 30.00, '2026-01-01 00:00:00+00', NULL);

-- ============================================================================
-- PASO 5: CREAR TURNOS DE EJEMPLO (comentar si no hay usuarios)
-- ============================================================================

/*
-- Turno abierto para operador 1
INSERT INTO shifts (org_id, user_id, parking_id, status, opening_time, opening_cash) VALUES
    ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'open', now() - interval '2 hours', 500.00);

-- Turno cerrado de ejemplo (día anterior)
INSERT INTO shifts (
    org_id, user_id, parking_id, status, 
    opening_time, closing_time, 
    opening_cash, closing_cash, cash_sales, expected_cash_drawer, difference,
    notes
) VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    '33333333-3333-3333-3333-333333333333', 
    'closed',
    now() - interval '1 day' - interval '8 hours',
    now() - interval '1 day',
    500.00,
    8450.00,
    7950.00,
    8450.00,
    0.00,
    'Cierre normal sin diferencias'
);
*/

-- ============================================================================
-- PASO 6: CREAR SESIONES DE EJEMPLO (comentar si no hay turnos)
-- ============================================================================

/*
-- Sesión abierta
INSERT INTO sessions (
    org_id, parking_id, shift_id, plate, session_code, 
    status, entry_time, created_by
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    (SELECT id FROM shifts WHERE status = 'open' LIMIT 1),
    'ABC123',
    'test-code-001',
    'open',
    now() - interval '30 minutes',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

-- Sesión cerrada de ejemplo
INSERT INTO sessions (
    org_id, parking_id, shift_id, plate, session_code, 
    status, entry_time, exit_time, created_by
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    (SELECT id FROM shifts WHERE status = 'closed' LIMIT 1),
    'XYZ789',
    'test-code-002',
    'closed',
    now() - interval '1 day' - interval '2 hours',
    now() - interval '1 day' - interval '1 hour',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
*/

-- ============================================================================
-- PASO 7: CREAR QUOTES DE EJEMPLO (comentar si no hay sesiones)
-- ============================================================================

/*
-- Quote activo para sesión abierta
INSERT INTO payment_quotes (
    quote_id, org_id, session_id, parking_id, created_by,
    exit_time_locked, minutes_locked, tariff_applied, amount_locked,
    expires_at, status
) VALUES (
    'quote-test-001',
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM sessions WHERE status = 'open' LIMIT 1),
    '33333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    now(),
    30,
    25.00,
    750.00,
    now() + interval '2 minutes',
    'active'
);
*/

-- ============================================================================
-- PASO 8: CREAR PAGOS DE EJEMPLO (comentar si no hay sesiones cerradas)
-- ============================================================================

/*
-- Pago para sesión cerrada
INSERT INTO payments (
    org_id, session_id, shift_id, quote_id,
    amount, minutes, exit_time_locked, tariff_applied,
    payment_method, status, created_by
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM sessions WHERE status = 'closed' LIMIT 1),
    (SELECT id FROM shifts WHERE status = 'closed' LIMIT 1),
    'quote-test-002',
    1500.00,
    60,
    now() - interval '1 day' - interval '1 hour',
    25.00,
    'cash',
    'completed',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
*/

-- ============================================================================
-- PASO 9: CREAR LOGS DE AUDITORÍA DE EJEMPLO
-- ============================================================================

INSERT INTO audit_logs (org_id, user_id, action, entity_type, entity_id, metadata) VALUES
    ('11111111-1111-1111-1111-111111111111', NULL, 'system.initialized', 'system', NULL, '{"version": "0.1.5", "environment": "development"}'::jsonb);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
    org_count INTEGER;
    parking_count INTEGER;
    tariff_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO org_count FROM organizations;
    SELECT COUNT(*) INTO parking_count FROM parkings;
    SELECT COUNT(*) INTO tariff_count FROM tariffs;
    
    RAISE NOTICE 'Seed data insertado correctamente:';
    RAISE NOTICE '  - Organizaciones: %', org_count;
    RAISE NOTICE '  - Parkings: %', parking_count;
    RAISE NOTICE '  - Tarifas: %', tariff_count;
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANTE: Crear usuarios en Supabase Auth y descomentar secciones de memberships, shifts, sessions, etc.';
    RAISE NOTICE 'Nota: Zonas (zones) eliminadas del MVP';
END $$;

-- ============================================================================
-- QUERIES ÚTILES PARA TESTING
-- ============================================================================

-- Ver organizaciones
-- SELECT * FROM organizations;

-- Ver parkings con su organización
-- SELECT p.*, o.name as org_name FROM parkings p JOIN organizations o ON p.org_id = o.id;

-- Ver tarifas activas
-- SELECT t.*, p.name as parking_name, o.name as org_name 
-- FROM tariffs t 
-- JOIN organizations o ON t.org_id = o.id
-- LEFT JOIN parkings p ON t.parking_id = p.id
-- WHERE t.valid_from <= now() AND (t.valid_until IS NULL OR t.valid_until > now());

-- Probar normalización de patente
-- SELECT normalize_plate('AB-CD 12') as normalized; -- Debe retornar: ABCD12

-- Probar búsqueda de tarifa
-- SELECT * FROM get_active_tariff(
--     '11111111-1111-1111-1111-111111111111',
--     '33333333-3333-3333-3333-333333333333',
--     now()
-- );
