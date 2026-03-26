'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import Link from 'next/link'
import SignOutButton from './SignOutButton'

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createSupabaseClient()
  const { userInfo } = useUser()
  const [loading, setLoading] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        if (typeof window !== 'undefined') {
          const storageKey = 'sb-mmqqrfvullrovstcykcj-auth-token'
          const stored = localStorage.getItem(storageKey)
        }
        const { data: { session }, error } = await supabase.auth.getSession()
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (error || userError) {
          router.push('/login')
          return
        }
        if (!session || !user) {
          router.push('/login')
          return
        }
        setHasSession(true)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(checkSession, 200)
    return () => clearTimeout(timer)
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-canvas">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-slate-600">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!hasSession) return null

  const isDashboard = pathname === '/dashboard' || pathname === '/dashboard/'
  const isHistory = pathname?.startsWith('/dashboard/history')
  const isParkings = pathname?.startsWith('/admin/parkings')
  const isUsers = pathname?.startsWith('/admin/users')
  const isOrganizations = pathname?.startsWith('/admin/organizations')
  const isTariffs = pathname?.startsWith('/admin/tariffs')
  const isShifts = pathname?.startsWith('/admin/shifts')

  const navLink = (href: string, label: string, icon: string, active: boolean) => (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-l-lg transition-all text-white ${
        active ? 'bg-white/10 border-r-4 border-primary' : 'hover:bg-white/5'
      }`}
    >
      <span className="material-icons text-xl">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background-canvas">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 h-full flex flex-col z-50 shrink-0">
        <div className="p-8 flex flex-col items-center gap-1">
          <img src="/parkin-on-logo.png" alt="" className="w-[7.5rem] h-[7.5rem] object-contain flex-shrink-0 [mix-blend-mode:screen]" />
          <span className="text-white font-bold text-2xl tracking-tight">ParkingOn</span>
        </div>
        <nav className="flex-1 px-4 mt-4 overflow-y-auto">
          <p className="text-[10px] font-bold text-white uppercase tracking-widest px-4 mb-4">Menú principal</p>
          <div className="space-y-1">
            {navLink('/dashboard', 'Dashboard', 'dashboard', isDashboard)}
            {navLink('/dashboard/history', 'Historial', 'history', isHistory)}
            {(userInfo?.role === 'superadmin' || userInfo?.role === 'admin_empresa') && navLink('/admin/parkings', 'Parkings', 'local_parking', isParkings)}
            {(userInfo?.role === 'superadmin' || userInfo?.role === 'admin_empresa') && navLink('/admin/users', 'Usuarios', 'group', isUsers)}
            {userInfo?.role === 'superadmin' && navLink('/admin/organizations', 'Organizaciones', 'business', isOrganizations)}
            {userInfo?.role === 'superadmin' && navLink('/admin/tariffs', 'Tarifas', 'receipt', isTariffs)}
            {userInfo?.role === 'superadmin' && navLink('/admin/shifts', 'Turnos', 'schedule', isShifts)}
          </div>
        </nav>
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3 text-white hover:bg-white/5 cursor-pointer px-4 py-2 transition-colors rounded-lg">
            <span className="material-icons text-xl">settings</span>
            <span className="font-medium text-sm">Ajustes</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 z-40 shrink-0">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-12 pr-4 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm outline-none"
                placeholder="Buscar operaciones, usuarios..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-5">
              <button type="button" className="relative text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
              <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">help_outline</span>
              </button>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{userInfo?.displayName || userInfo?.email || 'Usuario'}</p>
                <p className="text-[11px] text-slate-500 font-semibold">
                  {userInfo?.role === 'superadmin' ? 'Superadmin' : userInfo?.role === 'admin_empresa' ? 'Admin' : 'Operador'}
                  {userInfo?.organizationName ? ` • ${userInfo.organizationName}` : ''}
                </p>
              </div>
              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
