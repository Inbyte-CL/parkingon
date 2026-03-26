# DOCUMENTO MVP v0.1.5 - PARKING ON STREET

**Proyecto:** Parking On Street (Inbyte)  
**Versión:** 0.1.5  
**Fecha:** 24 de Enero 2026  
**Estado:** Definición Inicial - Aprobada para Fase 1 (Production-Ready)  

---

## 1. RESUMEN EJECUTIVO

### ¿Qué es?
Sistema de gestión de estacionamiento regulado en vía pública (Parking On Street) con arquitectura multi-empresa (multi-tenant).

### Componentes
- **App Android (POS):** Para operadores de calle - registro de entrada/salida, cobro, gestión de turnos
- **Plataforma Web Admin:** Para administración - configuración de empresas, parkings, tarifas, usuarios, reportes y auditoría

### ¿Para quién?
- **Empresas:** Municipalidades, concesionarias de estacionamiento regulado
- **Operadores:** Personal en calle que gestiona entradas/salidas y cobros
- **Administradores:** Personal que configura y supervisa operaciones

### ¿Qué problema resuelve?
- Control de efectivo con trazabilidad completa (turnos obligatorios)
- Gestión multi-empresa sin costos de infraestructura duplicada
- Operación rápida en calle (entrada/salida en menos de 30-45 segundos)
- Auditoría completa de todas las operaciones
- Escalabilidad sin cambios de arquitectura

---

## 2. REGLAS DE NEGOCIO

### 2.1 TARIFA

#### Reglas Confirmadas
- ✅ **Sin minutos de gracia:** Se cobra por minuto iniciado (desde el segundo 1)
- ✅ **Tarifa base:** $25 por minuto (configurable por parking)
- ✅ **Redondeo hacia arriba:** Cualquier fracción de minuto se cobra como minuto completo (ceil)
- ✅ **Sin cobro mínimo adicional:** El mínimo es 1 minuto por estar aunque sea 1 segundo

#### Fórmula de Cálculo
```
monto_total = minutos_cobrados × tarifa_por_minuto

Donde:
- minutos_cobrados = ceil((exit_time - entry_time) / 60 segundos)
- tarifa_por_minuto = valor configurado en tabla tariffs para ese parking

IMPORTANTE: Se usa ceil() (redondeo hacia arriba) para cobrar "por minuto iniciado"
- Cualquier fracción de minuto se cobra como minuto completo
- 1 segundo = 1 minuto cobrado
- 1 minuto 30 segundos = 2 minutos cobrados
```

#### Ejemplos de Cálculo

| Tiempo Estacionado | Segundos | Minutos Cobrados | Tarifa | Cálculo | Monto Total |
|-------------------|----------|------------------|--------|---------|-------------|
| 1 segundo | 1 | 1 | $25 | 1 × $25 | **$25** |
| 45 segundos | 45 | 1 | $25 | 1 × $25 | **$25** |
| 1 minuto exacto | 60 | 1 | $25 | 1 × $25 | **$25** |
| 1 min 30 seg | 90 | 2 | $25 | 2 × $25 | **$50** |
| 7 minutos | 420 | 7 | $25 | 7 × $25 | **$175** |
| 37 minutos | 2220 | 37 | $25 | 37 × $25 | **$925** |
| 1 hora 15 min | 4500 | 75 | $25 | 75 × $25 | **$1,875** |
| 2 horas 15 min | 8100 | 135 | $25 | 135 × $25 | **$3,375** |

#### Configuración por Parking
Cada parking puede tener su propia tarifa:
- Parking "Zona Centro": $25/min
- Parking "Zona Periférica": $15/min
- Parking "Zona Premium": $40/min

---

### 2.2 TURNOS (SHIFTS)

#### Reglas
- ✅ **Turno obligatorio para crear sesiones y cobrar** (no hay modo contingencia en MVP)
- ✅ **Un operador solo puede tener 1 turno abierto a la vez**
- ✅ **No se puede abrir un nuevo turno si ya hay uno abierto**
- ✅ **Solo el operador puede cerrar su propio turno** (MVP)
- ✅ **Al abrir turno:** Operador registra efectivo inicial (`opening_cash`)
- ✅ **Al cerrar turno:** Operador registra efectivo final (`closing_cash`)
- ✅ **Sistema calcula automáticamente:**
  - `cash_sales` = suma de pagos en efectivo del turno
  - `expected_cash_drawer` = opening_cash + cash_sales (efectivo esperado en caja)
- ✅ **Sistema registra diferencia:** `difference = closing_cash - expected_cash_drawer`

#### Estados de Turno
```
┌─────────┐
│  open   │ ← Estado inicial (operador abre turno)
└────┬────┘
     │
     │ (operador cierra turno)
     │
     ↓
┌─────────┐
│ closed  │ ← Estado final
└─────────┘
```

---

### 2.3 SESIONES (PARKING SESSIONS)

#### Reglas
- ✅ **No se permite doble sesión con la misma patente:** Regla exacta: "No más de 1 sesión `open` por `org_id` + `parking_id` + `plate` (normalizada)". Si el parking tiene zonas, igual aplica (no puede tener 2 sesiones abiertas en zonas distintas del mismo parking)
- ✅ **Cada sesión genera un `session_code` único y random** (para QR)
- ✅ **El QR contiene el `session_code`, NO la patente** (privacidad y seguridad)
- ✅ **Solo se puede cerrar sesión si hay pago registrado**
- ✅ **Una sesión cerrada no se puede reabrir**
- ✅ **Debe haber turno abierto para crear sesiones** (MVP sin modo contingencia)
- ✅ **Sesiones sin límite de tiempo:** Una sesión puede quedar abierta indefinidamente hasta que el operador la cierre manualmente (no hay auto-cierre)
- ✅ **Alertas por sesiones antiguas abiertas:**
  - **Warning:** Sesiones `open` con antigüedad > 12 horas
  - **Crítico:** Sesiones `open` con antigüedad > 24 horas
  - No cierra automáticamente, solo alerta en UI/reportes para investigación

#### Estados de Sesión
```
┌─────────┐
│  open   │ ← Estado inicial (vehículo entra)
└────┬────┘
     │
     │ (operador cobra y cierra)
     │
     ↓
┌─────────┐
│ closed  │ ← Estado final (vehículo salió y pagó)
└─────────┘
```

#### Formato de Patente
- Validación flexible para Chile: 5-8 caracteres alfanuméricos
- Formatos comunes: `ABCD12` (6 chars), `ABC123` (6 chars), `AB1234` (6 chars)
- También acepta formatos antiguos y especiales

**Normalización Estricta (antes de guardar/buscar):**
1. `trim()` espacios al inicio y final
2. Eliminar guiones, puntos, espacios internos (`-`, `.`, ` `)
3. Convertir a mayúsculas (`UPPERCASE`)
4. Guardar como `plate` (ya normalizada)

**Ejemplos de normalización:**
- `"AB-CD12"` → `"ABCD12"`
- `" abc 123 "` → `"ABC123"`
- `"ab.cd.12"` → `"ABCD12"`

**Propósito:** Evitar duplicados por formato (ej: "AB-CD12" y "ABCD12" son la misma patente)

- Validación estricta por país se deja para post-MVP

