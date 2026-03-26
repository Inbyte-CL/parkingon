'use client'

import { useState } from 'react'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userEmail: string
  userId: string
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
  userEmail,
  userId
}: ChangePasswordModalProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validaciones
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    const trimmedUserId = userId.trim()
    if (!trimmedUserId) {
      setError('Usuario inválido: falta el ID. Vuelve a abrir el listado de usuarios.')
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: trimmedUserId, password })
      })

      const contentType = response.headers.get('content-type') || ''
      const raw = await response.text()

      let data: { error?: string } = {}
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(raw)
        } catch {
          throw new Error('Respuesta JSON inválida del servidor.')
        }
      } else {
        // HTML (404, 500 Next, proxy, etc.) → no es JSON
        const snippet = raw.slice(0, 120).replace(/\s+/g, ' ')
        throw new Error(
          `El servidor devolvió HTML en lugar de JSON (${response.status}). ` +
            `Comprueba que la app Next esté corriendo y que la ruta API exista. ${snippet}`
        )
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar contraseña')
      }

      // Mostrar mensaje de éxito
      setSuccess(true)
      
      // Reset form
      setPassword('')
      setConfirmPassword('')
      
      // Esperar 2 segundos para que el usuario vea el mensaje de éxito
      setTimeout(() => {
        onSuccess()
        onClose()
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Error al cambiar contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cambiar Contraseña</h2>
        <p className="text-sm text-gray-600 mb-4">Usuario: {userEmail}</p>

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-800 text-sm font-medium">¡Contraseña cambiada correctamente!</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva Contraseña *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Contraseña *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
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
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Cambiando...' : success ? '¡Completado!' : 'Cambiar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
