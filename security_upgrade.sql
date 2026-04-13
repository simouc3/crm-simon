-- =========================================================================
-- MIGRACIÓN DE SEGURIDAD CORPORATIVA: GOOGLE OAUTH & CLOSED ACCESS
-- =========================================================================

-- 1. Añadir el rol 'PENDIENTE' para nuevos usuarios (Closed Beta Policy)
-- Note: IF NOT EXISTS is not supported in ALTER TYPE ADD VALUE until PG 9.x+
-- If it fails, it might be because the value already exists.
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'PENDIENTE') THEN
    ALTER TYPE user_role ADD VALUE 'PENDIENTE' BEFORE 'VENTAS';
  END IF;
END $$;

-- 2. Actualizar función de sincronización de Perfiles (Trigger)
-- Ahora captura avatar_url yEmail desde Google Auth Metadata
-- Forzando que todo nuevo registro inicie como 'PENDIENTE'
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_default_role user_role := 'PENDIENTE';
  v_allowed_domain text := NULL; -- Configurar aquí el dominio restrictivo en el futuro (ej: 'tuempresa.com')
begin
  -- Preparación para restricción de dominio:
  -- IF v_allowed_domain IS NOT NULL AND split_part(new.email, '@', 2) != v_allowed_domain THEN
  --   RAISE EXCEPTION 'Registro restringido al dominio %', v_allowed_domain;
  -- END IF;

  insert into public.profiles (id, full_name, email, avatar_url, role)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), -- Google usa 'name' a veces
    new.email, 
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'), -- Google usa 'picture'
    v_default_role
  )
  on conflict (id) do update 
  set 
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    email = excluded.email;
    -- Importante: NO actualizamos el 'role' en el UPSERT para evitar que un login posterior 
    -- de Google resetee el rol que un ADMIN ya asignó manualmente.

  return new;
end;
$$ language plpgsql security definer;

-- 3. Blindaje de Políticas RLS (Row Level Security)
-- Ningún usuario con rol 'PENDIENTE' debe ver datos críticos.

-- 3.1 Empresas (Companies)
drop policy if exists "Companies select policy" on companies;
create policy "Companies select policy" on companies for select
  using (
    (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'))
    or (created_by = auth.uid() and exists (select 1 from profiles where id = auth.uid() and role = 'VENTAS'))
  );

-- 3.2 Negocios (Deals)
drop policy if exists "Deals select policy" on deals;
create policy "Deals select policy" on deals for select
  using (
    (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'))
    or (user_id = auth.uid() and exists (select 1 from profiles where id = auth.uid() and role = 'VENTAS'))
  );

-- 3.3 Actividades (Activities)
drop policy if exists "Activities select policy" on activities;
create policy "Activities select policy" on activities for select
  using (
    (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'))
    or (user_id = auth.uid() and exists (select 1 from profiles where id = auth.uid() and role = 'VENTAS'))
  );

-- 3.4 Configuración (App Settings)
drop policy if exists "Read app_settings public" on app_settings;
create policy "Read app_settings restricted" on app_settings for select 
using (exists (select 1 from profiles where id = auth.uid() and role in ('ADMIN', 'VENTAS')));

-- 3.5 Perfiles (Trazabilidad)
-- Los perfiles son visibles entre sí solo si ya están autorizados (Admin/Ventas)
drop policy if exists "Profiles visible to authenticated" on profiles;
create policy "Profiles visible to authorized" on profiles for select 
using (exists (select 1 from profiles where id = auth.uid() and role in ('ADMIN', 'VENTAS')) OR auth.uid() = id);
