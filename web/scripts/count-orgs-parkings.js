// Script para contar organizaciones y parkings en Supabase
// Uso: node scripts/count-orgs-parkings.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Faltan variables de entorno')
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

// Crear cliente con service_role para tener acceso completo
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function countOrganizationsAndParkings() {
  console.log('🔍 Consultando organizaciones y parkings desde Supabase...\n')
  
  try {
    // Contar organizaciones
    const { data: orgs, error: orgsError, count: orgsCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
    
    if (orgsError) {
      console.error('❌ Error consultando organizaciones:', orgsError)
    } else {
      console.log('='.repeat(80))
      console.log('📊 ORGANIZACIONES')
      console.log('='.repeat(80))
      console.log(`Total de organizaciones: ${orgsCount || 0}\n`)
    }

    // Obtener todas las organizaciones con detalles
    const { data: allOrgs, error: allOrgsError } = await supabase
      .from('organizations')
      .select('id, name, slug, status, created_at')
      .order('name')

    if (allOrgsError) {
      console.error('❌ Error obteniendo detalles de organizaciones:', allOrgsError)
    } else if (allOrgs && allOrgs.length > 0) {
      console.log('📋 Detalles de organizaciones:')
      console.log('-'.repeat(80))
      allOrgs.forEach((org, index) => {
        console.log(`${index + 1}. ${org.name}`)
        console.log(`   ID: ${org.id}`)
        console.log(`   Slug: ${org.slug || 'N/A'}`)
        console.log(`   Estado: ${org.status}`)
        console.log(`   Creada: ${new Date(org.created_at).toLocaleString('es-CL')}`)
        console.log()
      })
    }

    // Contar parkings
    const { data: parkings, error: parkingsError, count: parkingsCount } = await supabase
      .from('parkings')
      .select('*', { count: 'exact', head: true })
    
    if (parkingsError) {
      console.error('❌ Error consultando parkings:', parkingsError)
    } else {
      console.log('='.repeat(80))
      console.log('🅿️  PARKINGS')
      console.log('='.repeat(80))
      console.log(`Total de parkings: ${parkingsCount || 0}\n`)
    }

    // Obtener todos los parkings con detalles
    const { data: allParkings, error: allParkingsError } = await supabase
      .from('parkings')
      .select('id, name, address, status, org_id, total_spaces, created_at, organizations:org_id(name)')
      .order('name')

    if (allParkingsError) {
      console.error('❌ Error obteniendo detalles de parkings:', allParkingsError)
    } else if (allParkings && allParkings.length > 0) {
      console.log('📋 Detalles de parkings:')
      console.log('-'.repeat(80))
      allParkings.forEach((parking, index) => {
        console.log(`${index + 1}. ${parking.name}`)
        console.log(`   ID: ${parking.id}`)
        console.log(`   Dirección: ${parking.address || 'N/A'}`)
        console.log(`   Estado: ${parking.status}`)
        console.log(`   Capacidad: ${parking.total_spaces || 'N/A'} espacios`)
        console.log(`   Organización: ${parking.organizations?.name || 'N/A'}`)
        console.log(`   Creado: ${new Date(parking.created_at).toLocaleString('es-CL')}`)
        console.log()
      })
    }

    // Resumen por organización
    if (allOrgs && allOrgs.length > 0 && allParkings && allParkings.length > 0) {
      console.log('='.repeat(80))
      console.log('📊 RESUMEN POR ORGANIZACIÓN')
      console.log('='.repeat(80))
      
      allOrgs.forEach(org => {
        const orgParkings = allParkings.filter(p => p.org_id === org.id)
        console.log(`\n${org.name}:`)
        console.log(`  - Parkings: ${orgParkings.length}`)
        if (orgParkings.length > 0) {
          orgParkings.forEach(p => {
            console.log(`    • ${p.name} (${p.status})`)
          })
        }
      })
    }

    // Resumen final
    console.log('\n' + '='.repeat(80))
    console.log('✅ RESUMEN FINAL')
    console.log('='.repeat(80))
    console.log(`Total Organizaciones: ${orgsCount || 0}`)
    console.log(`Total Parkings: ${parkingsCount || 0}`)
    console.log('='.repeat(80))

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

countOrganizationsAndParkings()
