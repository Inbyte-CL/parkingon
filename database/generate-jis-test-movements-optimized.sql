-- ============================================================================
-- SCRIPT OPTIMIZADO PARA GENERAR MOVIMIENTOS DE PRUEBA - JIS PARKING
-- ============================================================================
-- Genera: 1000 movimientos por mes (Oct 2025 - Ene 2026) por cada operador en cada estacionamiento
-- Total: 5 operadores × 5 parkings × 4 meses × 1000 = 100,000 movimientos
-- 
-- OPTIMIZACIÓN: Procesa en lotes de 100 movimientos para evitar timeouts
-- ============================================================================

-- PASO 1: Crear funciones auxiliares
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
-- PASO 2: Función para generar un lote de movimientos
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_movements_batch(
    p_org_id UUID,
    p_operator_id UUID,
    p_parking_id UUID,
    p_month_start DATE,
    p_month_end DATE,
    p_tariff_price NUMERIC,
    p_batch_size INTEGER DEFAULT 100
) RETURNS INTEGER AS $$
DECLARE
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
    v_count INTEGER := 0;
    v_shift_cash_sales NUMERIC(10,2) := 0;
    v_shift_created BOOLEAN := FALSE;
BEGIN
    FOR i IN 1..p_batch_size LOOP
        -- Generar tiempos aleatorios dentro del mes
        v_entry_time := p_month_start::TIMESTAMPTZ + 
            (random() * (EXTRACT(EPOCH FROM (p_month_end::TIMESTAMPTZ - p_month_start::TIMESTAMPTZ))))::INTEGER * INTERVAL '1 second';
        
        -- Monto entre 1500 y 3000 CLP
        v_amount := 1500 + floor(random() * 1501)::NUMERIC;
        
        -- Calcular minutos basado en el monto y la tarifa
        v_minutes := CEIL(v_amount / p_tariff_price)::INTEGER;
        
        -- Calcular exit_time
        v_exit_time := v_entry_time + (v_minutes * INTERVAL '1 minute');
        
        -- Asegurar que exit_time esté dentro del mes
        IF v_exit_time > p_month_end::TIMESTAMPTZ THEN
            v_exit_time := p_month_end::TIMESTAMPTZ;
            v_minutes := CEIL(EXTRACT(EPOCH FROM (v_exit_time - v_entry_time)) / 60)::INTEGER;
            v_amount := v_minutes * p_tariff_price;
        END IF;
        
        -- Método de pago aleatorio
        v_payment_method := v_payment_methods[1 + floor(random() * array_length(v_payment_methods, 1))::INTEGER];
        
        -- Generar patente y código
        v_plate := generate_random_plate();
        v_session_code := generate_session_code();
        
        -- Verificar unicidad de session_code (máximo 10 intentos)
        DECLARE
            attempts INTEGER := 0;
        BEGIN
            WHILE EXISTS (SELECT 1 FROM sessions WHERE session_code = v_session_code) AND attempts < 10 LOOP
                v_session_code := generate_session_code();
                attempts := attempts + 1;
            END LOOP;
        END;
        
        -- Crear turno cada 50 movimientos
        IF NOT v_shift_created OR v_count % 50 = 0 THEN
            v_shift_opening := v_entry_time - INTERVAL '30 minutes';
            v_shift_closing := v_exit_time + INTERVAL '30 minutes';
            
            INSERT INTO shifts (
                id, org_id, user_id, parking_id, status,
                opening_time, closing_time,
                opening_cash, closing_cash, cash_sales,
                expected_cash_drawer, difference,
                created_at, updated_at
            ) VALUES (
                gen_random_uuid(), p_org_id, p_operator_id, p_parking_id, 'closed',
                v_shift_opening, v_shift_closing,
                0, 0, 0, 0, 0,
                v_shift_opening, v_shift_closing
            ) RETURNING id INTO v_shift_id;
            
            v_shift_created := TRUE;
            v_shift_cash_sales := 0;
        END IF;
        
        -- Crear sesión
        INSERT INTO sessions (
            id, org_id, parking_id, shift_id, plate, session_code,
            status, entry_time, exit_time, created_by,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(), p_org_id, p_parking_id, v_shift_id, v_plate, v_session_code,
            'closed', v_entry_time, v_exit_time, p_operator_id,
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
            v_quote_id, p_org_id, v_session_id, p_parking_id, p_operator_id,
            v_exit_time_locked, v_minutes, p_tariff_price,
            v_amount, v_expires_at, 'used', v_exit_time_locked
        );
        
        -- Crear pago
        INSERT INTO payments (
            id, org_id, session_id, shift_id, quote_id,
            amount, minutes, exit_time_locked, tariff_applied,
            payment_method, status, created_by, created_at
        ) VALUES (
            gen_random_uuid(), p_org_id, v_session_id, v_shift_id, v_quote_id,
            v_amount, v_minutes, v_exit_time_locked, p_tariff_price,
            v_payment_method::payment_method_type, 'completed', p_operator_id, v_exit_time_locked
        );
        
        -- Acumular ventas en efectivo
        IF v_payment_method = 'cash' THEN
            v_shift_cash_sales := v_shift_cash_sales + v_amount;
        END IF;
        
        v_count := v_count + 1;
        
        -- Actualizar shift cada 50 movimientos o al final
        IF v_count % 50 = 0 OR v_count = p_batch_size THEN
            UPDATE shifts SET
                cash_sales = v_shift_cash_sales,
                expected_cash_drawer = v_shift_cash_sales,
                closing_cash = v_shift_cash_sales,
                difference = 0,
                updated_at = v_shift_closing
            WHERE id = v_shift_id;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 3: Script principal que procesa en lotes
