// Script para verificar métodos de pago de los últimos movimientos

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

async function checkPaymentsMethods() {
  console.log('🔍 Verificando métodos de pago...\n')
  
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
    
    // Obtener pagos en el período
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('id, payment_method, created_at, session_id')
      .eq('org_id', orgData.id)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())
      .order('created_at', { ascending: false })
    
    if (paymentsError) {
      throw new Error(`Error obteniendo pagos: ${paymentsError.message}`)
    }
    
    console.log(`Total de pagos en el período: ${paymentsData?.length || 0}`)
    
    // Contar por método de pago
    const methodCounts = {}
    if (paymentsData) {
      paymentsData.forEach(p => {
        const method = p.payment_method || 'null'
        methodCounts[method] = (methodCounts[method] || 0) + 1
      })
    }
    
    console.log('\n💳 Distribución por método de pago:')
    Object.entries(methodCounts).forEach(([method, count]) => {
      const methodName = method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method === 'qr_payment' ? 'QR' : method
      console.log(`   ${methodName}: ${count} pagos`)
    })
    
    // Verificar los últimos 500 pagos
    const last500Payments = paymentsData?.slice(0, 500) || []
    const last500MethodCounts = {}
    last500Payments.forEach(p => {
      const method = p.payment_method || 'null'
      last500MethodCounts[method] = (last500MethodCounts[method] || 0) + 1
    })
    
    console.log('\n💳 Distribución de los últimos 500 pagos:')
    Object.entries(last500MethodCounts).forEach(([method, count]) => {
      const methodName = method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method === 'qr_payment' ? 'QR' : method
      console.log(`   ${methodName}: ${count} pagos`)
    })
    
    const invalidMethods = Object.keys(last500MethodCounts).filter(m => m !== 'cash' && m !== 'card' && m !== 'null')
    if (invalidMethods.length > 0) {
      console.log(`\n⚠️  Métodos de pago no esperados en los últimos 500: ${invalidMethods.join(', ')}`)
    } else {
      console.log('\n✅ Los últimos 500 pagos solo tienen Efectivo y Tarjeta (o null)')
    }
    
    console.log('\n' + '='.repeat(80))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkPaymentsMethods()
