'use client'

import { useState, useEffect } from 'react'
import { useOrganizations } from '@/lib/hooks/useOrganizations'
import { useParkings } from '@/lib/hooks/useParkings'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultOrgId?: string
}

export default function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  defaultOrgId
}: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'operador' as 'operador' | 'admin_empresa',
    orgId: defaultOrgId || '',
    parkingId: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { organizations, loading: orgsLoading } = useOrganizations()
  const { parkings, loading: parkingsLoading } = useParkings(formData.orgId)

  useEffect(() => {
    if (defaultOrgId) {
      setFormData(prev => ({ ...prev, orgId: defaultOrgId }))
    }
  }, [defaultOrgId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName || null,
          role: formData.role,
          orgId: formData.orgId,
          parkingId: formData.role === 'operador' ? formData.parkingId : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario')
      }

      // Reset form
      setFormData({
        email: '',
        password: '',
        displayName: '',
        role: 'operador',
        orgId: defaultOrgId || '',
        parkingId: ''
      })
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Crear Usuario</h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              disabled={orgsLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              <option value="">{orgsLoading ? 'Cargando organizaciones...' : 'Seleccionar organización'}</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            {organizations.length === 0 && !orgsLoading && (
              <p className="text-xs text-red-600 mt-1">No hay organizaciones disponibles. Verifica los permisos.</p>
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
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
