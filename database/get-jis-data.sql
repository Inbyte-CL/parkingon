-- Script para obtener datos de JIS Parking necesarios para generar movimientos
-- Ejecutar en Supabase SQL Editor

-- 1. ID de organización JIS Parking
SELECT id, name FROM organizations WHERE slug = 'jis-parking';

-- 2. IDs de parkings de JIS Parking
SELECT id, name FROM parkings 
WHERE org_id = (SELECT id FROM organizations WHERE slug = 'jis-parking')
ORDER BY name;

-- 3. IDs de operadores de JIS Parking
SELECT 
    m.user_id,
    m.display_name,
    m.parking_id,
    p.name as parking_name
FROM memberships m
LEFT JOIN parkings p ON m.parking_id = p.id
WHERE m.org_id = (SELECT id FROM organizations WHERE slug = 'jis-parking')
  AND m.role = 'operador'
  AND m.status = 'active'
ORDER BY m.display_name;

-- 4. Tarifas activas de JIS Parking
SELECT 
    id,
    org_id,
    parking_id,
    price_per_minute,
    valid_from,
    valid_until
FROM tariffs
WHERE org_id = (SELECT id FROM organizations WHERE slug = 'jis-parking')
  AND valid_from <= NOW()
  AND (valid_until IS NULL OR valid_until >= NOW())
ORDER BY parking_id NULLS LAST, valid_from DESC;
