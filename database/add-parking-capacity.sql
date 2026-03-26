-- ============================================================================
-- AGREGAR FUNCIONALIDAD DE CAPACIDAD DE ESTACIONAMIENTO
-- ============================================================================
-- Esta funcionalidad permite:
-- 1. Definir capacidad total de cada parking
-- 2. Calcular ocupación en tiempo real
-- 3. Validar disponibilidad antes de crear sesiones
-- ============================================================================

-- 1. Agregar campo de capacidad a parkings
ALTER TABLE parkings 
ADD COLUMN IF NOT EXISTS total_spaces INTEGER;

-- Agregar constraint para que sea positivo
ALTER TABLE parkings 
ADD CONSTRAINT check_total_spaces_positive 
CHECK (total_spaces IS NULL OR total_spaces > 0);

-- 2. Actualizar parkings existentes con capacidad de ejemplo
UPDATE parkings 
SET total_spaces = 50 
WHERE org_id = 'a0000000-0000-0000-0000-000000000001'
AND total_spaces IS NULL;

-- 3. Crear función para obtener ocupación actual de un parking
CREATE OR REPLACE FUNCTION get_parking_occupancy(p_parking_id UUID)
RETURNS TABLE(
    parking_id UUID,
    parking_name TEXT,
    total_spaces INTEGER,
    occupied_spaces BIGINT,
    available_spaces INTEGER,
    occupancy_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as parking_id,
        p.name as parking_name,
        p.total_spaces,
        COUNT(s.id) as occupied_spaces,
        CASE 
            WHEN p.total_spaces IS NULL THEN NULL
            ELSE p.total_spaces - COUNT(s.id)::INTEGER
        END as available_spaces,
        CASE 
            WHEN p.total_spaces IS NULL OR p.total_spaces = 0 THEN NULL
            ELSE ROUND((COUNT(s.id)::NUMERIC / p.total_spaces::NUMERIC) * 100, 2)
        END as occupancy_percentage
    FROM parkings p
    LEFT JOIN sessions s ON s.parking_id = p.id AND s.status = 'open'
    WHERE p.id = p_parking_id
    GROUP BY p.id, p.name, p.total_spaces;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Crear función para obtener ocupación de todos los parkings de una org
CREATE OR REPLACE FUNCTION get_org_parkings_occupancy(p_org_id UUID)
RETURNS TABLE(
    parking_id UUID,
    parking_name TEXT,
    total_spaces INTEGER,
    occupied_spaces BIGINT,
    available_spaces INTEGER,
    occupancy_percentage NUMERIC,
    status status_type
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as parking_id,
        p.name as parking_name,
        p.total_spaces,
        COUNT(s.id) as occupied_spaces,
        CASE 
            WHEN p.total_spaces IS NULL THEN NULL
            ELSE p.total_spaces - COUNT(s.id)::INTEGER
        END as available_spaces,
        CASE 
            WHEN p.total_spaces IS NULL OR p.total_spaces = 0 THEN NULL
            ELSE ROUND((COUNT(s.id)::NUMERIC / p.total_spaces::NUMERIC) * 100, 2)
        END as occupancy_percentage,
        p.status
    FROM parkings p
    LEFT JOIN sessions s ON s.parking_id = p.id AND s.status = 'open'
    WHERE p.org_id = p_org_id
    GROUP BY p.id, p.name, p.total_spaces, p.status
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Crear vista para monitoreo en tiempo real
CREATE OR REPLACE VIEW parking_occupancy_realtime AS
SELECT 
    p.id as parking_id,
    p.org_id,
    o.name as organization_name,
    p.name as parking_name,
    p.address,
    p.total_spaces,
    COUNT(s.id) as occupied_spaces,
    CASE 
        WHEN p.total_spaces IS NULL THEN NULL
        ELSE p.total_spaces - COUNT(s.id)::INTEGER
    END as available_spaces,
    CASE 
        WHEN p.total_spaces IS NULL OR p.total_spaces = 0 THEN NULL
        ELSE ROUND((COUNT(s.id)::NUMERIC / p.total_spaces::NUMERIC) * 100, 2)
    END as occupancy_percentage,
    CASE 
        WHEN p.total_spaces IS NULL THEN 'unlimited'
        WHEN COUNT(s.id) >= p.total_spaces THEN 'full'
        WHEN COUNT(s.id)::NUMERIC / p.total_spaces::NUMERIC > 0.9 THEN 'almost_full'
        WHEN COUNT(s.id)::NUMERIC / p.total_spaces::NUMERIC > 0.5 THEN 'moderate'
        ELSE 'available'
    END as availability_status,
    p.status as parking_status
FROM parkings p
JOIN organizations o ON o.id = p.org_id
LEFT JOIN sessions s ON s.parking_id = p.id AND s.status = 'open'
WHERE p.status = 'active'
GROUP BY p.id, p.org_id, o.name, p.name, p.address, p.total_spaces, p.status;

-- 6. Verificar implementación
SELECT 
    '✅ Capacidad agregada' as status,
    id,
    name,
    total_spaces,
    (SELECT COUNT(*) FROM sessions WHERE parking_id = parkings.id AND status = 'open') as occupied
FROM parkings
WHERE org_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY name;

-- 7. Probar funciones
SELECT '✅ Ocupación de Zona Centro:' as test;
SELECT * FROM get_parking_occupancy('b0000000-0000-0000-0000-000000000001');

SELECT '✅ Ocupación de todos los parkings de Inbyte:' as test;
SELECT * FROM get_org_parkings_occupancy('a0000000-0000-0000-0000-000000000001');

SELECT '✅ Vista en tiempo real:' as test;
SELECT * FROM parking_occupancy_realtime 
WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