-- ============================================================================
DO $$
DECLARE
    v_org_id UUID;
    v_parking_ids UUID[];
    v_operator_ids UUID[];
    v_tariff_price NUMERIC(10,2) := 100.00;
    
    v_operator_id UUID;
    v_parking_id UUID;
    v_month_start DATE;
    v_month_end DATE;
    v_month_name TEXT;
    v_months DATE[] := ARRAY[
        '2025-10-01'::DATE,
        '2025-11-01'::DATE,
        '2025-12-01'::DATE,
        '2026-01-01'::DATE
    ];
    
    v_movements_per_batch INTEGER := 100;
    v_total_per_combination INTEGER := 1000;
    v_batches_needed INTEGER;
    v_batch_count INTEGER;
    v_total_movements INTEGER := 0;
    v_batch_result INTEGER;
BEGIN
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
    RAISE NOTICE 'INICIANDO GENERACIÓN DE MOVIMIENTOS';
    RAISE NOTICE 'Organización: JIS Parking (%)', v_org_id;
    RAISE NOTICE 'Parkings: %', array_length(v_parking_ids, 1);
    RAISE NOTICE 'Operadores: %', array_length(v_operator_ids, 1);
    RAISE NOTICE 'Tarifa: % CLP/min', v_tariff_price;
    RAISE NOTICE 'Procesando en lotes de % movimientos', v_movements_per_batch;
    RAISE NOTICE '========================================';
    
    v_batches_needed := CEIL(v_total_per_combination::NUMERIC / v_movements_per_batch);
    
    -- Loop por mes
    FOREACH v_month_start IN ARRAY v_months LOOP
        v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        v_month_name := to_char(v_month_start, 'Month YYYY');
        
        RAISE NOTICE '';
        RAISE NOTICE '--- Procesando % ---', v_month_name;
        
        -- Loop por operador
        FOREACH v_operator_id IN ARRAY v_operator_ids LOOP
            -- Loop por parking
            FOREACH v_parking_id IN ARRAY v_parking_ids LOOP
                v_batch_count := 0;
                
                -- Procesar en lotes
                WHILE v_batch_count * v_movements_per_batch < v_total_per_combination LOOP
                    v_batch_result := generate_movements_batch(
                        v_org_id,
                        v_operator_id,
                        v_parking_id,
                        v_month_start,
                        v_month_end,
                        v_tariff_price,
                        LEAST(v_movements_per_batch, v_total_per_combination - (v_batch_count * v_movements_per_batch))
                    );
                    
                    v_batch_count := v_batch_count + 1;
                    v_total_movements := v_total_movements + v_batch_result;
                    
                    RAISE NOTICE '  Lote %/% completado: % movimientos', 
                        v_batch_count, v_batches_needed, v_batch_result;
                END LOOP;
                
                RAISE NOTICE '  ✓ Operador % - Parking %: % movimientos', 
                    v_operator_id, v_parking_id, v_total_per_combination;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE '✓ % completado', v_month_name;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'GENERACIÓN COMPLETADA';
    RAISE NOTICE 'Total de movimientos generados: %', v_total_movements;
    RAISE NOTICE '========================================';
END $$;

-- NOTA: Las funciones auxiliares se pueden eliminar después si lo deseas:
-- DROP FUNCTION IF EXISTS generate_random_plate();
-- DROP FUNCTION IF EXISTS generate_session_code();
-- DROP FUNCTION IF EXISTS generate_movements_batch(UUID, UUID, UUID, DATE, DATE, NUMERIC, INTEGER);
