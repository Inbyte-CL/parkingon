'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import CreateUserModal from '@/components/CreateUserModal'
import EditUserModal from '@/components/EditUserModal'
import ChangePasswordModal from '@/components/ChangePasswordModal'

interface UserWithRole {
  user_id: string
  email: string
  user_created_at: string
  email_confirmed_at: string | null
  is_superadmin: boolean
  membership_id: string | null
  role: string | null
  membership_status: string | null
  display_name: string | null
  org_id: string | null
  parking_id: string | null
  organization_name: string | null
  parking_name: string | null
  parking_status: string | null
}

export default function UsersPage() {
  const { userInfo } = useUser()
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null)
  const [changingPasswordFor, setChangingPasswordFor] = useState<UserWithRole | null>(null)
  
  const isSuperadmin = userInfo?.role === 'superadmin'
  const isAdminEmpresa = userInfo?.role === 'admin_empresa'
  const canAccess = isSuperadmin || isAdminEmpresa

  const fetchUsers = async () => {
    if (!canAccess) return
    
    try {
      setLoading(true)
      // Si es admin_empresa, filtrar por su orgId automáticamente
      const url = isAdminEmpresa && userInfo?.orgId
        ? `/api/admin/users?orgId=${userInfo.orgId}`
        : '/api/admin/users'
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Error al cargar usuarios')
        setLoading(false)
        return
      }

      const data = await response.json()
      // Filtrar solo operadores si es admin_empresa
      let filteredUsers = data.users || []
      if (isAdminEmpresa) {
        filteredUsers = filteredUsers.filter((user: UserWithRole) => 
          user.role === 'operador' && user.org_id === userInfo?.orgId
        )
      }
      setUsers(filteredUsers)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canAccess) {
      fetchUsers()
    }
  }, [canAccess, userInfo?.orgId])

  // Calcular resumen por rol
  const roleSummary = users.reduce((acc, user) => {
    const role = user.is_superadmin ? 'superadmin' : (user.role || 'sin_rol')
    if (!acc[role]) {
      acc[role] = { count: 0, users: [] }
    }
    acc[role].count++
    acc[role].users.push(user.email)
    return acc
  }, {} as Record<string, { count: number; users: string[] }>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Usuarios y Roles
          </h1>

          {/* Resumen por rol */}
          <div className="bg-white shadow rounded-lg mb-6 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumen por Rol</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(roleSummary)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([role, data]) => (
                  <div key={role} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 capitalize">{role}</span>
                      <span className="text-2xl font-bold text-indigo-600">{data.count}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {data.users.slice(0, 3).join(', ')}
                      {data.users.length > 3 && ` +${data.users.length - 3} más`}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Lista detallada */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Lista Completa de Usuarios</h2>
              {isSuperadmin && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                >
                  + Crear Usuario
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organización
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parking
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
                  {users.map((user) => (
                    <tr key={user.user_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(user.user_created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.display_name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_superadmin 
                            ? 'bg-purple-100 text-purple-800' 
                            : user.role === 'admin_empresa'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.is_superadmin ? 'Superadmin' : (user.role || 'sin_rol')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.organization_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.parking_name || '-'}
                        {user.parking_status && (
                          <span className={`ml-2 text-xs ${
                            user.parking_status === 'active' ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            ({user.parking_status})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.membership_status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.membership_status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            Editar
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => setChangingPasswordFor(user)}
                            className="text-orange-600 hover:text-orange-900 font-medium"
                          >
                            Cambiar Contraseña
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

      {/* Modales */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchUsers()
          setShowCreateModal(false)
        }}
        defaultOrgId={userInfo?.orgId}
      />

      <EditUserModal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        onSuccess={() => {
          fetchUsers()
          setEditingUser(null)
        }}
        user={editingUser}
      />

      <ChangePasswordModal
        isOpen={changingPasswordFor !== null}
        onClose={() => setChangingPasswordFor(null)}
        onSuccess={() => {
          setChangingPasswordFor(null)
        }}
        userEmail={changingPasswordFor?.email || ''}
        userId={changingPasswordFor?.user_id || ''}
      />
    </div>
  )
}
