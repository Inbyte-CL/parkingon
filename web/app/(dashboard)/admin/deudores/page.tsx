'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { authFetch } from '@/lib/api/authFetch'
import { formatCLP } from '@/lib/utils/currency'

interface DebtRow {
  id: string
  plate: string
  amount_owed: number
  tariff_plan_name: string | null
  price_per_minute: number | null
  abandoned_at: string
  status: string
  parking: { id: string; name: string } | null
}

interface Debtor {
  plate: string
  total_owed: number
  parking_name: string
  debts: DebtRow[]
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function plateDisplay(plate: string) {
  if (/^[A-Z]{4}\d{2}$/.test(plate)) return `${plate.slice(0, 4)}-${plate.slice(4)}`
  if (/^[A-Z]{2}\d{4}$/.test(plate)) return `${plate.slice(0, 2)}-${plate.slice(2)}`
  return plate
}

export default function DeudoresPage() {
  const { userInfo, loading: userLoading } = useUser()
  const isSuperadmin = userInfo?.role === 'superadmin'
  const isAdmin = userInfo?.role === 'admin_empresa' || isSuperadmin

  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  // Para superadmin: lista de organizaciones y org seleccionada
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')

  const fetchDebtors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Para superadmin sin orgId seleccionado, no cargar nada todavía
      const effectiveOrgId = userInfo?.orgId || selectedOrgId
      if (isSuperadmin && !effectiveOrgId) {
        setDebtors([])
        setLoading(false)
        return
      }
      const orgParam = isSuperadmin ? `?orgId=${effectiveOrgId}` : ''
      const res = await authFetch(`/api/admin/debtors${orgParam}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al cargar deudores')
      setDebtors(data.debtors ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [isSuperadmin, userInfo?.orgId, selectedOrgId])

  useEffect(() => {
    if (!userLoading && isAdmin) fetchDebtors()
  }, [userLoading, isAdmin, fetchDebtors])

  // Cargar organizaciones si es superadmin
  useEffect(() => {
    if (userLoading || !isSuperadmin) return
    authFetch('/api/admin/organizations')
      .then((r) => r.json())
      .then((d) => setOrgs(d.organizations ?? []))
      .catch(() => {})
  }, [userLoading, isSuperadmin])

  // Superadmin: recargar al elegir organización
  useEffect(() => {
    if (!isSuperadmin || !selectedOrgId || userLoading) return
    fetchDebtors()
  }, [selectedOrgId, isSuperadmin, userLoading, fetchDebtors])

  const runMarkAbandoned = async () => {
    setRunning(true)
    setRunResult(null)
    try {
      const res = await authFetch('/api/admin/debtors', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      const r = data.result?.[0]
      setRunResult(`Sesiones cerradas: ${r?.sessions_marked ?? 0} — Deudas creadas: ${r?.debts_created ?? 0}`)
      fetchDebtors()
    } catch (e: any) {
      setRunResult(`Error: ${e.message}`)
    } finally {
      setRunning(false)
    }
  }

  const waiveDebt = async (debtId: string) => {
    if (!confirm('¿Condonar esta deuda? No se podrá deshacer.')) return
    const res = await authFetch(`/api/admin/debtors?id=${debtId}`, { method: 'DELETE' })
    if (res.ok) fetchDebtors()
    else {
      const d = await res.json()
      alert(d.error ?? 'Error al condonar')
    }
  }

  if (userLoading) return <div className="p-8 text-slate-500">Cargando...</div>
  if (!isAdmin) return <div className="p-8 text-red-600">Sin acceso a esta sección.</div>

  const totalDebt = debtors.reduce((sum, d) => sum + d.total_owed, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deudores</h1>
          <p className="text-sm text-slate-500 mt-1">
            Vehículos que quedaron estacionados sin pagar al cierre del día. Al abrir esta página se sincronizan automáticamente.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchDebtors}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Actualizar
          </button>
          <button
            onClick={runMarkAbandoned}
            disabled={running}
            className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {running ? 'Procesando…' : 'Sincronizar deudores'}
          </button>
        </div>
      </div>

      {runResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
          {runResult}
        </div>
      )}

      {/* Selector de organización para superadmin */}
      {isSuperadmin && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-700">Organización:</label>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
          >
            <option value="">— Seleccionar —</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          {selectedOrgId && (
            <button
              onClick={fetchDebtors}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90"
            >
              Ver deudores
            </button>
          )}
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Total adeudado</p>
          <p className="text-3xl font-extrabold text-red-700 mt-1">{formatCLP(totalDebt)}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Patentes deudoras</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{debtors.length}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Registros de deuda</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">
            {debtors.reduce((s, d) => s + d.debts.length, 0)}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-400">Cargando deudores…</div>
      ) : debtors.length === 0 ? (
        <div className="text-center py-16">
          <span className="material-icons text-5xl text-slate-300">check_circle</span>
          <p className="mt-4 text-slate-500 text-lg font-semibold">Sin deudores activos</p>
          <p className="text-slate-400 text-sm">No hay vehículos con deuda pendiente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {debtors.map((debtor) => (
            <div key={debtor.plate} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded((p) => ({ ...p, [debtor.plate]: !p[debtor.plate] }))}
              >
                <div className="flex items-center gap-4">
                  {/* Patente */}
                  <div className="bg-slate-900 text-white font-mono font-extrabold text-lg px-4 py-1.5 rounded-lg tracking-wider border-2 border-slate-700">
                    {plateDisplay(debtor.plate)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{debtor.parking_name}</p>
                    <p className="text-xs text-slate-400">{debtor.debts.length} registro{debtor.debts.length !== 1 ? 's' : ''} de deuda</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs font-bold text-red-500 uppercase">Total adeudado</p>
                    <p className="text-2xl font-extrabold text-red-600">{formatCLP(debtor.total_owed)}</p>
                  </div>
                  <span className="material-icons text-slate-400">
                    {expanded[debtor.plate] ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
              </div>

              {expanded[debtor.plate] && (
                <div className="border-t border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-2 text-left text-xs font-bold text-slate-500 uppercase">Tarifa</th>
                        <th className="px-6 py-2 text-left text-xs font-bold text-slate-500 uppercase">Abandonó</th>
                        <th className="px-6 py-2 text-right text-xs font-bold text-slate-500 uppercase">Monto</th>
                        <th className="px-6 py-2 text-right text-xs font-bold text-slate-500 uppercase">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debtor.debts.map((debt) => (
                        <tr key={debt.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-6 py-3 text-slate-700">
                            {debt.tariff_plan_name ?? '–'}
                            {debt.price_per_minute != null && (
                              <span className="ml-2 text-xs text-slate-400">{formatCLP(debt.price_per_minute)}/min</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-slate-500">{formatDateTime(debt.abandoned_at)}</td>
                          <td className="px-6 py-3 text-right font-bold text-red-600">{formatCLP(debt.amount_owed)}</td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => waiveDebt(debt.id)}
                              className="text-xs text-slate-400 hover:text-red-500 underline underline-offset-2"
                            >
                              Condonar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td colSpan={2} className="px-6 py-2 text-xs font-bold text-slate-500 uppercase">Total</td>
                        <td className="px-6 py-2 text-right font-extrabold text-red-600 text-base">{formatCLP(debtor.total_owed)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
