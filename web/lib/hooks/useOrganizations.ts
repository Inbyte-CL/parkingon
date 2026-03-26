'use client'

import { useState, useEffect } from 'react'
import { useUser } from './useUser'

export interface Organization {
  id: string
  name: string
  slug: string
  status: 'active' | 'inactive'
}

export function useOrganizations() {
  const { userInfo } = useUser()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        // Para superadmin, usar API route con service_role
        // Para otros usuarios, usar cliente directo (con RLS)
        if (userInfo?.role === 'superadmin') {
          const response = await fetch('/api/admin/organizations')
          
          if (!response.ok) {
            const errorData = await response.json()
            setError(errorData.error || 'Error al cargar organizaciones')
            setLoading(false)
            return
          }

          const data = await response.json()
          setOrganizations(data.organizations || [])
        } else {
          // Para usuarios normales, usar el hook normal con RLS
          const { createSupabaseClient } = await import('@/lib/supabase/client')
          const supabase = createSupabaseClient()
          
          const { data, error: fetchError } = await supabase
            .from('organizations')
            .select('id, name, slug, status')
            .eq('status', 'active')
            .order('name')

          if (fetchError) {
            setError(fetchError.message)
          } else {
            setOrganizations(data || [])
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar organizaciones')
      } finally {
        setLoading(false)
      }
    }

    // Solo ejecutar cuando userInfo esté disponible
    if (userInfo !== null) {
      fetchOrganizations()
    }
  }, [userInfo])

  return { organizations, loading, error }
}
