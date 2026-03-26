// Script para verificar operadores y parkings de JIS Parking con sus asignaciones

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

async function checkJISOperatorsAndParkings() {
  console.log('🔍 Verificando operadores y parkings de JIS Parking...\n')
  
  try {
    // 1. Obtener org_id de JIS Parking
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', 'jis-parking')
      .single()
    
    if (orgError || !orgData) {
      console.error('❌ Error obteniendo organización:', orgError)
      return
    }
    
    console.log('='.repeat(80))
    console.log('📊 ORGANIZACIÓN: JIS Parking')
    console.log('='.repeat(80))
    console.log(`ID: ${orgData.id}`)
    console.log(`Nombre: ${orgData.name}`)
    console.log(`Slug: ${orgData.slug}\n`)
    
    // 2. Obtener todos los parkings de JIS Parking
    const { data: parkingsData, error: parkingsError } = await supabase
      .from('parkings')
      .select('id, name, address, status, total_spaces')
      .eq('org_id', orgData.id)
      .order('name')
    
    if (parkingsError) {
      console.error('❌ Error obteniendo parkings:', parkingsError)
      return
    }
    
    console.log('='.repeat(80))
    console.log('🅿️  PARKINGS DE JIS PARKING')
    console.log('='.repeat(80))
    console.log(`Total: ${parkingsData?.length || 0}\n`)
    
    if (parkingsData && parkingsData.length > 0) {
      parkingsData.forEach((parking, index) => {
        console.log(`${index + 1}. ${parking.name}`)
        console.log(`   ID: ${parking.id}`)
        console.log(`   Dirección: ${parking.address || 'N/A'}`)
        console.log(`   Estado: ${parking.status}`)
        console.log(`   Capacidad: ${parking.total_spaces || 'N/A'} espacios`)
        console.log()
      })
    }
    
    // 3. Obtener todos los operadores de JIS Parking
    const { data: membershipsData, error: membershipsError } = await supabase
      .from('memberships')
      .select(`
        user_id,
        display_name,
        role,
        status,
        parking_id,
        parkings:parking_id(name)
      `)
      .eq('org_id', orgData.id)
      .eq('role', 'operador')
      .eq('status', 'active')
      .order('display_name')
    
    if (membershipsError) {
      console.error('❌ Error obteniendo memberships:', membershipsError)
      return
    }
    
    console.log('='.repeat(80))
    console.log('👤 OPERADORES DE JIS PARKING')
    console.log('='.repeat(80))
    console.log(`Total: ${membershipsData?.length || 0}\n`)
    
    // Obtener emails de los usuarios
    const operatorsWithDetails = []
    
    if (membershipsData && membershipsData.length > 0) {
      
      for (const membership of membershipsData) {
        try {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(membership.user_id)
          
          if (userError || !userData?.user) {
            console.warn(`⚠️  No se pudo obtener usuario ${membership.user_id}`)
            continue
          }
          
          operatorsWithDetails.push({
            email: userData.user.email || 'N/A',
            userId: membership.user_id,
            displayName: membership.display_name,
            parkingId: membership.parking_id,
            parkingName: membership.parkings?.name || 'Sin parking asignado'
          })
        } catch (err) {
          console.warn(`⚠️  Error obteniendo usuario ${membership.user_id}:`, err.message)
        }
      }
      
      operatorsWithDetails.forEach((op, index) => {
        console.log(`${index + 1}. ${op.displayName || op.email}`)
        console.log(`   Email: ${op.email}`)
        console.log(`   User ID: ${op.userId}`)
        console.log(`   Parking asignado: ${op.parkingName}`)
        if (op.parkingId) {
          console.log(`   Parking ID: ${op.parkingId}`)
        } else {
          console.log(`   ⚠️  NO TIENE PARKING ASIGNADO`)
        }
        console.log()
      })
    }
    
    // 4. Resumen: Parkings y sus operadores asignados
    console.log('='.repeat(80))
    console.log('📋 RESUMEN: PARKINGS Y SUS OPERADORES')
    console.log('='.repeat(80))
    
    if (parkingsData && parkingsData.length > 0 && operatorsWithDetails.length > 0) {
      parkingsData.forEach(parking => {
        const operators = operatorsWithDetails.filter(o => o.parkingId === parking.id)
        console.log(`\n${parking.name}:`)
        if (operators.length > 0) {
          operators.forEach(op => {
            console.log(`  ✓ ${op.displayName || op.email}`)
          })
        } else {
          console.log(`  ⚠️  Sin operadores asignados`)
        }
      })
    }
    
    // 5. Operadores sin parking asignado
    const operatorsWithoutParking = operatorsWithDetails.filter(o => !o.parkingId)
    if (operatorsWithoutParking.length > 0) {
      console.log('\n' + '='.repeat(80))
      console.log('⚠️  OPERADORES SIN PARKING ASIGNADO')
      console.log('='.repeat(80))
      operatorsWithoutParking.forEach(op => {
        console.log(`- ${op.displayName || op.email}`)
      })
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ Consulta completada')
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkJISOperatorsAndParkings()
