-- Función RPC para obtener todos los usuarios con sus roles y asignaciones
-- Esta función puede ser llamada desde el cliente de Supabase

CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    user_created_at TIMESTAMPTZ,
    email_confirmed_at TIMESTAMPTZ,
    is_superadmin BOOLEAN,
    membership_id UUID,
    role TEXT,
    membership_status TEXT,
    display_name TEXT,
    org_id UUID,
    parking_id UUID,
    organization_name TEXT,
    parking_name TEXT,
    parking_status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email::TEXT,
        u.created_at as user_created_at,
        u.email_confirmed_at,
        -- Verificar si es superadmin desde metadata
        COALESCE((u.raw_user_meta_data->>'is_superadmin')::boolean, false) as is_superadmin,
        -- Información de membership
        m.id as membership_id,
        m.role::TEXT as role,
        m.status::TEXT as membership_status,
        m.display_name::TEXT,
        m.org_id,
        m.parking_id,
        -- Información de organización
        o.name::TEXT as organization_name,
        -- Información de parking
        p.name::TEXT as parking_name,
        p.status::TEXT as parking_status
    FROM auth.users u
    LEFT JOIN memberships m ON m.user_id = u.id AND m.status = 'active'
    LEFT JOIN organizations o ON o.id = m.org_id
    LEFT JOIN parkings p ON p.id = m.parking_id
    ORDER BY 
        -- Primero superadmins
        COALESCE((u.raw_user_meta_data->>'is_superadmin')::boolean, false) DESC,
        -- Luego por email
        u.email ASC;
END;
$$;

-- Ejecutar la función para ver los resultados
SELECT * FROM get_all_users_with_roles();

-- Resumen por rol
SELECT 
    CASE 
        WHEN is_superadmin = true THEN 'superadmin'
        WHEN role IS NOT NULL THEN role
        ELSE 'sin_rol'
    END as role,
    COUNT(*) as total_usuarios,
    STRING_AGG(email, ', ' ORDER BY email) as emails
FROM get_all_users_with_roles()
GROUP BY 
    CASE 
        WHEN is_superadmin = true THEN 'superadmin'
        WHEN role IS NOT NULL THEN role
        ELSE 'sin_rol'
    END
ORDER BY total_usuarios DESC;
