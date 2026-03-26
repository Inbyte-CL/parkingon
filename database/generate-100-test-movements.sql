-- ============================================================================
-- SCRIPT SIMPLE PARA GENERAR 100 MOVIMIENTOS DE PRUEBA - JIS PARKING
-- ============================================================================
-- Genera: 100 movimientos completos (sessions + shifts + payment_quotes + payments)
-- Fecha: Enero 2026
-- ============================================================================

DO $$
DECLARE
    v_org_id UUID;
    v_parking_id UUID;
    v_operator_id UUID;
    v_tariff_price NUMERIC(10,2) := 100.00;
    
    v_shift_id UUID;
    v_session_id UUID;
    v_quote_id TEXT;
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
    v_i INTEGER;
    v_shift_cash_sales NUMERIC(10,2);
    v_month_start DATE := '2026-01-01';
    v_month_end DATE := '2026-01-31';
BEGIN
    -- Obtener org_id
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'jis-parking';
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró la organización JIS Parking';
    END IF;
    
    -- Obtener primer parking activo
    SELECT id INTO v_parking_id 
    FROM parkings 
    WHERE org_id = v_org_id AND status = 'active'
    LIMIT 1;
    
    IF v_parking_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró ningún parking activo';
    END IF;
    
    -- Obtener primer operador activo
    SELECT user_id INTO v_operator_id 
    FROM memberships 
    WHERE org_id = v_org_id AND role = 'operador' AND status = 'active'
    LIMIT 1;
    
    IF v_operator_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró ningún operador activo';
    END IF;
    
    -- Obtener tarifa
    SELECT COALESCE(price_per_minute, v_tariff_price) INTO v_tariff_price
    FROM tariffs
    WHERE org_id = v_org_id
      AND valid_from <= NOW()
      AND (valid_until IS NULL OR valid_until >= NOW())
    ORDER BY parking_id NULLS LAST, valid_from DESC
    LIMIT 1;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'GENERANDO 100 MOVIMIENTOS DE PRUEBA';
    RAISE NOTICE 'Organización: %', v_org_id;
    RAISE NOTICE 'Parking: %', v_parking_id;
    RAISE NOTICE 'Operador: %', v_operator_id;
    RAISE NOTICE 'Tarifa: % CLP/min', v_tariff_price;
    RAISE NOTICE '========================================';
    
    -- Crear un turno para todos los movimientos
    v_shift_opening := v_month_start::TIMESTAMPTZ;
    v_shift_closing := v_month_end::TIMESTAMPTZ;
    v_shift_cash_sales := 0;
    
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
    
    RAISE NOTICE 'Turno creado: %', v_shift_id;
    
    -- Generar 100 movimientos
    FOR v_i IN 1..100 LOOP
        -- Generar tiempo de entrada aleatorio en enero 2026
        v_entry_time := v_month_start::TIMESTAMPTZ + 
            (random() * EXTRACT(EPOCH FROM (v_month_end::TIMESTAMPTZ - v_month_start::TIMESTAMPTZ)))::INTEGER * INTERVAL '1 second';
        
        -- Monto entre 1500 y 3000 CLP
        v_amount := 1500 + floor(random() * 1501)::NUMERIC;
        
        -- Calcular minutos basado en monto y tarifa
        v_minutes := CEIL(v_amount / v_tariff_price)::INTEGER;
        
        -- Calcular tiempo de salida
        v_exit_time := v_entry_time + (v_minutes * INTERVAL '1 minute');
        
        -- Asegurar que esté dentro del mes
        IF v_exit_time > v_month_end::TIMESTAMPTZ THEN
            v_exit_time := v_month_end::TIMESTAMPTZ;
            v_minutes := CEIL(EXTRACT(EPOCH FROM (v_exit_time - v_entry_time)) / 60)::INTEGER;
            v_amount := v_minutes * v_tariff_price;
        END IF;
        
        -- Método de pago aleatorio
        v_payment_method := v_payment_methods[1 + floor(random() * array_length(v_payment_methods, 1))::INTEGER];
        
        -- Generar patente (formato simple: 3 letras + 3 números)
        v_plate := chr(65 + floor(random() * 26)::INTEGER) || 
                   chr(65 + floor(random() * 26)::INTEGER) || 
                   chr(65 + floor(random() * 26)::INTEGER) ||
                   floor(random() * 10)::TEXT ||
                   floor(random() * 10)::TEXT ||
                   floor(random() * 10)::TEXT;
        
        -- Generar session_code único usando timestamp y número
        v_session_code := 'TEST' || extract(epoch from now())::TEXT || v_i::TEXT || substr(md5(random()::TEXT), 1, 4);
        
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
        
        -- Log cada 10 movimientos
        IF v_i % 10 = 0 THEN
            RAISE NOTICE 'Generados % movimientos...', v_i;
        END IF;
    END LOOP;
    
    -- Actualizar turno con ventas
    UPDATE shifts SET
        cash_sales = v_shift_cash_sales,
        expected_cash_drawer = v_shift_cash_sales,
        closing_cash = v_shift_cash_sales,
        difference = 0,
        updated_at = v_shift_closing
    WHERE id = v_shift_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'GENERACIÓN COMPLETADA';
    RAISE NOTICE 'Total de movimientos: 100';
    RAISE NOTICE 'Ventas en efectivo: % CLP', v_shift_cash_sales;
    RAISE NOTICE '========================================';
    
    -- Verificar que se crearon correctamente
    DECLARE
        v_sessions_count INTEGER;
        v_payments_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_sessions_count
        FROM sessions
        WHERE shift_id = v_shift_id;
        
        SELECT COUNT(*) INTO v_payments_count
        FROM payments
        WHERE shift_id = v_shift_id;
        
        RAISE NOTICE '';
        RAISE NOTICE 'VERIFICACIÓN:';
        RAISE NOTICE '  Sesiones creadas: %', v_sessions_count;
        RAISE NOTICE '  Pagos creados: %', v_payments_count;
        
        IF v_sessions_count != 100 OR v_payments_count != 100 THEN
            RAISE WARNING '⚠️  No se crearon todos los registros esperados!';
        ELSE
            RAISE NOTICE '✅ Todos los registros se crearon correctamente';
        END IF;
    END;
END $$;
