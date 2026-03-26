-- Tope máximo a cobrar por sesión/día por parking.
-- Si está definido, el monto a pagar no supera este valor aunque la tarifa × minutos sea mayor.
-- NULL = sin tope.

ALTER TABLE parkings
ADD COLUMN IF NOT EXISTS max_daily_amount NUMERIC(12,2) NULL;

ALTER TABLE parkings
ADD CONSTRAINT check_max_daily_amount_non_negative
CHECK (max_daily_amount IS NULL OR max_daily_amount >= 0);

COMMENT ON COLUMN parkings.max_daily_amount IS 'Monto máximo a cobrar por vehículo por sesión/día. NULL = sin tope.';
