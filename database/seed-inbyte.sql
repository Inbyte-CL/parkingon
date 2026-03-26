-- ============================================================================
-- PARKING ON STREET - SEED INBYTE (Empresa de Prueba Completa)
-- Versión: 0.1.5
-- Descripción: Datos completos de prueba para empresa Inbyte
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR ORGANIZACIÓN INBYTE
-- ============================================================================

INSERT INTO organizations (id, name, slug, status) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Inbyte Parking Solutions', 'inbyte', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PASO 2: CREAR PARKINGS
-- ============================================================================

INSERT INTO parkings (id, org_id, name, address, status) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Zona Centro', 'Av. Corrientes 1234, Centro', 'active'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Zona Norte', 'Calle Belgrano 5678, Norte', 'active'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Zona Sur', 'Av. San Martín 9012, Sur', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PASO 3: CREAR TARIFAS
-- ============================================================================

-- Tarifa para Zona Centro (más cara)
INSERT INTO tariffs (org_id, parking_id, price_per_minute, valid_from, valid_until) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 25.00, '2026-01-01 00:00:00+00', NULL);

-- Tarifa para Zona Norte (media)
INSERT INTO tariffs (org_id, parking_id, price_per_minute, valid_from, valid_until) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 20.00, '2026-01-01 00:00:00+00', NULL);

-- Tarifa para Zona Sur (más económica)
INSERT INTO tariffs (org_id, parking_id, price_per_minute, valid_from, valid_until) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 15.00, '2026-01-01 00:00:00+00', NULL);

-- Tarifa default de Inbyte (si no hay tarifa específica)
INSERT INTO tariffs (org_id, parking_id, price_per_minute, valid_from, valid_until) VALUES
    ('a0000000-0000-0000-0000-000000000001', NULL, 18.00, '2026-01-01 00:00:00+00', NULL);

-- ============================================================================
-- PASO 4: CREAR USUARIOS (Memberships)
-- ============================================================================

-- IMPORTANTE: Primero debes crear estos usuarios en Supabase Auth
-- Luego reemplaza los UUIDs con los reales

-- Usuario 1: Admin de Inbyte
-- Email: admin@inbyte.com | Password: Admin123!
INSERT INTO memberships (org_id, user_id, role, status) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'admin_empresa', 'active')
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Usuario 2: Operador Zona Centro - Juan Pérez
-- Email: juan.perez@inbyte.com | Password: Operador123!
INSERT INTO memberships (org_id, user_id, parking_id, role, status) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'operador', 'active')
ON CONFLICT (org_id, user_id) DO UPDATE SET parking_id = 'b0000000-0000-0000-0000-000000000001';

-- Usuario 3: Operador Zona Norte - María García
-- Email: maria.garcia@inbyte.com | Password: Operador123!
INSERT INTO memberships (org_id, user_id, parking_id, role, status) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'operador', 'active')
ON CONFLICT (org_id, user_id) DO UPDATE SET parking_id = 'b0000000-0000-0000-0000-000000000002';

-- Usuario 4: Operador Zona Sur - Carlos López
-- Email: carlos.lopez@inbyte.com | Password: Operador123!
INSERT INTO memberships (org_id, user_id, parking_id, role, status) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 'operador', 'active')
ON CONFLICT (org_id, user_id) DO UPDATE SET parking_id = 'b0000000-0000-0000-0000-000000000003';

-- Usuario 5: Operador Zona Centro - Ana Martínez
-- Email: ana.martinez@inbyte.com | Password: Operador123!
INSERT INTO memberships (org_id, user_id, parking_id, role, status) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'operador', 'active')
ON CONFLICT (org_id, user_id) DO UPDATE SET parking_id = 'b0000000-0000-0000-0000-000000000001';

-- ============================================================================
-- PASO 5: CREAR TURNOS (Shifts)
-- ============================================================================

-- Turno ABIERTO - Juan Pérez en Zona Centro (turno actual)
INSERT INTO shifts (
    id, org_id, user_id, parking_id, status,
    opening_time, opening_cash
) VALUES (
    's0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'open',
    now() - interval '3 hours',
    500.00
) ON CONFLICT (id) DO NOTHING;

