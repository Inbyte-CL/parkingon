# DICCIONARIO DE DATOS - PARKING ON STREET

**Proyecto:** Parking On Street (Inbyte)  
**Versión:** 0.1.5  
**Fecha:** 24 de Enero 2026  

---

## TABLA: organizations

**Descripción:** Empresas o municipalidades que usan el sistema (multi-tenant).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único de la organización |
| `name` | TEXT | Nombre de la empresa (ej: "Municipalidad de Rosario") |
| `slug` | TEXT | Identificador amigable para URLs (ej: "rosario") |
| `status` | ENUM | Estado de la organización: `active` (activa), `inactive` (inactiva) |
| `created_at` | TIMESTAMPTZ | Fecha y hora de creación |
| `updated_at` | TIMESTAMPTZ | Fecha y hora de última actualización |

**Índices:**
- Primary Key: `id`
- Unique: `slug`

---

## TABLA: memberships

**Descripción:** Relación entre usuarios y organizaciones. Define qué usuarios pertenecen a qué empresa y su rol.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único de la membresía |
| `org_id` | UUID | ID de la organización (FK → organizations) |
| `user_id` | UUID | ID del usuario en Supabase Auth (FK → auth.users) |
| `role` | ENUM | Rol del usuario: `operador` (opera en calle), `admin_empresa` (administra empresa) |
| `status` | ENUM | Estado de la membresía: `active` (activa), `inactive` (inactiva) |
| `created_at` | TIMESTAMPTZ | Fecha y hora de creación |

**Índices:**
- Primary Key: `id`
- Index: `(org_id, user_id)`
- Index: `(user_id)`

**Notas:**
- Un usuario puede tener membresías en múltiples organizaciones
- Superadmin se identifica con flag especial en metadata

---

## TABLA: parkings

**Descripción:** Zonas de estacionamiento regulado (ej: "Zona Centro", "Zona Periférica").

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único del parking |
| `org_id` | UUID | ID de la organización dueña (FK → organizations) |
| `name` | TEXT | Nombre del parking (ej: "Zona Centro") |
| `address` | TEXT | Dirección o ubicación del parking |
| `status` | ENUM | Estado del parking: `active` (activo), `inactive` (inactivo) |
| `created_at` | TIMESTAMPTZ | Fecha y hora de creación |
| `updated_at` | TIMESTAMPTZ | Fecha y hora de última actualización |

**Índices:**
- Primary Key: `id`
- Index: `(org_id, status)`

---

## TABLA: zones

**Descripción:** Sub-zonas dentro de un parking (opcional en MVP). Ej: "Cuadra 1", "Cuadra 2".

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único de la zona |
| `parking_id` | UUID | ID del parking al que pertenece (FK → parkings) |
| `name` | TEXT | Nombre de la zona (ej: "Cuadra 1") |
| `status` | ENUM | Estado de la zona: `active` (activa), `inactive` (inactiva) |

**Índices:**
- Primary Key: `id`
- Index: `(parking_id, status)`

**Notas:**
- Opcional en MVP
- Útil para parkings grandes divididos en sectores

---

## TABLA: tariffs

**Descripción:** Tarifas de estacionamiento configurables por parking o por empresa.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único de la tarifa |
| `org_id` | UUID | ID de la organización (FK → organizations) |
| `parking_id` | UUID | ID del parking (FK → parkings). Si es NULL, es tarifa default de la empresa |
| `price_per_minute` | NUMERIC | Precio por minuto en pesos (ej: 25.00) |
| `valid_from` | TIMESTAMPTZ | Fecha y hora desde la cual es válida |
| `valid_until` | TIMESTAMPTZ | Fecha y hora hasta la cual es válida (NULL = sin límite) |
| `created_at` | TIMESTAMPTZ | Fecha y hora de creación |

**Índices:**
- Primary Key: `id`
- Index: `(org_id, parking_id, valid_from, valid_until)`
- Index: `(org_id, valid_from) WHERE parking_id IS NULL`

