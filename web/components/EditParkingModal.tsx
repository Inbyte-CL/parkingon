'use client'

import { useState, useEffect } from 'react'
import { useOrganizations } from '@/lib/hooks/useOrganizations'
import { useUser } from '@/lib/hooks/useUser'
import { formatCLP } from '@/lib/utils/currency'

interface Parking {
  id: string
  org_id: string
  name: string
  address: string | null
  status: 'active' | 'inactive'
  total_spaces: number | null
  max_daily_amount?: number | null
  pricing_mode?: 'per_minute' | 'per_segment' | null
  segment_amount?: number | null
  segment_minutes?: number | null
  active_tariff?: {
    id: string
    price_per_minute: number
  } | null
}

interface EditParkingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  parking: Parking | null
}

export default function EditParkingModal({
  isOpen,
  onClose,
  onSuccess,
  parking
}: EditParkingModalProps) {
  const { userInfo } = useUser()
  const isAdminEmpresa = userInfo?.role === 'admin_empresa'
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
    segmentMinutes: '',
    pricePerMinute: '',
    validFrom: new Date().toISOString().slice(0, 16),
    validUntil: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingTariff, setLoadingTariff] = useState(false)
  const [currentTariff, setCurrentTariff] = useState<any>(null)

  useEffect(() => {
    if (parking) {
      // Resetear currentTariff cuando cambia el parking
      setCurrentTariff(null)
      
      // Primero establecer los datos básicos del parking
      setFormData({
        orgId: parking.org_id,
        name: parking.name,
        address: parking.address || '',
        status: parking.status,
        totalSpaces: parking.total_spaces?.toString() || '',
        maxDailyAmount: parking.max_daily_amount != null ? String(parking.max_daily_amount) : '',
        pricingMode: (parking.pricing_mode === 'per_segment' ? 'per_segment' : 'per_minute') as 'per_minute' | 'per_segment',
        segmentAmount: parking.segment_amount != null ? String(parking.segment_amount) : '',
        segmentMinutes: parking.segment_minutes != null ? String(parking.segment_minutes) : '',
        pricePerMinute: parking.active_tariff?.price_per_minute?.toString() || '',
        validFrom: new Date().toISOString().slice(0, 16),
        validUntil: ''
      })
      
      // Luego cargar información completa de la tarifa activa si existe
      if (parking.active_tariff?.id) {
        fetchTariffDetails(parking.active_tariff.id)
      }
    }
  }, [parking])

  const fetchTariffDetails = async (tariffId: string) => {
    try {
      setLoadingTariff(true)
      // Obtener todas las tarifas del parking para encontrar la activa
      const response = await fetch(`/api/admin/tariffs?parkingId=${parking?.id}`)
      const data = await response.json()
      
      if (data.tariffs) {
        const tariff = data.tariffs.find((t: any) => t.id === tariffId)
        if (tariff) {
          setCurrentTariff(tariff)
          const validFrom = new Date(tariff.valid_from)
          const validUntil = tariff.valid_until ? new Date(tariff.valid_until) : null
          
          // Solo actualizar los campos de la tarifa, preservar los datos del parking
          setFormData(prev => ({
            ...prev,
            pricePerMinute: tariff.price_per_minute.toString(),
            validFrom: validFrom.toISOString().slice(0, 16),
            validUntil: validUntil ? validUntil.toISOString().slice(0, 16) : ''
          }))
        }
      }
    } catch (err) {
      console.error('Error cargando detalles de tarifa:', err)
    } finally {
      setLoadingTariff(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parking) return

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
      // 1. Actualizar parking
      const response = await fetch(`/api/admin/parkings/${parking.id}`, {
        method: 'PUT',
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
        throw new Error(data.error || 'Error al actualizar parking')
      }

      // 2. Actualizar o crear tarifa si se proporcionó precio (usado cuando modo = por minuto)
      if (formData.pricePerMinute || formData.pricingMode === 'per_minute') {
        const price = parseFloat(formData.pricePerMinute || '0')
        if (isNaN(price) || price < 0) {
          throw new Error('El precio por minuto debe ser un número válido mayor o igual a 0')
        }
        if (formData.pricingMode === 'per_segment') {
          // No actualizar tarifa cuando es por tramo; el monto se toma de segment_amount
          onSuccess()
          onClose()
          return
        }

        const validFromDate = new Date(formData.validFrom)
        const validUntilDate = formData.validUntil ? new Date(formData.validUntil) : null

        if (validUntilDate && validUntilDate <= validFromDate) {
          throw new Error('La fecha de fin debe ser mayor a la fecha de inicio')
        }

        // Determinar qué tarifa actualizar o crear
        const tariffIdToUpdate = currentTariff?.id || parking.active_tariff?.id

        if (tariffIdToUpdate) {
          // Actualizar tarifa existente
          // Para mantener la tarifa activa, debemos asegurarnos de que valid_from sea en el pasado o presente
          const originalValidFrom = currentTariff?.valid_from 
            ? new Date(currentTariff.valid_from)
            : null
          
          // Si el usuario estableció una fecha futura, ajustarla a la fecha actual
          // para que la tarifa siga siendo activa
          let finalValidFrom = validFromDate
          if (validFromDate > new Date()) {
            // Si la fecha es futura, usar la fecha actual para mantener la tarifa activa
            finalValidFrom = new Date()
            console.warn('Fecha futura detectada, ajustando a fecha actual para mantener tarifa activa')
          } else if (originalValidFrom && validFromDate.getTime() !== originalValidFrom.getTime()) {
            // Si el usuario cambió la fecha pero es en el pasado o presente, usar la fecha solicitada
            finalValidFrom = validFromDate
          } else if (originalValidFrom) {
            // Si no se cambió la fecha, mantener la original
            finalValidFrom = originalValidFrom
          }
          
          console.log('Actualizando tarifa:', tariffIdToUpdate, { 
            price, 
            originalValidFrom: originalValidFrom?.toISOString(),
            requestedValidFrom: validFromDate.toISOString(),
            finalValidFrom: finalValidFrom.toISOString(),
            validUntil: validUntilDate?.toISOString() 
          })
          
          const updateBody: any = {
            pricePerMinute: price,
            parkingId: parking.id,
            validFrom: finalValidFrom.toISOString()
          }
          
          // Actualizar valid_until si se proporcionó
          if (validUntilDate !== null) {
            updateBody.validUntil = validUntilDate ? validUntilDate.toISOString() : null
          }
          
          const tariffResponse = await fetch(`/api/admin/tariffs/${tariffIdToUpdate}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateBody)
          })

          const tariffResponseData = await tariffResponse.json()
          
          if (!tariffResponse.ok) {
            throw new Error(tariffResponseData.error || 'Error al actualizar tarifa')
          }
          
          console.log('Tarifa actualizada exitosamente:', tariffResponseData)
        } else {
          // Crear nueva tarifa
          // Si la fecha es futura, ajustarla a la fecha actual para que la tarifa sea activa inmediatamente
          let finalValidFrom = validFromDate
          if (validFromDate > new Date()) {
            finalValidFrom = new Date()
            console.warn('Fecha futura detectada al crear tarifa, ajustando a fecha actual para que sea activa')
          }
          
          console.log('Creando nueva tarifa para parking:', parking.id, {
            price,
            requestedValidFrom: validFromDate.toISOString(),
            finalValidFrom: finalValidFrom.toISOString()
          })
          
          const tariffResponse = await fetch('/api/admin/tariffs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orgId: formData.orgId,
              parkingId: parking.id,
              pricePerMinute: price,
              validFrom: finalValidFrom.toISOString(),
              validUntil: validUntilDate ? validUntilDate.toISOString() : null
            })
          })

          const tariffResponseData = await tariffResponse.json()
          
          if (!tariffResponse.ok) {
            throw new Error(tariffResponseData.error || 'Error al crear tarifa')
          }
          
          console.log('Tarifa creada exitosamente:', tariffResponseData)
        }
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al actualizar parking')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !parking) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Editar Parking</h2>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

          {/* Sección de Tarifa (solo aplica cuando modo = por minuto) */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Tarifa</h3>
            
            {formData.pricingMode === 'per_segment' ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                Este parking usa tarifa por tramo. El monto y los minutos por tramo están configurados arriba.
              </div>
            ) : loadingTariff ? (
              <div className="text-center py-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : (
              <>
                {parking.active_tariff && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    Tarifa actual: {formatCLP(parking.active_tariff.price_per_minute)}/min
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio por Minuto ($) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required={formData.pricingMode === 'per_minute'}
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
              </>
            )}
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
