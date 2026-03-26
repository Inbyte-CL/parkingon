// Script para verificar los movimientos más recientes

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

async function checkRecentMovements() {
  console.log('🔍 Verificando movimientos recientes...\n')
  
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
    
    // Obtener las últimas 600 sesiones ordenadas por created_at
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, entry_time, created_at, parking_id, parkings:parking_id(name)')
      .eq('org_id', orgData.id)
      .order('created_at', { ascending: false })
      .limit(600)
    
    if (sessionsError) {
      throw new Error(`Error obteniendo sesiones: ${sessionsError.message}`)
    }
    
    // Obtener pagos de estas sesiones
    const sessionIds = sessionsData?.map(s => s.id) || []
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('session_id, payment_method, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })
    
    const paymentsBySession = new Map()
    if (paymentsData) {
      paymentsData.forEach(p => {
        paymentsBySession.set(p.session_id, p.payment_method)
      })
    }
    
    // Analizar los últimos 500 movimientos
    const last500 = sessionsData.slice(0, 500)
    
    const paymentMethodCounts = {}
    const monthCounts = {
      'Noviembre 2025': 0,
      'Diciembre 2025': 0,
      'Enero 2026': 0
    }
    
    last500.forEach(session => {
      const paymentMethod = paymentsBySession.get(session.id) || 'null'
      paymentMethodCounts[paymentMethod] = (paymentMethodCounts[paymentMethod] || 0) + 1
      
      const date = new Date(session.entry_time)
      const month = date.getMonth()
      const year = date.getFullYear()
      
      if (year === 2025 && month === 10) {
        monthCounts['Noviembre 2025']++
      } else if (year === 2025 && month === 11) {
        monthCounts['Diciembre 2025']++
      } else if (year === 2026 && month === 0) {
        monthCounts['Enero 2026']++
      }
    })
    
    console.log('='.repeat(80))
    console.log('📊 ANÁLISIS DE LOS ÚLTIMOS 500 MOVIMIENTOS')
    console.log('='.repeat(80))
    console.log(`Total analizados: ${last500.length}`)
    console.log()
    
    console.log('📅 Distribución por mes:')
    Object.entries(monthCounts).forEach(([month, count]) => {
      console.log(`   ${month}: ${count} movimientos`)
    })
    console.log()
    
    console.log('💳 Distribución por método de pago:')
    Object.entries(paymentMethodCounts).forEach(([method, count]) => {
      const methodName = method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method === 'qr_payment' ? 'QR' : method
      console.log(`   ${methodName}: ${count} pagos`)
    })
    console.log()
    
    const invalidMethods = Object.keys(paymentMethodCounts).filter(m => m !== 'cash' && m !== 'card' && m !== 'null')
    if (invalidMethods.length > 0) {
      console.log(`⚠️  Métodos de pago no esperados encontrados: ${invalidMethods.join(', ')}`)
      console.log(`   Esto puede ser de movimientos anteriores o un error en la generación`)
    } else {
      console.log('✅ Todos los métodos de pago son válidos (solo Efectivo y Tarjeta)')
    }
    
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkRecentMovements()
