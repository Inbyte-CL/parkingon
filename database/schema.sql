-- ============================================================================
-- PARKING ON STREET - SCHEMA SQL
-- Versión: 0.1.5
-- Fecha: 24 de Enero 2026
-- Base de datos: PostgreSQL (Supabase)
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR TIPOS ENUMERADOS (ENUMs)
-- ============================================================================

-- Status general (organizations, parkings, zones, memberships)
CREATE TYPE status_type AS ENUM ('active', 'inactive');

-- Roles de usuarios
CREATE TYPE user_role AS ENUM ('operador', 'admin_empresa');

-- Estados de turnos
CREATE TYPE shift_status AS ENUM ('open', 'closed');

-- Estados de sesiones
CREATE TYPE session_status AS ENUM ('open', 'closed');

-- Métodos de pago
CREATE TYPE payment_method_type AS ENUM ('cash', 'card', 'qr_payment');

-- Estados de pagos
CREATE TYPE payment_status_type AS ENUM ('pending', 'completed', 'cancelled', 'refunded');

-- Estados de quotes
CREATE TYPE quote_status_type AS ENUM ('active', 'expired', 'used');

-- ============================================================================
-- PASO 2: CREAR TABLAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLA: organizations
-- Descripción: Empresas o municipalidades (multi-tenant)
-- ----------------------------------------------------------------------------
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_organizations_status ON organizations(status);

-- Comentarios
COMMENT ON TABLE organizations IS 'Empresas o municipalidades que usan el sistema (multi-tenant)';
COMMENT ON COLUMN organizations.slug IS 'Identificador amigable para URLs (ej: "rosario")';

-- ----------------------------------------------------------------------------
-- TABLA: memberships
-- Descripción: Relación usuarios-organizaciones con roles
-- ----------------------------------------------------------------------------
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parking_id UUID REFERENCES parkings(id) ON DELETE SET NULL,
    role user_role NOT NULL,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraint: un usuario no puede tener múltiples membresías activas en la misma org
    UNIQUE(org_id, user_id)
);

-- Índices
CREATE INDEX idx_memberships_org_user ON memberships(org_id, user_id);
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org_status ON memberships(org_id, status);
CREATE INDEX idx_memberships_parking ON memberships(parking_id);

-- Comentarios
COMMENT ON TABLE memberships IS 'Relación entre usuarios y organizaciones con roles';
COMMENT ON COLUMN memberships.parking_id IS 'Parking asignado al usuario (requerido para operadores)';

-- ----------------------------------------------------------------------------
-- TABLA: parkings
-- Descripción: Zonas de estacionamiento regulado
-- ----------------------------------------------------------------------------
CREATE TABLE parkings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_parkings_org_status ON parkings(org_id, status);

-- Comentarios
COMMENT ON TABLE parkings IS 'Zonas de estacionamiento regulado (ej: "Zona Centro")';

-- ----------------------------------------------------------------------------
-- TABLA: tariffs
-- Descripción: Tarifas configurables por parking o empresa
-- ----------------------------------------------------------------------------
CREATE TABLE tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parking_id UUID REFERENCES parkings(id) ON DELETE CASCADE,
    price_per_minute NUMERIC(10,2) NOT NULL CHECK (price_per_minute >= 0),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraint: valid_until debe ser mayor que valid_from si no es NULL
    CHECK (valid_until IS NULL OR valid_until > valid_from)
);

-- Índices
CREATE INDEX idx_tariffs_org_parking_dates ON tariffs(org_id, parking_id, valid_from, valid_until);
CREATE INDEX idx_tariffs_org_default ON tariffs(org_id, valid_from) WHERE parking_id IS NULL;

-- Comentarios
COMMENT ON TABLE tariffs IS 'Tarifas configurables por parking o empresa (parking_id=NULL es default)';
COMMENT ON COLUMN tariffs.parking_id IS 'NULL = tarifa default de la empresa';