-- Turno ABIERTO - María García en Zona Norte (turno actual)
INSERT INTO shifts (
    id, org_id, user_id, parking_id, status,
    opening_time, opening_cash
) VALUES (
    's0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'open',
    now() - interval '2 hours',
    300.00
) ON CONFLICT (id) DO NOTHING;

-- Turno CERRADO - Juan Pérez ayer (con diferencia de caja)
INSERT INTO shifts (
    id, org_id, user_id, parking_id, status,
    opening_time, closing_time,
    opening_cash, closing_cash, cash_sales, expected_cash_drawer, difference,
    notes
) VALUES (
    's0000000-0000-0000-0000-000000000010',
    'a0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'closed',
    now() - interval '1 day' - interval '8 hours',
    now() - interval '1 day',
    500.00,
    12450.00,
    11950.00,
    12450.00,
    0.00,
    'Cierre normal, sin diferencias'
) ON CONFLICT (id) DO NOTHING;

-- Turno CERRADO - María García ayer (con pequeña diferencia)
INSERT INTO shifts (
    id, org_id, user_id, parking_id, status,
    opening_time, closing_time,
    opening_cash, closing_cash, cash_sales, expected_cash_drawer, difference,
    notes
) VALUES (
    's0000000-0000-0000-0000-000000000011',
    'a0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'closed',
    now() - interval '1 day' - interval '8 hours',
    now() - interval '1 day',
    300.00,
    8250.00,
    8000.00,
    8300.00,
    -50.00,
    'Faltaron $50, posible error al dar cambio'
) ON CONFLICT (id) DO NOTHING;

