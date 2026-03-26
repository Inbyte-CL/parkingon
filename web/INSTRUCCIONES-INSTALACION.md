# 📋 Instrucciones de Instalación

## ⚠️ IMPORTANTE: Reinicia tu Terminal

Después de instalar Node.js, **debes cerrar y abrir una nueva ventana de PowerShell/CMD** para que reconozca los comandos.

## Pasos a Seguir

### 1. Abrir Nueva Terminal
- Cierra la terminal actual
- Abre una **nueva** ventana de PowerShell o CMD

### 2. Verificar Node.js
```powershell
node --version
npm --version
```

Si ambos comandos funcionan, continúa. Si no, reinicia la computadora.

### 3. Navegar al Proyecto
```powershell
cd C:\dev\ParkingOnStreet\web
```

### 4. Instalar Dependencias
```powershell
npm install
```

Esto puede tardar 2-5 minutos la primera vez.

### 5. Configurar Variables de Entorno

Copia el archivo de ejemplo:
```powershell
copy .env.local.example .env.local
```

Edita `.env.local` con un editor de texto y agrega tus credenciales de Supabase:

**Si usas Supabase Cloud:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**Si usas Supabase Local:**
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_local
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_local
```

Para obtener las keys de Supabase:
- **Cloud**: Dashboard de Supabase → Settings → API
- **Local**: Ejecuta `supabase status` en la carpeta `supabase/`

### 6. Ejecutar el Proyecto
```powershell
npm run dev
```

### 7. Abrir en el Navegador
Abre: http://localhost:3000

## ✅ Verificación

Si todo está bien, deberías ver:
- La página de login en http://localhost:3000
- Puedes iniciar sesión con tus credenciales de Supabase

## 🐛 Problemas Comunes

### "npm no se reconoce"
- **Solución**: Reinicia la terminal o la computadora

### "Missing Supabase environment variables"
- **Solución**: Verifica que `.env.local` existe y tiene las variables correctas

### Error de conexión a Supabase
- **Solución**: Verifica que la URL y las keys son correctas
- Si usas Supabase local, asegúrate de que está corriendo: `supabase start`

## 📞 Siguiente Paso

Una vez que el proyecto esté corriendo, avísame y continuamos con:
- Verificación de roles (superadmin/admin)
- Dashboard con métricas reales
- CRUD de empresas
