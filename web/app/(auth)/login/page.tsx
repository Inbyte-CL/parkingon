'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createSupabaseClient(), [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (authError) {
        setError(authError.message || 'Credenciales incorrectas')
        return
      }

      if (!data?.session) {
        setError('No se pudo crear la sesión. Verifica tus credenciales.')
        return
      }

      await new Promise(resolve => setTimeout(resolve, 300))
      const { data: { session: verifySession } } = await supabase.auth.getSession()

      if (verifySession) {
        await supabase.auth.getSession()
        await new Promise(resolve => setTimeout(resolve, 1000))
        const { data: { session: finalCheck } } = await supabase.auth.getSession()
        if (finalCheck) {
          router.push('/dashboard')
          router.refresh()
        } else {
          setError('Error al guardar la sesión. Intenta de nuevo.')
        }
      } else {
        setError('Error al guardar la sesión. Intenta de nuevo.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión. Intenta de nuevo.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background-canvas">
      <main className="bg-white border border-slate-200/60 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row w-full max-w-4xl min-h-[580px]">
        {/* Panel izquierdo: marca y mensaje */}
        <div className="hidden md:flex flex-1 bg-white relative overflow-hidden flex-col justify-between p-12 border-r border-slate-100">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex flex-col items-start gap-2 mb-8">
              <img
                src="/parkin-on-logo.png"
                alt=""
                className="w-14 h-14 object-contain [mix-blend-mode:screen]"
              />
              <span className="text-slate-900 font-extrabold text-2xl tracking-tight">ParkingOn</span>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 leading-tight tracking-tight mb-4">
              Gestión de estacionamiento
              <br />
              <span className="text-primary">eficiente.</span>
            </h1>
            <p className="text-slate-500 text-lg font-medium max-w-xs leading-relaxed">
              Optimiza operaciones y maximiza ingresos con nuestro panel inteligente.
            </p>
          </div>
          <span className="material-icons absolute -bottom-12 -right-8 text-slate-50/80 text-[240px] pointer-events-none select-none">
            dashboard_customize
          </span>
        </div>

        {/* Panel derecho: formulario */}
        <div className="w-full md:w-[420px] p-8 md:p-12 flex flex-col justify-center">
          {/* Logo e isotipo en móvil */}
          <div className="flex md:hidden flex-col items-center gap-1 mb-8">
            <img src="/parkin-on-logo.png" alt="" className="h-16 w-auto object-contain [mix-blend-mode:screen]" />
            <span className="text-xl font-extrabold text-slate-900">ParkingOn</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Bienvenido</h2>
            <p className="text-slate-500 text-sm font-medium">
              Ingresa tus credenciales para acceder al panel de administración.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2" htmlFor="email">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                  mail
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="tu@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm outline-none placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider" htmlFor="password">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                  lock
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm outline-none placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#21de92] hover:bg-[#1bc982] text-[#111814] font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#21de92]/25 flex items-center justify-center gap-2 group mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar al panel'}
              <span className="material-icons text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