**Notas:**
- Prioridad: 1) Tarifa específica de parking, 2) Tarifa default (parking_id=NULL)
- Se busca tarifa vigente usando `exit_time_locked` del quote

---

## TABLA: shifts

**Descripción:** Turnos de trabajo de los operadores. Controla apertura/cierre y conciliación de efectivo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único del turno |
| `org_id` | UUID | ID de la organización (FK → organizations) |
| `user_id` | UUID | ID del operador (FK → auth.users) |
| `parking_id` | UUID | ID del parking donde trabaja (FK → parkings) |
| `status` | ENUM | Estado del turno: `open` (abierto), `closed` (cerrado) |
| `opening_time` | TIMESTAMPTZ | Fecha y hora de apertura del turno |
| `closing_time` | TIMESTAMPTZ | Fecha y hora de cierre del turno (NULL si está abierto) |
| `opening_cash` | NUMERIC | Efectivo inicial en caja al abrir turno |
| `closing_cash` | NUMERIC | Efectivo final en caja al cerrar turno (NULL si está abierto) |
| `cash_sales` | NUMERIC | Suma de pagos en efectivo del turno (calculado, NULL si está abierto) |
| `expected_cash_drawer` | NUMERIC | Efectivo esperado: opening_cash + cash_sales (calculado, NULL si está abierto) |
| `difference` | NUMERIC | Diferencia: closing_cash - expected_cash_drawer (NULL si está abierto) |
| `notes` | TEXT | Notas del operador al cerrar (ej: explicación de diferencia) |
| `created_at` | TIMESTAMPTZ | Fecha y hora de creación |
| `updated_at` | TIMESTAMPTZ | Fecha y hora de última actualización |

**Índices:**
- Primary Key: `id`
- Index: `(org_id, user_id, status)`
- Index: `(parking_id, status)`
- Unique: `(user_id, status) WHERE status='open'` (solo 1 turno abierto por usuario)

**Notas:**
- Un operador solo puede tener 1 turno abierto a la vez
- `cash_sales` se calcula sumando payments con payment_method='cash' del turno
- `expected_cash_drawer` = opening_cash + cash_sales

---

## TABLA: sessions

**Descripción:** Sesiones de estacionamiento. Representa el período desde que un vehículo entra hasta que sale y paga.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único de la sesión |
| `org_id` | UUID | ID de la organización (FK → organizations) |
| `parking_id` | UUID | ID del parking (FK → parkings) |
| `zone_id` | UUID | ID de la zona (FK → zones, NULL si no aplica) |
| `shift_id` | UUID | ID del turno que CREÓ la sesión (FK → shifts) |
| `plate` | TEXT | Patente del vehículo NORMALIZADA (uppercase, sin guiones/puntos, ej: "ABC123") |
| `session_code` | TEXT | Código random único para QR (8-12 caracteres alfanuméricos) |
| `status` | ENUM | Estado de la sesión: `open` (abierta), `closed` (cerrada y pagada) |
| `entry_time` | TIMESTAMPTZ | Fecha y hora de entrada del vehículo |
| `exit_time` | TIMESTAMPTZ | Fecha y hora de salida (NULL hasta que se cierra con pago, se copia de payments.exit_time_locked) |
| `created_by` | UUID | ID del operador que creó la sesión (FK → auth.users) |
| `created_at` | TIMESTAMPTZ | Fecha y hora de creación del registro |
| `updated_at` | TIMESTAMPTZ | Fecha y hora de última actualización |

**Índices:**
- Primary Key: `id`
- Unique: `(org_id, parking_id, plate, status) WHERE status='open'` (no doble sesión abierta con misma patente)
- Unique: `session_code`
- Index: `(shift_id)`
- Index: `(status, entry_time)` (para alertas de sesiones antiguas)

**Notas:**
- `plate` se normaliza antes de guardar: trim, sin guiones/puntos, uppercase
- `session_code` se usa en QR (no expone la patente)
- `exit_time` se setea solo al cerrar con pago (copia de payments.exit_time_locked)
- No hay auto-cierre: sesiones pueden quedar abiertas indefinidamente
- Alertas: Warning > 12h, Crítico > 24h