-- ----------------------------------------------------------------------------
-- TABLA: shifts
-- Descripción: Turnos de operadores con control de efectivo
-- ----------------------------------------------------------------------------
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parking_id UUID NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
    status shift_status NOT NULL DEFAULT 'open',
    opening_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    closing_time TIMESTAMPTZ,
    opening_cash NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
    closing_cash NUMERIC(10,2) CHECK (closing_cash >= 0),
    cash_sales NUMERIC(10,2),
    expected_cash_drawer NUMERIC(10,2),
    difference NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraint: si está cerrado, debe tener closing_time y closing_cash
    CHECK (
        (status = 'open' AND closing_time IS NULL AND closing_cash IS NULL) OR
        (status = 'closed' AND closing_time IS NOT NULL AND closing_cash IS NOT NULL)
    )
);

-- Índices
CREATE INDEX idx_shifts_org_user_status ON shifts(org_id, user_id, status);
CREATE INDEX idx_shifts_parking_status ON shifts(parking_id, status);
CREATE INDEX idx_shifts_user_status ON shifts(user_id, status);

-- Constraint UNIQUE: solo 1 turno abierto por usuario
CREATE UNIQUE INDEX idx_shifts_user_open_unique ON shifts(user_id, status) 
WHERE status = 'open';

-- Comentarios
COMMENT ON TABLE shifts IS 'Turnos de operadores con control y conciliación de efectivo';
COMMENT ON COLUMN shifts.cash_sales IS 'Suma de pagos en efectivo del turno (calculado)';
COMMENT ON COLUMN shifts.expected_cash_drawer IS 'opening_cash + cash_sales (calculado)';
COMMENT ON COLUMN shifts.difference IS 'closing_cash - expected_cash_drawer';

-- ----------------------------------------------------------------------------
-- TABLA: sessions
-- Descripción: Sesiones de estacionamiento
-- ----------------------------------------------------------------------------
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parking_id UUID NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
    plate TEXT NOT NULL,
    session_code TEXT NOT NULL UNIQUE,
    status session_status NOT NULL DEFAULT 'open',
    entry_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    exit_time TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraint: exit_time debe ser mayor que entry_time si no es NULL
    CHECK (exit_time IS NULL OR exit_time >= entry_time),
    
    -- Constraint: si está cerrada, debe tener exit_time
    CHECK (
        (status = 'open' AND exit_time IS NULL) OR
        (status = 'closed' AND exit_time IS NOT NULL)
    )
);

-- Índices
CREATE INDEX idx_sessions_org_parking_plate ON sessions(org_id, parking_id, plate);
CREATE INDEX idx_sessions_shift ON sessions(shift_id);
CREATE INDEX idx_sessions_status_entry ON sessions(status, entry_time);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);

-- Constraint UNIQUE: no doble sesión abierta con misma patente en mismo parking
CREATE UNIQUE INDEX idx_sessions_unique_open_plate ON sessions(org_id, parking_id, plate, status) 
WHERE status = 'open';

-- Comentarios
COMMENT ON TABLE sessions IS 'Sesiones de estacionamiento (entrada hasta salida y pago)';
COMMENT ON COLUMN sessions.plate IS 'Patente NORMALIZADA (uppercase, sin guiones/puntos)';
COMMENT ON COLUMN sessions.session_code IS 'Código random único para QR (8-12 chars)';
COMMENT ON COLUMN sessions.shift_id IS 'Turno que CREÓ la sesión';
COMMENT ON COLUMN sessions.exit_time IS 'Se setea solo al cerrar con pago (copia de payments.exit_time_locked)';

-- ----------------------------------------------------------------------------
-- TABLA: payment_quotes
-- Descripción: Quotes temporales que congelan monto (2-3 min)
-- ----------------------------------------------------------------------------
CREATE TABLE payment_quotes (
    quote_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    parking_id UUID NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    exit_time_locked TIMESTAMPTZ NOT NULL,
    minutes_locked INTEGER NOT NULL CHECK (minutes_locked >= 0),
    tariff_applied NUMERIC(10,2) NOT NULL CHECK (tariff_applied >= 0),
    amount_locked NUMERIC(10,2) NOT NULL CHECK (amount_locked >= 0),
    expires_at TIMESTAMPTZ NOT NULL,
    status quote_status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraint: expires_at debe ser mayor que exit_time_locked
    CHECK (expires_at > exit_time_locked)
);

