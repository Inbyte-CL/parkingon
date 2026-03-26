-- ============================================================================
-- SCRIPT: Configurar Tarifa Activa para Parking
-- ============================================================================

-- 1. Verificar tarifas existentes
SELECT 
    '📋 Tarifas existentes:' as info,
    t.id,
    t.name,
    t.price_per_minute,
    t.valid_from,
    t.valid_until,
    p.name as parking_name,
    o.name as org_name
FROM tariffs t
LEFT JOIN parkings p ON p.id = t.parking_id
JOIN organizations o ON o.id = t.org_id
ORDER BY t.created_at DESC;

-- 2. Crear tarifa si no existe
DO $$
DECLARE
    v_org_id UUID;
    v_parking_id UUID;
    v_tariff_count INT;
BEGIN
    -- Obtener la primera organización y parking
    SELECT o.id, p.id 
    INTO v_org_id, v_parking_id
    FROM organizations o
    JOIN parkings p ON p.org_id = o.id
    LIMIT 1;
    
    IF v_org_id IS NULL OR v_parking_id IS NULL THEN
        RAISE EXCEPTION '❌ No se encontró organización o parking';
    END IF;
    
    -- Contar tarifas activas para este parking
    SELECT COUNT(*) INTO v_tariff_count 
    FROM tariffs 
    WHERE org_id = v_org_id 
    AND parking_id = v_parking_id
    AND valid_from <= NOW()
    AND (valid_until IS NULL OR valid_until > NOW());
    
    -- Si no hay tarifas activas, crear una
    IF v_tariff_count = 0 THEN
        INSERT INTO tariffs (
            org_id,
            parking_id,
            name,
            price_per_minute,
            valid_from,
            valid_until
        ) VALUES (
            v_org_id,
            v_parking_id,
            'Tarifa Estándar',
            1.00, -- $1.00 por minuto
            NOW(),
            NULL -- Sin fecha de expiración
        );
        
        RAISE NOTICE '✅ Tarifa creada: $1.00 por minuto para parking %', v_parking_id;
    ELSE
        RAISE NOTICE '✅ Ya existe una tarifa activa';
    END IF;
END $$;

-- 3. Verificar resultado final
SELECT 
    '✅ Tarifas activas configuradas' as status,
    t.name,
    t.price_per_minute,
    t.valid_from,
    t.valid_until,
    p.name as parking_name,
    o.name as org_name
FROM tariffs t
JOIN parkings p ON p.id = t.parking_id
JOIN organizations o ON o.id = t.org_id
WHERE t.valid_from <= NOW()
AND (t.valid_until IS NULL OR t.valid_until > NOW())
ORDER BY t.created_at DESC;

-- 4. Probar la función get_active_tariff
DO $$
DECLARE
    v_org_id UUID;
    v_parking_id UUID;
    v_result RECORD;
BEGIN
    -- Obtener IDs
    SELECT o.id, p.id 
    INTO v_org_id, v_parking_id
    FROM organizations o
    JOIN parkings p ON p.org_id = o.id
    LIMIT 1;
    
    -- Probar función
    SELECT * INTO v_result
    FROM get_active_tariff(v_org_id, v_parking_id, NOW());
    
    IF v_result IS NOT NULL THEN
        RAISE NOTICE '✅ Función get_active_tariff funciona correctamente';
        RAISE NOTICE '   Tarifa ID: %', v_result.id;
        RAISE NOTICE '   Precio por minuto: $%', v_result.price_per_minute;
    ELSE
        RAISE WARNING '⚠️ La función get_active_tariff no devolvió resultados';
    END IF;
END $$;
