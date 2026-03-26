'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { UserRole } from '@/types/database'

export interface UserInfo {
  id: string
  email: string
  displayName: string | null
  role: UserRole
  orgId: string
  parkingId: string | null
  organizationName: string | null
  parkingName: string | null
}

export function useUser() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const supabase = createSupabaseClient()
        
        // Obtener usuario autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          setError('Usuario no autenticado')
          setLoading(false)
          return
        }

        // Primero verificar si es superadmin (usando metadata)
        const isSuperadmin = (user.user_metadata?.is_superadmin as boolean) || false
        
        let role: UserRole = 'operador'
        let orgId = ''
        let parkingId: string | null = null
        let displayName: string | null = null
        let organizationName: string | null = null
        let parkingName: string | null = null

        if (isSuperadmin) {
          role = 'superadmin'
          // Superadmin no tiene org_id ni parking_id
        } else {
          // Obtener información del membership
          const { data: membershipData, error: membershipError } = await supabase
            .from('memberships')
            .select('id, org_id, parking_id, role, display_name')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle()

          if (membershipError) {
            console.error('Error obteniendo membership:', membershipError)
            // No es crítico, continuamos con datos básicos
          } else if (membershipData) {
            role = membershipData.role as UserRole
            orgId = membershipData.org_id
            parkingId = membershipData.parking_id || null
            displayName = membershipData.display_name || null

            // Obtener nombre de la organización
            if (orgId) {
              const { data: orgData } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', orgId)
                .single()
              
              if (orgData) {
                organizationName = orgData.name
              }
            }

            // Obtener nombre del parking
            if (parkingId) {
              const { data: parkingData } = await supabase
                .from('parkings')
                .select('name')
                .eq('id', parkingId)
                .single()
              
              if (parkingData) {
                parkingName = parkingData.name
              }
            }
          }
        }

        setUserInfo({
          id: user.id,
          email: user.email || '',
          displayName: displayName,
          role: role,
          orgId: orgId,
          parkingId: parkingId,
          organizationName: organizationName,
          parkingName: parkingName,
        })
      } catch (err: any) {
        console.error('Error inesperado:', err)
        setError(err.message || 'Error al cargar información del usuario')
      } finally {
        setLoading(false)
      }
    }

    fetchUserInfo()
  }, [])

  return { userInfo, loading, error }
}