#### Session Code (para QR)
- Código random de 8-12 caracteres alfanuméricos
- Único en toda la base de datos (índice UNIQUE)
- Válido solo mientras la sesión está abierta
- Ejemplo: `7f8a9b2c`, `k3m9p2x5`
- **Seguridad:** Endpoint de resolución de QR no revela si el código no existe vs no pertenece a la empresa (siempre retorna "Sesión no encontrada")
- **Rate limiting:** Post-MVP se agregará protección anti-enumeración

---

### 2.4 PAGOS (PAYMENTS)

#### Reglas MVP
- ✅ **Método de pago:** Solo efectivo (cash) en MVP
- ✅ **Cálculo de monto:** Siempre en servidor (nunca confiar en cliente)
- ✅ **Cliente NO envía monto:** Solo envía `session_id` y `payment_method`, servidor calcula y guarda el `amount`
- ✅ **Estado:** Solo `completed` en MVP (pago siempre exitoso)
- ✅ **Registro obligatorio:** Antes de cerrar sesión
- ✅ **Asociado a turno:** `payments.shift_id` = turno que cobra (puede diferir de `sessions.shift_id` que creó la sesión)
- ✅ **Validación con quote:** Servidor calcula y congela al iniciar salida; al confirmar valida vigencia del quote (no recalcula si vigente)

#### Fuera de Scope MVP
- ❌ Pagos con tarjeta
- ❌ Pagos con QR (Mercado Pago, etc.)
- ❌ Estados `pending` o `cancelled`
- ❌ Devoluciones

---

## 3. FLUJO OPERATIVO

### 3.1 FLUJO HAPPY PATH (Día Normal)

#### **PASO 1: INICIO DE JORNADA**
```
1. Operador abre la App
2. Se autentica (usuario/contraseña)
3. Selecciona "Abrir Turno"
4. Selecciona parking donde trabajará
5. Ingresa efectivo inicial (ej: $500 para dar cambio)
6. Confirma
7. Sistema crea turno con status='open'
8. Operador puede empezar a trabajar
```

#### **PASO 2: ENTRADA DE VEHÍCULO**
```
1. Auto llega y se estaciona
2. Operador selecciona "Nueva Entrada"
3. Ingresa patente (ej: ABC123)
4. Sistema valida:
   - ✓ Turno está abierto
   - ✓ Patente no tiene sesión abierta
5. Sistema crea sesión con:
   - status = 'open'
   - entry_time = timestamp actual (servidor)
   - session_code = random único
6. Sistema genera QR con session_code
7. Imprime ticket con:
   - Patente
   - Hora entrada
   - QR
   - Tarifa
8. Operador entrega ticket a conductor
9. Conductor se va
```

#### **PASO 3: SALIDA DE VEHÍCULO**
```
1. Conductor vuelve con ticket
2. Operador selecciona "Salida"
3. Operador escanea QR del ticket
   (o busca manualmente por patente si perdió ticket)
4. Sistema busca sesión por session_code
5. Sistema valida:
   - ✓ Sesión existe
   - ✓ Sesión está abierta (status='open')
   - ✓ Pertenece a la misma empresa (org_id)
6. Sistema CONGELA monto en servidor (iniciar salida):
   - exit_time_locked = now
   - segundos_totales = (exit_time_locked - entry_time)
   - minutes_locked = ceil(segundos_totales / 60)
   - tarifa = busca tarifa vigente (prioridad: parking_id específico, luego parking_id=NULL)
   - amount_locked = minutes_locked × tarifa
   - Genera quote_id con TTL 120-180 segundos
   - Registra auditoría: payment.quote_created
7. Sistema muestra en pantalla:
   - Patente
   - Hora entrada
   - Hora salida (congelada)
   - Minutos cobrados
   - Monto a cobrar (SOLO LECTURA - congelado)
   - "Válido hasta HH:MM:SS" (countdown)
8. Operador cobra efectivo al conductor
9. Operador confirma "Pago Recibido" (envía quote_id, NO envía monto)
10. Sistema valida quote y cierra:
    - Si quote vigente: usa amount_locked (NO recalcula)
    - Si quote expiró: error "Quote expiró, recalcular"
    - Crea registro en payments (amount_locked, minutes_locked, quote_id, exit_time_locked)
    - Actualiza sesión: status='closed', exit_time=exit_time_locked
11. Imprime voucher con:
    - Patente
    - Hora entrada/salida
    - Minutos
    - Monto pagado
    - Operador
12. Conductor se retira
```

#### **PASO 4: CIERRE DE JORNADA**
```
1. Operador termina su jornada
2. Selecciona "Cerrar Turno"
3. Sistema muestra:
   - Sesiones atendidas
   - Total ventas en efectivo (cash_sales)
   - Efectivo esperado en caja (expected_cash_drawer = opening_cash + cash_sales)
4. Operador cuenta efectivo real
5. Ingresa closing_cash (ej: $8,750)
6. Sistema calcula:
   - cash_sales = suma de todos los payments con payment_method='cash' del turno
   - expected_cash_drawer = opening_cash + cash_sales
   - difference = closing_cash - expected_cash_drawer
7. Si hay diferencia (positiva o negativa):
   - Operador puede ingresar nota explicativa
8. Sistema cierra turno (status='closed', closing_time=now)
9. Operador entrega efectivo a supervisor/caja
10. Fin de jornada
```

---

### 3.2 CASOS BORDE Y SOLUCIONES

