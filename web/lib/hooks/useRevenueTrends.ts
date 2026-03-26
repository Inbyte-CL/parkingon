'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

export type RevenueTrendPeriod = '24h' | '7d' | '1m'

export interface RevenueTrendPoint {
  label: string
  value: number
  fullLabel?: string
}

export function useRevenueTrends(orgId?: string, parkingId?: string, period: RevenueTrendPeriod = '24h') {
  const [data, setData] = useState<RevenueTrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrends = async () => {
      if (!orgId) {
        setData([])
        setLoading(false)
        return
      }
      try {
        const supabase = createSupabaseClient()
        const now = new Date()
        let from: Date
        const points: RevenueTrendPoint[] = []

        if (period === '24h') {
          from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          let paymentsQuery = supabase
            .from('payments')
            .select('amount, created_at, session_id')
            .eq('org_id', orgId)
            .eq('status', 'completed')
            .gte('created_at', from.toISOString())

          if (parkingId) {
            const { data: sessionIds } = await supabase.from('sessions').select('id').eq('parking_id', parkingId)
            const ids = sessionIds?.map(s => s.id) || []
            if (ids.length === 0) {
              setData(Array.from({ length: 24 }, (_, i) => ({ label: `${i}:00`, value: 0 })))
              setLoading(false)
              return
            }
            paymentsQuery = paymentsQuery.in('session_id', ids)
          }
          const { data: payments } = await paymentsQuery

          const byHour: Record<number, number> = {}
          for (let h = 0; h < 24; h++) byHour[h] = 0
          payments?.forEach((p: { amount: number; created_at: string }) => {
            const d = new Date(p.created_at)
            const hour = d.getHours()
            byHour[hour] = (byHour[hour] || 0) + Number(p.amount || 0)
          })
          setData(Array.from({ length: 24 }, (_, h) => ({ label: `${h.toString().padStart(2, '0')}:00`, value: byHour[h] || 0 })))
        } else {
          const days = period === '7d' ? 7 : 30
          from = new Date(now)
          from.setDate(from.getDate() - days)
          from.setHours(0, 0, 0, 0)

          let paymentsQuery = supabase
            .from('payments')
            .select('amount, created_at, session_id')
            .eq('org_id', orgId)
            .eq('status', 'completed')
            .gte('created_at', from.toISOString())
          if (parkingId) {
            const { data: sessionIds } = await supabase.from('sessions').select('id').eq('parking_id', parkingId)
            const ids = sessionIds?.map(s => s.id) || []
            if (ids.length > 0) paymentsQuery = paymentsQuery.in('session_id', ids)
          }
          const { data: payments } = await paymentsQuery

          const byDay: Record<string, number> = {}
          for (let d = 0; d < days; d++) {
            const day = new Date(from)
            day.setDate(day.getDate() + d)
            const key = day.toISOString().slice(0, 10)
            byDay[key] = 0
          }
          payments?.forEach((p: { amount: number; created_at: string }) => {
            const key = new Date(p.created_at).toISOString().slice(0, 10)
            if (byDay[key] !== undefined) byDay[key] += Number(p.amount || 0)
          })
          setData(
            Object.entries(byDay)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([label, value]) => ({ label: new Date(label).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }), value }))
          )
        }
      } catch (err) {
        console.error('Error revenue trends:', err)
        setData([])
      } finally {
        setLoading(false)
      }
    }
    fetchTrends()
  }, [orgId, parkingId, period])

  return { data, loading }
}
