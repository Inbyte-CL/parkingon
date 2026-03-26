// Script para verificar las sesiones generadas y sus parkings

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

async function checkSessions() {
  console.log('🔍 Verificando sesiones generadas...\n')
  
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
    
    // Obtener las últimas 10 sesiones de JIS Parking
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        plate,
        parking_id,
        created_by,
        entry_time,
        parkings:parking_id(
          id,
          name,
          org_id
        )
      `)
      .eq('org_id', orgData.id)
      .order('entry_time', { ascending: false })
      .limit(10)
    
    if (sessionsError) {
      throw new Error(`Error obteniendo sesiones: ${sessionsError.message}`)
    }
    
    console.log('='.repeat(80))
    console.log('📊 ÚLTIMAS 10 SESIONES GENERADAS')
    console.log('='.repeat(80))
    
    if (sessionsData && sessionsData.length > 0) {
      for (let index = 0; index < sessionsData.length; index++) {
        const session = sessionsData[index]
        console.log(`\n${index + 1}. Sesión ${session.id}`)
        console.log(`   Patente: ${session.plate}`)
        console.log(`   Parking ID: ${session.parking_id}`)
        console.log(`   Created By: ${session.created_by}`)
        console.log(`   Entry Time: ${session.entry_time}`)
        
        if (session.parkings) {
          console.log(`   ✅ Parking encontrado:`)
          console.log(`      - ID: ${session.parkings.id}`)
          console.log(`      - Nombre: ${session.parkings.name}`)
          console.log(`      - Org ID: ${session.parkings.org_id}`)
        } else {
          console.log(`   ❌ Parking NO encontrado (null/undefined)`)
          
          // Intentar obtener el parking directamente
          if (session.parking_id) {
            const { data: parkingData, error: parkingError } = await supabase
              .from('parkings')
              .select('id, name, org_id')
              .eq('id', session.parking_id)
              .single()
            
            if (parkingError) {
              console.log(`      ⚠️  Error al consultar parking directamente: ${parkingError.message}`)
            } else if (parkingData) {
              console.log(`      ✅ Parking existe en BD pero no se unió en el query:`)
              console.log(`         - ID: ${parkingData.id}`)
              console.log(`         - Nombre: ${parkingData.name}`)
              console.log(`         - Org ID: ${parkingData.org_id}`)
            } else {
              console.log(`      ❌ Parking con ID ${session.parking_id} NO EXISTE en la BD`)
            }
          }
        }
      }
    } else {
      console.log('No se encontraron sesiones')
    }
    
    // Verificar todos los parkings de JIS Parking
    console.log('\n' + '='.repeat(80))
    console.log('🅿️  PARKINGS DE JIS PARKING')
    console.log('='.repeat(80))
    
    const { data: parkingsData, error: parkingsError } = await supabase
      .from('parkings')
      .select('id, name, org_id')
      .eq('org_id', orgData.id)
    
    if (parkingsError) {
      console.error('Error obteniendo parkings:', parkingsError)
    } else if (parkingsData) {
      parkingsData.forEach(p => {
        console.log(`- ${p.name} (ID: ${p.id})`)
      })
    }
    
    // Verificar cuántas sesiones tienen parking_id válido
    const { data: allSessions, error: allSessionsError } = await supabase
      .from('sessions')
      .select('id, parking_id')
      .eq('org_id', orgData.id)
      .order('entry_time', { ascending: false })
      .limit(100)
    
    if (!allSessionsError && allSessions) {
      const sessionsWithParking = allSessions.filter(s => s.parking_id)
      const sessionsWithoutParking = allSessions.filter(s => !s.parking_id)
      
      console.log('\n' + '='.repeat(80))
      console.log('📊 ESTADÍSTICAS DE SESIONES')
      console.log('='.repeat(80))
      console.log(`Total de sesiones consultadas: ${allSessions.length}`)
      console.log(`Sesiones CON parking_id: ${sessionsWithParking.length}`)
      console.log(`Sesiones SIN parking_id: ${sessionsWithoutParking.length}`)
      
      // Verificar si los parking_ids existen
      if (parkingsData) {
        const parkingIds = new Set(parkingsData.map(p => p.id))
        const invalidParkingIds = sessionsWithParking
          .filter(s => !parkingIds.has(s.parking_id))
          .map(s => s.parking_id)
        
        if (invalidParkingIds.length > 0) {
          console.log(`\n⚠️  Sesiones con parking_id inválido: ${invalidParkingIds.length}`)
          const uniqueInvalidIds = [...new Set(invalidParkingIds)]
          uniqueInvalidIds.forEach(id => {
            console.log(`   - ${id}`)
          })
        }
      }
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ Verificación completada')
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkSessions()