| # | Caso | Solución MVP | Prioridad |
|---|------|--------------|-----------|
| **1** | **Doble sesión misma patente** | Bloquear con mensaje: "Patente ABC123 ya tiene sesión abierta. Ciérrela primero o verifique que ingresó la patente correctamente" | 🔴 Alta |
| **2** | **Operador intenta abrir 2do turno** | Bloquear con mensaje: "Ya tienes un turno abierto. Ciérralo primero para abrir uno nuevo" | 🔴 Alta |
| **3** | **Cliente perdió ticket (QR)** | Operador busca manualmente por patente en lugar de escanear QR. Flujo de cobro continúa normal | 🟡 Media |
| **4** | **Patente mal ingresada** | Por ahora: operador debe cerrar sesión incorrecta (cobrar mínimo 1 minuto) y crear nueva con patente correcta. Queda registrado en auditoría. *Post-MVP: permitir corrección con supervisor* | 🟡 Media |
| **5** | **Sin internet al crear sesión** | Bloquear operación con mensaje: "Sin conexión. Intente nuevamente". *Post-MVP (Fase 5): modo offline con cola local* | 🟢 Baja (piloto en zona con señal) |
| **5b** | **Sesión Auth expiró / no puede login** | Operador autenticado pero sesión expiró o falla Auth: no puede operar. **Mitigación MVP:** Mantener sesión iniciada con token refresh automático. **Procedimiento manual:** Si falla Auth, operador anota en papel y registra después. *Post-MVP: modo offline completo* | 🟡 Media |
| **5c** | **Sesión abierta por muchas horas/días** | Sistema NO cierra automáticamente. Sesión queda abierta hasta que operador la cierre manualmente. Al cobrar, se calculará el monto real (puede ser muy alto). **Alertas:** Warning > 12h, Crítico > 24h (solo alerta, no auto-cierre) | 🟡 Media |
| **5d** | **Quote expiró y operador ya cobró efectivo** | Si quote expiró: app muestra "Quote expiró, recalcular". Botón "Recalcular" genera nuevo quote. **MVP estricto:** NO permitir override. Operador debe recalcular y ajustar cobro si cambió monto. *Post-MVP: override con supervisor si delta <= 1 minuto* | 🟡 Media |
| **5e** | **Sesión creada por turno A, cobrada por turno B** | Permitido. `sessions.shift_id` = turno que creó, `payments.shift_id` = turno que cobró. Se audita como cobro cruzado. Útil si sesión quedó abierta y otro operador la cierra. | 🟢 Baja |
| **5f** | **Múltiples clicks en "Iniciar Salida"** | Sistema verifica si ya existe quote activo para la sesión. Si existe y es vigente: retorna el mismo. Si expiró: marca expired y crea nuevo. Solo 1 quote activo por sesión. | 🟢 Baja |
| **6** | **Impresora falla al imprimir ticket** | Sistema registra sesión exitosamente. Operador anota patente y hora en papel como respaldo. Cliente puede reclamar después con su patente. Se registra en audit_log. *Post-MVP: voucher digital* | 🟡 Media |
| **7** | **Anular sesión o pago** | No implementar en MVP. Si hay error, queda registrado y se resuelve manualmente con supervisor. *Post-MVP: anulación con aprobación de supervisor* | 🟢 Baja |
| **8** | **Diferencia en cierre de turno** | Sistema muestra diferencia (puede ser +/-). Operador ingresa nota explicativa. Queda registrado para auditoría. Supervisor revisa después | 🟡 Media |
| **9** | **Cliente no quiere/puede pagar** | Operador NO cierra la sesión. Queda abierta. Supervisor resuelve después (puede ser multa, cobro posterior, etc.). *Post-MVP: sesiones impagas con seguimiento* | 🟢 Baja |
| **10** | **Operador olvidó cerrar turno** | Por ahora: solo el operador puede cerrar su turno (debe volver a la app). *Post-MVP: supervisor puede cerrar turno de otro operador* | 🟢 Baja |
| **11** | **Mismo auto entra 2 veces en el día** | Permitido, siempre que la sesión anterior esté cerrada. Son sesiones independientes | 🟡 Media |
| **12** | **Operador cobra de más/menos** | Sistema calcula monto automáticamente en servidor. Operador no puede modificar ni enviar monto. Cliente solo envía confirmación, servidor calcula y guarda el amount. Si hay error en cálculo, queda registrado y se resuelve con supervisor | 🔴 Alta |

---

## 4. ROLES Y PERMISOS

### 4.1 MATRIZ DE PERMISOS

| Acción / Operación | Operador | Admin Empresa | Superadmin |
|-------------------|----------|---------------|------------|
| **AUTENTICACIÓN** |
| Login en App/Web | ✅ | ✅ | ✅ |
| **TURNOS** |
| Abrir su propio turno | ✅ | ✅ | ✅ |
| Cerrar su propio turno | ✅ | ✅ | ✅ |
| Ver turnos de otros operadores | ❌ | ✅ | ✅ |
| Cerrar turno de otro operador | ❌ | ❌ (post-MVP) | ✅ |
| **SESIONES** |
| Crear sesión (entrada) | ✅ | ✅ | ✅ |
| Buscar sesión por QR/patente | ✅ | ✅ | ✅ |
| Cobrar y cerrar sesión | ✅ | ✅ | ✅ |
| Ver sesiones de su turno | ✅ | ✅ | ✅ |
| Ver todas las sesiones de su empresa | ❌ | ✅ | ✅ |
| Anular sesión | ❌ (post-MVP) | ❌ (post-MVP) | ✅ |
| **CONFIGURACIÓN** |
| Ver parkings/zonas | ✅ (solo lectura) | ✅ | ✅ |
| Crear/editar parkings/zonas | ❌ | ✅ | ✅ |
| Ver tarifas | ✅ (solo lectura) | ✅ | ✅ |
| Crear/editar tarifas | ❌ | ✅ | ✅ |
| **USUARIOS** |
| Ver usuarios de su empresa | ❌ | ✅ | ✅ |
| Crear/editar usuarios de su empresa | ❌ | ✅ | ✅ |
| Crear/editar usuarios de otras empresas | ❌ | ❌ | ✅ |
| **EMPRESAS** |
| Ver su propia empresa | ✅ (info básica) | ✅ | ✅ |
| Editar su propia empresa | ❌ | ✅ (datos básicos) | ✅ |
| Ver otras empresas | ❌ | ❌ | ✅ |
| Crear empresas | ❌ | ❌ | ✅ |
| **REPORTES Y AUDITORÍA** |
| Ver reportes de su turno | ✅ | ✅ | ✅ |
| Ver reportes de su empresa | ❌ | ✅ | ✅ |
| Ver auditoría de su empresa | ❌ | ✅ | ✅ |
| Ver auditoría de todas las empresas | ❌ | ❌ | ✅ |

### 4.2 DESCRIPCIÓN DE ROLES

#### **OPERADOR**
- Rol base para personal de calle
- Opera desde App Android (POS)
- Gestiona su propio turno y sesiones
- No tiene acceso a configuración ni datos de otros operadores

#### **ADMIN EMPRESA**
- Administrador de una empresa/municipalidad
- Opera desde Web Admin
- Configura parkings, zonas, tarifas
- Gestiona usuarios de su empresa
- Ve reportes y auditoría de su empresa
- No ve datos de otras empresas

#### **SUPERADMIN**
- Rol exclusivo de Inbyte (proveedor del sistema)
- Acceso total al sistema
- Crea y gestiona empresas
- Soporte técnico y configuración global
- Acceso a todas las empresas para troubleshooting

---

## 5. MODELO DE DATOS CONCEPTUAL

### 5.1 ENTIDADES PRINCIPALES

