'use client'

import { useState, useEffect } from 'react'
import { useOrganizations } from '@/lib/hooks/useOrganizations'
import { useParkings } from '@/lib/hooks/useParkings'
import { useUser } from '@/lib/hooks/useUser'

interface UserWithRole {
  user_id: string
  email: string
  display_name: string | null
  role: string | null
  org_id: string | null
  parking_id: string | null
  is_superadmin: boolean
}

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: UserWithRole | null
}

export default function EditUserModal({
  isOpen,
  onClose,
  onSuccess,
  user
}: EditUserModalProps) {
  const { userInfo } = useUser()
  const isAdminEmpresa = userInfo?.role === 'admin_empresa'
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    role: 'operador' as 'operador' | 'admin_empresa',
    orgId: '',
    parkingId: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { organizations, loading: orgsLoading } = useOrganizations()
  const { parkings, loading: parkingsLoading } = useParkings(formData.orgId)

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        displayName: user.display_name || '',
        role: (user.is_superadmin ? 'superadmin' : (user.role || 'operador')) as 'operador' | 'admin_empresa',
        orgId: user.org_id || '',
        parkingId: user.parking_id || ''
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!user) return

    try {
      const response = await fetch(`/api/admin/users/${user.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          displayName: formData.displayName || null,
          role: formData.role,
          orgId: formData.orgId,
          parkingId: formData.role === 'operador' ? formData.parkingId : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar usuario')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al actualizar usuario')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !user) return null

  // No permitir editar superadmins
  if (user.is_superadmin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Editar Usuario</h2>
          <p className="text-gray-600 mb-4">
            Los superadmins no pueden ser editados desde esta interfaz.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Editar Usuario</h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="usuario@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre para mostrar
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol *
            </label>
            <select
              required
              value={formData.role}
              onChange={(e) => setFormData({ 
                ...formData, 
                role: e.target.value as 'operador' | 'admin_empresa',
                parkingId: e.target.value === 'admin_empresa' ? '' : formData.parkingId
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="operador">Operador (App móvil)</option>
              <option value="admin_empresa">Administrador (Web)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organización *
            </label>
            <select
              required
              value={formData.orgId}
              onChange={(e) => setFormData({ ...formData, orgId: e.target.value, parkingId: '' })}
              disabled={orgsLoading || isAdminEmpresa}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              <option value="">Seleccionar organización</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            {isAdminEmpresa && (
              <p className="text-xs text-gray-500 mt-1">No puedes cambiar la organización</p>
            )}
          </div>

          {formData.role === 'operador' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parking asignado *
              </label>
              <select
                required={formData.role === 'operador'}
                value={formData.parkingId}
                onChange={(e) => setFormData({ ...formData, parkingId: e.target.value })}
                disabled={parkingsLoading || !formData.orgId}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              >
                <option value="">Seleccionar parking</option>
                {parkings.map((parking) => (
                  <option key={parking.id} value={parking.id}>
                    {parking.name}
                  </option>
                ))}
              </select>
              {!formData.orgId && (
                <p className="text-xs text-gray-500 mt-1">Primero selecciona una organización</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
