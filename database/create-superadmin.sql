-- ============================================================================
-- CREAR SUPERADMIN: carlosm@inbyte.cl
-- ============================================================================
-- Ejecuta esto en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/mmqqrfvullrovstcykcj/sql/new
-- ============================================================================

-- IMPORTANTE: Este script crea el usuario en auth.users y lo marca como superadmin
-- Los superadmins NO tienen membership en la tabla memberships

-- Paso 1: Crear el usuario en Supabase Auth
-- Nota: Esto debe hacerse desde el Dashboard de Supabase Auth o usando la API
-- Aquí solo verificamos si existe y actualizamos su metadata

-- Verificar si el usuario ya existe
DO $$
DECLARE
    user_exists BOOLEAN;
    user_id_val UUID;
BEGIN
    -- Verificar si el usuario existe
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'carlosm@inbyte.cl') INTO user_exists;
    
    IF user_exists THEN
        -- Obtener el ID del usuario
        SELECT id INTO user_id_val FROM auth.users WHERE email = 'carlosm@inbyte.cl';
        
        -- Actualizar metadata para marcarlo como superadmin
        UPDATE auth.users
        SET 
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_superadmin": true}'::jsonb,
            email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE id = user_id_val;
        
        RAISE NOTICE '✅ Usuario carlosm@inbyte.cl actualizado como superadmin (ID: %)', user_id_val;
    ELSE
        RAISE NOTICE '⚠️  Usuario carlosm@inbyte.cl NO existe en auth.users';
        RAISE NOTICE '📝 Debes crear el usuario primero desde el Dashboard de Supabase:';
        RAISE NOTICE '   1. Ve a Authentication > Users';
        RAISE NOTICE '   2. Click en "Add user"';
        RAISE NOTICE '   3. Email: carlosm@inbyte.cl';
        RAISE NOTICE '   4. Password: MoracaN77';
        RAISE NOTICE '   5. Luego ejecuta este script nuevamente para marcarlo como superadmin';
    END IF;
END $$;

-- Paso 2: Verificar que el usuario esté marcado como superadmin
SELECT 
    '✅ Verificación de Superadmin' as status,
    u.id as user_id,
    u.email,
    u.email_confirmed_at,
    COALESCE((u.raw_user_meta_data->>'is_superadmin')::boolean, false) as is_superadmin,
    u.raw_user_meta_data->>'is_superadmin' as metadata_value
FROM auth.users u
WHERE u.email = 'carlosm@inbyte.cl';

-- Paso 3: Verificar que NO tenga membership (los superadmins no tienen)
SELECT 
    '✅ Verificación de Membership' as status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM memberships WHERE user_id = (SELECT id FROM auth.users WHERE email = 'carlosm@inbyte.cl'))
        THEN '⚠️  El usuario tiene membership (no debería tenerlo como superadmin)'
        ELSE '✅ El usuario NO tiene membership (correcto para superadmin)'
    END as membership_status
FROM auth.users
WHERE email = 'carlosm@inbyte.cl';