---

## TABLA: payments

**Descripción:** Pagos de sesiones de estacionamiento. Registra el cobro efectuado.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único del pago |
| `org_id` | UUID | ID de la organización (FK → organizations) |
| `session_id` | UUID | ID de la sesión pagada (FK → sessions) |
| `shift_id` | UUID | ID del turno que COBRÓ (FK → shifts, puede diferir de sessions.shift_id) |
| `quote_id` | TEXT | ID del quote usado (FK → payment_quotes, NOT NULL en MVP) |
| `amount` | NUMERIC | Monto cobrado en pesos (congelado del quote) |
| `minutes` | INTEGER | Minutos cobrados (congelados del quote) |
| `exit_time_locked` | TIMESTAMPTZ | Hora de salida congelada (del quote) |
| `tariff_applied` | NUMERIC | Tarifa aplicada en pesos/minuto (del quote) |
| `payment_method` | ENUM | Método de pago: `cash` (efectivo, único en MVP) |
| `status` | ENUM | Estado del pago: `completed` (completado, único en MVP) |
| `created_by` | UUID | ID del operador que cobró (FK → auth.users) |
| `created_at` | TIMESTAMPTZ | Fecha y hora del pago |

**Índices:**
- Primary Key: `id`
- Index: `(org_id, session_id)`
- Index: `(shift_id, payment_method)`
- Index: `(quote_id)`
- Unique: `(session_id, status) WHERE status='completed'` (solo 1 pago completed por sesión en MVP)

**Notas:**
- `shift_id` es el turno que cobró (puede ser diferente al que creó la sesión)
- `quote_id` NOT NULL en MVP (siempre usa quote). Post-MVP: nullable
- Todos los valores monetarios/tiempo vienen del quote (congelados)
- Relación 1:N con sessions (futuro: anulaciones). MVP: max 1 completed

---

## TABLA: payment_quotes

**Descripción:** Quotes temporales que congelan el monto al iniciar salida. Válidos por 2-3 minutos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `quote_id` | TEXT | Identificador único del quote (UUID o random) |
| `org_id` | UUID | ID de la organización (FK → organizations, redundante pero necesario para RLS) |
| `session_id` | UUID | ID de la sesión (FK → sessions) |
| `parking_id` | UUID | ID del parking (FK → parkings) |
| `created_by` | UUID | ID del operador que creó el quote (FK → auth.users) |
| `exit_time_locked` | TIMESTAMPTZ | Hora de salida congelada (NOW al crear quote) |
| `minutes_locked` | INTEGER | Minutos calculados: ceil((exit_time_locked - entry_time) / 60) |
| `tariff_applied` | NUMERIC | Tarifa aplicada en pesos/minuto (vigente al exit_time_locked) |
| `amount_locked` | NUMERIC | Monto congelado: minutes_locked × tariff_applied |
| `expires_at` | TIMESTAMPTZ | Fecha y hora de expiración (exit_time_locked + 120-180 segundos) |
| `status` | ENUM | Estado del quote: `active` (activo), `expired` (expirado), `used` (usado en pago) |
| `created_at` | TIMESTAMPTZ | Fecha y hora de creación |

**Índices:**
- Primary Key: `quote_id`
- Unique: `(session_id) WHERE status='active'` (solo 1 quote activo por sesión)
- Index: `(expires_at)` (para job de limpieza)
- Index: `(created_at)` (para limpieza por antigüedad)
- Index: `(org_id, created_at)` (reportes)

**Notas:**
- `org_id` es redundante (viene de session) pero necesario para RLS y limpieza
- Validación: `payment_quotes.org_id = sessions.org_id` (consistencia)
- Solo 1 quote activo por sesión (manejo de concurrencia/doble click)
- TTL: 120-180 segundos (2-3 minutos)
- Limpieza: Job elimina quotes expired/used con created_at < now() - 7 días
- Al pagar: marca status='used'
- Si expira: marca status='expired'

