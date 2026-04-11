-- Recalcular Valor Total (TCV) basado en la nueva lógica: MRR * Meses
-- Ejecutar en el SQL Editor de Supabase para corregir datos históricos

UPDATE deals
SET valor_total = valor_neto * COALESCE(contract_months, 1)
WHERE is_contract = true;

UPDATE deals
SET valor_total = valor_neto
WHERE is_contract = false OR is_contract IS NULL;
