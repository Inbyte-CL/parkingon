# 🔧 Solución: Asignar Parking al Usuario Test

## ❌ Problema Identificado

El usuario `test@inbyte.com` tiene membership en la organización Inbyte, pero **NO tiene un `parking_id` asignado**.

Esto causa que al intentar abrir un turno, el backend responda:
```
"parking_id y opening_cash son requeridos"
```

## ✅ Solución

Ejecutar este SQL en Supabase para asignar el parking "Zona Centro" al usuario:

```sql
-- Asignar Zona Centro al usuario test
UPDATE memberships
SET parking_id = 'b0000000-0000-0000-0000-000000000001'
WHERE user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002'
AND org_id = 'a0000000-0000-0000-0000-000000000001';

-- Verificar
SELECT 
    u.email,
    m.role,
    p.name as parking_asignado,
    p.address,
    m.status
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
JOIN parkings p ON p.id = m.parking_id
WHERE m.user_id = '9e52435a-dd5c-441b-9650-8ea3ec504002';
```

## 📋 Pasos para Ejecutar

1. Ve a: https://supabase.com/dashboard/project/mmqqrfvullrovstcykcj/sql/new
2. Pega el SQL de arriba
3. Presiona "Run"
4. Verifica que aparezca:
   ```
   email: test@inbyte.com
   role: operador
   parking_asignado: Zona Centro
   address: Av. Corrientes 1234, Centro
   status: active
   ```

## 🚀 Después de Ejecutar

1. Vuelve a la app
2. Intenta abrir el turno nuevamente
3. Debería funcionar correctamente

---

**Archivo SQL completo:** `database/assign-parking-to-test-user.sql`
