'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

export interface ParkingRevenue {
  parkingId: string
  parkingName: string
  revenue: number
  sessions: number
}

export function useParkingRevenue(
  orgId?: string, 
  parkingId?: string,
  dateFrom?: Date,
  dateTo?: Date
) {
  const [revenueData, setRevenueData] = useState<ParkingRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        setLoading(true)
        const supabase = createSupabaseClient()
        
        // Usar fechas proporcionadas o calcular inicio y fin del mes actual por defecto
        let periodStart: Date
        let periodEnd: Date
        
        if (dateFrom && dateTo) {
          periodStart = new Date(dateFrom)
          periodStart.setHours(0, 0, 0, 0)
          periodEnd = new Date(dateTo)
          periodEnd.setHours(23, 59, 59, 999)
        } else {
          // Por defecto: mes actual
          const now = new Date()
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
          periodStart.setHours(0, 0, 0, 0)
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          periodEnd.setHours(23, 59, 59, 999)
        }

        // Obtener parkings disponibles
        let parkingsQuery = supabase
          .from('parkings')
          .select('id, name')
          .eq('status', 'active')
        
        if (parkingId) {
          // Si hay filtro de parking, solo ese parking
          parkingsQuery = parkingsQuery.eq('id', parkingId)
        } else if (orgId) {
          parkingsQuery = parkingsQuery.eq('org_id', orgId)
        }
        
        const { data: parkings, error: parkingsError } = await parkingsQuery
        
        if (parkingsError) {
          throw new Error(parkingsError.message)
        }

        if (!parkings || parkings.length === 0) {
          setRevenueData([])
          setLoading(false)
          return
        }

        const parkingIds = parkings.map(p => p.id)
        
        // Obtener sesiones cerradas del período seleccionado de estos parkings
        const { data: periodSessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, parking_id, entry_time, exit_time')
          .eq('status', 'closed')
          .in('parking_id', parkingIds)
          .gte('exit_time', periodStart.toISOString())
          .lte('exit_time', periodEnd.toISOString())
        
        if (sessionsError) {
          throw new Error(sessionsError.message)
        }

        // Obtener pagos del período seleccionado
        const sessionIds = periodSessions?.map(s => s.id) || []
        let paymentsQuery = supabase
          .from('payments')
          .select('session_id, amount')
          .eq('status', 'completed')
          .gte('created_at', periodStart.toISOString())
          .lte('created_at', periodEnd.toISOString())
        
        if (sessionIds.length > 0) {
          paymentsQuery = paymentsQuery.in('session_id', sessionIds)
        } else {
          paymentsQuery = paymentsQuery.eq('session_id', '00000000-0000-0000-0000-000000000000')
        }
        
        const { data: payments, error: paymentsError } = await paymentsQuery
        
        if (paymentsError) {
          throw new Error(paymentsError.message)
        }

        const paidSessionIds = new Set(payments?.map(p => p.session_id) || [])
        const paymentsBySession = new Map(payments?.map(p => [p.session_id, Number(p.amount || 0)]) || [])

        // Calcular ingresos por parking
        const revenueByParking = new Map<string, { revenue: number; sessions: number }>()
        
        // Inicializar todos los parkings con 0
        parkings.forEach(p => {
          revenueByParking.set(p.id, { revenue: 0, sessions: 0 })
        })

        // Procesar sesiones con pago
        periodSessions?.forEach(session => {
          const paid = paymentsBySession.get(session.id) || 0
          const current = revenueByParking.get(session.parking_id) || { revenue: 0, sessions: 0 }
          revenueByParking.set(session.parking_id, {
            revenue: current.revenue + paid,
            sessions: current.sessions + 1
          })
        })

        // Procesar sesiones sin pago (NO calcular estimado para mejor rendimiento)
        // Las sesiones sin pago se cuentan pero no se agregan al revenue
        const unpaidSessions = periodSessions?.filter(s => !paidSessionIds.has(s.id)) || []
        
        // Solo contar las sesiones sin pago, no calcular montos estimados (muy lento)
        unpaidSessions.forEach(session => {
          const current = revenueByParking.get(session.parking_id) || { revenue: 0, sessions: 0 }
          revenueByParking.set(session.parking_id, {
            revenue: current.revenue, // Mantener revenue sin cambios
            sessions: current.sessions + 1 // Solo contar la sesión
          })
        })
        
        // NOTA: Si en el futuro necesitas calcular montos estimados, hazlo en batch
        // o con una sola consulta que obtenga todas las tarifas de una vez

        // Convertir a array y ordenar por ingresos
        const revenueArray: ParkingRevenue[] = Array.from(revenueByParking.entries())
          .map(([parkingId, data]) => {
            const parking = parkings.find(p => p.id === parkingId)
            return {
              parkingId,
              parkingName: parking?.name || 'Parking desconocido',
              revenue: data.revenue,
              sessions: data.sessions
            }
          })
          .sort((a, b) => b.revenue - a.revenue)

        setRevenueData(revenueArray)
      } catch (err: any) {
        console.error('Error obteniendo ingresos por parking:', err)
        setError(err.message || 'Error al cargar ingresos por parking')
      } finally {
        setLoading(false)
      }
    }

    fetchRevenue()
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchRevenue, 30000)
    return () => clearInterval(interval)
  }, [orgId, parkingId, dateFrom, dateTo])

  return { revenueData, loading, error }
}