---

## TABLA: audit_logs

**Descripción:** Registro de auditoría de todas las acciones importantes del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único del log |
| `org_id` | UUID | ID de la organización (FK → organizations) |
| `user_id` | UUID | ID del usuario que realizó la acción (FK → auth.users, NULL si es sistema) |
| `action` | TEXT | Tipo de acción (ej: "session.created", "payment.completed", "shift.closed") |
| `entity_type` | TEXT | Tipo de entidad afectada (ej: "session", "payment", "shift") |
| `entity_id` | UUID | ID de la entidad afectada (NULL si no aplica) |
| `metadata` | JSONB | Datos adicionales de la acción (campos específicos según action) |
| `ip_address` | TEXT | Dirección IP del cliente (NULL si no aplica) |
| `user_agent` | TEXT | User agent del navegador/app (NULL si no aplica) |
| `created_at` | TIMESTAMPTZ | Fecha y hora de la acción |

**Índices:**
- Primary Key: `id`
- Index: `(org_id, created_at)`
- Index: `(user_id, created_at)`
- Index: `(entity_type, entity_id)`
- Index: `(action, created_at)`

**Notas:**
- Registra acciones críticas: crear sesión, cobrar, abrir/cerrar turno, cambiar tarifa, etc.
- `metadata` contiene detalles específicos según el tipo de acción
- No se puede editar ni eliminar (solo insertar)

---

## ENUMS (Tipos Enumerados)

### status (organizations, parkings, zones, memberships)
- `active`: Activo, en uso
- `inactive`: Inactivo, no disponible

### role (memberships)
- `operador`: Operador de calle (usa app Android)
- `admin_empresa`: Administrador de empresa (usa web admin)

### shift_status (shifts)
- `open`: Turno abierto (operador trabajando)
- `closed`: Turno cerrado (jornada terminada)

### session_status (sessions)
- `open`: Sesión abierta (vehículo estacionado)
- `closed`: Sesión cerrada (vehículo salió y pagó)

### payment_method (payments)
- `cash`: Efectivo (único en MVP)
- Futuro: `card`, `qr_payment`, etc.

### payment_status (payments)
- `completed`: Pago completado exitosamente (único en MVP)
- Futuro: `pending`, `cancelled`, `refunded`

### quote_status (payment_quotes)
- `active`: Quote activo (vigente, puede usarse)
- `expired`: Quote expirado (pasó el TTL)
- `used`: Quote usado (ya se completó el pago)

---

## FUNCIONES HELPER (PostgreSQL)

### normalize_plate(input TEXT) → TEXT
**Descripción:** Normaliza una patente para búsqueda y almacenamiento consistente.

**Proceso:**
1. `trim()` espacios al inicio y final
2. Eliminar guiones, puntos, espacios internos
3. Convertir a mayúsculas

**Ejemplos:**
- `"AB-CD12"` → `"ABCD12"`
- `" abc 123 "` → `"ABC123"`
- `"ab.cd.12"` → `"ABCD12"`

---

### get_user_org_id() → UUID
**Descripción:** Obtiene el org_id del usuario autenticado actual.

**Proceso:**
1. Obtiene `user_id` de `auth.uid()` (Supabase Auth)
2. Busca en `memberships` donde `user_id = auth.uid()`
3. Retorna `org_id`
4. Si no encuentra, retorna NULL

**Uso:** RLS policies para filtrar por organización

---

### get_user_active_parking() → UUID
**Descripción:** Obtiene el parking_id del turno abierto del usuario actual.

**Proceso:**
1. Busca en `shifts` donde `user_id = auth.uid()` y `status = 'open'`
2. Retorna `parking_id`
3. Si no hay turno abierto, retorna NULL

**Uso:** RLS policies para operadores (solo ven su parking activo)

---

