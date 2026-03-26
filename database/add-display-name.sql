-- Agregar display_name a la tabla memberships
ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Comentario
COMMENT ON COLUMN memberships.display_name IS 'Nombre para mostrar del usuario (ej: Juan Pérez)';

-- Crear índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_memberships_display_name ON memberships(display_name);

-- Actualizar usuarios existentes con nombres de ejemplo
UPDATE memberships m
SET display_name = 'Usuario Test'
FROM auth.users u
WHERE m.user_id = u.id AND u.email = 'test@inbyte.com';

UPDATE memberships m
SET display_name = 'Juan García'
FROM auth.users u
WHERE m.user_id = u.id AND u.email = 'juan@inbyte.com';

UPDATE memberships m
SET display_name = 'María López'
FROM auth.users u
WHERE m.user_id = u.id AND u.email = 'maria@inbyte.com';

UPDATE memberships m
SET display_name = 'Carlos Admin'
FROM auth.users u
WHERE m.user_id = u.id AND u.email = 'admin@inbyte.com';

-- Verificar
SELECT
    '✅ Display names agregados' as status,
    u.email,
    m.role,
    m.display_name,
    p.name as parking_name
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
LEFT JOIN parkings p ON p.id = m.parking_id
ORDER BY u.email;
