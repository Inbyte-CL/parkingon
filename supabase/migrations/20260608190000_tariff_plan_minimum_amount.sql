-- Agrega monto mínimo a cobrar en los planes de tarifa múltiple.
-- Cuando se configura junto con minimum_stay_hours, las primeras N horas
-- siempre valen minimum_amount y a partir de ahí se cobra por minuto/tramo.

ALTER TABLE parking_tariff_plans
  ADD COLUMN IF NOT EXISTS minimum_amount NUMERIC(10, 2) DEFAULT NULL;

COMMENT ON COLUMN parking_tariff_plans.minimum_amount IS
  'Monto mínimo a cobrar. Si la sesión dura menos que minimum_stay_hours, se cobra este monto.
   Si dura más, se cobra minimum_amount (por las primeras minimum_stay_hours) más los minutos
   adicionales según price_per_minute / segment_amount.';
