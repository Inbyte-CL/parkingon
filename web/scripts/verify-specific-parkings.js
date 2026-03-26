// Script para verificar movimientos de Parking Calle 2 y Mall del Centro

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Faltan variables de entorno')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifySpecificParkings() {
  console.log('🔍 Verificando movimientos de Parking Calle 2 y Mall del Centro...\n')
  
  try {
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'jis-parking')
      .single()
    
    if (orgError || !orgData) {
      throw new Error(`Error obteniendo organización: ${orgError?.message}`)
    }
    
    // Obtener los parkings específicos
    const { data: parkingsData, error: parkingsError } = await supabase
      .from('parkings')
      .select('id, name')
      .eq('org_id', orgData.id)
      .in('name', ['Parking Calle 2', 'Mall del Centro'])
      .eq('status', 'active')
    
    if (parkingsError || !parkingsData) {
      throw new Error(`Error obteniendo parkings: ${parkingsError?.message}`)
    }
    
    const parkingIds = parkingsData.map(p => p.id)
    
    // Obtener sesiones de estos parkings
    const periodStart = new Date('2025-11-01')
    const periodEnd = new Date('2026-01-31T23:59:59')
    
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, parking_id, entry_time, created_at, parkings:parking_id(name)')
      .eq('org_id', orgData.id)
      .in('parking_id', parkingIds)
      .gte('entry_time', periodStart.toISOString())
      .lte('entry_time', periodEnd.toISOString())
      .order('created_at', { ascending: false })
    
    if (sessionsError) {
      throw new Error(`Error obteniendo sesiones: ${sessionsError.message}`)
    }
    
    // Obtener pagos de estas sesiones
    const sessionIds = sessionsData?.map(s => s.id) || []
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('session_id, amount, payment_method')
      .in('session_id', sessionIds)
    
    const paymentsBySession = new Map()
    if (paymentsData) {
      paymentsData.forEach(p => {
        paymentsBySession.set(p.session_id, { amount: p.amount, method: p.payment_method })
      })
    }
    
    // Analizar por parking (todos los movimientos)
    const parkingStats = {}
    
    sessionsData?.forEach(session => {
      const parkingName = Array.isArray(session.parkings) 
        ? (session.parkings[0]?.name || 'Desconocido')
        : (session.parkings?.name || 'Desconocido')
      
      if (!parkingStats[parkingName]) {
        parkingStats[parkingName] = {
          count: 0,
          totalAmount: 0,
          minAmount: Infinity,
          maxAmount: 0,
          methods: {}
        }
      }
      
      const payment = paymentsBySession.get(session.id)
      if (payment) {
        parkingStats[parkingName].count++
        parkingStats[parkingName].totalAmount += Number(payment.amount || 0)
        parkingStats[parkingName].minAmount = Math.min(parkingStats[parkingName].minAmount, Number(payment.amount || 0))
        parkingStats[parkingName].maxAmount = Math.max(parkingStats[parkingName].maxAmount, Number(payment.amount || 0))
        
        const method = payment.method || 'null'
        parkingStats[parkingName].methods[method] = (parkingStats[parkingName].methods[method] || 0) + 1
      }
    })
    
    // Analizar los últimos 100 movimientos (los más recientes)
    const last100Sessions = sessionsData?.slice(0, 100) || []
    
    console.log('='.repeat(80))
    console.log('📊 RESUMEN DE MOVIMIENTOS')
    console.log('='.repeat(80))
    console.log(`Total de sesiones en el período: ${sessionsData?.length || 0}`)
    console.log(`Últimos 100 movimientos (más recientes): ${last100Sessions.length}`)
    console.log()
    
    Object.entries(parkingStats).forEach(([parkingName, stats]) => {
      console.log(`🅿️  ${parkingName}:`)
      console.log(`   Total movimientos: ${stats.count}`)
      console.log(`   Monto total: ${stats.totalAmount.toLocaleString('es-CL')} CLP`)
      console.log(`   Monto mínimo: ${stats.minAmount === Infinity ? 'N/A' : stats.minAmount.toLocaleString('es-CL')} CLP`)
      console.log(`   Monto máximo: ${stats.maxAmount.toLocaleString('es-CL')} CLP`)
      console.log(`   Monto promedio: ${stats.count > 0 ? Math.round(stats.totalAmount / stats.count).toLocaleString('es-CL') : 0} CLP`)
      console.log(`   Métodos de pago:`)
      Object.entries(stats.methods).forEach(([method, count]) => {
        const methodName = method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method
        console.log(`      ${methodName}: ${count}`)
      })
      console.log()
    })
    
    // Verificar los últimos 100 movimientos (los nuevos)
    const last100Amounts = last100Sessions
      .map(s => paymentsBySession.get(s.id))
      .filter(p => p)
      .map(p => Number(p.amount || 0))
      .filter(a => a > 0)
    
    const last100Below2000 = last100Amounts.filter(a => a < 2000)
    const last100Above3000 = last100Amounts.filter(a => a > 3000)
    const last100InRange = last100Amounts.filter(a => a >= 2000 && a <= 3000)
    
    console.log('📊 Análisis de los últimos 100 movimientos (nuevos):')
    console.log(`   Total con pagos: ${last100Amounts.length}`)
    console.log(`   Montos entre 2000-3000 CLP: ${last100InRange.length}`)
    if (last100Below2000.length > 0) {
      console.log(`   ⚠️  Montos menores a 2000 CLP: ${last100Below2000.length}`)
    }
    if (last100Above3000.length > 0) {
      console.log(`   ⚠️  Montos mayores a 3000 CLP: ${last100Above3000.length}`)
    }
    if (last100Below2000.length === 0 && last100Above3000.length === 0) {
      console.log('   ✅ Todos los montos están entre 2000 y 3000 CLP')
    }
    
    // Verificar todos los movimientos
    const allAmounts = Array.from(paymentsBySession.values()).map(p => Number(p.amount || 0))
    const amountsBelow2000 = allAmounts.filter(a => a < 2000 && a > 0)
    const amountsAbove3000 = allAmounts.filter(a => a > 3000)
    
    if (amountsBelow2000.length > 0) {
      console.log(`\n⚠️  En total hay ${amountsBelow2000.length} pagos con montos menores a 2000 CLP (movimientos anteriores)`)
    }
    
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

verifySpecificParkings()