-- Índices
CREATE INDEX idx_payment_quotes_session ON payment_quotes(session_id);
CREATE INDEX idx_payment_quotes_expires ON payment_quotes(expires_at);
CREATE INDEX idx_payment_quotes_created ON payment_quotes(created_at);
CREATE INDEX idx_payment_quotes_org_created ON payment_quotes(org_id, created_at);

-- Constraint UNIQUE: solo 1 quote activo por sesión
CREATE UNIQUE INDEX idx_payment_quotes_session_active ON payment_quotes(session_id) 
WHERE status = 'active';

-- Comentarios
COMMENT ON TABLE payment_quotes IS 'Quotes temporales que congelan monto al iniciar salida (TTL 2-3 min)';
COMMENT ON COLUMN payment_quotes.org_id IS 'Redundante pero necesario para RLS y limpieza';
COMMENT ON COLUMN payment_quotes.exit_time_locked IS 'Hora de salida congelada (NOW al crear quote)';
COMMENT ON COLUMN payment_quotes.minutes_locked IS 'ceil((exit_time_locked - entry_time) / 60)';

-- ----------------------------------------------------------------------------
-- TABLA: payments
-- Descripción: Pagos de sesiones
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
    quote_id TEXT NOT NULL REFERENCES payment_quotes(quote_id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    minutes INTEGER NOT NULL CHECK (minutes >= 0),
    exit_time_locked TIMESTAMPTZ NOT NULL,
    tariff_applied NUMERIC(10,2) NOT NULL CHECK (tariff_applied >= 0),
    payment_method payment_method_type NOT NULL DEFAULT 'cash',
    status payment_status_type NOT NULL DEFAULT 'completed',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_payments_org_session ON payments(org_id, session_id);
CREATE INDEX idx_payments_shift_method ON payments(shift_id, payment_method);
CREATE INDEX idx_payments_quote ON payments(quote_id);
CREATE INDEX idx_payments_created ON payments(created_at);

-- Constraint UNIQUE: solo 1 pago completed por sesión (MVP)
CREATE UNIQUE INDEX idx_payments_session_completed ON payments(session_id, status) 
WHERE status = 'completed';

-- Comentarios
COMMENT ON TABLE payments IS 'Pagos de sesiones de estacionamiento';
COMMENT ON COLUMN payments.shift_id IS 'Turno que COBRÓ (puede diferir de sessions.shift_id)';
COMMENT ON COLUMN payments.quote_id IS 'NOT NULL en MVP (siempre usa quote)';
COMMENT ON COLUMN payments.exit_time_locked IS 'Hora de salida congelada del quote';

-- ----------------------------------------------------------------------------
-- TABLA: audit_logs
-- Descripción: Registro de auditoría
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_audit_logs_org_created ON audit_logs(org_id, created_at);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action_created ON audit_logs(action, created_at);

-- Comentarios
COMMENT ON TABLE audit_logs IS 'Registro de auditoría de acciones importantes (solo insertar)';

-- ============================================================================
-- PASO 3: FUNCIONES HELPER
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCIÓN: normalize_plate
-- Descripción: Normaliza patente (trim, sin guiones/puntos, uppercase)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_plate(input TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN UPPER(
        REGEXP_REPLACE(
            TRIM(input),
            '[-.\s]',
            '',
            'g'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_plate IS 'Normaliza patente: trim, sin guiones/puntos/espacios, uppercase';

-- ----------------------------------------------------------------------------
-- FUNCIÓN: get_user_org_id
-- Descripción: Obtiene org_id del usuario autenticado
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT org_id 
        FROM memberships 
        WHERE user_id = auth.uid() 
        AND status = 'active'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_org_id IS 'Obtiene org_id del usuario autenticado (para RLS)';

-- ----------------------------------------------------------------------------
-- FUNCIÓN: get_user_active_parking
-- Descripción: Obtiene parking_id del turno abierto del usuario
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_active_parking()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT parking_id 
        FROM shifts 
        WHERE user_id = auth.uid() 
        AND status = 'open'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_active_parking IS 'Obtiene parking_id del turno abierto del usuario (para RLS operadores)';

-- ----------------------------------------------------------------------------
-- FUNCIÓN: is_superadmin
-- Descripción: Verifica si usuario es superadmin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifica si el usuario tiene metadata is_superadmin = true
    RETURN COALESCE(
        (auth.jwt()->>'is_superadmin')::boolean,
        false
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_superadmin IS 'Verifica si usuario es superadmin (metadata en JWT)';

-- ----------------------------------------------------------------------------
-- FUNCIÓN: get_active_tariff
-- Descripción: Obtiene tarifa vigente por timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_active_tariff(
    p_org_id UUID,
    p_parking_id UUID,
    p_timestamp TIMESTAMPTZ
)
RETURNS TABLE(
    id UUID,
    price_per_minute NUMERIC
) AS $$
BEGIN
    -- Buscar tarifa específica del parking
    RETURN QUERY
    SELECT t.id, t.price_per_minute
    FROM tariffs t
    WHERE t.org_id = p_org_id
    AND t.parking_id = p_parking_id
    AND t.valid_from <= p_timestamp
    AND (t.valid_until IS NULL OR p_timestamp < t.valid_until)
    ORDER BY t.valid_from DESC
    LIMIT 1;
    
    -- Si no hay resultado, buscar tarifa default
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT t.id, t.price_per_minute
        FROM tariffs t
        WHERE t.org_id = p_org_id
        AND t.parking_id IS NULL
        AND t.valid_from <= p_timestamp
        AND (t.valid_until IS NULL OR p_timestamp < t.valid_until)
        ORDER BY t.valid_from DESC
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_active_tariff IS 'Obtiene tarifa vigente (prioridad: parking específico, luego default)';

-- ============================================================================
-- PASO 4: TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TRIGGER: Actualizar updated_at automáticamente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas con updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parkings_updated_at
    BEFORE UPDATE ON parkings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TRIGGER: Normalizar patente automáticamente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_plate_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.plate = normalize_plate(NEW.plate);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_plate_on_insert
    BEFORE INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION normalize_plate_trigger();

CREATE TRIGGER normalize_plate_on_update
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    WHEN (OLD.plate IS DISTINCT FROM NEW.plate)
    EXECUTE FUNCTION normalize_plate_trigger();

-- ============================================================================
-- PASO 5: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE parkings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS: organizations
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (id = get_user_org_id() OR is_superadmin());

CREATE POLICY "Superadmin can manage all organizations"
    ON organizations FOR ALL
    USING (is_superadmin());

-- ----------------------------------------------------------------------------
-- RLS: memberships
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view memberships of their organization"
    ON memberships FOR SELECT
    USING (org_id = get_user_org_id() OR is_superadmin());

CREATE POLICY "Admin can manage memberships of their organization"
    ON memberships FOR ALL
    USING (
        (org_id = get_user_org_id() AND 
         EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND role = 'admin_empresa'))
        OR is_superadmin()
    );

-- ----------------------------------------------------------------------------
-- RLS: parkings
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view parkings of their organization"
    ON parkings FOR SELECT
    USING (org_id = get_user_org_id() OR is_superadmin());

CREATE POLICY "Admin can manage parkings of their organization"
    ON parkings FOR ALL
    USING (
        (org_id = get_user_org_id() AND 
         EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND role = 'admin_empresa'))
        OR is_superadmin()
    );

-- ----------------------------------------------------------------------------
-- RLS: tariffs
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view tariffs of their organization"
    ON tariffs FOR SELECT
    USING (org_id = get_user_org_id() OR is_superadmin());

CREATE POLICY "Admin can manage tariffs of their organization"
    ON tariffs FOR ALL
    USING (
        (org_id = get_user_org_id() AND 
         EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND role = 'admin_empresa'))
        OR is_superadmin()
    );

-- ----------------------------------------------------------------------------
-- RLS: shifts
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view shifts of their organization"
    ON shifts FOR SELECT
    USING (org_id = get_user_org_id() OR is_superadmin());

CREATE POLICY "Operators can manage their own shifts"
    ON shifts FOR ALL
    USING (
        (org_id = get_user_org_id() AND user_id = auth.uid())
        OR is_superadmin()
    );

-- ----------------------------------------------------------------------------
-- RLS: sessions (con restricción por parking activo para operadores)
-- ----------------------------------------------------------------------------
CREATE POLICY "Operators can view sessions of their active parking"
    ON sessions FOR SELECT
    USING (
        (org_id = get_user_org_id() AND parking_id = get_user_active_parking())
        OR (org_id = get_user_org_id() AND 
            EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND role = 'admin_empresa'))
        OR is_superadmin()
    );

CREATE POLICY "Operators can create sessions in their active parking"
    ON sessions FOR INSERT
    WITH CHECK (
        (org_id = get_user_org_id() AND parking_id = get_user_active_parking())
        OR is_superadmin()
    );

CREATE POLICY "Operators can update sessions in their active parking"
    ON sessions FOR UPDATE
    USING (
        (org_id = get_user_org_id() AND parking_id = get_user_active_parking())
        OR (org_id = get_user_org_id() AND 
            EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND role = 'admin_empresa'))
        OR is_superadmin()
    );

