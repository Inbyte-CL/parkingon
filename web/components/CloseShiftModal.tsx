'use client'

import { useState, useEffect } from 'react'
import { formatCLP } from '@/lib/utils/currency'

interface Shift {
  id: string
  opening_time: string
  opening_cash: number
  cash_sales: number | null
  expected_cash_drawer: number | null
  user_email: string
  user_display_name: string | null
  organizations?: { name: string }
  parkings?: { name: string }
}

interface CloseShiftModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  shift: Shift | null
}

export default function CloseShiftModal({
  isOpen,
  onClose,
  onSuccess,
  shift
}: CloseShiftModalProps) {
  const [formData, setFormData] = useState({
    closingCash: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (shift) {
      // Pre-llenar con el valor esperado
      const expected = shift.expected_cash_drawer || shift.opening_cash
      setFormData({
        closingCash: Math.round(expected).toString(),
        notes: ''
      })
    }
  }, [shift])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shift) return

    setError(null)
    setLoading(true)

    try {
      const closingCash = parseFloat(formData.closingCash)
      if (isNaN(closingCash) || closingCash < 0) {
        throw new Error('El monto de cierre debe ser un número válido mayor o igual a 0')
      }

      const response = await fetch(`/api/admin/shifts/${shift.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closingCash: closingCash,
          notes: formData.notes || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cerrar turno')
      }

      setSuccess(true)
      
      // Esperar 2 segundos antes de cerrar
      setTimeout(() => {
        onSuccess()
        onClose()
        setSuccess(false)
        setFormData({ closingCash: '', notes: '' })
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Error al cerrar turno')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !shift) return null

  const expectedCash = shift.expected_cash_drawer || shift.opening_cash
  const difference = formData.closingCash 
    ? Math.round(parseFloat(formData.closingCash) - expectedCash)
    : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cerrar Turno</h2>
        <p className="text-sm text-gray-600 mb-4">
          Operador: {shift.user_display_name || shift.user_email}
        </p>

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-800 text-sm font-medium">¡Turno cerrado correctamente!</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Información del turno */}
        <div className="mb-4 bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Organización:</span>
            <span className="text-sm font-medium text-gray-900">
              {(shift.organizations as any)?.name || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Parking:</span>
            <span className="text-sm font-medium text-gray-900">
              {(shift.parkings as any)?.name || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Apertura:</span>
            <span className="text-sm font-medium text-gray-900">
              {new Date(shift.opening_time).toLocaleString('es-ES')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Caja Inicial:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCLP(shift.opening_cash)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Ventas en Efectivo:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCLP(shift.cash_sales || 0)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="text-sm font-medium text-gray-700">Caja Esperada:</span>
            <span className="text-sm font-bold text-indigo-600">
              {formatCLP(expectedCash)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caja de Cierre ($) *
            </label>
            <input
              type="number"
              step="1"
              min="0"
              required
              value={formData.closingCash}
              onChange={(e) => setFormData({ ...formData, closingCash: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Diferencia: 
              <span className={`ml-1 font-medium ${
                difference > 0 ? 'text-green-600' : 
                difference < 0 ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {formatCLP(difference)} 
                {difference > 0 ? ' (Sobrante)' : 
                 difference < 0 ? ' (Faltante)' : 
                 ' (Exacto)'}
              </span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (Opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Notas adicionales sobre el cierre del turno..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || success}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {success ? 'Cerrar' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Cerrando...' : success ? '¡Completado!' : 'Cerrar Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
