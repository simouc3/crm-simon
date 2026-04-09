-- ============================================================
-- FIX CRÍTICO: Actualizar get_deal_by_token con todos los campos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

create or replace function get_deal_by_token(p_token uuid)
returns table (
  id uuid,
  title text,
  nombre_proyecto text,
  valor_neto numeric,
  valor_total numeric,
  proposal_status proposal_status,
  public_token uuid,
  company_name text,
  company_rut text,
  seller_name text,
  cotizacion_detalles text,
  ia_proposal_report jsonb,
  offer_validity text,
  contract_duration text,
  payment_terms text,
  proposal_view_count integer
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    d.id,
    d.title,
    d.nombre_proyecto,
    d.valor_neto,
    d.valor_total,
    d.proposal_status,
    d.public_token,
    c.razon_social as company_name,
    c.rut as company_rut,
    p.full_name as seller_name,
    d.cotizacion_detalles,
    d.ia_proposal_report,
    d.offer_validity,
    d.contract_duration,
    d.payment_terms,
    d.proposal_view_count
  from deals d
  left join companies c on d.company_id = c.id
  left join profiles p on d.user_id = p.id
  where d.public_token = p_token;
end;
$$;