```
┌─────────────────┐
│ organizations   │ (Empresas/Municipalidades)
├─────────────────┤
│ id              │ UUID, PK
│ name            │ TEXT (ej: "Municipalidad de Rosario")
│ slug            │ TEXT (ej: "rosario")
│ status          │ ENUM (active, inactive)
│ created_at      │ TIMESTAMPTZ
│ updated_at      │ TIMESTAMPTZ
└─────────────────┘
        │
        │ 1:N
        ↓
┌─────────────────┐
│ memberships     │ (Usuarios en empresas)
├─────────────────┤
│ id              │ UUID, PK
│ org_id          │ UUID, FK → organizations
│ user_id         │ UUID, FK → auth.users (Supabase Auth)
│ role            │ ENUM (operador, admin_empresa)
│ status          │ ENUM (active, inactive)
│ created_at      │ TIMESTAMPTZ
└─────────────────┘
        │
        │ 1:N
        ↓
┌─────────────────┐
│ parkings        │ (Estacionamientos/Zonas)
├─────────────────┤
│ id              │ UUID, PK
│ org_id          │ UUID, FK → organizations
│ name            │ TEXT (ej: "Zona Centro")
│ address         │ TEXT
│ status          │ ENUM (active, inactive)
│ created_at      │ TIMESTAMPTZ
│ updated_at      │ TIMESTAMPTZ
└─────────────────┘
        │
        │ 1:N (opcional MVP)
        ↓
┌─────────────────┐
│ zones           │ (Sub-zonas dentro de parking - OPCIONAL)
├─────────────────┤
│ id              │ UUID, PK
│ parking_id      │ UUID, FK → parkings
│ name            │ TEXT (ej: "Cuadra 1")
│ status          │ ENUM (active, inactive)
└─────────────────┘

┌─────────────────┐
│ tariffs         │ (Tarifas por parking)
├─────────────────┤
│ id              │ UUID, PK
│ org_id          │ UUID, FK → organizations
│ parking_id      │ UUID, FK → parkings (nullable)
│ price_per_minute│ NUMERIC (ej: 25.00)
│ valid_from      │ TIMESTAMPTZ
│ valid_until     │ TIMESTAMPTZ (nullable)
│ created_at      │ TIMESTAMPTZ
└─────────────────┘

┌─────────────────┐
│ shifts          │ (Turnos de operadores)
├─────────────────┤
│ id              │ UUID, PK
│ org_id          │ UUID, FK → organizations
│ user_id         │ UUID, FK → auth.users (Supabase Auth)
│ parking_id      │ UUID, FK → parkings
│ status          │ ENUM (open, closed)
│ opening_time    │ TIMESTAMPTZ
│ closing_time    │ TIMESTAMPTZ (nullable)
│ opening_cash    │ NUMERIC (efectivo inicial)
│ closing_cash    │ NUMERIC (efectivo final, nullable)
│ cash_sales      │ NUMERIC (suma pagos efectivo, calculado, nullable)
│ expected_cash_drawer │ NUMERIC (opening + cash_sales, calculado, nullable)
│ difference      │ NUMERIC (closing - expected_cash_drawer, nullable)
│ notes           │ TEXT (nullable)
│ created_at      │ TIMESTAMPTZ
│ updated_at      │ TIMESTAMPTZ
└─────────────────┘
        │
        │ 1:N
        ↓
┌─────────────────┐
│ sessions        │ (Sesiones de estacionamiento)
├─────────────────┤
│ id              │ UUID, PK
│ org_id          │ UUID, FK → organizations
│ parking_id      │ UUID, FK → parkings
│ zone_id         │ UUID, FK → zones (nullable)
│ shift_id        │ UUID, FK → shifts (turno que CREÓ la sesión)
│ plate           │ TEXT (patente normalizada: uppercase, sin guiones/puntos)
│ session_code    │ TEXT (random único para QR)
│ status          │ ENUM (open, closed)
│ entry_time      │ TIMESTAMPTZ
│ exit_time       │ TIMESTAMPTZ (nullable, se setea al cerrar con pago)
│ created_by      │ UUID, FK → auth.users
│ created_at      │ TIMESTAMPTZ
│ updated_at      │ TIMESTAMPTZ
└─────────────────┘

Nota: 
- shift_id = turno que creó la sesión (entrada)
- payments.shift_id = turno que cobró (puede ser diferente)
- exit_time se setea solo al cerrar (copia de payments.exit_time_locked)
        │
        │ 1:N (futuro: anulaciones, reintentos)
        │ MVP: max 1 payment completed por session
        ↓
┌─────────────────┐
│ payments        │ (Pagos)
├─────────────────┤
│ id              │ UUID, PK
│ org_id          │ UUID, FK → organizations
│ session_id      │ UUID, FK → sessions
│ shift_id        │ UUID, FK → shifts (turno que COBRÓ)
│ quote_id        │ TEXT, NOT NULL (referencia al quote usado - obligatorio MVP)
│ amount          │ NUMERIC (monto cobrado, congelado del quote)
│ minutes         │ INTEGER (minutos cobrados, congelados del quote)
│ exit_time_locked│ TIMESTAMPTZ (hora salida congelada del quote)
│ tariff_applied  │ NUMERIC (tarifa aplicada en el momento)
│ payment_method  │ ENUM (cash) - solo efectivo en MVP
│ status          │ ENUM (completed) - solo completed en MVP
│ created_by      │ UUID, FK → auth.users
│ created_at      │ TIMESTAMPTZ
└─────────────────┘

Nota: 
- Relación 1:N para soportar anulaciones futuras
- Regla MVP: máximo 1 payment con status='completed' por session
- shift_id = turno que cobró (puede diferir de sessions.shift_id)
- quote_id NOT NULL en MVP (siempre usa quote). Post-MVP: nullable si permite cobro sin quote

┌─────────────────┐
│ payment_quotes  │ (Quotes temporales - cache o tabla)
├─────────────────┤
│ quote_id        │ TEXT, PK (UUID o random)
│ org_id          │ UUID, FK → organizations (redundante pero necesario para RLS)
│ session_id      │ UUID, FK → sessions
│ parking_id      │ UUID, FK → parkings
│ created_by      │ UUID, FK → auth.users
│ exit_time_locked│ TIMESTAMPTZ (hora salida congelada)
│ minutes_locked  │ INTEGER (minutos calculados)
│ tariff_applied  │ NUMERIC (tarifa usada)
│ amount_locked   │ NUMERIC (monto congelado)
│ expires_at      │ TIMESTAMPTZ (now + 120-180s)
│ status          │ ENUM (active, expired, used)
│ created_at      │ TIMESTAMPTZ
└─────────────────┘

Reglas:
- UNIQUE (session_id) WHERE status='active' ← solo 1 quote activo por sesión
- CONSTRAINT: payment_quotes.org_id = sessions.org_id (validación consistencia)
- Al crear: validar shift open del usuario + parking coincide
- Al pagar: marcar status='used'
- Al expirar: marcar status='expired' (o TTL elimina si es cache)
- Al crear nuevo: manejar colisión UNIQUE (leer existente, validar vigencia, reintentar)
- Limpieza: Job elimina quotes expired/used con created_at < now() - 7 días

┌─────────────────┐
│ audit_logs      │ (Auditoría)
├─────────────────┤
│ id              │ UUID, PK
│ org_id          │ UUID, FK → organizations
│ user_id         │ UUID, FK → auth.users (nullable)
│ action          │ TEXT (ej: "session.created")
│ entity_type     │ TEXT (ej: "session", "payment")
│ entity_id       │ UUID (nullable)
│ metadata        │ JSONB (detalles adicionales)
│ ip_address      │ TEXT (nullable)
│ user_agent      │ TEXT (nullable)
│ created_at      │ TIMESTAMPTZ
└─────────────────┘
```

### 5.2 RELACIONES CLAVE

```
organizations (1) ──→ (N) memberships
organizations (1) ──→ (N) parkings
organizations (1) ──→ (N) tariffs
organizations (1) ──→ (N) shifts
organizations (1) ──→ (N) sessions
organizations (1) ──→ (N) payments
organizations (1) ──→ (N) audit_logs

parkings (1) ──→ (N) zones (opcional)
parkings (1) ──→ (N) tariffs
parkings (1) ──→ (N) shifts
parkings (1) ──→ (N) sessions

shifts (1) ──→ (N) sessions (turno que creó)
shifts (1) ──→ (N) payments (turno que cobró)

sessions (1) ──→ (N) payments
  Regla MVP: max 1 payment con status='completed' por session
  Futuro: permite anulaciones, reintentos, refunds

sessions (1) ──→ (1) payment_quotes (activo)
  Regla: max 1 quote con status='active' por session

auth.users (1) ──→ (N) memberships
auth.users (1) ──→ (N) shifts
auth.users (1) ──→ (N) sessions (created_by)
auth.users (1) ──→ (N) payments (created_by)
auth.users (1) ──→ (N) payment_quotes (created_by)
```

