/**
 * Script para listar todos los usuarios y sus roles desde Supabase
 * Ejecutar con: node scripts/list-users.js
 */

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

async function listAllUsers() {
  console.log('🔍 Consultando usuarios desde Supabase...\n')
  
  try {
    // Consulta 1: Lista completa de usuarios
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('*')
    
    if (usersError) {
      console.error('❌ Error consultando auth.users directamente:', usersError)
      // Intentar método alternativo usando RPC o consulta directa
      console.log('\n📝 Intentando método alternativo...\n')
    }

    // Método alternativo: consultar memberships y luego usuarios
    const { data: memberships, error: membershipsError } = await supabase
      .from('memberships')
      .select(`
        id,
        user_id,
        role,
        status,
        display_name,
        org_id,
        parking_id,
        organizations:org_id (name),
        parkings:parking_id (name, status)
      `)
      .eq('status', 'active')
      .order('role', { ascending: true })

    if (membershipsError) {
      console.error('❌ Error consultando memberships:', membershipsError)
      return
    }

    console.log('='.repeat(80))
    console.log('📊 USUARIOS Y ROLES')
    console.log('='.repeat(80))
    console.log()

    // Obtener información de usuarios desde auth.users usando RPC o consulta directa
    // Como no podemos consultar auth.users directamente, usaremos los user_ids de memberships
    const userIds = memberships.map(m => m.user_id)
    
    // Para cada membership, intentar obtener el email del usuario
    const usersWithDetails = []
    
    for (const membership of memberships) {
      // Intentar obtener el usuario usando admin API
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(membership.user_id)
      
      if (userError) {
        console.warn(`⚠️  No se pudo obtener usuario ${membership.user_id}:`, userError.message)
        continue
      }

      const isSuperadmin = userData.user?.user_metadata?.is_superadmin || false
      
      usersWithDetails.push({
        email: userData.user?.email || 'N/A',
        userId: membership.user_id,
        isSuperadmin,
        role: isSuperadmin ? 'superadmin' : membership.role,
        displayName: membership.display_name,
        organization: membership.organizations?.name || 'N/A',
        parking: membership.parkings?.name || 'N/A',
        parkingStatus: membership.parkings?.status || 'N/A',
        membershipStatus: membership.status
      })
    }

    // Mostrar usuarios con membership
    if (usersWithDetails.length > 0) {
      console.log('👥 USUARIOS CON MEMBERSHIP ACTIVO:')
      console.log('-'.repeat(80))
      usersWithDetails.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.email}`)
        console.log(`   ID: ${user.userId}`)
        console.log(`   Rol: ${user.role} ${user.isSuperadmin ? '(Superadmin)' : ''}`)
        if (user.displayName) {
          console.log(`   Nombre: ${user.displayName}`)
        }
        if (user.organization !== 'N/A') {
          console.log(`   Organización: ${user.organization}`)
        }
        if (user.parking !== 'N/A') {
          console.log(`   Parking: ${user.parking} (${user.parkingStatus})`)
        }
        console.log(`   Estado: ${user.membershipStatus}`)
      })
    }

    // Resumen por rol
    console.log('\n' + '='.repeat(80))
    console.log('📊 RESUMEN POR ROL')
    console.log('='.repeat(80))
    
    const roleCount = {}
    usersWithDetails.forEach(user => {
      const role = user.role || 'sin_rol'
      roleCount[role] = (roleCount[role] || 0) + 1
    })

    Object.entries(roleCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([role, count]) => {
        console.log(`   ${role}: ${count} usuario(s)`)
      })

    console.log('\n✅ Consulta completada\n')

  } catch (error) {
    console.error('❌ Error inesperado:', error)
  }
}

// Ejecutar
listAllUsers()
