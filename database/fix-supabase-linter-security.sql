-- ============================================================================
-- FIX: Errores del linter de Supabase (seguridad)
-- ============================================================================
-- 1. Vista parking_occupancy_realtime: pasar a SECURITY INVOKER (PG15+)
-- 2. Tabla memberships: habilitar RLS sin recursión (get_user_org_id con row_security = off)
-- ============================================================================
-- Ejecutar en el SQL Editor de Supabase (Dashboard > SQL Editor).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Vista parking_occupancy_realtime (solo si existen public.parkings, etc.)
--    Si la tabla no existe, se omite y se sigue con get_user_org_id y RLS.
-- ----------------------------------------------------------------------------
DO $fix$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'parkings') THEN
        DROP VIEW IF EXISTS public.parking_occupancy_realtime;
        EXECUTE $v$
            CREATE VIEW public.parking_occupancy_realtime AS
            SELECT 
                p.id AS parking_id,
                p.org_id,
                o.name AS organization_name,
                p.name AS parking_name,
                p.address,
                p.total_spaces,
                COUNT(s.id) AS occupied_spaces,
                CASE WHEN p.total_spaces IS NULL THEN NULL
                    ELSE p.total_spaces - COUNT(s.id)::INTEGER END AS available_spaces,
                CASE WHEN p.total_spaces IS NULL OR p.total_spaces = 0 THEN NULL
                    ELSE ROUND((COUNT(s.id)::NUMERIC / p.total_spaces::NUMERIC) * 100, 2) END AS occupancy_percentage,
                CASE WHEN p.total_spaces IS NULL THEN 'unlimited'
                    WHEN COUNT(s.id) >= p.total_spaces THEN 'full'
                    WHEN COUNT(s.id)::NUMERIC / p.total_spaces::NUMERIC > 0.9 THEN 'almost_full'
                    WHEN COUNT(s.id)::NUMERIC / p.total_spaces::NUMERIC > 0.5 THEN 'moderate'
                    ELSE 'available' END AS availability_status,
                p.status AS parking_status
            FROM public.parkings p
            JOIN public.organizations o ON o.id = p.org_id
            LEFT JOIN public.sessions s ON s.parking_id = p.id AND s.status = 'open'
            WHERE p.status = 'active'
            GROUP BY p.id, p.org_id, o.name, p.name, p.address, p.total_spaces, p.status
        $v$;
        RAISE NOTICE 'Vista public.parking_occupancy_realtime creada.';
    ELSE
        RAISE NOTICE 'Se omite la vista: public.parkings no existe. Ejecutado get_user_org_id y RLS memberships.';
    END IF;
END $fix$;


-- ----------------------------------------------------------------------------
-- 2 y 3. get_user_org_id + RLS en memberships (solo si existe public.memberships)
-- ----------------------------------------------------------------------------
DO $m$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memberships') THEN
        EXECUTE $exec$
            CREATE OR REPLACE FUNCTION public.get_user_org_id()
            RETURNS UUID
            LANGUAGE plpgsql
            STABLE
            SECURITY DEFINER
            SET row_security = off
            AS $fbody$
            BEGIN
                RETURN (
                    SELECT org_id 
                    FROM public.memberships 
                    WHERE user_id = auth.uid() 
                    AND status = 'active'
                    LIMIT 1
                );
            END;
            $fbody$;
        $exec$;
        COMMENT ON FUNCTION public.get_user_org_id() IS 'Obtiene org_id del usuario autenticado (para RLS). Lee memberships con row_security=off para evitar recursión.';

        ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view memberships of their organization" ON public.memberships;
        DROP POLICY IF EXISTS "Admin can manage memberships of their organization" ON public.memberships;

        CREATE POLICY "Users can view memberships of their organization"
            ON public.memberships FOR SELECT
            USING (org_id = get_user_org_id() OR is_superadmin());

        CREATE POLICY "Admin can manage memberships of their organization"
            ON public.memberships FOR ALL
            USING (
                (org_id = get_user_org_id() AND 
                 EXISTS (SELECT 1 FROM public.memberships m WHERE m.user_id = auth.uid() AND m.role = 'admin_empresa' AND m.status = 'active'))
                OR is_superadmin()
            )
            WITH CHECK (
                (org_id = get_user_org_id() AND 
                 EXISTS (SELECT 1 FROM public.memberships m WHERE m.user_id = auth.uid() AND m.role = 'admin_empresa' AND m.status = 'active'))
                OR is_superadmin()
            );

        RAISE NOTICE 'get_user_org_id y RLS en memberships aplicados.';
    ELSE
        RAISE NOTICE 'Se omite get_user_org_id y RLS: public.memberships no existe. Ejecuta antes schema.sql en este proyecto.';
    END IF;
END $m$;


-- ----------------------------------------------------------------------------
-- Verificación (no falla si no existen las tablas)
-- ----------------------------------------------------------------------------
SELECT 'Vista' AS tipo, relname AS name
FROM pg_class
WHERE relname = 'parking_occupancy_realtime'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

SELECT 'RLS memberships' AS tipo, tablename AS name, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'memberships';
