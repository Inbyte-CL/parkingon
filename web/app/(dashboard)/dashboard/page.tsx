'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import type { DateRange } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import { useUser } from '@/lib/hooks/useUser'
import { useDashboardMetrics } from '@/lib/hooks/useDashboardMetrics'
import { useParkings } from '@/lib/hooks/useParkings'
import { usePaymentBreakdown } from '@/lib/hooks/usePaymentBreakdown'
import { useParkingRevenue } from '@/lib/hooks/useParkingRevenue'
import { formatCLP } from '@/lib/utils/currency'

type RevenuePeriod = 'today' | '7d' | '1m' | 'range'

export default function DashboardPage() {
  const { userInfo } = useUser()
  const [selectedParkingId, setSelectedParkingId] = useState<string>('')
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('1m')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [showCalendar, setShowCalendar] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (revenuePeriod !== 'range') setShowCalendar(false)
  }, [revenuePeriod])

  useEffect(() => {
    if (!showCalendar) return
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCalendar])

  const { parkings, loading: parkingsLoading } = useParkings(userInfo?.orgId)
  const { metrics, loading: metricsLoading } = useDashboardMetrics(userInfo?.orgId || undefined, selectedParkingId || undefined)

  const chartDateRange = useMemo(() => {
    const now = new Date()
    let dateFrom: Date | undefined
    let dateTo: Date | undefined
    switch (revenuePeriod) {
      case 'today':
        dateFrom = new Date(now); dateFrom.setHours(0, 0, 0, 0)
        dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999)
        break
      case '7d':
        dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - 7); dateFrom.setHours(0, 0, 0, 0)
        dateTo = new Date(now); dateTo.setHours(23, 59, 59, 999)
        break
      case 'range':
        if (dateRange?.from && dateRange?.to) {
          dateFrom = new Date(dateRange.from); dateFrom.setHours(0, 0, 0, 0)
          dateTo = new Date(dateRange.to); dateTo.setHours(23, 59, 59, 999)
          if (dateFrom.getTime() > dateTo.getTime()) [dateFrom, dateTo] = [dateTo, dateFrom]
        }
        break
      default:
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1); dateFrom.setHours(0, 0, 0, 0)
        dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0); dateTo.setHours(23, 59, 59, 999)
    }
    if (!dateFrom || !dateTo) {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1); dateFrom.setHours(0, 0, 0, 0)
      dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0); dateTo.setHours(23, 59, 59, 999)
    }
    return { dateFrom, dateTo }
  }, [revenuePeriod, dateRange?.from, dateRange?.to])

  const { breakdown, loading: breakdownLoading } = usePaymentBreakdown(
    userInfo?.orgId || undefined,
    selectedParkingId || undefined,
    chartDateRange.dateFrom,
    chartDateRange.dateTo
  )

  const { revenueData, loading: revenueLoading } = useParkingRevenue(
    userInfo?.orgId,
    selectedParkingId || undefined,
    chartDateRange.dateFrom,
    chartDateRange.dateTo
  )

  const maxRevenue = revenueData.length > 0 ? Math.max(...revenueData.map((d) => Number(d.revenue) || 0), 1) : 1
  const totalRevenuePeriod = revenueData.reduce((s, d) => s + (Number(d.revenue) || 0), 0)

  const selectedParking = selectedParkingId ? parkings.find(p => p.id === selectedParkingId) : null
  const lastUpdated = typeof window !== 'undefined' ? 'Hace 1 min' : '—'
  const occupancyPct = Math.min(100, Math.max(0, Number(metrics?.totalOccupancy?.occupancyPercentage ?? 0)))

  const paymentMethodIcons: Record<string, string> = {
    cash: 'payments',
    card: 'credit_card',
    qr_payment: 'smartphone',
  }
  const paymentMethodColors: Record<string, string> = {
    cash: 'bg-amber-500',
    card: 'bg-blue-500',
    qr_payment: 'bg-primary',
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <select
              value={selectedParkingId}
              onChange={(e) => setSelectedParkingId(e.target.value)}
              disabled={parkingsLoading || !(userInfo?.role === 'superadmin' || userInfo?.role === 'admin_empresa')}
              className="w-72 bg-white border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm disabled:opacity-60"
            >
              <option value="">Todos los parkings</option>
              {parkings.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
          </div>
          <span className="text-slate-400 text-sm font-medium">Actualizado: {lastUpdated}</span>
        </div>
        <div className="flex gap-3">
          <a
            href="/dashboard/history"
            className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-dark text-sidebar-bg font-bold text-sm rounded-xl transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-icons text-lg">add</span>
            Ver historial
          </a>
          <button type="button" className="flex items-center justify-center p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
            <span className="material-icons">filter_list</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600 text-2xl">payments</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">Hoy</span>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Ingresos de hoy</p>
          <h2 className="text-3xl font-bold mt-2 text-slate-900">
            {metricsLoading ? '—' : formatCLP(metrics?.todayRevenue ?? 0)}
          </h2>
        </div>

        <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-500 text-2xl">account_balance_wallet</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Mes actual</span>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Ingresos totales</p>
          <h2 className="text-3xl font-bold mt-2 text-slate-900">
            {metricsLoading ? '—' : formatCLP(metrics?.monthRevenue ?? 0)}
          </h2>
        </div>

        <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-500 text-2xl">check_circle</span>
            </div>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Sesiones completadas (hoy)</p>
          <h2 className="text-3xl font-bold mt-2 text-slate-900">
            {metricsLoading ? '—' : (metrics?.todaySessions ?? 0)}
          </h2>
        </div>

        <div className="bg-white border border-primary/30 ring-1 ring-primary/5 shadow-sm rounded-2xl p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-500 text-2xl">directions_car</span>
            </div>
            <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-primary font-bold uppercase">En vivo</span>
            </div>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Ocupación %</p>
          <div className="flex items-end gap-3 mt-2">
            <h2 className="text-3xl font-bold text-slate-900">{metricsLoading ? '—' : `${occupancyPct.toFixed(0)}%`}</h2>
            <div className="flex-1 min-w-[60px] h-2.5 mb-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-300"
                style={{ width: `${occupancyPct}%`, minWidth: occupancyPct > 0 ? 6 : 0 }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Live Operations */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Operación en vivo</h3>
          <div className="h-px w-full bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Parkings activos</p>
              <p className="text-3xl font-bold text-slate-900">{metricsLoading ? '—' : (metrics?.activeParkings ?? 0)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-2xl">local_parking</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Vehículos estacionados</p>
              <p className="text-3xl font-bold text-slate-900">{metricsLoading ? '—' : (metrics?.activeSessions ?? 0)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-orange-500 text-2xl">directions_car</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Turnos activos</p>
              <p className="text-3xl font-bold text-slate-900">{metricsLoading ? '—' : (metrics?.activeShifts ?? 0)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-blue-500 text-2xl">schedule</span>
            </div>
          </div>
        </div>
      </section>

      {/* Ventas por parking (barras) + Desglose */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card-surface p-8 shadow-md">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Comparación por ubicación</h3>
              <p className="text-sm text-slate-500 mt-1">
                Rendimiento de ventas por instalación
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Ingresos</span>
              </div>
              <button type="button" className="ml-4 p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors" aria-label="Más opciones">
                <span className="material-icons text-xl">more_horiz</span>
              </button>
              <div className="flex flex-wrap items-center gap-2 ml-2">
                <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  {(['today', '7d', '1m', 'range'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setRevenuePeriod(p)}
                      className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors ${revenuePeriod === p ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {p === 'today' ? 'Hoy' : p === '7d' ? '7D' : p === '1m' ? '1M' : 'Rango'}
                    </button>
                  ))}
                </div>
                {revenuePeriod === 'range' && (
                  <div className="relative inline-block" ref={calendarRef}>
                    {!showCalendar ? (
                      <button
                        type="button"
                        onClick={() => setShowCalendar(true)}
                        className="px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
                      >
                        {dateRange?.from && dateRange?.to
                          ? `${dateRange.from.toLocaleDateString('es-CL')} – ${dateRange.to.toLocaleDateString('es-CL')}`
                          : 'Seleccionar fechas'}
                      </button>
                    ) : (
                      <div className="absolute top-full left-0 z-50 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-4">
                        <DayPicker
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          defaultMonth={dateRange?.from ?? dateRange?.to ?? new Date()}
                          numberOfMonths={1}
                          locale={es}
                          classNames={{
                            root: 'rdp',
                            month: 'space-y-3',
                            month_caption: 'flex justify-center items-center gap-2 text-sm font-bold text-slate-700 mb-2',
                            nav: 'flex gap-1',
                            button_previous: 'rounded-lg p-2 hover:bg-slate-100 text-slate-600',
                            button_next: 'rounded-lg p-2 hover:bg-slate-100 text-slate-600',
                            weekdays: 'flex',
                            weekday: 'w-9 text-center text-[11px] font-medium text-slate-500',
                            weeks: 'flex flex-col gap-0.5',
                            week: 'flex',
                            day: 'w-9 h-9 rounded-lg text-sm flex items-center justify-center text-slate-800',
                            day_button: 'w-full h-full rounded-lg hover:bg-slate-100',
                            selected: '!bg-slate-300 !text-slate-900 hover:!bg-slate-300',
                            range_start: '!bg-slate-300 !text-slate-900 rounded-l-lg',
                            range_end: '!bg-slate-300 !text-slate-900 rounded-r-lg',
                            range_middle: '!bg-slate-200 !text-slate-900',
                            today: 'font-bold text-primary',
                            outside: 'text-slate-300',
                            disabled: 'text-slate-300 opacity-50',
                            hidden: 'invisible',
                          }}
                        />
                        <div className="flex justify-end pt-3 mt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setShowCalendar(false)}
                            className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                          >
                            Aplicar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {revenueLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-10 bg-slate-50 rounded-xl border border-slate-100" />
                  </div>
                ))}
              </div>
            ) : revenueData.length > 0 ? (
              revenueData.map((row, index) => {
                const revenueNum = Number(row.revenue) || 0
                const pct = maxRevenue > 0 ? (revenueNum / maxRevenue) * 100 : 0
                const barWidth = revenueNum > 0 ? Math.max(8, Math.min(100, pct)) : 0
                const isTop = index === 0 && revenueNum > 0
                return (
                  <div key={row.parkingId} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{row.parkingName}</h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {row.sessions} sesión{row.sessions !== 1 ? 'es' : ''} • Total {formatCLP(revenueNum)}
                        </p>
                      </div>
                      <span className="text-lg font-black text-slate-700">
                        {formatCLP(revenueNum)}
                      </span>
                    </div>
                    <div className="relative h-7 w-full bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                      <div
                        className="absolute inset-y-0 left-0 rounded-r-xl"
                        style={{
                          width: `${barWidth}%`,
                          minWidth: revenueNum > 0 ? 8 : 0,
                          backgroundColor: revenueNum > 0 ? '#21de92' : 'transparent',
                        }}
                      />
                      {isTop && (
                        <div className="absolute inset-0 flex items-center justify-end px-4">
                          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                            Mayor venta
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-16 text-center text-slate-500 text-sm rounded-xl bg-slate-50 border border-slate-100">
                Sin ventas en el período seleccionado
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-8 shadow-md flex flex-col">
          {/* Datos generales del período (arriba) — protagonismo con verde */}
          <div className="pb-6 mb-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Resumen del período</h3>
              <a
                href="/dashboard/history"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <span className="material-icons text-base">download</span>
                Descargar informe
              </a>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {/* Total período */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex gap-3 w-full sm:min-w-[200px] sm:flex-1 sm:max-w-[240px]">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="material-icons text-emerald-600 text-xl">payments</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-widest block mb-1">Total período</span>
                  <span className="text-sm font-black text-emerald-800 tabular-nums break-all">{formatCLP(totalRevenuePeriod)}</span>
                </div>
              </div>
              {/* Sesiones */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex gap-3 w-full sm:min-w-[200px] sm:flex-1 sm:max-w-[240px]">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="material-icons text-emerald-600 text-xl">receipt_long</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-widest block mb-1">Sesiones</span>
                  <span className="text-sm font-bold text-emerald-800 tabular-nums">{revenueData.reduce((s, d) => s + d.sessions, 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desglose por método de pago (abajo) */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Desglose por método de pago</h3>
              <a href="/dashboard/history" className="text-xs text-primary font-bold cursor-pointer hover:text-primary-dark transition-colors border-b border-primary/30">
                Ver análisis
              </a>
            </div>
            <div className="space-y-8">
            {breakdownLoading ? (
              <div className="animate-pulse space-y-6">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-xl" />)}
              </div>
            ) : breakdown.length > 0 ? (
              breakdown.map((item) => (
                <div key={item.method} className="group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.method === 'card' ? 'bg-blue-50' : item.method === 'qr_payment' ? 'bg-primary/10' : 'bg-amber-50'}`}>
                        <span className={`material-icons text-xl ${item.method === 'card' ? 'text-blue-500' : item.method === 'qr_payment' ? 'text-primary' : 'text-amber-500'}`}>
                          {paymentMethodIcons[item.method]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.label}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{item.volumePercent.toFixed(0)}% del total</p>
                      </div>
                    </div>
                    <span className="text-base font-black text-slate-900">{formatCLP(item.amount)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${paymentMethodColors[item.method]}`} style={{ width: `${item.volumePercent}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Sin pagos en el período</p>
            )}
            </div>
          </div>
          <div className="mt-10 p-5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-start gap-3">
              <span className="material-icons text-slate-400 text-sm mt-0.5">info</span>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Estado del sistema: {metrics?.activeParkings ? 'Operativo' : 'Sin parkings activos'}. 
                {metrics?.activeShifts !== undefined && ` ${metrics.activeShifts} turno(s) abierto(s).`}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
