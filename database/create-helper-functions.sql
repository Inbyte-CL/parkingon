-- ============================================================================
-- FUNCIONES HELPER PARA PARKING ON STREET
-- Ejecuta esto en el SQL Editor: https://supabase.com/dashboard/project/mmqqrfvullrovstcykcj/sql/new
-- ============================================================================

-- 1. normalize_plate: Normaliza patente
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

-- 2. get_user_org_id: Obtiene org_id del usuario autenticado
-- SECURITY DEFINER permite que la función ejecute con privilegios del owner (postgres)
-- Esto bypassa RLS automáticamente
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

-- 3. get_user_org_id con parámetro: Para uso en Edge Functions
CREATE OR REPLACE FUNCTION get_user_org_id(p_user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT org_id 
        FROM memberships 
        WHERE user_id = p_user_id 
        AND status = 'active'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. get_user_active_parking: Obtiene parking_id del turno abierto
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

-- 5. is_superadmin: Verifica si usuario es superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt()->>'is_superadmin')::boolean,
        false
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 6. get_active_tariff: Obtiene tarifa vigente
CREATE OR REPLACE FUNCTION get_active_tariff(
    p_org_id UUID,
    p_parking_id UUID,
    p_timestamp TIMESTAMPTZ DEFAULT now()
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

-- Verificar instalación
DO $$
BEGIN
    RAISE NOTICE 'Funciones helper creadas correctamente';
    RAISE NOTICE '- normalize_plate';
    RAISE NOTICE '- get_user_org_id (sin parámetros)';
    RAISE NOTICE '- get_user_org_id(uuid) (con parámetros)';
    RAISE NOTICE '- get_user_active_parking';
    RAISE NOTICE '- is_superadmin';
    RAISE NOTICE '- get_active_tariff';
END $$;
