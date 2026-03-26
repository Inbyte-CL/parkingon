-- Consulta completa de usuarios y sus roles
-- Muestra todos los usuarios con su información de membresía, roles y asignaciones

SELECT 
    u.id as user_id,
    u.email,
    u.created_at as user_created_at,
    u.email_confirmed_at,
    -- Verificar si es superadmin desde metadata
    COALESCE((u.raw_user_meta_data->>'is_superadmin')::boolean, false) as is_superadmin,
    -- Información de membership
    m.id as membership_id,
    m.role,
    m.status as membership_status,
    m.display_name,
    m.org_id,
    m.parking_id,
    -- Información de organización
    o.name as organization_name,
    -- Información de parking
    p.name as parking_name,
    p.status as parking_status
FROM auth.users u
LEFT JOIN memberships m ON m.user_id = u.id AND m.status = 'active'
LEFT JOIN organizations o ON o.id = m.org_id
LEFT JOIN parkings p ON p.id = m.parking_id
ORDER BY 
    -- Primero superadmins
    COALESCE((u.raw_user_meta_data->>'is_superadmin')::boolean, false) DESC,
    -- Luego por email
    u.email ASC;

-- Resumen por rol
SELECT 
    CASE 
        WHEN COALESCE((u.raw_user_meta_data->>'is_superadmin')::boolean, false) = true THEN 'superadmin'
        WHEN m.role IS NOT NULL THEN m.role::TEXT
        ELSE 'sin_rol'
    END as role,
    COUNT(*) as total_usuarios
FROM auth.users u
LEFT JOIN memberships m ON m.user_id = u.id AND m.status = 'active'
GROUP BY 
    CASE 
        WHEN COALESCE((u.raw_user_meta_data->>'is_superadmin')::boolean, false) = true THEN 'superadmin'
        WHEN m.role IS NOT NULL THEN m.role::TEXT
        ELSE 'sin_rol'
    END
ORDER BY total_usuarios DESC;
