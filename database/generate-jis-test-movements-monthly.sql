-- ============================================================================
-- SCRIPT PARA GENERAR MOVIMIENTOS POR MES - JIS PARKING
-- ============================================================================
-- EJECUTA ESTE SCRIPT UNA VEZ POR MES para evitar timeouts
-- Cambia el mes en la variable v_month_start antes de ejecutar
-- ============================================================================

-- PASO 1: Crear funciones auxiliares (ejecutar solo la primera vez)
CREATE OR REPLACE FUNCTION generate_random_plate() RETURNS TEXT AS $$
DECLARE
    letters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    numbers TEXT := '0123456789';
    plate TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..(3 + floor(random() * 2)::INTEGER) LOOP
        plate := plate || substr(letters, floor(random() * length(letters) + 1)::INTEGER, 1);
    END LOOP;
    FOR i IN 1..(2 + floor(random() * 2)::INTEGER) LOOP
        plate := plate || substr(numbers, floor(random() * length(numbers) + 1)::INTEGER, 1);
    END LOOP;
    RETURN UPPER(plate);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_session_code() RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    code TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..(8 + floor(random() * 5)::INTEGER) LOOP
        code := code || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 2: CONFIGURAR EL MES AQUÍ (cambiar antes de ejecutar)
-- ============================================================================
DO $$
DECLARE
    -- ⚠️ CAMBIAR ESTA FECHA PARA CADA MES
    v_month_start DATE := '2025-10-01';  -- Cambiar a: '2025-11-01', '2025-12-01', '2026-01-01'
    v_month_end DATE;
    v_org_id UUID;
    v_parking_ids UUID[];
    v_operator_ids UUID[];
    v_tariff_price NUMERIC(10,2) := 100.00;
    
    v_operator_id UUID;
    v_parking_id UUID;
    v_shift_id UUID;
    v_session_id UUID;
    v_quote_id TEXT;
    v_payment_id UUID;
    v_entry_time TIMESTAMPTZ;
    v_exit_time TIMESTAMPTZ;
    v_minutes INTEGER;
    v_amount NUMERIC(10,2);
    v_payment_method TEXT;
    v_plate TEXT;
    v_session_code TEXT;
    v_shift_opening TIMESTAMPTZ;
    v_shift_closing TIMESTAMPTZ;
    v_exit_time_locked TIMESTAMPTZ;
    v_expires_at TIMESTAMPTZ;
    v_payment_methods TEXT[] := ARRAY['cash', 'card', 'qr_payment'];
    v_movement_count INTEGER;
    v_shift_cash_sales NUMERIC(10,2);
    v_shift_count INTEGER;
    v_total_movements INTEGER := 0;
    v_batch_size INTEGER := 20;  -- Procesar en lotes muy pequeños de 20
    v_batch_num INTEGER;
    v_current_batch_size INTEGER;
