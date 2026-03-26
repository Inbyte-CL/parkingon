import { UserRole } from '@/types/database'

/**
 * Verifica si el usuario tiene un rol específico
 */
export function hasRole(userRole: UserRole | null | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false
  
  const roleHierarchy: Record<UserRole, number> = {
    superadmin: 3,
    admin_empresa: 2,
    operador: 1,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Verifica si el usuario es superadmin
 */
export function isSuperadmin(role: UserRole | null | undefined): boolean {
  return role === 'superadmin'
}

/**
 * Verifica si el usuario es admin_empresa o superadmin
 */
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin_empresa' || role === 'superadmin'
}

/**
 * Obtiene el nombre del rol en español
 */
export function getRoleName(role: UserRole | null | undefined): string {
  const roleNames: Record<UserRole, string> = {
    superadmin: 'Super Administrador',
    admin_empresa: 'Administrador',
    operador: 'Operador',
  }

  return role ? roleNames[role] : 'Sin rol'
}

/**
 * Obtiene el color del rol para UI
 */
export function getRoleColor(role: UserRole | null | undefined): string {
  const roleColors: Record<UserRole, string> = {
    superadmin: 'bg-purple-100 text-purple-800',
    admin_empresa: 'bg-blue-100 text-blue-800',
    operador: 'bg-green-100 text-green-800',
  }

  return role ? roleColors[role] : 'bg-gray-100 text-gray-800'
}
