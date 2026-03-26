// Script para verificar movimientos generados y por qué no aparecen en el historial

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

async function checkHistoryData() {
  console.log('🔍 Verificando movimientos generados...\n')
  
  try {
    // 1. Obtener org_id de JIS Parking
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('slug', 'jis-parking')
      .single()
    
    if (orgError || !orgData) {
      console.error('❌ Error obteniendo organización:', orgError)
      return
    }
    
    const orgId = orgData.id
    console.log('✅ Organización:', orgData.name, `(${orgId})`)
    
    // 2. Obtener parkings de JIS Parking
    const { data: parkingsData, error: parkingsError } = await supabase
      .from('parkings')
      .select('id, name, org_id, status')
      .eq('org_id', orgId)
      .eq('status', 'active')
    
    if (parkingsError) {
      console.error('❌ Error obteniendo parkings:', parkingsError)
      return
    }
    
    console.log(`\n✅ Parkings activos: ${parkingsData?.length || 0}`)
    parkingsData?.forEach(p => {
      console.log(`   - ${p.name} (${p.id})`)
    })
    
    const parkingIds = parkingsData?.map(p => p.id) || []
    
    // 3. Contar sesiones totales
    const { count: totalSessions, error: sessionsCountError } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
    
    console.log(`\n📊 Total de sesiones en JIS Parking: ${totalSessions || 0}`)
    
    // 4. Contar sesiones por estado
    const { count: closedSessions, error: closedError } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'closed')
    
    const { count: openSessions, error: openError } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'open')
    
    console.log(`   - Cerradas: ${closedSessions || 0}`)
    console.log(`   - Abiertas: ${openSessions || 0}`)
    
    // 5. Verificar sesiones filtradas por parking_id (como lo hace el historial)
    if (parkingIds.length > 0) {
      const { data: filteredSessions, error: filteredError } = await supabase
        .from('sessions')
        .select('id, entry_time, exit_time, status, parking_id')
        .in('parking_id', parkingIds)
        .order('entry_time', { ascending: false })
        .limit(10)
      
      if (filteredError) {
        console.error('❌ Error obteniendo sesiones filtradas:', filteredError)
      } else {
        console.log(`\n📋 Últimas 10 sesiones (filtradas por parking_id):`)
        filteredSessions?.forEach((s, i) => {
          console.log(`   ${i + 1}. ${s.id.substring(0, 8)}... - ${s.entry_time} - ${s.status}`)
        })
      }
    }
    
    // 6. Verificar rangos de fechas
    const { data: dateRange, error: dateError } = await supabase
      .from('sessions')
      .select('entry_time, exit_time')
      .eq('org_id', orgId)
      .order('entry_time', { ascending: false })
      .limit(1)
    
    if (dateRange && dateRange.length > 0) {
      console.log(`\n📅 Última sesión generada:`)
      console.log(`   - Entry: ${dateRange[0].entry_time}`)
      console.log(`   - Exit: ${dateRange[0].exit_time}`)
    }
    
    // 7. Verificar pagos asociados
    const { count: totalPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
    
    console.log(`\n💳 Total de pagos: ${totalPayments || 0}`)
    
    // 8. Verificar sesiones sin pagos
    const { data: sessionsWithoutPayments, error: noPaymentsError } = await supabase
      .from('sessions')
      .select('id, entry_time, status')
      .eq('org_id', orgId)
      .eq('status', 'closed')
      .limit(5)
    
    if (sessionsWithoutPayments && sessionsWithoutPayments.length > 0) {
      console.log(`\n⚠️  Verificando si hay sesiones cerradas sin pagos...`)
      for (const session of sessionsWithoutPayments) {
        const { count: paymentCount } = await supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('status', 'completed')
        
        if (paymentCount === 0) {
          console.log(`   ⚠️  Sesión ${session.id.substring(0, 8)}... sin pago (entry: ${session.entry_time})`)
        }
      }
    }
    
    // 9. Verificar el límite de 1000 del historial
    if (totalSessions && totalSessions > 1000) {
      console.log(`\n⚠️  ADVERTENCIA: Hay ${totalSessions} sesiones pero el historial solo muestra las últimas 1000`)
      console.log(`   Las sesiones más antiguas no aparecerán en el historial`)
    }
    
    // 10. Verificar si las fechas están en el rango esperado (Oct 2025 - Ene 2026)
    const { data: dateCheck, error: dateCheckError } = await supabase
      .from('sessions')
      .select('entry_time')
      .eq('org_id', orgId)
      .gte('entry_time', '2025-10-01')
      .lte('entry_time', '2026-01-31')
    
    console.log(`\n📅 Sesiones en rango Oct 2025 - Ene 2026: ${dateCheck?.length || 0}`)
    
    // 11. Verificar si el usuario tiene orgId correcto
    console.log(`\n👤 Para verificar en el historial:`)
    console.log(`   - El usuario debe tener org_id: ${orgId}`)
    console.log(`   - Los parkings deben estar activos`)
    console.log(`   - Las fechas deben estar dentro del rango filtrado`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkHistoryData()
