# Parking On Street - Web Admin

Panel de administración web para Parking On Street.

## 🚀 Setup Inicial

### Prerequisitos
- Node.js 18+ instalado
- npm o yarn

### Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.local.example .env.local
```

Editar `.env.local` con tus credenciales de Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

3. Ejecutar en desarrollo:
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
web/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas de autenticación
│   ├── (dashboard)/       # Rutas protegidas
│   └── layout.tsx         # Layout principal
├── components/            # Componentes React
│   ├── ui/                # Componentes base
│   └── dashboard/         # Componentes del dashboard
├── lib/                   # Utilidades y helpers
│   ├── supabase/         # Cliente Supabase
│   └── utils/            # Funciones utilitarias
└── types/                 # TypeScript types
```

## 🛠️ Scripts Disponibles

- `npm run dev` - Desarrollo local
- `npm run build` - Build de producción
- `npm run start` - Servidor de producción
- `npm run lint` - Linter

## 📦 Despliegue a Vercel

1. Conectar repositorio a Vercel
2. Agregar variables de entorno en el dashboard
3. Deploy automático en cada push