### 5.3 ÍNDICES CRÍTICOS

Para performance y búsquedas rápidas:

```
sessions:
  - (org_id, parking_id, plate, status) UNIQUE WHERE status='open' ← validar doble sesión (patente normalizada)
  - (session_code) UNIQUE ← resolver QR rápido
  - (shift_id) ← reportes por turno
  - (created_at) ← ordenar por fecha
  - (status, entry_time) ← sesiones antiguas abiertas (alertas > 12h, > 24h)

payments:
  - (org_id, session_id) ← buscar pago de sesión
  - (shift_id, payment_method) ← conciliación de turno por método
  - (quote_id) ← buscar pago por quote
  - (created_at) ← reportes por fecha
  - (session_id, status) UNIQUE WHERE status='completed' ← MVP: solo 1 pago completed

shifts:
  - (org_id, user_id, status) ← validar turno abierto
  - (parking_id, status) ← turnos activos por parking
  - (user_id, status) UNIQUE WHERE status='open' ← solo 1 turno abierto por usuario

tariffs:
  - (org_id, parking_id, valid_from, valid_until) ← buscar tarifa vigente
  - (org_id, valid_from) WHERE parking_id IS NULL ← tarifa default empresa

payment_quotes:
  - (quote_id) PK ← buscar quote rápido
  - (session_id, status) UNIQUE WHERE status='active' ← solo 1 activo por sesión
  - (expires_at) ← limpiar expirados (job diario/horario)
  - (created_at) ← limpieza: borrar expired/used con created_at < now() - 7 días
  - (org_id, created_at) ← reportes

audit_logs:
  - (org_id, created_at) ← auditoría por empresa
  - (user_id, created_at) ← auditoría por usuario
  - (entity_type, entity_id) ← auditoría por entidad
  - (action, created_at) ← búsqueda por tipo de acción
```

---

## 6. VALIDACIONES

### 6.1 AL CREAR SESIÓN (Entrada de vehículo)

| Validación | Mensaje de Error | Acción |
|------------|------------------|--------|
| ✓ Usuario autenticado | "Sesión expirada. Inicie sesión nuevamente" | Bloquear |
| ✓ Turno abierto | "Debe abrir un turno antes de crear sesiones" | Bloquear |
| ✓ Patente no vacía | "Debe ingresar una patente" | Bloquear |
| ✓ Patente formato válido | "Formato de patente inválido. Use 5-8 caracteres alfanuméricos (ej: ABCD12)" | Bloquear |
| ✓ Normalizar patente | Aplicar: trim, eliminar guiones/puntos, uppercase | Automático |
| ✓ Patente sin sesión abierta | Buscar por `org_id + parking_id + plate` (normalizada). Si existe con `status='open'`: "Patente ABC123 ya tiene sesión abierta. Ciérrela primero" | Bloquear |
| ✓ session_code único | (error interno) | Regenerar código |
| ✓ Parking activo | "Parking no disponible" | Bloquear |

### 6.2 AL COBRAR/CERRAR SESIÓN (Salida de vehículo)

| Validación | Mensaje de Error | Acción |
|------------|------------------|--------|
| ✓ Sesión existe | "Sesión no encontrada. Verifique el QR o patente" | Bloquear |
| ✓ Sesión abierta | "Esta sesión ya fue cerrada" | Bloquear |
| ✓ Sesión de misma empresa | "Sesión no encontrada" (seguridad) | Bloquear |
| ✓ Turno abierto | "Debe abrir un turno para cobrar" | Bloquear |
| ✓ Quote válido y vigente | Si quote expiró: "Quote expiró. Recalcule para continuar" | Bloquear si expiró |
| ✓ exit_time_locked >= entry_time | (error interno) | Bloquear |
| ✓ Tarifa existe | Buscar por `org_id + parking_id`, si no existe buscar `org_id + parking_id=NULL`. Si no existe ninguna: "Tarifa no configurada. Contacte administrador" | Bloquear |
| ✓ Monto calculado >= mínimo | (Con ceil(), siempre será >= $25 si estuvo aunque sea 1 segundo) | Permitir |
| ✓ Pago registrado antes de cerrar | (validación interna) | Bloquear |

### 6.3 AL ABRIR TURNO

| Validación | Mensaje de Error | Acción |
|------------|------------------|--------|
| ✓ Usuario autenticado | "Sesión expirada. Inicie sesión nuevamente" | Bloquear |
| ✓ Sin turno abierto previo | "Ya tienes un turno abierto. Ciérralo primero" | Bloquear |
| ✓ Parking seleccionado | "Debe seleccionar un parking" | Bloquear |
| ✓ opening_cash >= 0 | "Efectivo inicial debe ser mayor o igual a 0" | Bloquear |

### 6.4 AL CERRAR TURNO

| Validación | Mensaje de Error | Acción |
|------------|------------------|--------|
| ✓ Turno existe y está abierto | "No tienes un turno abierto" | Bloquear |
| ✓ closing_cash >= 0 | "Efectivo final debe ser mayor o igual a 0" | Bloquear |
| ✓ Turno pertenece al usuario | "No puedes cerrar el turno de otro operador" | Bloquear |
| ⚠️ Sesiones abiertas | Contar sesiones `open` del turno. Si > 0: mostrar warning "Tienes X sesiones abiertas. ¿Confirmar cierre?" | Permitir con confirmación |

**Nota:** En MVP permitimos cerrar turno con sesiones abiertas (quedan huérfanas para resolver después). Se registra en auditoría: `shift.closed_with_open_sessions`.

---

## 7. SEGURIDAD

### 7.1 ROW LEVEL SECURITY (RLS)

**Principio:** Cada tabla tiene `org_id` y solo se puede acceder a datos de la propia empresa.

#### Política General (todas las tablas con org_id)
```
POLÍTICA: select_own_org
  USING (org_id = get_user_org_id())

POLÍTICA: insert_own_org
  WITH CHECK (org_id = get_user_org_id())

POLÍTICA: update_own_org
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id())

POLÍTICA: delete_own_org
  USING (org_id = get_user_org_id())
```

#### Política Adicional para Operadores (App): Restricción por Parking Activo

Para `sessions` y `payment_quotes` en app operador:

```
POLÍTICA: operador_only_active_parking
  USING (
    org_id = get_user_org_id()
    AND parking_id = get_user_active_parking()
  )

get_user_active_parking():
  1. Busca shift con user_id=auth.uid() y status='open'
  2. Retorna shift.parking_id
  3. Si no hay shift open, retorna NULL (no puede ver sesiones/quotes)

Propósito: Evitar que operador de Zona Centro vea/cobre sesiones de Zona Periférica
```

**Excepción:** Admin empresa en web puede ver todo org-wide (sin restricción de parking).

