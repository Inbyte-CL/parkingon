-- Verificar tarifas activas
SELECT 
    t.id,
    t.name,
    t.price_per_minute,
    t.status,
    p.name as parking_name,
    o.name as org_name
FROM tariffs t
JOIN parkings p ON p.id = t.parking_id
JOIN organizations o ON o.id = p.org_id
WHERE t.status = 'active'
ORDER BY t.created_at DESC;

-- Si no hay tarifas, crear una de ejemplo
DO $$
DECLARE
    v_parking_id UUID;
    v_tariff_count INT;
BEGIN
    -- Obtener el primer parking
    SELECT id INTO v_parking_id FROM parkings LIMIT 1;
    
    -- Contar tarifas activas
    SELECT COUNT(*) INTO v_tariff_count FROM tariffs WHERE parking_id = v_parking_id AND status = 'active';
    
    -- Si no hay tarifas activas, crear una
    IF v_tariff_count = 0 THEN
        INSERT INTO tariffs (parking_id, name, price_per_minute, status)
        VALUES (v_parking_id, 'Tarifa Estándar', 1.00, 'active');
        
        RAISE NOTICE '✅ Tarifa creada: $1.00 por minuto';
    ELSE
        RAISE NOTICE '✅ Ya existe una tarifa activa';
    END IF;
END $$;

-- Verificar resultado
SELECT 
    '✅ Tarifas activas configuradas' as status,
    t.name,
    t.price_per_minute,
    p.name as parking_name
FROM tariffs t
JOIN parkings p ON p.id = t.parking_id
WHERE t.status = 'active';
