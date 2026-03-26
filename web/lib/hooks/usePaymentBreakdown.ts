'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

export interface PaymentMethodBreakdown {
  method: 'cash' | 'card' | 'qr_payment'
  label: string
  amount: number
  count: number
  volumePercent: number
}

export function usePaymentBreakdown(
  orgId?: string,
  parkingId?: string,
  dateFrom?: Date,
  dateTo?: Date
) {
  const [breakdown, setBreakdown] = useState<PaymentMethodBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchBreakdown = async () => {
      if (!orgId) {
        setBreakdown([])
        setTotal(0)
        setLoading(false)
        return
      }
      try {
        const supabase = createSupabaseClient()
        const from = dateFrom
          ? (() => { const d = new Date(dateFrom); d.setHours(0, 0, 0, 0); return d })()
          : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })()
        const to = dateTo
          ? (() => { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); return d })()
          : (() => { const d = new Date(from); d.setDate(d.getDate() + 1); return d })()

        let query = supabase
          .from('payments')
          .select('amount, payment_method')
          .eq('org_id', orgId)
          .eq('status', 'completed')
          .gte('created_at', from.toISOString())
          .lt('created_at', to.toISOString())

        if (parkingId) {
          const { data: sessionIds } = await supabase
            .from('sessions')
            .select('id')
            .eq('parking_id', parkingId)
          const ids = sessionIds?.map(s => s.id) || []
          if (ids.length > 0) {
            query = query.in('session_id', ids)
          } else {
            query = query.eq('session_id', '00000000-0000-0000-0000-000000000000')
          }
        }

        const { data: payments, error } = await query
        if (error) throw new Error(error.message)

        const byMethod: Record<string, { amount: number; count: number }> = {
          cash: { amount: 0, count: 0 },
          card: { amount: 0, count: 0 },
          qr_payment: { amount: 0, count: 0 },
        }

        payments?.forEach((p: { amount: number; payment_method: string }) => {
          const method = (p.payment_method || 'cash') as keyof typeof byMethod
          if (!byMethod[method]) byMethod[method] = { amount: 0, count: 0 }
          byMethod[method].amount += Number(p.amount || 0)
          byMethod[method].count += 1
        })

        const totalAmount = Object.values(byMethod).reduce((s, x) => s + x.amount, 0)
        const labels: Record<string, string> = {
          cash: 'Efectivo',
          card: 'Tarjeta',
          qr_payment: 'QR / App',
        }
        const result: PaymentMethodBreakdown[] = Object.entries(byMethod)
          .filter(([, v]) => v.amount > 0 || v.count > 0)
          .map(([method, v]) => ({
            method: method as PaymentMethodBreakdown['method'],
            label: labels[method] || method,
            amount: v.amount,
            count: v.count,
            volumePercent: totalAmount > 0 ? (v.amount / totalAmount) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount)

        setBreakdown(result)
        setTotal(totalAmount)
      } catch (err) {
        console.error('Error payment breakdown:', err)
        setBreakdown([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }
    fetchBreakdown()
    const interval = setInterval(fetchBreakdown, 60000)
    return () => clearInterval(interval)
  }, [orgId, parkingId, dateFrom?.getTime(), dateTo?.getTime()])

  return { breakdown, total, loading }
}