#### Función Helper
```
get_user_org_id():
  1. Obtiene user_id del usuario autenticado (Supabase Auth)
  2. Busca en memberships donde user_id = current_user
  3. Retorna org_id
  4. Si no encuentra, retorna NULL (no puede ver nada)
```

#### Excepción: Superadmin
```
POLÍTICA: superadmin_all_access
  USING (is_superadmin())

is_superadmin():
  1. Verifica si usuario tiene rol especial en tabla memberships
  2. O verifica flag en metadata de auth.users
  3. Retorna true/false
```

### 7.2 AUDITORÍA

#### Acciones que generan audit_log

| Acción | entity_type | Metadata |
|--------|-------------|----------|
| Crear sesión | session | `{plate_input, plate, parking_id, shift_id, session_code}` |
| Resolver QR | session | `{session_code, session_id, found: true/false}` |
| Buscar por patente | session | `{plate_input, plate, parking_id, found: true/false, results_count}` |
| Intento fallido QR/patente | session | `{search_term, reason: 'not_found'}` (sin revelar si existe) |
| Iniciar salida (quote) | payment | `{session_id, quote_id, amount_locked, minutes_locked, exit_time_locked, tariff_applied, expires_at}` |
| Cerrar sesión con quote | session | `{session_id, quote_id, minutes, amount, exit_time_locked}` |
| Quote expirado | payment | `{quote_id, session_id, amount_locked, new_amount_calculated, delta, action: 'recalculate_required'}` |
| Crear pago | payment | `{session_id, amount, payment_method, minutes, quote_id, tariff_applied}` |
| Abrir turno | shift | `{parking_id, opening_cash}` |
| Cerrar turno | shift | `{shift_id, closing_cash, cash_sales, expected_cash_drawer, difference}` |
| Cerrar turno con sesiones abiertas | shift | `{shift_id, open_sessions_count, sample_session_ids: [max 10]}` |
| Crear usuario | membership | `{user_email, role}` |
| Cambiar tarifa | tariff | `{parking_id, old_price, new_price, valid_from}` |
| Tarifa no encontrada | tariff | `{org_id, parking_id, action: 'missing_tariff'}` |
| Login exitoso | auth | `{user_id, ip_address}` |
| Login fallido | auth | `{email, ip_address, reason}` |
| Token refresh | auth | `{user_id, ip_address}` |

#### Implementación
- Trigger en base de datos o función en backend
- Registro automático (no depende de cliente)
- Incluye timestamp, user_id, org_id, IP, user_agent

### 7.3 CÁLCULO DE MONTO EN SERVIDOR

**CRÍTICO:** El monto SIEMPRE se calcula en servidor, nunca confiar en el cliente.

**REGLA:** El cliente NUNCA envía el monto (`amount`), solo envía `session_id` y `payment_method`.

```
Flujo seguro (monto congelado al iniciar salida):

PASO 1 - INICIAR SALIDA (congela monto por 2-3 minutos):
1. Cliente envía: session_id (o session_code)
2. Servidor:
   - Busca sesión
   - Valida permisos (RLS por org_id + parking_id del shift activo)
   - Obtiene entry_time
   - Valida shift open del usuario:
     * Busca shift con user_id=auth.uid() y status='open'
     * Valida que shift.parking_id = session.parking_id (o permiso cross-parking)
     * Si no hay shift open: error "Debe abrir turno primero"
   - Verifica si ya existe quote activo para esta session_id:
     * Intenta leer quote con session_id y status='active'
     * Si existe y NO expiró: retorna el mismo quote
     * Si existe y expiró: marca como expired, continúa creando nuevo
     * Si no existe: continúa creando nuevo
   - Congela exit_time_locked = NOW()
   - Calcula segundos_totales = (exit_time_locked - entry_time)
   - Calcula minutes_locked = ceil(segundos_totales / 60)
   - Busca tarifa vigente usando exit_time_locked (ver regla temporal abajo)
   - Calcula amount_locked = minutes_locked × tarifa
   - Genera quote_id único con expiración de 120-180 segundos (2-3 min)
   - Intenta insertar en payment_quotes: {quote_id, org_id=session.org_id, 
     session_id, parking_id, created_by=auth.uid(), exit_time_locked, 
     minutes_locked, tariff_applied, amount_locked, expires_at, status='active'}
   - Si falla por UNIQUE (colisión concurrencia):
     * Lee quote activo existente
     * Si vigente: retorna ese quote
     * Si expiró: marca expired en transacción, reintenta insert
   - Retorna: {quote_id, minutes_locked, amount_locked, entry_time, 
     exit_time_locked, expires_at, valid_until_display: "HH:MM:SS"}
3. Cliente muestra:
   - Monto a cobrar (SOLO LECTURA - no editable)
   - "Válido hasta HH:MM:SS" (countdown)

PASO 2 - CONFIRMAR PAGO (usa monto congelado si quote vigente):
4. Operador cobra efectivo al cliente
5. Operador confirma pago
6. Cliente envía: {session_id, quote_id, payment_method: 'cash'}
   (NO envía amount)
7. Servidor valida quote:
   
   SI quote_id válido y NO expiró (< 120-180 segundos):
     - Valida que quote.org_id = session.org_id (consistencia)
     - Usa amount_locked del quote (NO recalcula)
     - Crea payment con amount_locked, exit_time_locked, tariff_applied, quote_id (NOT NULL)
     - Actualiza sessions: status='closed', exit_time=exit_time_locked (del quote)
     - Marca quote como status='used'
     - Registra auditoría: payment.completed_with_quote
     - Retorna confirmación
   
   SI quote_id expiró:
     - Recalcula monto actual con exit_time = NOW()
     - Calcula delta = nuevo_monto - amount_locked
     - Retorna error: {
         status: 'quote_expired',
         message: 'Quote expiró. Recalcule para continuar',
         old_amount: amount_locked,
         new_amount: nuevo_monto,
         delta: delta
       }
     - Cliente muestra: "Quote expiró, monto actualizado a $XXX"
     - Botón "Recalcular" (vuelve a PASO 1)
     
     OPCIONAL (MVP estricto - NO implementar):
     - Si delta <= 1 minuto de tarifa: permitir "Confirmar Override"
     - Registra auditoría: payment.completed_with_override
     - Requiere aprobación supervisor (post-MVP)

Protección: 
- Cliente nunca manipula monto
- Servidor calcula y congela al iniciar salida; al confirmar valida vigencia del quote
- Monto congelado por 2-3 min (tiempo real de cobro)
- Solo 1 quote activo por sesión (evita concurrencia)
- Si expira, operador debe recalcular antes de confirmar
- Countdown visible evita sorpresas
```

**Implementación:** 
- Quote en Redis (cache con TTL) o tabla `payment_quotes`
- TTL recomendado: 120 segundos (2 min) o 180 segundos (3 min)
- **Concurrencia:** Solo 1 quote activo por `session_id` (UNIQUE parcial)
- Si existe quote activo: devolver el mismo (si vigente) o invalidar y crear nuevo

