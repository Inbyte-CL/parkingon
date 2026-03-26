-- Tarifa por minuto (actual) vs tarifa por tramo.
-- Por defecto los parking usan tarifa por minuto.
-- Si pricing_mode = 'per_segment', se usa segment_amount cada segment_minutes (ej: $300 cada 30 min).
-- 0-30 min = $300, 31-60 = $600, etc.

ALTER TABLE parkings
ADD COLUMN IF NOT EXISTS pricing_mode TEXT NOT NULL DEFAULT 'per_minute'
  CHECK (pricing_mode IN ('per_minute', 'per_segment'));

ALTER TABLE parkings
ADD COLUMN IF NOT EXISTS segment_amount NUMERIC(10,2) NULL;

ALTER TABLE parkings
ADD COLUMN IF NOT EXISTS segment_minutes INT NULL;

ALTER TABLE parkings
DROP CONSTRAINT IF EXISTS check_segment_when_per_segment;

ALTER TABLE parkings
ADD CONSTRAINT check_segment_when_per_segment
CHECK (
  (pricing_mode = 'per_minute') OR
  (pricing_mode = 'per_segment' AND segment_amount IS NOT NULL AND segment_amount >= 0 AND segment_minutes IS NOT NULL AND segment_minutes > 0)
);

COMMENT ON COLUMN parkings.pricing_mode IS 'per_minute = tarifa por minuto; per_segment = monto fijo cada X minutos';
COMMENT ON COLUMN parkings.segment_amount IS 'Monto en pesos por tramo (solo si pricing_mode = per_segment)';
COMMENT ON COLUMN parkings.segment_minutes IS 'Minutos por tramo (ej: 30 = cada 30 min). Solo si pricing_mode = per_segment';
