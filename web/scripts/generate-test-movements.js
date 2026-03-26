// Script para generar 100 movimientos de prueba usando la API de Supabase
// Ejecuta el SQL directamente

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
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

async function generateTestMovements() {
  console.log('🚀 Generando 100 movimientos de prueba...\n')
  
  try {
    // Leer el script SQL
    const sqlPath = path.join(__dirname, '..', '..', 'database', 'generate-100-test-movements.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📄 Script SQL cargado')
    console.log('⏳ Ejecutando script (esto puede tardar unos minutos)...\n')
    
    // Ejecutar el script SQL usando RPC o directamente
    // Nota: Supabase JS no tiene un método directo para ejecutar SQL arbitrario
    // Necesitamos usar el SQL Editor o ejecutar desde la consola de Supabase
    
    console.log('⚠️  Nota: Este script necesita ejecutarse desde el SQL Editor de Supabase')
    console.log('   o usando psql directamente conectado a la base de datos.')
    console.log('\n📋 Para ejecutar:')
    console.log('   1. Abre el SQL Editor en Supabase')
    console.log('   2. Copia el contenido de: database/generate-100-test-movements.sql')
    console.log('   3. Ejecuta el script')
    console.log('\n   O ejecuta desde psql:')
    console.log(`   psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f database/generate-100-test-movements.sql`)
    
    // Alternativa: generar los movimientos usando la API de Supabase
    console.log('\n🔄 Intentando generar movimientos usando la API...\n')
    
    // Obtener datos necesarios
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'jis-parking')
      .single()
    
    if (!orgData) {
      throw new Error('No se encontró JIS Parking')
    }
    
    const { data: parkingData } = await supabase
      .from('parkings')
      .select('id')
      .eq('org_id', orgData.id)
      .eq('status', 'active')
      .limit(1)
      .single()
    
    if (!parkingData) {
      throw new Error('No se encontró parking activo')
    }
    
    const { data: membershipData } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', orgData.id)
      .eq('role', 'operador')
      .eq('status', 'active')
      .limit(1)
      .single()
    
    if (!membershipData) {
      throw new Error('No se encontró operador activo')
    }
    
    console.log('✅ Datos obtenidos:')
    console.log(`   Org ID: ${orgData.id}`)
    console.log(`   Parking ID: ${parkingData.id}`)
    console.log(`   Operador ID: ${membershipData.user_id}`)
    console.log('\n⚠️  Para generar los movimientos, ejecuta el SQL desde Supabase SQL Editor')
    console.log('   El archivo está en: database/generate-100-test-movements.sql')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

generateTestMovements()
