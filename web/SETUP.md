# 🚀 Setup del Proyecto Web

## Prerequisitos

1. **Instalar Node.js 18+**
   - Descargar desde: https://nodejs.org/
   - Verificar instalación: `node --version` y `npm --version`

## Instalación

1. **Instalar dependencias:**
   ```bash
   cd C:\dev\ParkingOnStreet\web
   npm install
   ```

2. **Configurar variables de entorno:**
   - Copiar `.env.local.example` a `.env.local`
   - Editar `.env.local` con tus credenciales de Supabase:
     ```
     NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
     NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
     SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
     ```

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

4. **Abrir en el navegador:**
   - http://localhost:3000

## Estructura del Proyecto

```
web/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas de autenticación
│   │   └── login/        # Página de login
│   ├── (dashboard)/      # Rutas protegidas
│   │   ├── dashboard/    # Dashboard principal
│   │   └── layout.tsx    # Layout del dashboard
│   ├── layout.tsx         # Layout raíz
│   ├── page.tsx          # Página principal (redirige)
│   └── globals.css       # Estilos globales
├── components/            # Componentes React
│   ├── ui/               # Componentes base (futuro)
│   └── SignOutButton.tsx # Botón de cerrar sesión
├── lib/                   # Utilidades
│   ├── supabase/         # Cliente Supabase
│   │   └── client.ts     # Configuración de Supabase
│   └── utils.ts          # Funciones utilitarias
└── types/                # TypeScript types
    └── database.ts       # Tipos de la base de datos
```

## Scripts Disponibles

- `npm run dev` - Servidor de desarrollo (http://localhost:3000)
- `npm run build` - Build de producción
- `npm run start` - Servidor de producción
- `npm run lint` - Ejecutar linter

## Próximos Pasos

1. ✅ Setup básico completado
2. ⏳ Implementar verificación de roles (superadmin/admin)
3. ⏳ Crear dashboard con métricas reales
4. ⏳ CRUD de empresas (superadmin)
5. ⏳ CRUD de parkings
6. ⏳ CRUD de usuarios/operadores
7. ⏳ Gestión de tarifas
8. ⏳ Reportes y estadísticas

## Despliegue a Vercel

Cuando estés listo:

1. Subir el código a GitHub/GitLab
2. Conectar el repositorio a Vercel
3. Agregar las variables de entorno en el dashboard de Vercel
4. Deploy automático en cada push

O usar CLI de Vercel:
```bash
npm i -g vercel
vercel
```
