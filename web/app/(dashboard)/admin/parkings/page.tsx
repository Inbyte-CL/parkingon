'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useOrganizations } from '@/lib/hooks/useOrganizations'
import CreateParkingModal from '@/components/CreateParkingModal'
import EditParkingModal from '@/components/EditParkingModal'
import { formatCLP } from '@/lib/utils/currency'

interface Parking {
  id: string
  org_id: string
  name: string
  address: string | null
  status: 'active' | 'inactive'
  total_spaces: number | null
  max_daily_amount: number | null
  pricing_mode?: 'per_minute' | 'per_segment' | null
  segment_amount?: number | null
  segment_minutes?: number | null
  created_at: string
  updated_at: string
  organizations?: { name: string }
  active_tariff?: {
    id: string
    price_per_minute: number
  } | null
}


export default function ParkingsPage() {
  const { userInfo } = useUser()
  const { organizations } = useOrganizations()
  const [parkings, setParkings] = useState<Parking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingParking, setEditingParking] = useState<Parking | null>(null)
  const [filterOrgId, setFilterOrgId] = useState<string>('')
  
  const isSuperadmin = userInfo?.role === 'superadmin'
  const isAdminEmpresa = userInfo?.role === 'admin_empresa'
  const canAccess = isSuperadmin || isAdminEmpresa

  const fetchParkings = async () => {
    if (!canAccess) return
    
    try {
      setLoading(true)
      // Si es admin_empresa, usar su orgId automáticamente
      const orgIdToUse = isAdminEmpresa && userInfo?.orgId 
        ? userInfo.orgId 
        : filterOrgId || undefined
      
      const url = orgIdToUse
        ? `/api/admin/parkings?orgId=${orgIdToUse}`
        : '/api/admin/parkings'
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Error al cargar parkings')
        setLoading(false)
        return
      }

      const data = await response.json()
      setParkings(data.parkings || [])
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al cargar parkings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canAccess) {
      fetchParkings()
    }
  }, [canAccess, filterOrgId, userInfo?.orgId])

  const handleDelete = async (parkingId: string) => {
    if (!confirm('¿Estás seguro de desactivar este parking?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/parkings/${parkingId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(`Error: ${errorData.error}`)
        return
      }

      fetchParkings()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Acceso Denegado</h2>
          <p className="text-red-600">Solo los administradores pueden acceder a esta página.</p>
        </div>
      </div>
    )
  }

  if (loading && parkings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando parkings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Administración de Parkings
            </h1>
            {isSuperadmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
              >
                + Crear Parking
              </button>
            )}
          </div>

          {/* Filtro por organización - Solo para superadmin */}
          {isSuperadmin && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Organización
              </label>
              <select
                value={filterOrgId}
                onChange={(e) => setFilterOrgId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todas las organizaciones</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {isAdminEmpresa && userInfo?.organizationName && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Organización:</span> {userInfo.organizationName}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organización
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dirección
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Capacidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarifa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tope máx.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parkings.map((parking) => (
                    <tr key={parking.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{parking.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {(parking.organizations as any)?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{parking.address || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {parking.total_spaces !== null ? parking.total_spaces : 'Sin límite'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {parking.pricing_mode === 'per_segment' && parking.segment_amount != null && parking.segment_minutes != null
                            ? `${formatCLP(parking.segment_amount)} cada ${parking.segment_minutes} min`
                            : parking.active_tariff
                              ? `${formatCLP(parking.active_tariff.price_per_minute)}/min`
                              : <span className="text-gray-400">Sin tarifa</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {parking.max_daily_amount != null ? formatCLP(parking.max_daily_amount) : <span className="text-gray-400">Sin tope</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          parking.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {parking.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditingParking(parking)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            Editar
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleDelete(parking.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            {parking.status === 'active' ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <CreateParkingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchParkings()
          setShowCreateModal(false)
        }}
      />

      <EditParkingModal
        isOpen={editingParking !== null}
        onClose={() => setEditingParking(null)}
        onSuccess={() => {
          fetchParkings()
          setEditingParking(null)
        }}
        parking={editingParking}
      />
    </div>
  )
}
