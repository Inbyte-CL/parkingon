/**
 * Script para crear superadmin: carlosm@inbyte.cl
 * Ejecutar con: node scripts/create-superadmin.js
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

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createSuperadmin() {
  const email = 'carlosm@inbyte.cl'
  const password = 'MoracaN77'

  console.log('🔐 Creando superadmin...')
  console.log(`📧 Email: ${email}`)

  try {
    // 1. Intentar crear el usuario
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        is_superadmin: true
      }
    })

    if (authError) {
      // Si el usuario ya existe, actualizarlo
      if (authError.message?.includes('already registered') || authError.message?.includes('User already registered')) {
        console.log('⚠️  Usuario ya existe, actualizando metadata...')
        
        const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email)
        
        if (existingUser?.user) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.user.id,
            {
              user_metadata: {
                ...existingUser.user.user_metadata,
                is_superadmin: true
              }
            }
          )

          if (updateError) {
            console.error('❌ Error al actualizar usuario:', updateError.message)
            process.exit(1)
          }

          console.log('✅ Usuario existente actualizado como superadmin')
          console.log(`   ID: ${existingUser.user.id}`)
          console.log(`   Email: ${existingUser.user.email}`)
          
          // Verificar que no tenga membership
          const { data: membership } = await supabase
            .from('memberships')
            .select('id')
            .eq('user_id', existingUser.user.id)
            .maybeSingle()

          if (membership) {
            console.log('⚠️  El usuario tiene membership, eliminándolo...')
            await supabase
              .from('memberships')
              .delete()
              .eq('user_id', existingUser.user.id)
            console.log('✅ Membership eliminado')
          }

          return
        }
      }

      console.error('❌ Error al crear usuario:', authError.message)
      process.exit(1)
    }

    if (!authData?.user) {
      console.error('❌ Usuario no creado')
      process.exit(1)
    }

    console.log('✅ Superadmin creado correctamente')
    console.log(`   ID: ${authData.user.id}`)
    console.log(`   Email: ${authData.user.email}`)
    console.log(`   is_superadmin: ${authData.user.user_metadata?.is_superadmin}`)

    // Verificar que no tenga membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (membership) {
      console.log('⚠️  El usuario tiene membership, eliminándolo...')
      await supabase
        .from('memberships')
        .delete()
        .eq('user_id', authData.user.id)
      console.log('✅ Membership eliminado')
    } else {
      console.log('✅ Usuario sin membership (correcto para superadmin)')
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error)
    process.exit(1)
  }
}

createSuperadmin()
