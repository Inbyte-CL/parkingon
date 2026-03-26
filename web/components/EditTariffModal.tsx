'use client'

import { useState, useEffect } from 'react'
import { useOrganizations } from '@/lib/hooks/useOrganizations'
import { useParkings } from '@/lib/hooks/useParkings'

interface Tariff {
  id: string
  org_id: string
  parking_id: string | null
  price_per_minute: number
  valid_from: string
  valid_until: string | null
}

interface EditTariffModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  tariff: Tariff | null
}

export default function EditTariffModal({
  isOpen,
  onClose,
  onSuccess,
  tariff
}: EditTariffModalProps) {
  const { organizations, loading: orgsLoading } = useOrganizations()
  const [formData, setFormData] = useState({
    orgId: '',
    parkingId: '',
    pricePerMinute: '',
    validFrom: '',
    validUntil: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { parkings, loading: parkingsLoading } = useParkings(formData.orgId || undefined)

  useEffect(() => {
    if (tariff) {
      const validFrom = new Date(tariff.valid_from)
      const validUntil = tariff.valid_until ? new Date(tariff.valid_until) : null
      
      setFormData({
        orgId: tariff.org_id,
        parkingId: tariff.parking_id || '',
        pricePerMinute: tariff.price_per_minute.toString(),
        validFrom: validFrom.toISOString().slice(0, 16),
        validUntil: validUntil ? validUntil.toISOString().slice(0, 16) : ''
      })
    }
  }, [tariff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tariff) return

    setError(null)
    setLoading(true)

    try {
      const price = parseFloat(formData.pricePerMinute)
      if (isNaN(price) || price < 0) {
        throw new Error('El precio por minuto debe ser un número válido mayor o igual a 0')
      }

      const validFromDate = new Date(formData.validFrom)
      const validUntilDate = formData.validUntil ? new Date(formData.validUntil) : null

      if (validUntilDate && validUntilDate <= validFromDate) {
        throw new Error('La fecha de fin debe ser mayor a la fecha de inicio')
      }

      const response = await fetch(`/api/admin/tariffs/${tariff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricePerMinute: price,
          validFrom: validFromDate.toISOString(),
          validUntil: validUntilDate ? validUntilDate.toISOString() : null,
          parkingId: formData.parkingId || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar tarifa')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al actualizar tarifa')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !tariff) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Editar Tarifa</h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organización
            </label>
            <input
              type="text"
              value={organizations.find(o => o.id === formData.orgId)?.name || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">La organización no se puede cambiar</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parking (Opcional)
            </label>
            <select
              value={formData.parkingId}
              onChange={(e) => setFormData({ ...formData, parkingId: e.target.value })}
              disabled={parkingsLoading || !formData.orgId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              <option value="">Tarifa Default (para toda la organización)</option>
              {parkings.map((parking) => (
                <option key={parking.id} value={parking.id}>
                  {parking.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio por Minuto ($) *
            </label>
            <input
              type="number"
              step="1"
              min="0"
              required
              value={formData.pricePerMinute}
              onChange={(e) => setFormData({ ...formData, pricePerMinute: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: 100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Válida Desde *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.validFrom}
              onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Válida Hasta (Opcional)
            </label>
            <input
              type="datetime-local"
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              min={formData.validFrom}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Dejar vacío si la tarifa no tiene fecha de expiración
            </p>
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
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
