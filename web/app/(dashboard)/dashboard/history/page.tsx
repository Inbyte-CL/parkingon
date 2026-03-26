'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createSupabaseClient } from '@/lib/supabase/client'
import { formatCLP } from '@/lib/utils/currency'

interface SessionHistory {
  id: string
  plate: string
  parkingName: string
  entryTime: string
  exitTime: string | null
  amount: number
  paymentMethod: string | null
  status: string
  sessionCode: string
  operatorName: string | null
  klapCode: string
}

export default function HistoryPage() {
  const { userInfo } = useUser()
  const [sessions, setSessions] = useState<SessionHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterParkingId, setFilterParkingId] = useState<string>('')
  const [parkings, setParkings] = useState<Array<{ id: string; name: string }>>([])
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalSessions, setTotalSessions] = useState<number>(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const supabase = createSupabaseClient()

        // Obtener parkings disponibles
        let parkingsQuery = supabase
          .from('parkings')
          .select('id, name')
          .eq('status', 'active')
          .order('name')

        if (userInfo?.orgId) {
          parkingsQuery = parkingsQuery.eq('org_id', userInfo.orgId)
        }

        const { data: parkingsData, error: parkingsError } = await parkingsQuery

        if (parkingsError) {
          throw new Error(parkingsError.message)
        }

        setParkings(parkingsData || [])

        // Obtener sesiones con información de parking y org
        // Primero obtener sesiones directamente filtradas por org_id a través de parking_id
        let sessionsQuery = supabase
          .from('sessions')
          .select(`
            id,
            plate,
            entry_time,
            exit_time,
            status,
            session_code,
            parking_id,
            created_by,
            parkings:parking_id(name, org_id)
          `)
          .order('entry_time', { ascending: false })

        // Aplicar filtros
        if (filterParkingId) {
          sessionsQuery = sessionsQuery.eq('parking_id', filterParkingId)
        } else if (userInfo?.orgId) {
          // Filtrar por parkings de la organización
          const parkingIds = parkingsData?.map(p => p.id) || []
          if (parkingIds.length > 0) {
            sessionsQuery = sessionsQuery.in('parking_id', parkingIds)
          } else {
            // Si no hay parkings, no hay sesiones que mostrar
            console.warn('No hay parkings activos para esta organización')
            setSessions([])
            setLoading(false)
            return
          }
        }

        // Aplicar filtros de fecha
        if (filterDateFrom) {
          // Convertir fecha a formato ISO con hora 00:00:00
          const fromDate = new Date(filterDateFrom)
          fromDate.setHours(0, 0, 0, 0)
          sessionsQuery = sessionsQuery.gte('entry_time', fromDate.toISOString())
        }
        if (filterDateTo) {
          // Convertir fecha a formato ISO con hora 23:59:59
          const toDate = new Date(filterDateTo)
          toDate.setHours(23, 59, 59, 999)
          sessionsQuery = sessionsQuery.lte('entry_time', toDate.toISOString())
        }

        // Obtener total de sesiones para paginación (consulta separada con los mismos filtros)
        let countQuery = supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
        
        if (filterParkingId) {
          countQuery = countQuery.eq('parking_id', filterParkingId)
        } else if (userInfo?.orgId) {
          const parkingIds = parkingsData?.map(p => p.id) || []
          if (parkingIds.length > 0) {
            countQuery = countQuery.in('parking_id', parkingIds)
          }
        }
        
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom)
          fromDate.setHours(0, 0, 0, 0)
          countQuery = countQuery.gte('entry_time', fromDate.toISOString())
        }
        if (filterDateTo) {
          const toDate = new Date(filterDateTo)
          toDate.setHours(23, 59, 59, 999)
          countQuery = countQuery.lte('entry_time', toDate.toISOString())
        }
        
        const { count: totalCount, error: countError } = await countQuery
        
        if (countError) {
          console.error('❌ Error obteniendo conteo total:', countError)
          setTotalSessions(0)
        } else {
          const total = totalCount || 0
          setTotalSessions(total)
          console.log('📊 Total de sesiones para paginación:', total)
          console.log('📊 Tamaño de página:', pageSize)
          console.log('📊 Página actual:', currentPage)
          console.log('📊 Total de páginas:', Math.ceil(total / pageSize))
        }

        // Aplicar paginación a la consulta de datos
        const offset = (currentPage - 1) * pageSize
        const { data: sessionsData, error: sessionsError } = await sessionsQuery
          .range(offset, offset + pageSize - 1)

        if (sessionsError) {
          console.error('❌ Error obteniendo sesiones:', sessionsError)
          throw new Error(sessionsError.message)
        }

        console.log('📊 Sesiones obtenidas:', sessionsData?.length || 0)
        console.log('📊 Total de sesiones (para paginación):', totalSessions)
        
        // Debug: Verificar estructura de datos del join
        if (sessionsData && sessionsData.length > 0) {
          const firstSession = sessionsData[0]
          console.log('🔍 Ejemplo de sesión (primera):', {
            id: firstSession.id,
            plate: firstSession.plate,
            parking_id: firstSession.parking_id,
            parkings: firstSession.parkings,
            parkingsType: typeof firstSession.parkings,
            parkingsIsArray: Array.isArray(firstSession.parkings),
            parkingsName: firstSession.parkings?.name || (Array.isArray(firstSession.parkings) && firstSession.parkings[0]?.name) || 'NO ENCONTRADO'
          })
          
          // Si parkings es un array, tomar el primero
          if (Array.isArray(firstSession.parkings) && firstSession.parkings.length > 0) {
            console.log('⚠️  parkings es un array, usando el primer elemento')
          }
        }
        
        if (sessionsData && sessionsData.length > 0) {
          console.log('   Primera sesión:', {
            id: sessionsData[0].id,
            entry_time: sessionsData[0].entry_time,
            parking_name: sessionsData[0].parkings?.name,
            org_id: sessionsData[0].parkings?.org_id
          })
        }

        // Obtener pagos para estas sesiones (incluyendo quote_id para identificar salidas sin pago)
        const sessionIds = sessionsData?.map(s => s.id) || []
        console.log('📋 IDs de sesiones para buscar pagos:', sessionIds.length)
        
        let paymentsData: any[] = []
        if (sessionIds.length > 0) {
          // Obtener pagos en lotes si hay muchos (Supabase tiene límite de 1000 en .in())
          const batchSize = 1000
          for (let i = 0; i < sessionIds.length; i += batchSize) {
            const batch = sessionIds.slice(i, i + batchSize)
            const { data: batchPayments, error: paymentsError } = await supabase
              .from('payments')
              .select('session_id, amount, payment_method, quote_id, created_by, klap_code')
              .eq('status', 'completed')
              .in('session_id', batch)

            if (paymentsError) {
              console.warn('Error obteniendo pagos (batch):', paymentsError)
            } else if (batchPayments) {
              paymentsData = [...paymentsData, ...batchPayments]
            }
          }
        }

        console.log('💳 Total pagos obtenidos:', paymentsData.length)
        if (paymentsData.length > 0) {
          // Agrupar por método de pago para ver distribución
          const methodCounts = paymentsData.reduce((acc: any, p: any) => {
            const method = p.payment_method || 'null'
            acc[method] = (acc[method] || 0) + 1
            return acc
          }, {})
          console.log('💳 Distribución de métodos de pago:', methodCounts)
          console.log('💳 Ejemplos de pagos:', paymentsData.slice(0, 10).map(p => ({
            session_id: p.session_id,
            amount: p.amount,
            payment_method: p.payment_method
          })))
        }

        // Crear mapa de pagos por sesión
        const paymentsBySession = new Map(
          paymentsData?.map(p => [
            p.session_id,
            { 
              amount: Number(p.amount || 0), 
              method: p.payment_method || null,
              quoteId: p.quote_id || null,
              createdBy: p.created_by || null,
              klapCode: (p.klap_code ?? '0') as string
            }
          ]) || []
        )

        // Obtener todos los parking_ids únicos para obtener nombres si el join falló
        const parkingIds = new Set<string>()
        sessionsData?.forEach(s => {
          if (s.parking_id) parkingIds.add(s.parking_id)
        })
        
        // Obtener nombres de parkings si el join no funcionó
        const parkingNames = new Map<string, string>()
        if (parkingIds.size > 0) {
          const parkingIdsArray = Array.from(parkingIds)
          const { data: parkingsDataForNames, error: parkingsError } = await supabase
            .from('parkings')
            .select('id, name')
            .in('id', parkingIdsArray)
          
          if (!parkingsError && parkingsDataForNames) {
            parkingsDataForNames.forEach(p => {
              parkingNames.set(p.id, p.name)
            })
            console.log('🅿️  Nombres de parkings obtenidos directamente:', Array.from(parkingNames.entries()).slice(0, 5))
          } else if (parkingsError) {
            console.warn('⚠️  Error obteniendo nombres de parkings:', parkingsError)
          }
        }
        
        // Obtener todos los user_ids únicos de sesiones y pagos
        const userIds = new Set<string>()
        sessionsData?.forEach(s => {
          if (s.created_by) userIds.add(s.created_by)
        })
        paymentsData?.forEach(p => {
          if (p.created_by) userIds.add(p.created_by)
        })

        // Obtener nombres de operadores usando API route
        const operatorNames = new Map<string, string>()
        if (userIds.size > 0) {
          const userIdsArray = Array.from(userIds)
          console.log('👤 Obteniendo nombres para', userIdsArray.length, 'operadores')
          
          try {
            // Llamar a la API route para obtener nombres
            const response = await fetch('/api/admin/operators', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ user_ids: userIdsArray })
            })

            if (response.ok) {
              const data = await response.json()
              console.log('👤 Respuesta de API operadores:', data)
              
              if (data.operators) {
                Object.entries(data.operators).forEach(([userId, name]) => {
                  operatorNames.set(userId, name as string)
                })
              }
            } else {
              console.warn('Error en API de operadores:', await response.text())
              // Fallback: marcar todos como "Operador"
              userIdsArray.forEach(userId => {
                operatorNames.set(userId, 'Operador')
              })
            }
          } catch (error) {
            console.error('Error llamando API de operadores:', error)
            // Fallback: marcar todos como "Operador"
            userIdsArray.forEach(userId => {
              operatorNames.set(userId, 'Operador')
            })
          }
          
          console.log('👤 Nombres de operadores obtenidos:', Array.from(operatorNames.entries()).slice(0, 5))
        }

        // Procesar sesiones (sin calcular montos estimados para mejor rendimiento)
        const sessionsWithDetails: SessionHistory[] = (sessionsData || []).map((session: any) => {
            const payment = paymentsBySession.get(session.id)
            
            // Manejar el caso donde parkings puede ser un array o un objeto
            let parkingData = null
            if (Array.isArray(session.parkings)) {
              parkingData = session.parkings[0] || null
            } else {
              parkingData = session.parkings || null
            }
            
            // Obtener nombre del parking: primero del join, luego del mapa de nombres directos
            let parkingName = parkingData?.name || null
            if (!parkingName && session.parking_id) {
              parkingName = parkingNames.get(session.parking_id) || null
            }
            parkingName = parkingName || 'Parking desconocido'
            
            const orgId = parkingData?.org_id
            
            // Log si no se encontró el parking
            if (parkingName === 'Parking desconocido' && session.parking_id) {
              console.warn(`⚠️  Sesión ${session.id} tiene parking_id ${session.parking_id} pero no se pudo obtener el nombre del parking`)
            }

            let amount = payment?.amount || 0
            let paymentMethod = payment?.method || null

            // Función para formatear el método de pago
            const formatPaymentMethod = (method: string | null) => {
              if (!method) return null
              const methodMap: Record<string, string> = {
                'cash': 'Efectivo',
                'card': 'Tarjeta',
                'qr_payment': 'QR',
                'qr': 'QR',
                'transfer': 'Transferencia'
              }
              return methodMap[method.toLowerCase()] || method.charAt(0).toUpperCase() + method.slice(1)
            }

            // Si la sesión está cerrada y no tiene pago, dejar amount en 0
            // (No calcular monto estimado para evitar llamadas RPC lentas)

            // Determinar método de pago final
            // Verificar si es una salida sin pago:
            // 1. Si el quote_id empieza con "no_payment_"
            // 2. O si no hay pago registrado pero la sesión está cerrada
            const isNoPayment = payment?.quoteId?.startsWith('no_payment_') || false
            
            let finalPaymentMethod: string | null = null
            if (payment) {
              if (isNoPayment) {
                // Si es salida sin pago identificada por quote_id
                finalPaymentMethod = 'Sin pago'
              } else if (payment.method) {
                // Si hay pago registrado con método, usar su método real
                finalPaymentMethod = formatPaymentMethod(payment.method)
              } else {
                // Si el pago existe pero no tiene método, asumir efectivo
                finalPaymentMethod = 'Efectivo'
              }
            } else if (session.status === 'closed' && session.exit_time) {
              // Si la sesión está cerrada pero no hay pago registrado, marcar como "Sin pago"
              finalPaymentMethod = 'Sin pago'
            }
            
            // Log para depuración
            if (session.status === 'closed') {
              console.log(`Sesión ${session.id} (${session.plate}):`, {
                hasPayment: !!payment,
                paymentMethod: payment?.method,
                paymentAmount: payment?.amount,
                finalPaymentMethod,
                calculatedAmount: amount
              })
            }

            // Determinar nombre del operador
            // Priorizar el operador que procesó el pago (salida), si no, el que creó la sesión (entrada)
            const operatorUserId = payment?.createdBy || session.created_by
            const operatorName = operatorUserId ? (operatorNames.get(operatorUserId) || 'Operador') : null
            
            // Log para depuración
            if (!operatorName || operatorName === 'Operador') {
              console.log(`⚠️ Operador sin nombre para sesión ${session.id}:`, {
                operatorUserId,
                hasPayment: !!payment,
                paymentCreatedBy: payment?.createdBy,
                sessionCreatedBy: session.created_by,
                operatorName
              })
            }

            return {
              id: session.id,
              plate: session.plate,
              parkingName,
              entryTime: session.entry_time,
              exitTime: session.exit_time,
              amount,
              paymentMethod: finalPaymentMethod,
              status: session.status,
              sessionCode: session.session_code,
              operatorName,
              klapCode: payment?.klapCode || '0'
            }
          })

        setSessions(sessionsWithDetails)
      } catch (err: any) {
        console.error('Error obteniendo historial:', err)
        setError(err.message || 'Error al cargar historial de movimientos')
      } finally {
        setLoading(false)
      }
    }

    if (userInfo !== null) {
      fetchData()
    }
  }, [userInfo, filterParkingId, filterDateFrom, filterDateTo, pageSize, currentPage])

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filterParkingId, filterDateFrom, filterDateTo, pageSize])

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const downloadCSV = () => {
    if (sessions.length === 0) {
      alert('No hay datos para descargar')
      return
    }

    // Encabezados CSV
    const headers = [
      'Patente',
      'Operador',
      'Parking',
      'Entrada',
      'Salida',
      'Monto',
      'Medio de Pago',
      'Estado',
      'Código',
      'Código Klap'
    ]

    // Convertir datos a filas CSV
    const rows = sessions.map(session => [
      session.plate,
      session.operatorName || '-',
      session.parkingName,
      formatDateTime(session.entryTime),
      formatDateTime(session.exitTime),
      session.status === 'closed' 
        ? (session.amount > 0 ? formatCLP(session.amount) : '$0')
        : '-',
      session.status === 'closed' 
        ? (session.paymentMethod || 'Sin pago')
        : '-',
      session.status === 'closed' ? 'Cerrada' : 'Abierta',
      session.sessionCode,
      session.klapCode && session.klapCode !== '0' ? session.klapCode : 'N/A'
    ])

    // Crear contenido CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escapar comillas y envolver en comillas si contiene comas o comillas
          const cellStr = String(cell || '')
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(',')
      )
    ].join('\n')

    // Crear blob y descargar
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    // Generar nombre de archivo con fecha
    const now = new Date()
    const fileName = `historial_movimientos_${formatDateForInput(now)}_${now.getHours()}${now.getMinutes()}.csv`
    
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                Historial de Movimientos
              </h1>
              
              {/* Botón descargar CSV */}
              <button
                onClick={downloadCSV}
                disabled={loading || sessions.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar CSV
              </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
              {/* Filtro por Parking */}
              {parkings.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Parking:
                  </label>
                  <select
                    value={filterParkingId}
                    onChange={(e) => setFilterParkingId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[180px]"
                  >
                    <option value="">Todos</option>
                    {parkings.map((parking) => (
                      <option key={parking.id} value={parking.id}>
                        {parking.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro de fecha desde */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Desde:
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Filtro de fecha hasta */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Hasta:
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  min={filterDateFrom || undefined}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Selector de tamaño de página */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Mostrar:
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Botón limpiar filtros */}
              {(filterParkingId || filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => {
                    setFilterParkingId('')
                    setFilterDateFrom('')
                    setFilterDateTo('')
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold">Error al cargar historial</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-center">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Operador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parking
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entrada
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salida
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Medio de Pago
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código Klap
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {session.plate}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {session.operatorName || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {session.parkingName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDateTime(session.entryTime)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDateTime(session.exitTime)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {session.status === 'closed' 
                              ? (session.amount > 0 ? formatCLP(session.amount) : formatCLP(0))
                              : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {session.status === 'closed' 
                              ? (session.paymentMethod || 'Sin pago')
                              : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              session.status === 'closed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {session.status === 'closed' ? 'Cerrada' : 'Abierta'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 font-mono">
                            {session.sessionCode}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 font-mono">
                            {session.klapCode && session.klapCode !== '0' ? session.klapCode : 'N/A'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Controles de paginación */}
              {totalSessions > pageSize && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalSessions)} de {totalSessions} movimientos
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, Math.ceil(totalSessions / pageSize)) }, (_, i) => {
                        const totalPages = Math.ceil(totalSessions / pageSize)
                        let pageNum: number
                        
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                              currentPage === pageNum
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalSessions / pageSize), prev + 1))}
                      disabled={currentPage >= Math.ceil(totalSessions / pageSize)}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