BEGIN
    v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Obtener org_id
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'jis-parking';
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró la organización JIS Parking';
    END IF;
    
    -- Obtener parkings
    SELECT ARRAY_AGG(id) INTO v_parking_ids 
    FROM parkings 
    WHERE org_id = v_org_id AND status = 'active';
    
    -- Obtener operadores
    SELECT ARRAY_AGG(user_id) INTO v_operator_ids 
    FROM memberships 
    WHERE org_id = v_org_id AND role = 'operador' AND status = 'active';
    
    -- Obtener tarifa
    SELECT COALESCE(price_per_minute, v_tariff_price) INTO v_tariff_price
    FROM tariffs
    WHERE org_id = v_org_id
      AND valid_from <= NOW()
      AND (valid_until IS NULL OR valid_until >= NOW())
    ORDER BY parking_id NULLS LAST, valid_from DESC
    LIMIT 1;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'GENERANDO MOVIMIENTOS PARA: %', to_char(v_month_start, 'Month YYYY');
    RAISE NOTICE 'Organización: JIS Parking';
    RAISE NOTICE 'Parkings: %', array_length(v_parking_ids, 1);
    RAISE NOTICE 'Operadores: %', array_length(v_operator_ids, 1);
    RAISE NOTICE 'Tarifa: % CLP/min', v_tariff_price;
    RAISE NOTICE 'Procesando en lotes de %', v_batch_size;
    RAISE NOTICE '========================================';
    
    -- Loop por operador
    FOREACH v_operator_id IN ARRAY v_operator_ids LOOP
        -- Loop por parking
        FOREACH v_parking_id IN ARRAY v_parking_ids LOOP
            v_movement_count := 0;
            v_batch_num := 0;
            
            -- Procesar en lotes muy pequeños
            WHILE v_movement_count < 1000 LOOP
                v_batch_num := v_batch_num + 1;
                v_current_batch_size := LEAST(v_batch_size, 1000 - v_movement_count);
                v_shift_count := 0;
                v_shift_cash_sales := 0;
                
                -- Crear turno para este lote
                v_shift_opening := v_month_start::TIMESTAMPTZ + (random() * EXTRACT(EPOCH FROM (v_month_end::TIMESTAMPTZ - v_month_start::TIMESTAMPTZ)))::INTEGER * INTERVAL '1 second';
                v_shift_closing := v_shift_opening + INTERVAL '8 hours';
                
                IF v_shift_closing > v_month_end::TIMESTAMPTZ THEN
                    v_shift_closing := v_month_end::TIMESTAMPTZ;
                END IF;
                
                INSERT INTO shifts (
                    id, org_id, user_id, parking_id, status,
                    opening_time, closing_time,
                    opening_cash, closing_cash, cash_sales,
                    expected_cash_drawer, difference,
                    created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), v_org_id, v_operator_id, v_parking_id, 'closed',
                    v_shift_opening, v_shift_closing,
                    0, 0, 0, 0, 0,
                    v_shift_opening, v_shift_closing
                ) RETURNING id INTO v_shift_id;
                
                -- Generar movimientos en este lote
                FOR i IN 1..v_current_batch_size LOOP
                    -- Generar tiempos aleatorios dentro del mes
                    v_entry_time := v_month_start::TIMESTAMPTZ + 
                        (random() * EXTRACT(EPOCH FROM (v_month_end::TIMESTAMPTZ - v_month_start::TIMESTAMPTZ)))::INTEGER * INTERVAL '1 second';
                    
                    -- Monto entre 1500 y 3000 CLP
                    v_amount := 1500 + floor(random() * 1501)::NUMERIC;
                    
                    -- Calcular minutos
                    v_minutes := CEIL(v_amount / v_tariff_price)::INTEGER;
                    
                    -- Calcular exit_time
                    v_exit_time := v_entry_time + (v_minutes * INTERVAL '1 minute');
                    
                    IF v_exit_time > v_month_end::TIMESTAMPTZ THEN
                        v_exit_time := v_month_end::TIMESTAMPTZ;
                        v_minutes := CEIL(EXTRACT(EPOCH FROM (v_exit_time - v_entry_time)) / 60)::INTEGER;
                        v_amount := v_minutes * v_tariff_price;
                    END IF;
                    
                    -- Método de pago aleatorio
                    v_payment_method := v_payment_methods[1 + floor(random() * array_length(v_payment_methods, 1))::INTEGER];
                    
                    -- Generar patente y código
                    v_plate := generate_random_plate();
                    v_session_code := generate_session_code();
                    
                    -- Verificar unicidad (máximo 3 intentos, usar timestamp para garantizar unicidad)
                    DECLARE
                        attempts INTEGER := 0;
                    BEGIN
                        WHILE EXISTS (SELECT 1 FROM sessions WHERE session_code = v_session_code) AND attempts < 3 LOOP
                            v_session_code := generate_session_code() || substr(extract(epoch from now())::TEXT, -6);
                            attempts := attempts + 1;
                        END LOOP;
                    END;
                    
                    -- Crear sesión
                    INSERT INTO sessions (
                        id, org_id, parking_id, shift_id, plate, session_code,
                        status, entry_time, exit_time, created_by,
                        created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), v_org_id, v_parking_id, v_shift_id, v_plate, v_session_code,
                        'closed', v_entry_time, v_exit_time, v_operator_id,
                        v_entry_time, v_exit_time
                    ) RETURNING id INTO v_session_id;
                    
                    -- Calcular exit_time_locked
                    v_exit_time_locked := v_exit_time;
                    v_expires_at := v_exit_time_locked + INTERVAL '3 minutes';
                    
                    -- Crear quote
                    v_quote_id := 'quote_' || v_session_id::TEXT || '_' || extract(epoch from v_exit_time_locked)::TEXT;
                    
                    INSERT INTO payment_quotes (
                        quote_id, org_id, session_id, parking_id, created_by,
                        exit_time_locked, minutes_locked, tariff_applied,
                        amount_locked, expires_at, status, created_at
                    ) VALUES (
                        v_quote_id, v_org_id, v_session_id, v_parking_id, v_operator_id,
                        v_exit_time_locked, v_minutes, v_tariff_price,
                        v_amount, v_expires_at, 'used', v_exit_time_locked
                    );
                    
                    -- Crear pago
                    INSERT INTO payments (
                        id, org_id, session_id, shift_id, quote_id,
                        amount, minutes, exit_time_locked, tariff_applied,
                        payment_method, status, created_by, created_at
                    ) VALUES (
                        gen_random_uuid(), v_org_id, v_session_id, v_shift_id, v_quote_id,
                        v_amount, v_minutes, v_exit_time_locked, v_tariff_price,
                        v_payment_method::payment_method_type, 'completed', v_operator_id, v_exit_time_locked
                    );
                    
                    -- Acumular ventas en efectivo
                    IF v_payment_method = 'cash' THEN
                        v_shift_cash_sales := v_shift_cash_sales + v_amount;
                    END IF;
                    
                    v_movement_count := v_movement_count + 1;
                END LOOP;
                
                -- Actualizar shift con ventas
                UPDATE shifts SET
                    cash_sales = v_shift_cash_sales,
                    expected_cash_drawer = v_shift_cash_sales,
                    closing_cash = v_shift_cash_sales,
                    difference = 0,
                    updated_at = v_shift_closing
                WHERE id = v_shift_id;
                
                -- Commit implícito después de cada lote (PostgreSQL hace commit automático en DO blocks)
                -- Pero podemos forzar un punto de control
                PERFORM 1;  -- Operación dummy para forzar procesamiento
                
                RAISE NOTICE '  Lote %: % movimientos (Total: %)', 
                    v_batch_num, v_current_batch_size, v_movement_count;
            END LOOP;
            
            v_total_movements := v_total_movements + v_movement_count;
            RAISE NOTICE '  ✓ Operador % - Parking %: 1000 movimientos', 
                v_operator_id, v_parking_id;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'GENERACIÓN COMPLETADA PARA: %', to_char(v_month_start, 'Month YYYY');
    RAISE NOTICE 'Total de movimientos: %', v_total_movements;
    RAISE NOTICE '========================================';
END $$;
