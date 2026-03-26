'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useOrganizations } from '@/lib/hooks/useOrganizations'
import { useParkings } from '@/lib/hooks/useParkings'
import CreateTariffModal from '@/components/CreateTariffModal'
import EditTariffModal from '@/components/EditTariffModal'
import { formatCLP } from '@/lib/utils/currency'

interface Tariff {
  id: string
  org_id: string
  parking_id: string | null
  price_per_minute: number
  valid_from: string
  valid_until: string | null
  created_at: string
  organizations?: { name: string }
  parkings?: { name: string } | null
}

export default function TariffsPage() {
  const { userInfo } = useUser()
  const { organizations } = useOrganizations()
  const [parkings, setParkings] = useState<any[]>([])
  const [tariffs, setTariffs] = useState<Tariff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null)
  const [filterOrgId, setFilterOrgId] = useState<string>('')
  const [filterParkingId, setFilterParkingId] = useState<string>('')
  
  const isSuperadmin = userInfo?.role === 'superadmin'
  const { parkings: parkingsList } = useParkings(filterOrgId || undefined)

  useEffect(() => {
    setParkings(parkingsList)
  }, [parkingsList])

  const fetchTariffs = async () => {
    try {
      setLoading(true)
      let url = '/api/admin/tariffs'
      const params = new URLSearchParams()
      if (filterOrgId) params.append('orgId', filterOrgId)
      if (filterParkingId) params.append('parkingId', filterParkingId)
      if (params.toString()) url += '?' + params.toString()
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Error al cargar tarifas')
        setLoading(false)
        return
      }

      const data = await response.json()
      setTariffs(data.tariffs || [])
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al cargar tarifas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperadmin) {
      fetchTariffs()
    }
  }, [isSuperadmin, filterOrgId, filterParkingId])

  const handleDelete = async (tariffId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta tarifa?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/tariffs/${tariffId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(`Error: ${errorData.error}`)
        return
      }

      fetchTariffs()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isSuperadmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Acceso Denegado</h2>
          <p className="text-red-600">Solo los superadmins pueden acceder a esta página.</p>
        </div>
      </div>
    )
  }

  if (loading && tariffs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tarifas...</p>
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
              Administración de Tarifas
            </h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
            >
              + Crear Tarifa
            </button>
          </div>

          {/* Filtros */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Organización
              </label>
              <select
                value={filterOrgId}
                onChange={(e) => {
                  setFilterOrgId(e.target.value)
                  setFilterParkingId('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todas las organizaciones</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Parking
              </label>
              <select
                value={filterParkingId}
                onChange={(e) => setFilterParkingId(e.target.value)}
                disabled={!filterOrgId}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              >
                <option value="">Todos los parkings (incluye default)</option>
                {parkings.map((parking) => (
                  <option key={parking.id} value={parking.id}>
                    {parking.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
                      Organización
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parking
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio/Min
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Válida Desde
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Válida Hasta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tariffs.map((tariff) => (
                    <tr key={tariff.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(tariff.organizations as any)?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {tariff.parking_id 
                            ? ((tariff.parkings as any)?.name || '-')
                            : <span className="text-gray-500 italic">Default</span>
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCLP(tariff.price_per_minute)}/min
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(tariff.valid_from)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {tariff.valid_until ? formatDate(tariff.valid_until) : 'Sin límite'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditingTariff(tariff)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            Editar
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleDelete(tariff.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Eliminar
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

      <CreateTariffModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchTariffs()
          setShowCreateModal(false)
        }}
      />

      <EditTariffModal
        isOpen={editingTariff !== null}
        onClose={() => setEditingTariff(null)}
        onSuccess={() => {
          fetchTariffs()
          setEditingTariff(null)
        }}
        tariff={editingTariff}
      />
    </div>
  )
}
