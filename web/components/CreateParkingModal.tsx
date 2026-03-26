'use client'

import { useState } from 'react'
import { useOrganizations } from '@/lib/hooks/useOrganizations'

interface CreateParkingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateParkingModal({
  isOpen,
  onClose,
  onSuccess
}: CreateParkingModalProps) {
  const { organizations, loading: orgsLoading } = useOrganizations()
  const [formData, setFormData] = useState({
    orgId: '',
    name: '',
    address: '',
    status: 'active' as 'active' | 'inactive',
    totalSpaces: '',
    maxDailyAmount: '',
    pricingMode: 'per_minute' as 'per_minute' | 'per_segment',
    segmentAmount: '',
    segmentMinutes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.pricingMode === 'per_segment') {
      const segAmt = formData.segmentAmount ? parseFloat(formData.segmentAmount) : NaN
      const segMin = formData.segmentMinutes ? parseInt(formData.segmentMinutes, 10) : NaN
      if (isNaN(segAmt) || segAmt < 0 || isNaN(segMin) || segMin <= 0) {
        setError('En tarifa por tramo, monto y minutos por tramo son obligatorios y mayores a 0.')
        return
      }
    }
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/admin/parkings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: formData.orgId,
          name: formData.name,
          address: formData.address || null,
          status: formData.status,
          totalSpaces: formData.totalSpaces ? parseInt(formData.totalSpaces) : null,
          maxDailyAmount: formData.maxDailyAmount ? parseFloat(formData.maxDailyAmount) : null,
          pricingMode: formData.pricingMode,
          segmentAmount: formData.pricingMode === 'per_segment' ? formData.segmentAmount : null,
          segmentMinutes: formData.pricingMode === 'per_segment' ? formData.segmentMinutes : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear parking')
      }

      // Reset form
      setFormData({
        orgId: '',
        name: '',
        address: '',
        status: 'active',
        totalSpaces: '',
        maxDailyAmount: '',
        pricingMode: 'per_minute',
        segmentAmount: '',
        segmentMinutes: ''
      })
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al crear parking')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Crear Parking</h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organización *
            </label>
            <select
              required
              value={formData.orgId}
              onChange={(e) => setFormData({ ...formData, orgId: e.target.value })}
              disabled={orgsLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              <option value="">Seleccionar organización</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Zona Centro"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ej: Av. Principal 123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacidad Total (Espacios)
            </label>
            <input
              type="number"
              min="1"
              value={formData.totalSpaces}
              onChange={(e) => setFormData({ ...formData, totalSpaces: e.target.value })}
              placeholder="Dejar vacío para sin límite"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Dejar vacío si no hay límite de espacios</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tope máximo diario (CLP)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.maxDailyAmount}
              onChange={(e) => setFormData({ ...formData, maxDailyAmount: e.target.value })}
              placeholder="Dejar vacío para sin tope"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Monto máximo a cobrar por vehículo por sesión. Vacío = sin tope.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de tarifa *
            </label>
            <select
              required
              value={formData.pricingMode}
              onChange={(e) => setFormData({ ...formData, pricingMode: e.target.value as 'per_minute' | 'per_segment' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="per_minute">Por minuto</option>
              <option value="per_segment">Por tramo</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Por minuto: se cobra según precio/min. Por tramo: monto fijo cada X minutos (ej. $300 cada 30 min).
            </p>
          </div>

          {formData.pricingMode === 'per_segment' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto por tramo (CLP) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.segmentAmount}
                  onChange={(e) => setFormData({ ...formData, segmentAmount: e.target.value })}
                  placeholder="Ej: 300"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Monto en pesos que se cobra por cada tramo.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minutos por tramo *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.segmentMinutes}
                  onChange={(e) => setFormData({ ...formData, segmentMinutes: e.target.value })}
                  placeholder="Ej: 30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Ej: 30 = cada 30 min (0-30 min = 1 tramo, 31-60 = 2 tramos, etc.).</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>

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
              {loading ? 'Creando...' : 'Crear Parking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
