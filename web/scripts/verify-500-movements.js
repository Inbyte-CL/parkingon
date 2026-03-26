// Script para verificar los 500 movimientos generados

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

async function verifyMovements() {
  console.log('🔍 Verificando movimientos generados...\n')
  
  try {
    // Obtener org_id de JIS Parking
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'jis-parking')
      .single()
    
    if (orgError || !orgData) {
      throw new Error(`Error obteniendo organización: ${orgError?.message}`)
    }
    
    // Rango de fechas: Nov 2025 - Ene 2026
    const periodStart = new Date('2025-11-01')
    const periodEnd = new Date('2026-01-31T23:59:59')
    
    // Contar sesiones en el período
    const { count: sessionsCount, error: sessionsError } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgData.id)
      .gte('entry_time', periodStart.toISOString())
      .lte('entry_time', periodEnd.toISOString())
    
    if (sessionsError) {
      throw new Error(`Error contando sesiones: ${sessionsError.message}`)
    }
    
    // Contar pagos en el período
    const { count: paymentsCount, error: paymentsError } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgData.id)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())
    
    if (paymentsError) {
      throw new Error(`Error contando pagos: ${paymentsError.message}`)
    }
    
    // Obtener distribución por método de pago
    const { data: paymentsData, error: paymentsDataError } = await supabase
      .from('payments')
      .select('payment_method')
      .eq('org_id', orgData.id)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())
    
    const paymentMethodCounts = {}
    if (paymentsData) {
      paymentsData.forEach(p => {
        const method = p.payment_method || 'null'
        paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1
      })
    }
    
    // Obtener distribución por parking
    const { data: sessionsData, error: sessionsDataError } = await supabase
      .from('sessions')
      .select('parking_id, parkings:parking_id(name)')
      .eq('org_id', orgData.id)
      .gte('entry_time', periodStart.toISOString())
      .lte('entry_time', periodEnd.toISOString())
      .limit(1000)
    
    const parkingCounts = {}
    if (sessionsData) {
      sessionsData.forEach(s => {
        const parkingName = Array.isArray(s.parkings) 
          ? (s.parkings[0]?.name || 'Desconocido')
          : (s.parkings?.name || 'Desconocido')
        parkingCounts[parkingName] = (parkingCounts[parkingName] || 0) + 1
      })
    }
    
    // Obtener distribución por operador
    const { data: sessionsWithOperators, error: operatorsError } = await supabase
      .from('sessions')
      .select('created_by')
      .eq('org_id', orgData.id)
      .gte('entry_time', periodStart.toISOString())
      .lte('entry_time', periodEnd.toISOString())
      .limit(1000)
    
    const operatorCounts = {}
    if (sessionsWithOperators) {
      sessionsWithOperators.forEach(s => {
        const operatorId = s.created_by || 'null'
        operatorCounts[operatorId] = (operatorCounts[operatorId] || 0) + 1
      })
    }
    
    // Obtener distribución por mes
    const { data: sessionsByMonth, error: monthError } = await supabase
      .from('sessions')
      .select('entry_time')
      .eq('org_id', orgData.id)
      .gte('entry_time', periodStart.toISOString())
      .lte('entry_time', periodEnd.toISOString())
      .limit(1000)
    
    const monthCounts = {
      'Noviembre 2025': 0,
      'Diciembre 2025': 0,
      'Enero 2026': 0
    }
    
    if (sessionsByMonth) {
      sessionsByMonth.forEach(s => {
        const date = new Date(s.entry_time)
        const month = date.getMonth()
        const year = date.getFullYear()
        
        if (year === 2025 && month === 10) { // Noviembre (0-indexed)
          monthCounts['Noviembre 2025']++
        } else if (year === 2025 && month === 11) { // Diciembre
          monthCounts['Diciembre 2025']++
        } else if (year === 2026 && month === 0) { // Enero
          monthCounts['Enero 2026']++
        }
      })
    }
    
    console.log('='.repeat(80))
    console.log('📊 RESUMEN DE MOVIMIENTOS GENERADOS')
    console.log('='.repeat(80))
    console.log(`Período: Noviembre 2025 - Enero 2026`)
    console.log(`Total de sesiones: ${sessionsCount || 0}`)
    console.log(`Total de pagos: ${paymentsCount || 0}`)
    console.log()
    
    console.log('📅 Distribución por mes:')
    Object.entries(monthCounts).forEach(([month, count]) => {
      console.log(`   ${month}: ${count} movimientos`)
    })
    console.log()
    
    console.log('💳 Distribución por método de pago:')
    Object.entries(paymentMethodCounts).forEach(([method, count]) => {
      const methodName = method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method
      console.log(`   ${methodName}: ${count} pagos`)
    })
    console.log()
    
    console.log('🅿️  Distribución por parking (primeros 1000 registros):')
    Object.entries(parkingCounts).forEach(([parking, count]) => {
      console.log(`   ${parking}: ${count} movimientos`)
    })
    console.log()
    
    console.log('👤 Distribución por operador (primeros 1000 registros):')
    console.log(`   Total de operadores únicos: ${Object.keys(operatorCounts).length}`)
    Object.entries(operatorCounts).slice(0, 10).forEach(([operatorId, count]) => {
      console.log(`   ${operatorId.substring(0, 8)}...: ${count} movimientos`)
    })
    console.log()
    
    if (sessionsCount === 500) {
      console.log('✅ ¡Perfecto! Se generaron exactamente 500 movimientos')
    } else if (sessionsCount > 500) {
      console.log(`⚠️  Se generaron ${sessionsCount} movimientos (más de los esperados)`)
    } else {
      console.log(`⚠️  Se generaron ${sessionsCount} movimientos (menos de los esperados)`)
    }
    
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

verifyMovements()
