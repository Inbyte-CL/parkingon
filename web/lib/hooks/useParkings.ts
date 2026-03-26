'use client'

import { useState, useEffect } from 'react'
import { useUser } from './useUser'

export interface Parking {
  id: string
  name: string
  address: string | null
  status: 'active' | 'inactive'
  org_id: string
}

export function useParkings(orgId?: string) {
  const { userInfo } = useUser()
  const [parkings, setParkings] = useState<Parking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchParkings = async () => {
      try {
        // Para superadmin, usar API route con service_role
        // Para otros usuarios, usar cliente directo (con RLS)
        if (userInfo?.role === 'superadmin') {
          const url = orgId 
            ? `/api/admin/parkings?orgId=${orgId}`
            : '/api/admin/parkings'
          
          const response = await fetch(url)
          
          if (!response.ok) {
            const errorData = await response.json()
            setError(errorData.error || 'Error al cargar parkings')
            setLoading(false)
            return
          }

          const data = await response.json()
          setParkings(data.parkings || [])
        } else {
          // Para usuarios normales, usar el hook normal con RLS
          const { createSupabaseClient } = await import('@/lib/supabase/client')
          const supabase = createSupabaseClient()
          
          let query = supabase
            .from('parkings')
            .select('id, name, address, status, org_id')
            .eq('status', 'active')
            .order('name')

          if (orgId) {
            query = query.eq('org_id', orgId)
          }

          const { data, error: fetchError } = await query

          if (fetchError) {
            setError(fetchError.message)
          } else {
            setParkings(data || [])
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar parkings')
      } finally {
        setLoading(false)
      }
    }

    // Solo ejecutar cuando userInfo esté disponible
    if (userInfo !== null) {
      fetchParkings()
    }
  }, [orgId, userInfo])

  return { parkings, loading, error }
}
