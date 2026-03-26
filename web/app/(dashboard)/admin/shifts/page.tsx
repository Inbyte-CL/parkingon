'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { formatCLP } from '@/lib/utils/currency'
import CloseShiftModal from '@/components/CloseShiftModal'

interface Shift {
  id: string
  org_id: string
  user_id: string
  parking_id: string
  status: 'open' | 'closed'
  opening_time: string
  closing_time: string | null
  opening_cash: number
  closing_cash: number | null
  cash_sales: number | null
  expected_cash_drawer: number | null
  difference: number | null
  notes: string | null
  created_at: string
  organizations?: { name: string }
  parkings?: { name: string; address: string | null }
  user_email: string
  user_display_name: string | null
}

export default function ShiftsPage() {
  const { userInfo } = useUser()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [closingShift, setClosingShift] = useState<Shift | null>(null)
  
  const isSuperadmin = userInfo?.role === 'superadmin'

  const fetchShifts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/shifts?status=open')
      
      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Error al cargar turnos')
        setLoading(false)
        return
      }

      const data = await response.json()
      setShifts(data.shifts || [])
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al cargar turnos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperadmin) {
      fetchShifts()
      // Actualizar cada 30 segundos
      const interval = setInterval(fetchShifts, 30000)
      return () => clearInterval(interval)
    }
  }, [isSuperadmin])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateDuration = (openingTime: string) => {
    const now = new Date()
    const opening = new Date(openingTime)
    const diffMs = now.getTime() - opening.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
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

  if (loading && shifts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando turnos activos...</p>
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
              Turnos Activos
            </h1>
            <button
              onClick={fetchShifts}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
            >
              🔄 Actualizar
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {shifts.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-600">No hay turnos activos en este momento.</p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Operador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organización
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parking
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Apertura
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duración
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Caja Inicial
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ventas Efectivo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Esperado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {shifts.map((shift) => (
                      <tr key={shift.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {shift.user_display_name || shift.user_email}
                          </div>
                          <div className="text-xs text-gray-500">{shift.user_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {(shift.organizations as any)?.name || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {(shift.parkings as any)?.name || '-'}
                          </div>
                          {(shift.parkings as any)?.address && (
                            <div className="text-xs text-gray-500">
                              {(shift.parkings as any).address}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(shift.opening_time)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {calculateDuration(shift.opening_time)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCLP(shift.opening_cash)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatCLP(shift.cash_sales || 0)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-indigo-600">
                            {formatCLP(shift.expected_cash_drawer || shift.opening_cash)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => setClosingShift(shift)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Cerrar Turno
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <CloseShiftModal
        isOpen={closingShift !== null}
        onClose={() => setClosingShift(null)}
        onSuccess={() => {
          fetchShifts()
          setClosingShift(null)
        }}
        shift={closingShift}
      />
    </div>
  )
}
