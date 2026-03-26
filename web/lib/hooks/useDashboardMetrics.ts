'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

export interface DashboardMetrics {
  activeParkings: number
  activeSessions: number
  activeShifts: number
  totalOccupancy: {
    totalSpaces: number
    occupiedSpaces: number
    availableSpaces: number
    occupancyPercentage: number
  }
  todayRevenue: number
  todaySessions: number
  todayAveragePerSession: number
  weekRevenue: number
  weekSessions: number
  monthRevenue: number
  monthSessions: number
}

export function useDashboardMetrics(orgId?: string, parkingId?: string) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const supabase = createSupabaseClient()
        
        const now = new Date()
        const today = new Date(now)
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)

        // Obtener IDs de parkings para filtrar si es necesario
        let parkingIds: string[] = []
        if (parkingId) {
          parkingIds = [parkingId]
        } else if (orgId) {
          const { data: orgParkings } = await supabase
            .from('parkings')
            .select('id')
            .eq('org_id', orgId)
          parkingIds = orgParkings?.map(p => p.id) || []
        }

        // 1. Parkings activos
        let parkingsQuery = supabase
          .from('parkings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
        
        if (parkingId) {
          parkingsQuery = parkingsQuery.eq('id', parkingId)
        } else if (orgId) {
          parkingsQuery = parkingsQuery.eq('org_id', orgId)
        }
        
        const { count: parkingsCount, error: parkingsError } = await parkingsQuery
        if (parkingsError) console.warn('Métricas parkings:', parkingsError.message)

        // 2. Sesiones activas (abiertas)
        let activeSessionsQuery = supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')
        
        if (parkingIds.length > 0) {
          activeSessionsQuery = activeSessionsQuery.in('parking_id', parkingIds)
        }
        
        const { count: sessionsCount, error: sessionsError } = await activeSessionsQuery
        if (sessionsError) console.warn('Métricas sesiones:', sessionsError.message)

        // 3. Turnos activos
        let shiftsQuery = supabase
          .from('shifts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')
        
        if (parkingIds.length > 0) {
          shiftsQuery = shiftsQuery.in('parking_id', parkingIds)
        }
        
        const { count: shiftsCount, error: shiftsError } = await shiftsQuery
        if (shiftsError) console.warn('Métricas turnos:', shiftsError.message)

        // 4. Ocupación
        let totalOccupancy = {
          totalSpaces: 0,
          occupiedSpaces: sessionsCount || 0,
          availableSpaces: 0,
          occupancyPercentage: 0
        }

        if (parkingId) {
          // Ocupación de un parking específico
          const { data: parkingData } = await supabase
            .from('parkings')
            .select('total_spaces')
            .eq('id', parkingId)
            .single()
          
          if (parkingData) {
            totalOccupancy.totalSpaces = parkingData.total_spaces || 0
            totalOccupancy.occupiedSpaces = sessionsCount || 0
            totalOccupancy.availableSpaces = Math.max(0, totalOccupancy.totalSpaces - totalOccupancy.occupiedSpaces)
            totalOccupancy.occupancyPercentage = totalOccupancy.totalSpaces > 0 
              ? (totalOccupancy.occupiedSpaces / totalOccupancy.totalSpaces) * 100 
              : 0
          }
        } else if (orgId) {
          // Ocupación de todos los parkings de la org
          try {
            const { data: occupancyData, error: occupancyError } = await supabase
              .rpc('get_org_parkings_occupancy', { p_org_id: orgId })

            if (!occupancyError && occupancyData && occupancyData.length > 0) {
              const total = occupancyData.reduce((acc: any, curr: any) => ({
                totalSpaces: acc.totalSpaces + (curr.total_spaces || 0),
                occupiedSpaces: acc.occupiedSpaces + (curr.occupied_spaces || 0),
                availableSpaces: acc.availableSpaces + (curr.available_spaces || 0),
              }), { totalSpaces: 0, occupiedSpaces: 0, availableSpaces: 0 })

              totalOccupancy = {
                ...total,
                occupancyPercentage: total.totalSpaces > 0 
                  ? (total.occupiedSpaces / total.totalSpaces) * 100 
                  : 0
              }
            }
          } catch (rpcError) {
            console.warn('Error al obtener ocupación desde RPC:', rpcError)
            // Calcular manualmente
            const { data: allParkings } = await supabase
              .from('parkings')
              .select('total_spaces')
              .eq('status', 'active')
              .eq('org_id', orgId)

            if (allParkings && allParkings.length > 0) {
              const totalSpaces = allParkings.reduce((sum: number, p: any) => {
                const spaces = typeof p.total_spaces === 'number' ? p.total_spaces : 0
                return sum + spaces
              }, 0)
              
              totalOccupancy.totalSpaces = totalSpaces
              totalOccupancy.occupiedSpaces = sessionsCount || 0
              totalOccupancy.availableSpaces = Math.max(0, totalSpaces - (sessionsCount || 0))
              totalOccupancy.occupancyPercentage = totalSpaces > 0 
                ? ((sessionsCount || 0) / totalSpaces) * 100 
                : 0
            }
          }
        } else {
          // Superadmin: todos los parkings
          const { data: allParkings } = await supabase
            .from('parkings')
            .select('total_spaces')
            .eq('status', 'active')

          if (allParkings && allParkings.length > 0) {
            const totalSpaces = allParkings.reduce((sum: number, p: any) => {
              const spaces = typeof p.total_spaces === 'number' ? p.total_spaces : 0
              return sum + spaces
            }, 0)
            
            totalOccupancy.totalSpaces = totalSpaces
            totalOccupancy.occupiedSpaces = sessionsCount || 0
            totalOccupancy.availableSpaces = Math.max(0, totalSpaces - (sessionsCount || 0))
            totalOccupancy.occupancyPercentage = totalSpaces > 0 
              ? ((sessionsCount || 0) / totalSpaces) * 100 
              : 0
          }
        }

        // 5. Ingresos y sesiones de hoy
        // Obtener session_ids del período y parking(s) seleccionado(s)
        let todaySessionsQuery = supabase
          .from('sessions')
          .select('id')
          .eq('status', 'closed')
          .gte('exit_time', today.toISOString())
          .lt('exit_time', tomorrow.toISOString())
        
        if (parkingIds.length > 0) {
          todaySessionsQuery = todaySessionsQuery.in('parking_id', parkingIds)
        }
        
        const { data: todaySessionsData } = await todaySessionsQuery
        const todaySessionIds = todaySessionsData?.map(s => s.id) || []
        
        let todayPaymentsQuery = supabase
          .from('payments')
          .select('amount, session_id')
          .eq('status', 'completed')
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString())
        
        if (todaySessionIds.length > 0) {
          todayPaymentsQuery = todayPaymentsQuery.in('session_id', todaySessionIds)
        } else {
          // No hay sesiones, no habrá pagos
          todayPaymentsQuery = todayPaymentsQuery.eq('session_id', '00000000-0000-0000-0000-000000000000')
        }

        const { data: todayPayments, error: paymentsError } = await todayPaymentsQuery
        let todayRevenue = todayPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0
        const paidSessionIds = new Set(todayPayments?.map(p => p.session_id) || [])

        // Obtener sesiones cerradas hoy sin pago y calcular monto estimado
        let allTodaySessionsQuery = supabase
          .from('sessions')
          .select('id, entry_time, exit_time, parking_id')
          .eq('status', 'closed')
          .gte('exit_time', today.toISOString())
          .lt('exit_time', tomorrow.toISOString())
        
        if (parkingIds.length > 0) {
          allTodaySessionsQuery = allTodaySessionsQuery.in('parking_id', parkingIds)
        }

        const { data: allTodaySessions } = await allTodaySessionsQuery
        const sessionsWithoutPayment = allTodaySessions?.filter(s => !paidSessionIds.has(s.id)) || []
        const MAX_UNPAID_SESSIONS_TO_ESTIMATE = 15 // Evita cuelgues: no hacer 2 llamadas por cada sesión sin pago
        const sessionsToEstimate = sessionsWithoutPayment.slice(0, MAX_UNPAID_SESSIONS_TO_ESTIMATE)

        let estimatedRevenueFromUnpaid = 0
        for (const session of sessionsToEstimate) {
          try {
            const { data: parkingData } = await supabase
              .from('parkings')
              .select('org_id')
              .eq('id', session.parking_id)
              .single()

            if (parkingData?.org_id) {
              const { data: tariffData } = await supabase
                .rpc('get_active_tariff', {
                  p_org_id: parkingData.org_id,
                  p_parking_id: session.parking_id,
                  p_timestamp: session.exit_time
                })

              if (tariffData && tariffData.length > 0) {
                const tariff = tariffData[0]
                const entryTime = new Date(session.entry_time)
                const exitTime = new Date(session.exit_time)
                const secondsParked = Math.floor((exitTime.getTime() - entryTime.getTime()) / 1000)
                const minutesCharged = Math.ceil(secondsParked / 60)
                const amount = minutesCharged * parseFloat(tariff.price_per_minute || 0)
                estimatedRevenueFromUnpaid += amount
              }
            }
          } catch {
            // Ignorar errores por sesión para no saturar logs
          }
        }

        todayRevenue += estimatedRevenueFromUnpaid
        const todaySessionsCount = allTodaySessions?.length || 0
        const todayAveragePerSession = todaySessionsCount > 0 ? todayRevenue / todaySessionsCount : 0

        // 6. Ingresos y sesiones de la semana
        let weekSessionsQuery = supabase
          .from('sessions')
          .select('id')
          .eq('status', 'closed')
          .gte('exit_time', weekAgo.toISOString())
          .lt('exit_time', tomorrow.toISOString())
        
        if (parkingIds.length > 0) {
          weekSessionsQuery = weekSessionsQuery.in('parking_id', parkingIds)
        }
        
        const { data: weekSessionsData } = await weekSessionsQuery
        const weekSessionIds = weekSessionsData?.map(s => s.id) || []
        
        let weekPaymentsQuery = supabase
          .from('payments')
          .select('amount, session_id')
          .eq('status', 'completed')
          .gte('created_at', weekAgo.toISOString())
          .lt('created_at', tomorrow.toISOString())
        
        if (weekSessionIds.length > 0) {
          weekPaymentsQuery = weekPaymentsQuery.in('session_id', weekSessionIds)
        } else {
          weekPaymentsQuery = weekPaymentsQuery.eq('session_id', '00000000-0000-0000-0000-000000000000')
        }

        const { data: weekPayments } = await weekPaymentsQuery
        const weekRevenue = weekPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0
        
        const weekSessionsCount = weekSessionIds.length

        // 7. Ingresos y sesiones del mes
        let monthSessionsQuery = supabase
          .from('sessions')
          .select('id')
          .eq('status', 'closed')
          .gte('exit_time', monthAgo.toISOString())
          .lt('exit_time', tomorrow.toISOString())
        
        if (parkingIds.length > 0) {
          monthSessionsQuery = monthSessionsQuery.in('parking_id', parkingIds)
        }
        
        const { data: monthSessionsData } = await monthSessionsQuery
        const monthSessionIds = monthSessionsData?.map(s => s.id) || []
        
        let monthPaymentsQuery = supabase
          .from('payments')
          .select('amount, session_id')
          .eq('status', 'completed')
          .gte('created_at', monthAgo.toISOString())
          .lt('created_at', tomorrow.toISOString())
        
        if (monthSessionIds.length > 0) {
          monthPaymentsQuery = monthPaymentsQuery.in('session_id', monthSessionIds)
        } else {
          monthPaymentsQuery = monthPaymentsQuery.eq('session_id', '00000000-0000-0000-0000-000000000000')
        }

        const { data: monthPayments } = await monthPaymentsQuery
        const monthRevenue = monthPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0
        const monthSessionsCount = monthSessionIds.length

        const finalMetrics: DashboardMetrics = {
          activeParkings: parkingsCount || 0,
          activeSessions: sessionsCount || 0,
          activeShifts: shiftsCount || 0,
          totalOccupancy,
          todayRevenue,
          todaySessions: todaySessionsCount,
          todayAveragePerSession,
          weekRevenue,
          weekSessions: weekSessionsCount || 0,
          monthRevenue,
          monthSessions: monthSessionsCount || 0,
        }
        
        setMetrics(finalMetrics)
      } catch (err: any) {
        console.error('Error obteniendo métricas:', err)
        setError(err.message || 'Error al cargar métricas')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [orgId, parkingId])

  return { metrics, loading, error }
}
