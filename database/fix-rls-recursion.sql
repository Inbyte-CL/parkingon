-- ============================================================================
-- FIX: Recursión infinita en políticas RLS de memberships
-- ============================================================================
-- El problema: Las políticas RLS de memberships usan get_user_org_id(),
-- que a su vez consulta memberships, creando recursión infinita.
--
-- Solución: Reescribir las políticas para consultar directamente sin función.
-- ============================================================================

-- 1. Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view memberships of their organization" ON memberships;
DROP POLICY IF EXISTS "Admin can manage memberships of their organization" ON memberships;

-- 2. Crear políticas SIN usar get_user_org_id()
CREATE POLICY "Users can view memberships of their organization"
    ON memberships FOR SELECT
    USING (
        -- Usuario puede ver memberships de su propia org
        org_id IN (
            SELECT m.org_id 
            FROM memberships m 
            WHERE m.user_id = auth.uid() 
            AND m.status = 'active'
        )
        OR is_superadmin()
    );

CREATE POLICY "Admin can manage memberships of their organization"
    ON memberships FOR ALL
    USING (
        -- Admin puede gestionar memberships de su org
        (
            org_id IN (
                SELECT m.org_id 
                FROM memberships m 
                WHERE m.user_id = auth.uid() 
                AND m.role = 'admin_empresa'
                AND m.status = 'active'
            )
        )
        OR is_superadmin()
    );

-- 3. Verificar
SELECT 'Políticas RLS actualizadas correctamente' as status;
