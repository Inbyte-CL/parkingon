'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { authFetch } from '@/lib/api/authFetch'
import CreateOrganizationModal from '@/components/CreateOrganizationModal'
import EditOrganizationModal from '@/components/EditOrganizationModal'

interface Organization {
  id: string
  name: string
  slug: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export default function OrganizationsPage() {
  const { userInfo, loading: userLoading } = useUser()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isSuperadmin = userInfo?.role === 'superadmin'

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await authFetch('/api/admin/organizations')

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Error al cargar organizaciones')
        return
      }

      const data = await response.json()
      setOrganizations(data.organizations || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar organizaciones'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isSuperadmin) {
      fetchOrganizations()
    } else if (!userLoading) {
      setLoading(false)
    }
  }, [isSuperadmin, userLoading, fetchOrganizations])

  const handleToggleStatus = async (org: Organization) => {
    const newStatus = org.status === 'active' ? 'inactive' : 'active'
    const action = newStatus === 'inactive' ? 'desactivar' : 'reactivar'
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} la organización "${org.name}"?`)) {
      return
    }

    try {
      const response = await authFetch(`/api/admin/organizations/${org.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(`Error: ${errorData.error}`)
        return
      }

      fetchOrganizations()
    } catch (err: unknown) {
      alert(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    }
  }

  const handleDelete = async (org: Organization) => {
    const message =
      `¿Eliminar permanentemente "${org.name}"?\n\n` +
      'Se borrarán parkings, usuarios, turnos, sesiones, pagos y el resto de datos asociados. ' +
      'Esta acción no se puede deshacer.'

    if (!confirm(message)) {
      return
    }

    try {
      setDeletingId(org.id)
      const response = await authFetch(`/api/admin/organizations/${org.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(`Error: ${errorData.error}`)
        return
      }

      fetchOrganizations()
    } catch (err: unknown) {
      alert(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    } finally {
      setDeletingId(null)
    }
  }

  if (userLoading || (loading && isSuperadmin)) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-slate-600">Cargando organizaciones...</p>
        </div>
      </div>
    )
  }

  if (!isSuperadmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
        <h2 className="text-red-800 font-semibold mb-2">Acceso denegado</h2>
        <p className="text-red-600 text-sm">
          Solo los superadmins pueden administrar organizaciones. Si acabas de iniciar sesión, verifica que tu usuario tenga{' '}
          <code className="text-xs bg-red-100 px-1 rounded">is_superadmin: true</code> en Supabase Auth.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-lg">
        <h2 className="text-red-800 font-semibold mb-2">Error</h2>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          type="button"
          onClick={fetchOrganizations}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organizaciones</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona empresas y municipalidades. Puedes editar, desactivar o eliminar cada una.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:opacity-90 text-sm font-semibold shrink-0"
        >
          <span className="material-icons text-lg">add</span>
          Crear organización
        </button>
      </div>

      {organizations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <span className="material-icons text-5xl text-slate-300">business</span>
          <p className="mt-4 text-slate-600 font-medium">No hay organizaciones</p>
          <p className="text-sm text-slate-400 mt-1">Crea la primera con el botón de arriba.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase min-w-[280px]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-4 text-sm font-medium text-slate-900">{org.name}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{org.slug}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          org.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {org.status === 'active' ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingOrg(org)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50"
                        >
                          <span className="material-icons text-base">edit</span>
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(org)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-medium hover:bg-amber-100"
                        >
                          <span className="material-icons text-base">
                            {org.status === 'active' ? 'pause_circle' : 'play_circle'}
                          </span>
                          {org.status === 'active' ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(org)}
                          disabled={deletingId === org.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
                        >
                          <span className="material-icons text-base">delete</span>
                          {deletingId === org.id ? 'Eliminando…' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateOrganizationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchOrganizations()
          setShowCreateModal(false)
        }}
      />

      <EditOrganizationModal
        isOpen={editingOrg !== null}
        onClose={() => setEditingOrg(null)}
        onSuccess={() => {
          fetchOrganizations()
          setEditingOrg(null)
        }}
        organization={editingOrg}
      />
    </div>
  )
}
