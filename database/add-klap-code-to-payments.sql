-- Adds "Código Klap" (MC_CODE) storage for card-approved payments.
-- For cash payments or when not available, value should remain '0' (treated as N/A).

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS klap_code TEXT NOT NULL DEFAULT '0';

