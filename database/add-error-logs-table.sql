-- Tabla para almacenar logs de errores subidos desde la app Android
CREATE TABLE IF NOT EXISTS app_error_logs (
    id          BIGSERIAL PRIMARY KEY,
    timestamp   BIGINT       NOT NULL,          -- epoch ms del momento del error
    recorded_at TIMESTAMPTZ  DEFAULT NOW(),     -- cuando se subió al servidor
    level       TEXT         NOT NULL,          -- ERROR | WARNING | INFO
    source      TEXT         NOT NULL,          -- clase que originó el error
    message     TEXT         NOT NULL,          -- mensaje de error
    device_id   TEXT                            -- Android ID del dispositivo
);

ALTER TABLE app_error_logs ENABLE ROW LEVEL SECURITY;

-- Permite insertar desde la app con anon key (solo escritura, no lectura)
DROP POLICY IF EXISTS "app_logs_insert" ON app_error_logs;
CREATE POLICY "app_logs_insert" ON app_error_logs
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);
