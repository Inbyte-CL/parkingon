/**
 * Establece la contraseña de un usuario Auth por email (ej. superadmin).
 * Usa SUPABASE_SERVICE_ROLE_KEY de .env.local — no subas ese archivo a git.
 *
 * Uso (desde la carpeta web):
 *   node scripts/set-superadmin-password.js carlosm@inbyte.cl "NuevaContraseña"
 *
 * O por variables:
 *   set SUPERADMIN_EMAIL=...
 *   set NEW_PASSWORD=...
 */
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const email = process.argv[2] || process.env.SUPERADMIN_EMAIL || 'carlosm@inbyte.cl'
const password = process.argv[3] || process.env.NEW_PASSWORD

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
    process.exit(1)
  }
  if (!password || password.length < 6) {
    console.error('Uso: node scripts/set-superadmin-password.js <email> <password>')
    console.error('La contraseña debe tener al menos 6 caracteres.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userId = null
  let page = 1
  const perPage = 1000
  while (!userId) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('Error listando usuarios:', error.message)
      process.exit(1)
    }
    const users = data?.users || []
    const u = users.find((x) => (x.email || '').toLowerCase() === email.toLowerCase())
    if (u) {
      userId = u.id
      break
    }
    if (users.length < perPage) break
    page += 1
  }

  if (!userId) {
    console.error(`No existe usuario con email: ${email}`)
    process.exit(1)
  }

  const { data, error } = await supabase.auth.admin.updateUserById(userId, { password })
  if (error) {
    console.error('Error actualizando contraseña:', error.message)
    process.exit(1)
  }

  console.log('Contraseña actualizada.')
  console.log('  user_id:', data.user?.id)
  console.log('  email:', data.user?.email)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
