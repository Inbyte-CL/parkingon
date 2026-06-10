'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useOrganizations } from '@/lib/hooks/useOrganizations'
import { authFetch } from '@/lib/api/authFetch'

interface AgreementPlate {
  id: string
  org_id: string
  plate: string
  label: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  organizations?: { name: string } | null
}

function formatPlateDisplay(plate: string): string {
  const p = plate.replace(/\s/g, '').toUpperCase()
  if (p.length <= 4) return p
  return `${p.slice(0, 4)}-${p.slice(4)}`
}

export default function ConveniosPage() {
  const { userInfo } = useUser()
  const { organizations } = useOrganizations()
  const [agreements, setAgreements] = useState<AgreementPlate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterOrgId, setFilterOrgId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [plateInput, setPlateInput] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isSuperadmin = userInfo?.role === 'superadmin'
  const isAdminEmpresa = userInfo?.role === 'admin_empresa'
  const canAccess = isSuperadmin || isAdminEmpresa

  const effectiveOrgId =
    isAdminEmpresa && userInfo?.orgId ? userInfo.orgId : filterOrgId || undefined

  const fetchAgreements = useCallback(async () => {
    if (!canAccess || !effectiveOrgId) {
      setAgreements([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await authFetch(`/api/admin/agreements?orgId=${effectiveOrgId}`)
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Error al cargar convenios')
        return
      }
      const data = await response.json()
      setAgreements((data.agreements || []).filter((a: AgreementPlate) => a.is_active))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar convenios')
    } finally {
      setLoading(false)
    }
  }, [canAccess, effectiveOrgId])

  useEffect(() => {
    fetchAgreements()
  }, [fetchAgreements])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!effectiveOrgId || !plateInput.trim()) return

    setSaving(true)
    try {
      const response = await authFetch('/api/admin/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: effectiveOrgId,
          plate: plateInput.trim(),
          label: labelInput.trim() || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        alert(data.error || 'Error al registrar patente')
        return
      }
      setShowModal(false)
      setPlateInput('')
      setLabelInput('')
      fetchAgreements()
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('¿Quitar esta patente del convenio?')) return
    setDeletingId(id)
    try {
      const response = await authFetch(`/api/admin/agreements/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Error al eliminar')
        return
      }
      fetchAgreements()
    } finally {
      setDeletingId(null)
    }
  }

  if (!canAccess) {
    return (
      <div className="p-10 text-slate-600">
        No tienes permisos para acceder a esta sección.
      </div>
    )
  }

  return (
    <div className="p-10 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Convenios</h1>
          <p className="text-slate-600 mt-1 text-sm">
            Patentes con pago liberado. Al ingresar y salir se imprime comprobante sin cobro.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={!effectiveOrgId}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          <span className="material-icons text-lg">add</span>
          Registrar patente
        </button>
      </div>

      {isSuperadmin && (
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Organización
          </label>
          <select
            value={filterOrgId}
            onChange={(e) => setFilterOrgId(e.target.value)}
            className="w-full max-w-md border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white"
          >
            <option value="">Selecciona organización</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!effectiveOrgId && isSuperadmin && (
        <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm mb-6">
          Selecciona una organización para ver y registrar patentes en convenio.
        </p>
      )}

      {error && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : effectiveOrgId && agreements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          No hay patentes en convenio. Registra la primera patente.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-slate-700">Patente</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-700">Referencia</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-700">Registro</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {agreements.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900 tracking-wide">
                    {formatPlateDisplay(row.plate)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{row.label || '—'}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(row.created_at).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeactivate(row.id)}
                      disabled={deletingId === row.id}
                      className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                    >
                      {deletingId === row.id ? 'Eliminando…' : 'Quitar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Registrar patente en convenio</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Patente</label>
                <input
                  type="text"
                  value={plateInput}
                  onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                  placeholder="ABCD12"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-mono uppercase"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Referencia (opcional)
                </label>
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="Ej: Personal Franklin"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