**Regla de Prioridad de Tarifas (con timestamp exit_time_locked):**
```
Buscar tarifa vigente usando exit_time_locked (no NOW()):

1. Buscar tarifa para org_id + parking_id específico donde:
   valid_from <= exit_time_locked
   AND (valid_until IS NULL OR exit_time_locked < valid_until)

2. Si no existe, buscar tarifa para org_id + parking_id=NULL (default) donde:
   valid_from <= exit_time_locked
   AND (valid_until IS NULL OR exit_time_locked < valid_until)

3. Si no existe ninguna, bloquear cobro y registrar tariff.missing en auditoría

Propósito: Usar exit_time_locked garantiza que el quote y el pago usen la misma 
tarifa, incluso si alguien cambia la tarifa en la web mientras el operador cobra.
```

---

## 8. FUERA DE SCOPE (MVP)

Funcionalidades que NO se implementan en MVP pero están planificadas:

### ❌ Fase Post-MVP
- Modo offline con cola de sincronización
- Anulación de sesiones/pagos (requiere supervisor)
- Corrección de patente (requiere supervisor)
- Supervisor puede cerrar turno de otro operador
- Voucher digital (email/SMS)
- Sesiones impagas con seguimiento
- Múltiples métodos de pago (tarjeta, QR)
- Alertas antifraude
- Reportes avanzados y BI
- Firmar QR con token JWT
- Notificaciones push
- Búsqueda avanzada de sesiones
- Exportación de reportes (Excel, PDF)

---

## 9. STACK TECNOLÓGICO

### Backend
- **Supabase:** Base de datos PostgreSQL + Auth + RLS + Realtime
- **Edge Functions:** Lógica de negocio (cálculo de tarifas, validaciones)

### Frontend Web
- **Vercel:** Hosting
- **Next.js:** Framework (React)
- **Tailwind CSS:** Estilos

### Frontend Mobile
- **Android:** Nativo o React Native / Flutter
- **Impresora térmica:** Bluetooth (librería según hardware)

### Costos Estimados (Piloto)
- Supabase: $0-25/mes
- Vercel: $0-20/mes
- **Total recurrente: ~$50/mes**

---

## 10. CRITERIOS DE ACEPTACIÓN - FASE 0

Esta Fase 0 está completa cuando:

- ✅ Cualquier persona del equipo puede leer este documento y entender el flujo sin preguntar
- ✅ Un desarrollador puede diseñar la base de datos con este documento
- ✅ Un diseñador UX puede crear wireframes con este documento
- ✅ No quedan decisiones de negocio pendientes para el MVP
- ✅ Todos los casos borde tienen solución definida
- ✅ Las reglas de tarifa están claras con ejemplos
- ✅ Los roles y permisos están definidos en matriz
- ✅ El modelo de datos conceptual está completo

---

## 11. PRÓXIMOS PASOS

Una vez aprobado este documento:

### **Fase 1: Arquitectura y Modelo de Datos (Supabase)**
- Crear proyecto Supabase
- Escribir SQL para crear tablas
- Implementar políticas RLS
- Crear índices
- Testear seguridad

**Duración estimada:** 5-7 días

---

## APÉNDICE A: GLOSARIO

| Término | Definición |
|---------|------------|
| **Parking** | Zona de estacionamiento regulado (ej: "Zona Centro") |
| **Zone** | Sub-zona dentro de un parking (ej: "Cuadra 1") - Opcional |
| **Sesión** | Período desde que un vehículo entra hasta que sale y paga |
| **Session** | Nombre de tabla: `sessions` (antes `parking_sessions`) |
| **Turno (Shift)** | Período de trabajo de un operador (apertura a cierre) |
| **Session Code** | Código random único para identificar sesión en QR |
| **Quote** | Cotización temporal del monto (120-180s) con monto congelado al iniciar salida. Solo 1 activo por sesión |
| **Shift Creación** | `sessions.shift_id` - turno que creó la sesión (entrada) |
| **Shift Cobro** | `payments.shift_id` - turno que cobró (puede diferir del de creación) |
| **RLS** | Row Level Security - Seguridad a nivel de fila en PostgreSQL |
| **Multi-tenant** | Arquitectura que soporta múltiples empresas en una misma base de datos |
| **org_id** | ID de organización/empresa - clave para multi-tenant |
| **POS** | Point of Sale - Dispositivo Android del operador |
| **Tariff Snapshot** | Copia de tarifa aplicada en el momento del pago (auditoría) |

---

## APÉNDICE B: PREGUNTAS FRECUENTES

**P: ¿Qué pasa si el operador cierra la app sin cerrar el turno?**  
R: El turno queda abierto en la base de datos. Al volver a abrir la app, puede continuar con el mismo turno o cerrarlo.

**P: ¿Puede un operador trabajar en múltiples parkings el mismo día?**  
R: Sí, pero debe cerrar el turno del primer parking antes de abrir turno en el segundo.

**P: ¿Qué pasa si hay 2 autos con la misma patente?**  
R: Es extremadamente raro, pero si sucede, el sistema bloqueará la segunda entrada. Se debe cerrar la primera sesión o verificar que la patente esté correctamente ingresada.

**P: ¿El QR expira?**  
R: El QR (session_code) es válido mientras la sesión esté abierta. Una vez cerrada la sesión, el QR ya no funciona.

**P: ¿Puede un admin empresa operar como operador?**  
R: Sí, tiene todos los permisos de operador + permisos de administración.

**P: ¿Cómo se cambia la tarifa?**  
R: Admin empresa edita la tarifa en la web. Puede crear una nueva tarifa con valid_from en el futuro. 

**IMPORTANTE:** La tarifa se determina al momento de CERRAR la sesión (no al entrar). Si un auto entró a las 10:00 con tarifa $25/min, y a las 11:00 cambió a $30/min, al cobrar a las 12:00 se aplica $30/min.

**Post-MVP:** Se agregará `tariff_snapshot` (guardar rate_per_minute aplicado en cada payment) para auditoría y evitar reclamos por cambios de tarifa durante el día.

**P: ¿Qué pasa si un auto está estacionado 2 días?**  
R: La sesión queda abierta. Al cobrar, se calculará el monto real (ej: 2880 minutos × $25 = $72,000). No hay auto-cierre. Post-MVP se agregarán alertas para sesiones antiguas.

**P: ¿El operador puede modificar el monto a cobrar?**  
R: No. El monto se calcula automáticamente en el servidor y no es editable. El cliente nunca envía el monto, solo confirma el pago.

**P: ¿Por qué ceil() en lugar de floor()?**  
R: Para cobrar "por minuto iniciado". Si estuvo 1 segundo, ya consumió 1 minuto del espacio. Con floor(), 59 segundos sería $0, lo cual genera conflictos operativos.

**P: ¿Qué pasa si el operador cobra y el quote expira antes de confirmar?**  
R: La app muestra "Quote expiró, recalcular". Operador debe presionar "Recalcular" para generar nuevo quote. Si el monto cambió, debe ajustar el cobro. MVP estricto: NO permite override. Post-MVP: supervisor puede aprobar override si delta <= 1 minuto.

**P: ¿Por qué 2-3 minutos de quote en lugar de 60 segundos?**  
R: En operación real, cobrar puede tomar más tiempo (cliente busca cambio, cuenta billetes, etc.). 60s es muy corto. 120-180s es más realista sin perder control.