### get_active_tariff(org_id UUID, parking_id UUID, timestamp TIMESTAMPTZ) → tariff
**Descripción:** Obtiene la tarifa vigente para un parking en un momento específico.

**Proceso:**
1. Busca tarifa para `org_id` + `parking_id` específico donde:
   - `valid_from <= timestamp`
   - `valid_until IS NULL OR timestamp < valid_until`
2. Si no existe, busca tarifa default (`parking_id = NULL`) con mismas condiciones
3. Si no existe ninguna, retorna NULL (error)

**Uso:** Calcular monto en quotes usando `exit_time_locked`

---

### is_superadmin() → BOOLEAN
**Descripción:** Verifica si el usuario actual es superadmin.

**Proceso:**
1. Verifica si usuario tiene rol especial en `memberships`
2. O verifica flag en metadata de `auth.users`
3. Retorna `true` o `false`

**Uso:** RLS policies para acceso total

---

## REGLAS DE NEGOCIO CLAVE

### Normalización de Patentes
- **Siempre** normalizar antes de guardar o buscar
- Función: `normalize_plate(input)`
- Evita duplicados por formato

### Tarifa Vigente
- Prioridad: 1) Parking específico, 2) Default empresa
- Usar `exit_time_locked` (no NOW) para coherencia
- Bloquear cobro si no hay tarifa configurada

### Quotes (Monto Congelado)
- TTL: 120-180 segundos (2-3 minutos)
- Solo 1 activo por sesión (UNIQUE constraint)
- Manejo de colisiones: leer existente, validar vigencia, reintentar
- Limpieza: Job elimina expired/used > 7 días

### Shifts (Turnos)
- Solo 1 turno abierto por usuario (UNIQUE constraint)
- Validar turno abierto antes de crear sesión o quote
- `cash_sales` = suma de payments.amount con payment_method='cash'
- `expected_cash_drawer` = opening_cash + cash_sales
- `difference` = closing_cash - expected_cash_drawer

### Sesiones
- No doble sesión abierta con misma patente en mismo parking (UNIQUE constraint)
- `exit_time` se setea solo al cerrar con pago
- Sin auto-cierre (pueden quedar abiertas indefinidamente)
- Alertas: Warning > 12h, Crítico > 24h

### RLS (Row Level Security)
- **Todos:** Filtro por `org_id = get_user_org_id()`
- **Operadores (sessions/quotes):** Filtro adicional por `parking_id = get_user_active_parking()`
- **Admin empresa:** Solo filtro por `org_id` (ve todo org-wide)
- **Superadmin:** Acceso total sin filtros

---

## GLOSARIO DE TÉRMINOS

| Término | Definición |
|---------|------------|
| **Multi-tenant** | Arquitectura que soporta múltiples empresas en una misma base de datos |
| **org_id** | ID de organización/empresa - clave para multi-tenant |
| **RLS** | Row Level Security - Seguridad a nivel de fila en PostgreSQL |
| **Parking** | Zona de estacionamiento regulado (ej: "Zona Centro") |
| **Zone** | Sub-zona dentro de un parking (ej: "Cuadra 1") - Opcional |
| **Session** | Período desde que un vehículo entra hasta que sale y paga |
| **Session Code** | Código random único para identificar sesión en QR |
| **Shift** | Turno de trabajo de un operador (apertura a cierre) |
| **Quote** | Cotización temporal del monto (120-180s) con monto congelado al iniciar salida |
| **Shift Creación** | `sessions.shift_id` - turno que creó la sesión (entrada) |
| **Shift Cobro** | `payments.shift_id` - turno que cobró (puede diferir del de creación) |
| **POS** | Point of Sale - Dispositivo Android del operador |
| **Tariff Snapshot** | Copia de tarifa aplicada en el momento del pago (auditoría) |
| **exit_time_locked** | Hora de salida congelada al crear quote (no cambia aunque pase tiempo) |
| **Normalización** | Proceso de estandarizar patentes: trim, sin guiones/puntos, uppercase |

---

**FIN DEL DICCIONARIO DE DATOS**