-- ----------------------------------------------------------------------------
-- RLS: payment_quotes (con restricción por parking activo para operadores)
-- ----------------------------------------------------------------------------
CREATE POLICY "Operators can view quotes of their active parking"
    ON payment_quotes FOR SELECT
    USING (
        (org_id = get_user_org_id() AND parking_id = get_user_active_parking())
        OR (org_id = get_user_org_id() AND 
            EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND role = 'admin_empresa'))
        OR is_superadmin()
    );

CREATE POLICY "Operators can create quotes in their active parking"
    ON payment_quotes FOR INSERT
    WITH CHECK (
        (org_id = get_user_org_id() AND parking_id = get_user_active_parking())
        OR is_superadmin()
    );

CREATE POLICY "Operators can update quotes in their active parking"
    ON payment_quotes FOR UPDATE
    USING (
        (org_id = get_user_org_id() AND parking_id = get_user_active_parking())
        OR is_superadmin()
    );

-- ----------------------------------------------------------------------------
-- RLS: payments
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view payments of their organization"
    ON payments FOR SELECT
    USING (org_id = get_user_org_id() OR is_superadmin());

CREATE POLICY "Operators can create payments in their organization"
    ON payments FOR INSERT
    WITH CHECK (
        org_id = get_user_org_id()
        OR is_superadmin()
    );

-- ----------------------------------------------------------------------------
-- RLS: audit_logs
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view audit logs of their organization"
    ON audit_logs FOR SELECT
    USING (org_id = get_user_org_id() OR is_superadmin());

CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- PASO 6: DATOS DE EJEMPLO (OPCIONAL - COMENTAR EN PRODUCCIÓN)
-- ============================================================================

-- Descomentar para insertar datos de prueba

/*
-- Organización de ejemplo
INSERT INTO organizations (id, name, slug, status) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Municipalidad de Rosario', 'rosario', 'active');

-- Parking de ejemplo
INSERT INTO parkings (id, org_id, name, address, status) VALUES
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Zona Centro', 'Calle Corrientes 1234', 'active');

-- Tarifa de ejemplo
INSERT INTO tariffs (org_id, parking_id, price_per_minute, valid_from) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 25.00, now());
*/

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================

-- Verificación de instalación
DO $$
BEGIN
    RAISE NOTICE 'Schema Parking On Street v0.1.5 instalado correctamente';
    RAISE NOTICE 'Tablas creadas: 9';
    RAISE NOTICE 'Funciones helper: 5';
    RAISE NOTICE 'RLS habilitado en todas las tablas';
END $$;