**P: ¿Cómo se normalizan las patentes?**  
R: Trim espacios, eliminar guiones/puntos, convertir a mayúsculas. Ejemplos: "AB-CD12" → "ABCD12", " abc 123 " → "ABC123". Esto evita duplicados por formato.

**P: ¿Qué pasa si no hay tarifa configurada?**  
R: Sistema busca tarifa para el parking específico. Si no existe, busca tarifa default de la empresa (parking_id=NULL). Si no existe ninguna, bloquea cobro y registra alerta en auditoría.

**P: ¿Puede un operador cobrar una sesión creada por otro operador/turno?**  
R: Sí. `sessions.shift_id` guarda el turno que creó la sesión. `payments.shift_id` guarda el turno que cobró. Pueden ser diferentes. Esto es útil si una sesión quedó abierta y otro operador la cierra. Se audita como cobro cruzado.

**P: ¿Qué pasa si aprieto "Iniciar Salida" dos veces?**  
R: Sistema verifica si ya existe un quote activo para esa sesión. Si existe y es vigente, retorna el mismo quote. Si expiró, lo marca como expired y crea uno nuevo. Solo puede haber 1 quote activo por sesión.

**P: ¿Cuándo se setea sessions.exit_time?**  
R: Solo cuando se completa el pago. Se copia de `payments.exit_time_locked` (que viene del quote). Mientras la sesión está abierta o tiene quote pendiente, `exit_time` es NULL.

**P: ¿Por qué payment_quotes.org_id es redundante pero necesario?**  
R: Como `session_id → sessions.org_id`, técnicamente es redundante. Pero se necesita para RLS (políticas de seguridad) y limpieza eficiente. Se valida consistencia al crear quote: `payment_quotes.org_id = sessions.org_id`.

**P: ¿Puede un operador de Zona Centro cobrar sesiones de Zona Periférica?**  
R: No en MVP. RLS restringe por `parking_id` del shift activo del operador. Solo admin empresa puede ver todas las zonas. Esto evita errores operativos.

**P: ¿Cómo se manejan las colisiones de quotes (doble click)?**  
R: Al insertar quote con UNIQUE constraint, si falla: lee el existente, valida vigencia, retorna el mismo o marca expired y reintenta. Evita "error 500 random".

**P: ¿Cómo se limpian los quotes viejos?**  
R: Job diario/horario elimina quotes con `status='expired'` o `status='used'` y `created_at < now() - 7 días`. Mantiene auditoría reciente sin inflar tabla.

---

**FIN DEL DOCUMENTO MVP v0.1**

---

**Historial de Cambios:**
- v0.1.5 (2026-01-24): Ajustes finales de implementación SQL/Edge Functions
  - **payment_quotes.org_id:** Redundante pero necesario para RLS. Validación consistencia con sessions.org_id
  - **RLS por parking activo:** Operadores solo ven sessions/quotes de su parking activo (shift.parking_id). Admin ve todo org-wide
  - **Validación shift al crear quote:** Exige shift open + parking coincide + setea created_by
  - **Manejo colisiones UNIQUE:** Al fallar insert por concurrencia: lee existente, valida vigencia, reintenta
  - **payments.quote_id NOT NULL:** Obligatorio en MVP (siempre usa quote). Post-MVP: nullable
  - **Limpieza quotes:** Job elimina expired/used con created_at < now() - 7 días
  - **Tarifa vigente por timestamp:** Usa exit_time_locked (no NOW) para buscar tarifa. Garantiza coherencia quote-pago
  - **FAQ ampliadas:** org_id redundante, RLS parking, colisiones, limpieza
- v0.1.4 (2026-01-24): Ajustes de implementación DB/concurrencia
  - **Tabla payment_quotes definida:** Estructura completa con campos y reglas
  - **Concurrencia quotes:** Solo 1 quote activo por session (UNIQUE parcial). Si existe: retorna mismo o invalida y crea nuevo
  - **sessions.exit_time:** Se setea SOLO al cerrar con pago (copia de payments.exit_time_locked). NO al crear quote
  - **Shift creación vs cobro:** `sessions.shift_id` = turno que creó, `payments.shift_id` = turno que cobró (pueden diferir)
  - **Auditoría:** `plate_input` + `plate` (normalizada). `sample_session_ids` (max 10) en lugar de lista completa
  - **Casos borde:** Agregados 5e (cobro cruzado) y 5f (múltiples clicks)
  - **FAQ ampliadas:** Cobro cruzado, múltiples clicks, cuándo se setea exit_time
  - **Texto alineado:** "Servidor calcula y congela al iniciar salida; al confirmar valida vigencia"
- v0.1.3 (2026-01-24): Micro-ajustes operativos críticos
  - **Monto congelado al iniciar salida:** Quote TTL 120-180s (2-3 min) en lugar de 60s
  - **exit_time_locked:** Se congela al iniciar salida, no al confirmar pago
  - **Normalización de patentes:** trim, sin guiones/puntos, uppercase antes de guardar/buscar
  - **Prioridad de tarifas:** 1) parking específico, 2) default empresa (parking_id=NULL), 3) error
  - **Alertas sesiones antiguas:** Warning > 12h, Crítico > 24h (sin auto-cierre)
  - **Cierre turno con sesiones abiertas:** Warning + confirmación + auditoría
  - **Quote expirado:** Botón "Recalcular" obligatorio, NO override en MVP
  - **Auditoría ampliada:** quote_created, quote_expired, shift.closed_with_open_sessions, tariff.missing
  - **Tabla payments:** Agregados campos quote_id, exit_time_locked, tariff_applied
  - **Índices:** UNIQUE parcial para sesiones abiertas con patente normalizada
- v0.1.2 (2026-01-24): Ajustes finos pre-piloto
  - Sistema de **quotes** (60s) para evitar discusiones por recálculo de monto
  - Tarifa se determina al **cerrar sesión** (no al entrar) + `tariff_snapshot` post-MVP
  - Regla exacta doble sesión: `org_id + parking_id + plate` (incluye zonas)
  - Caso borde: **sesión Auth expirada** con mitigación (token refresh)
  - Modelo corregido: `user_id` referencia `auth.users` (no `memberships`)
  - Relación `sessions (1) → (N) payments` (futuro: anulaciones) + regla MVP max 1
  - Auditoría ampliada: resolver QR, búsqueda patente, quotes, token refresh
  - Consistencia: tabla `sessions` (no `parking_sessions`) en todo el documento
  - Índices mejorados: UNIQUE constraints para validaciones
- v0.1.1 (2026-01-24): Correcciones críticas post-revisión
  - Cambio de `floor()` a `ceil()` para cobro por minuto iniciado
  - Separación de `cash_sales` vs `expected_cash_drawer` en turnos
  - Cliente NO envía monto, solo confirma (doble validación en servidor)
  - Validación de patente flexible 5-8 chars (Chile-friendly)
  - Agregada regla: sesiones sin límite de tiempo (no auto-cierre)
  - Aclaración: turno obligatorio para crear sesiones (sin contingencia en MVP)
  - Seguridad QR: no revelar diferencia entre "no existe" vs "no pertenece"
- v0.1 (2026-01-24): Versión inicial - Definición completa del MVP

