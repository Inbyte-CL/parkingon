// Script para generar movimientos para parkings específicos
// Genera 100 movimientos para Parking Calle 2 y Mall del Centro

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

function generatePlate() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  let plate = ''
  for (let i = 0; i < 3; i++) {
    plate += letters[Math.floor(Math.random() * letters.length)]
  }
  for (let i = 0; i < 3; i++) {
    plate += numbers[Math.floor(Math.random() * numbers.length)]
  }
  return plate
}

function generateSessionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'TEST' + Date.now().toString(36)
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code.toUpperCase()
}

async function generateMovementsForSpecificParkings() {
  console.log('🚀 Generando 100 movimientos para Parking Calle 2 y Mall del Centro...\n')
  
  try {
    // 1. Obtener datos necesarios
    console.log('📋 Obteniendo datos necesarios...')
    
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
    
    if (parkingsError || !parkingsData || parkingsData.length === 0) {
      throw new Error(`Error obteniendo parkings: ${parkingsError?.message || 'No se encontraron los parkings'}`)
    }
    
    console.log(`✅ Parkings encontrados: ${parkingsData.map(p => p.name).join(', ')}`)
    
    // Obtener operadores asignados a estos parkings
    const parkingIds = parkingsData.map(p => p.id)
    const { data: membershipsData, error: membershipsError } = await supabase
      .from('memberships')
      .select('user_id, parking_id')
      .eq('org_id', orgData.id)
      .eq('role', 'operador')
      .eq('status', 'active')
      .in('parking_id', parkingIds)
    
    if (membershipsError || !membershipsData || membershipsData.length === 0) {
      throw new Error(`Error obteniendo operadores: ${membershipsError?.message || 'No hay operadores asignados a estos parkings'}`)
    }
    
    // Crear lista de operador-parking válidos
    const operatorParkingPairs = membershipsData
      .filter(m => m.parking_id && parkingIds.includes(m.parking_id))
      .map(m => ({
        userId: m.user_id,
        parkingId: m.parking_id,
        parkingName: parkingsData.find(p => p.id === m.parking_id)?.name || 'Desconocido'
      }))
    
    if (operatorParkingPairs.length === 0) {
      throw new Error('No hay operadores con parking asignado para estos parkings')
    }
    
    console.log(`✅ Operadores encontrados: ${operatorParkingPairs.length}`)
    operatorParkingPairs.forEach(pair => {
      console.log(`   - ${pair.parkingName}: 1 operador`)
    })
    
    // Si no hay operadores para alguno de los parkings, asignar operadores de otros parkings
    const parkingsWithoutOperators = parkingsData.filter(p => 
      !operatorParkingPairs.some(pair => pair.parkingId === p.id)
    )
    
    if (parkingsWithoutOperators.length > 0) {
      console.log(`\n⚠️  Los siguientes parkings no tienen operadores asignados:`)
      parkingsWithoutOperators.forEach(p => console.log(`   - ${p.name}`))
      console.log(`   Se asignarán operadores de otros parkings para estos movimientos\n`)
      
      // Obtener todos los operadores de JIS Parking
      const { data: allOperators, error: allOpsError } = await supabase
        .from('memberships')
        .select('user_id, parking_id')
        .eq('org_id', orgData.id)
        .eq('role', 'operador')
        .eq('status', 'active')
      
      if (!allOpsError && allOperators) {
        // Asignar operadores aleatorios a los parkings sin operador
        parkingsWithoutOperators.forEach(parking => {
          const randomOperator = allOperators[Math.floor(Math.random() * allOperators.length)]
          if (randomOperator) {
            operatorParkingPairs.push({
              userId: randomOperator.user_id,
              parkingId: parking.id,
              parkingName: parking.name
            })
            console.log(`   ✅ Asignado operador a ${parking.name}`)
          }
        })
      }
    }
    
    // Obtener tarifa
    const { data: tariffData, error: tariffError } = await supabase
      .from('tariffs')
      .select('price_per_minute')
      .eq('org_id', orgData.id)
      .lte('valid_from', new Date().toISOString())
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString())
      .order('parking_id', { ascending: true, nullsFirst: false })
      .order('valid_from', { ascending: false })
      .limit(1)
      .single()
    
    const tariffPrice = parseFloat(tariffData?.price_per_minute || 100.00)
    
    console.log(`\n✅ Datos obtenidos:`)
    console.log(`   Org ID: ${orgData.id}`)
    console.log(`   Parkings objetivo: ${parkingsData.map(p => p.name).join(', ')}`)
    console.log(`   Operadores disponibles: ${operatorParkingPairs.length}`)
    console.log(`   Tarifa: ${tariffPrice} CLP/min`)
    console.log(`   Montos: 2000 - 3000 CLP\n`)
    
    // 2. Crear turnos para cada operador-parking único
    const periodStart = new Date('2025-11-01')
    const periodEnd = new Date('2026-01-31T23:59:59')
    
    const shiftsMap = new Map()
    
    for (const pair of operatorParkingPairs) {
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          org_id: orgData.id,
          user_id: pair.userId,
          parking_id: pair.parkingId,
          status: 'closed',
          opening_time: periodStart.toISOString(),
          closing_time: periodEnd.toISOString(),
          opening_cash: 0,
          closing_cash: 0,
          cash_sales: 0,
          expected_cash_drawer: 0,
          difference: 0
        })
        .select('id')
        .single()
      
      if (shiftError || !shiftData) {
        console.warn(`⚠️  Error creando turno para operador ${pair.userId} en parking ${pair.parkingName}: ${shiftError?.message}`)
        continue
      }
      
      const key = `${pair.userId}-${pair.parkingId}`
      shiftsMap.set(key, shiftData.id)
    }
    
    console.log(`✅ Turnos creados: ${shiftsMap.size}\n`)
    
    // 3. Generar 100 movimientos distribuidos entre los parkings objetivo
    const paymentMethods = ['cash', 'card']
    const cashSalesByShift = new Map()
    
    console.log('🔄 Generando movimientos...')
    
    let successCount = 0
    for (let i = 1; i <= 100; i++) {
      // Seleccionar aleatoriamente un operador-parking de los parkings objetivo
      const randomPair = operatorParkingPairs[Math.floor(Math.random() * operatorParkingPairs.length)]
      const shiftKey = `${randomPair.userId}-${randomPair.parkingId}`
      const shiftId = shiftsMap.get(shiftKey)
      
      if (!shiftId) {
        console.warn(`⚠️  No se encontró turno para ${shiftKey}, saltando movimiento ${i}`)
        continue
      }
      
      // Generar tiempos aleatorios entre Nov 2025 y Ene 2026
      const entryTime = new Date(
        periodStart.getTime() + 
        Math.random() * (periodEnd.getTime() - periodStart.getTime())
      )
      
      // Monto entre 2000 y 3000
      const amount = 2000 + Math.floor(Math.random() * 1001)
      const minutes = Math.ceil(amount / tariffPrice)
      const exitTime = new Date(entryTime.getTime() + minutes * 60 * 1000)
      
      if (exitTime > periodEnd) {
        exitTime.setTime(periodEnd.getTime())
      }
      
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
      const plate = generatePlate()
      const sessionCode = generateSessionCode()
      
      // Crear sesión
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          org_id: orgData.id,
          parking_id: randomPair.parkingId,
          shift_id: shiftId,
          plate: plate,
          session_code: sessionCode,
          status: 'closed',
          entry_time: entryTime.toISOString(),
          exit_time: exitTime.toISOString(),
          created_by: randomPair.userId
        })
        .select('id')
        .single()
      
      if (sessionError || !sessionData) {
        console.error(`❌ Error creando sesión ${i}:`, sessionError?.message)
        continue
      }
      
      // Crear quote
      const quoteId = `quote_${sessionData.id}_${Math.floor(exitTime.getTime() / 1000)}`
      const expiresAt = new Date(exitTime.getTime() + 3 * 60 * 1000)
      
      const { error: quoteError } = await supabase
        .from('payment_quotes')
        .insert({
          quote_id: quoteId,
          org_id: orgData.id,
          session_id: sessionData.id,
          parking_id: randomPair.parkingId,
          created_by: randomPair.userId,
          exit_time_locked: exitTime.toISOString(),
          minutes_locked: minutes,
          tariff_applied: tariffPrice,
          amount_locked: amount,
          expires_at: expiresAt.toISOString(),
          status: 'used'
        })
      
      if (quoteError) {
        console.error(`❌ Error creando quote ${i}:`, quoteError.message)
        continue
      }
      
      // Crear pago
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          org_id: orgData.id,
          session_id: sessionData.id,
          shift_id: shiftId,
          quote_id: quoteId,
          amount: amount,
          minutes: minutes,
          exit_time_locked: exitTime.toISOString(),
          tariff_applied: tariffPrice,
          payment_method: paymentMethod,
          status: 'completed',
          created_by: randomPair.userId
        })
      
      if (paymentError) {
        console.error(`❌ Error creando pago ${i}:`, paymentError.message)
        continue
      }
      
      // Acumular ventas en efectivo por turno
      if (paymentMethod === 'cash') {
        const currentCash = cashSalesByShift.get(shiftId) || 0
        cashSalesByShift.set(shiftId, currentCash + amount)
      }
      
      successCount++
      if (i % 20 === 0) {
        console.log(`   ✅ Generados ${i}/100 movimientos...`)
      }
    }
    
    // 4. Actualizar todos los turnos con sus ventas
    for (const [shiftKey, shiftId] of shiftsMap.entries()) {
      const cashSales = cashSalesByShift.get(shiftId) || 0
      const { error: updateError } = await supabase
        .from('shifts')
        .update({
          cash_sales: cashSales,
          expected_cash_drawer: cashSales,
          closing_cash: cashSales,
          difference: 0
        })
        .eq('id', shiftId)
      
      if (updateError) {
        console.warn(`⚠️  Error actualizando turno ${shiftId}:`, updateError.message)
      }
    }
    
    // 5. Verificar distribución
    const allShiftIds = Array.from(shiftsMap.values())
    const { data: sessionsData, error: sessionsDataError } = await supabase
      .from('sessions')
      .select('parking_id, parkings:parking_id(name)')
      .in('shift_id', allShiftIds)
    
    const parkingCounts = {}
    if (sessionsData) {
      sessionsData.forEach(s => {
        const parkingName = Array.isArray(s.parkings) 
          ? (s.parkings[0]?.name || 'Desconocido')
          : (s.parkings?.name || 'Desconocido')
        parkingCounts[parkingName] = (parkingCounts[parkingName] || 0) + 1
      })
    }
    
    const totalCashSales = Array.from(cashSalesByShift.values()).reduce((sum, val) => sum + val, 0)
    
    console.log('\n========================================')
    console.log('✅ GENERACIÓN COMPLETADA')
    console.log('========================================')
    console.log(`Movimientos exitosos: ${successCount}/100`)
    console.log(`Ventas en efectivo totales: ${totalCashSales.toLocaleString('es-CL')} CLP`)
    console.log(`Turnos utilizados: ${shiftsMap.size}`)
    console.log(`Período: Nov 2025 - Ene 2026`)
    console.log()
    console.log('🅿️  Distribución por parking:')
    Object.entries(parkingCounts).forEach(([parking, count]) => {
      console.log(`   ${parking}: ${count} movimientos`)
    })
    console.log('========================================\n')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

generateMovementsForSpecificParkings()