-- Turno CERRADO - Carlos López hace 2 días
INSERT INTO shifts (
    id, org_id, user_id, parking_id, status,
    opening_time, closing_time,
    opening_cash, closing_cash, cash_sales, expected_cash_drawer, difference,
    notes
) VALUES (
    's0000000-0000-0000-0000-000000000012',
    'a0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000003',
    'closed',
    now() - interval '2 days' - interval '8 hours',
    now() - interval '2 days',
    200.00,
    6750.00,
    6550.00,
    6750.00,
    0.00,
    'Todo correcto'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PASO 6: CREAR SESIONES (Sessions)
-- ============================================================================

-- SESIONES ABIERTAS (turno actual de Juan)

INSERT INTO sessions (
    id, org_id, parking_id, shift_id, plate, session_code,
    status, entry_time, created_by
) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'ABC123', 'qr-abc123-001', 'open', now() - interval '45 minutes', 'u0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'XYZ789', 'qr-xyz789-002', 'open', now() - interval '30 minutes', 'u0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'DEF456', 'qr-def456-003', 'open', now() - interval '15 minutes', 'u0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'GHI789', 'qr-ghi789-004', 'open', now() - interval '5 minutes', 'u0000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- SESIONES ABIERTAS (turno actual de María)

INSERT INTO sessions (
    id, org_id, parking_id, shift_id, plate, session_code,
    status, entry_time, created_by
) VALUES
    ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000002', 'JKL012', 'qr-jkl012-005', 'open', now() - interval '1 hour', 'u0000000-0000-0000-0000-000000000003'),
    ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000002', 'MNO345', 'qr-mno345-006', 'open', now() - interval '20 minutes', 'u0000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- SESIONES CERRADAS (turno de ayer de Juan)

INSERT INTO sessions (
    id, org_id, parking_id, shift_id, plate, session_code,
    status, entry_time, exit_time, created_by
) VALUES
    ('e0000000-0000-0000-0000-000000000100', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000010', 'AAA111', 'qr-aaa111-100', 'closed', now() - interval '1 day' - interval '7 hours', now() - interval '1 day' - interval '6 hours', 'u0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000101', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000010', 'BBB222', 'qr-bbb222-101', 'closed', now() - interval '1 day' - interval '6 hours', now() - interval '1 day' - interval '5 hours 30 minutes', 'u0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000102', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000010', 'CCC333', 'qr-ccc333-102', 'closed', now() - interval '1 day' - interval '5 hours', now() - interval '1 day' - interval '4 hours', 'u0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000103', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000010', 'DDD444', 'qr-ddd444-103', 'closed', now() - interval '1 day' - interval '4 hours', now() - interval '1 day' - interval '3 hours', 'u0000000-0000-0000-0000-000000000002'),
    ('e0000000-0000-0000-0000-000000000104', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000010', 'EEE555', 'qr-eee555-104', 'closed', now() - interval '1 day' - interval '3 hours', now() - interval '1 day' - interval '2 hours', 'u0000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PASO 7: CREAR QUOTES (Payment Quotes)
-- ============================================================================

-- Quote ACTIVO para sesión ABC123 (recién generado)
INSERT INTO payment_quotes (
    quote_id, org_id, session_id, parking_id, created_by,
    exit_time_locked, minutes_locked, tariff_applied, amount_locked,
    expires_at, status
) VALUES (
    'q0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000002',
    now(),
    45,
    25.00,
    1125.00,
    now() + interval '2 minutes',
    'active'
) ON CONFLICT (quote_id) DO NOTHING;

-- Quote USADO para sesión cerrada AAA111
INSERT INTO payment_quotes (
    quote_id, org_id, session_id, parking_id, created_by,
    exit_time_locked, minutes_locked, tariff_applied, amount_locked,
    expires_at, status
) VALUES (
    'q0000000-0000-0000-0000-000000000100',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000100',
    'b0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000002',
    now() - interval '1 day' - interval '6 hours',
    60,
    25.00,
    1500.00,
    now() - interval '1 day' - interval '6 hours' + interval '2 minutes',
    'used'
) ON CONFLICT (quote_id) DO NOTHING;

-- Quote EXPIRADO (ejemplo de quote que no se usó)
INSERT INTO payment_quotes (
    quote_id, org_id, session_id, parking_id, created_by,
    exit_time_locked, minutes_locked, tariff_applied, amount_locked,
    expires_at, status
) VALUES (
    'q0000000-0000-0000-0000-000000000200',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000101',
    'b0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000002',
    now() - interval '1 day' - interval '5 hours 30 minutes',
    30,
    25.00,
    750.00,
    now() - interval '1 day' - interval '5 hours 28 minutes',
    'expired'
) ON CONFLICT (quote_id) DO NOTHING;

-- ============================================================================
-- PASO 8: CREAR PAGOS (Payments)
-- ============================================================================

-- Pagos del turno cerrado de ayer (Juan)

INSERT INTO payments (
    id, org_id, session_id, shift_id, quote_id,
    amount, minutes, exit_time_locked, tariff_applied,
    payment_method, status, created_by
) VALUES
    ('p0000000-0000-0000-0000-000000000100', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000100', 's0000000-0000-0000-0000-000000000010', 'q0000000-0000-0000-0000-000000000100', 1500.00, 60, now() - interval '1 day' - interval '6 hours', 25.00, 'cash', 'completed', 'u0000000-0000-0000-0000-000000000002'),
    ('p0000000-0000-0000-0000-000000000101', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000101', 's0000000-0000-0000-0000-000000000010', 'q0000000-0000-0000-0000-000000000101', 750.00, 30, now() - interval '1 day' - interval '5 hours 30 minutes', 25.00, 'cash', 'completed', 'u0000000-0000-0000-0000-000000000002'),
    ('p0000000-0000-0000-0000-000000000102', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000102', 's0000000-0000-0000-0000-000000000010', 'q0000000-0000-0000-0000-000000000102', 1500.00, 60, now() - interval '1 day' - interval '4 hours', 25.00, 'cash', 'completed', 'u0000000-0000-0000-0000-000000000002'),
    ('p0000000-0000-0000-0000-000000000103', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000103', 's0000000-0000-0000-0000-000000000010', 'q0000000-0000-0000-0000-000000000103', 1500.00, 60, now() - interval '1 day' - interval '3 hours', 25.00, 'cash', 'completed', 'u0000000-0000-0000-0000-000000000002'),
    ('p0000000-0000-0000-0000-000000000104', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000104', 's0000000-0000-0000-0000-000000000010', 'q0000000-0000-0000-0000-000000000104', 1500.00, 60, now() - interval '1 day' - interval '2 hours', 25.00, 'cash', 'completed', 'u0000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- Crear quotes para los pagos (necesarios por FK)
INSERT INTO payment_quotes (quote_id, org_id, session_id, parking_id, created_by, exit_time_locked, minutes_locked, tariff_applied, amount_locked, expires_at, status) VALUES
    ('q0000000-0000-0000-0000-000000000101', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000101', 'b0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', now() - interval '1 day' - interval '5 hours 30 minutes', 30, 25.00, 750.00, now() - interval '1 day' - interval '5 hours 28 minutes', 'used'),
    ('q0000000-0000-0000-0000-000000000102', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000102', 'b0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', now() - interval '1 day' - interval '4 hours', 60, 25.00, 1500.00, now() - interval '1 day' - interval '3 hours 58 minutes', 'used'),
    ('q0000000-0000-0000-0000-000000000103', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000103', 'b0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', now() - interval '1 day' - interval '3 hours', 60, 25.00, 1500.00, now() - interval '1 day' - interval '2 hours 58 minutes', 'used'),
    ('q0000000-0000-0000-0000-000000000104', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000104', 'b0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', now() - interval '1 day' - interval '2 hours', 60, 25.00, 1500.00, now() - interval '1 day' - interval '1 hour 58 minutes', 'used')
ON CONFLICT (quote_id) DO NOTHING;

-- ============================================================================
-- PASO 9: CREAR LOGS DE AUDITORÍA
-- ============================================================================

INSERT INTO audit_logs (org_id, user_id, action, entity_type, entity_id, metadata) VALUES
    ('a0000000-0000-0000-0000-000000000001', NULL, 'system.initialized', 'organization', 'a0000000-0000-0000-0000-000000000001', '{"company": "Inbyte Parking Solutions", "version": "0.1.5"}'::jsonb),
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'organization.created', 'organization', 'a0000000-0000-0000-0000-000000000001', '{"name": "Inbyte Parking Solutions", "slug": "inbyte"}'::jsonb),
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'parking.created', 'parking', 'b0000000-0000-0000-0000-000000000001', '{"name": "Zona Centro", "address": "Av. Corrientes 1234"}'::jsonb),
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'parking.created', 'parking', 'b0000000-0000-0000-0000-000000000002', '{"name": "Zona Norte", "address": "Calle Belgrano 5678"}'::jsonb),
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'parking.created', 'parking', 'b0000000-0000-0000-0000-000000000003', '{"name": "Zona Sur", "address": "Av. San Martín 9012"}'::jsonb),
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'shift.opened', 'shift', 's0000000-0000-0000-0000-000000000001', '{"parking_id": "b0000000-0000-0000-0000-000000000001", "opening_cash": 500.00}'::jsonb),
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 'shift.opened', 'shift', 's0000000-0000-0000-0000-000000000002', '{"parking_id": "b0000000-0000-0000-0000-000000000002", "opening_cash": 300.00}'::jsonb),
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'session.created', 'session', 'e0000000-0000-0000-0000-000000000001', '{"plate_input": "ABC-123", "plate": "ABC123", "parking_id": "b0000000-0000-0000-0000-000000000001"}'::jsonb),
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'session.created', 'session', 'e0000000-0000-0000-0000-000000000002', '{"plate_input": "XYZ789", "plate": "XYZ789", "parking_id": "b0000000-0000-0000-0000-000000000001"}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN Y RESUMEN
-- ============================================================================

DO $$
DECLARE
    org_count INTEGER;
    parking_count INTEGER;
    zone_count INTEGER;
    tariff_count INTEGER;
    membership_count INTEGER;
    shift_count INTEGER;
    session_count INTEGER;
    quote_count INTEGER;
    payment_count INTEGER;
    audit_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO org_count FROM organizations WHERE id = 'a0000000-0000-0000-0000-000000000001';
    SELECT COUNT(*) INTO parking_count FROM parkings WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
    SELECT COUNT(*) INTO tariff_count FROM tariffs WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
    SELECT COUNT(*) INTO membership_count FROM memberships WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
    SELECT COUNT(*) INTO shift_count FROM shifts WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
    SELECT COUNT(*) INTO session_count FROM sessions WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
    SELECT COUNT(*) INTO quote_count FROM payment_quotes WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
    SELECT COUNT(*) INTO payment_count FROM payments WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
    SELECT COUNT(*) INTO audit_count FROM audit_logs WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INBYTE PARKING SOLUTIONS - DATOS CREADOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organizaciones: %', org_count;
    RAISE NOTICE 'Parkings: %', parking_count;
    RAISE NOTICE 'Tarifas: %', tariff_count;
    RAISE NOTICE 'Usuarios (memberships): %', membership_count;
    RAISE NOTICE 'Turnos: %', shift_count;
    RAISE NOTICE 'Sesiones: %', session_count;
    RAISE NOTICE 'Quotes: %', quote_count;
    RAISE NOTICE 'Pagos: %', payment_count;
    RAISE NOTICE 'Logs de auditoría: %', audit_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANTE:';
    RAISE NOTICE '1. Crear usuarios en Supabase Auth con estos emails:';
    RAISE NOTICE '   - admin@inbyte.com (Admin)';
    RAISE NOTICE '   - juan.perez@inbyte.com (Operador Zona Centro)';
    RAISE NOTICE '   - maria.garcia@inbyte.com (Operador Zona Norte)';
    RAISE NOTICE '   - carlos.lopez@inbyte.com (Operador Zona Sur)';
    RAISE NOTICE '   - ana.martinez@inbyte.com (Operador Zona Centro)';
    RAISE NOTICE '';
    RAISE NOTICE '2. Reemplazar los UUIDs u0000000-... con los user_id reales';
    RAISE NOTICE '';
    RAISE NOTICE '3. Estado actual:';
    RAISE NOTICE '   - 2 turnos ABIERTOS (Juan en Centro, María en Norte)';
    RAISE NOTICE '   - 6 sesiones ABIERTAS (4 en Centro, 2 en Norte)';
    RAISE NOTICE '   - 1 quote ACTIVO (para sesión ABC123)';
    RAISE NOTICE '   - 5 sesiones CERRADAS con pagos (turno de ayer)';
END $$;

-- ============================================================================
-- QUERIES ÚTILES PARA VERIFICAR
-- ============================================================================

-- Ver resumen de Inbyte
-- SELECT * FROM organizations WHERE slug = 'inbyte';

-- Ver parkings de Inbyte
-- SELECT * FROM parkings WHERE org_id = 'a0000000-0000-0000-0000-000000000001';

-- Ver tarifas de Inbyte
-- SELECT 
--     t.price_per_minute,
--     COALESCE(p.name, 'DEFAULT') as parking_name,
--     t.valid_from
-- FROM tariffs t
-- LEFT JOIN parkings p ON t.parking_id = p.id
-- WHERE t.org_id = 'a0000000-0000-0000-0000-000000000001'
-- ORDER BY t.parking_id NULLS LAST;

-- Ver turnos abiertos
-- SELECT 
--     sh.opening_time,
--     sh.opening_cash,
--     p.name as parking,
--     'Operador' as operator
-- FROM shifts sh
-- JOIN parkings p ON sh.parking_id = p.id
-- WHERE sh.org_id = 'a0000000-0000-0000-0000-000000000001'
-- AND sh.status = 'open';

-- Ver sesiones abiertas
-- SELECT 
--     s.plate,
--     s.entry_time,
--     EXTRACT(EPOCH FROM (now() - s.entry_time))/60 as minutes_parked,
--     p.name as parking
-- FROM sessions s
-- JOIN parkings p ON s.parking_id = p.id
-- WHERE s.org_id = 'a0000000-0000-0000-0000-000000000001'
-- AND s.status = 'open'
-- ORDER BY s.entry_time;

-- Ver recaudación de ayer
-- SELECT 
--     COUNT(*) as total_payments,
--     SUM(amount) as total_revenue,
--     AVG(minutes) as avg_minutes
-- FROM payments
-- WHERE org_id = 'a0000000-0000-0000-0000-000000000001'
-- AND created_at > now() - interval '1 day' - interval '12 hours'
-- AND created_at < now() - interval '12 hours';
