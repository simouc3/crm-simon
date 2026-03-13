-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create custom Enums to match our Typescript definitions
-- Actualizado para incluir los roles solicitados
drop type if exists user_role cascade;
create type user_role as enum ('ADMIN', 'VENTAS');
create type company_segment as enum ('ACUICOLA_MARITIMO', 'SALUD_CLINICO', 'CORPORATIVO', 'LOGISTICA');
create type payment_term as enum ('CONTADO', '30_DIAS', '45_DIAS', '60_DIAS');

-- 2. Create Profiles Table (extends Supabase auth.users)
create table public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    full_name text,
    email text,
    avatar_url text,
    role user_role default 'VENTAS',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;
create policy "Profiles visible to authenticated" on profiles for select using (auth.role() = 'authenticated');
create policy "Users manage own profile" on profiles for update using (auth.uid() = id);
create policy "Admins manage all profiles" on profiles for update 
  using (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'));
create policy "Admins delete profiles" on profiles for delete 
  using (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'));

-- 3. Create Companies Table
create table public.companies (
    id uuid default uuid_generate_v4() primary key,
    razon_social text not null,
    rut text not null unique,
    contact_name text not null,
    contact_phone text,
    contact_email text,
    cargo text,
    segmento company_segment,
    comuna text,
    m2_estimados numeric,
    requisitos_legales text[] default '{}',
    condiciones_pago payment_term,
    created_by uuid references auth.users(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for companies
alter table public.companies enable row level security;

-- Solo ADMIN ve todo, VENDEDOR ve lo que creó
create policy "Companies select policy" on companies for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
    or created_by = auth.uid()
  );

create policy "Companies insert policy" on companies for insert with check (auth.role() = 'authenticated');
create policy "Companies update policy" on companies for update using (auth.role() = 'authenticated');
create policy "Companies delete policy" on companies for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'));

-- 4. Create Deals Table (Pipeline)
create table public.deals (
    id uuid default uuid_generate_v4() primary key,
    company_id uuid references public.companies(id) on delete cascade not null,
    user_id uuid references auth.users(id),
    stage integer not null check (stage between 1 and 7),
    title text not null,
    valor_neto numeric default 0,
    valor_total numeric default 0,
    motivo_perdida text,
    stage_updated_at timestamp with time zone default timezone('utc'::text, now()),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function to autoupdate `updated_at` and `stage_updated_at`
create or replace function update_modified_column()
returns trigger as $$
begin
    new.updated_at = now();
    if new.stage is distinct from old.stage then
        new.stage_updated_at = now();
    end if;
    return new;
end;
$$ language plpgsql;

create trigger update_deals_modtime
before update on public.deals
for each row execute function update_modified_column();

-- Enable RLS for deals
alter table public.deals enable row level security;

-- Solo ADMIN ve todo, VENDEDOR ve lo que tiene asignado
create policy "Deals select policy" on deals for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
    or user_id = auth.uid()
  );

create policy "Deals insert policy" on deals for insert with check (auth.role() = 'authenticated');
create policy "Deals update policy" on deals for update using (auth.role() = 'authenticated');
create policy "Deals delete policy" on deals for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'));

-- 5. Trigger for new user profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, 'VENTAS');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Application Settings Table
create table public.app_settings (
    id uuid default '00000000-0000-0000-0000-000000000001'::uuid primary key,
    company_name text not null default 'Mi Empresa CRM',
    company_logo_url text,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.app_settings enable row level security;
create policy "Read app_settings public" on app_settings for select using (true);
create policy "Update app_settings restricted" on app_settings for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'));

-- Insert initial record
insert into public.app_settings (id, company_name)
values ('00000000-0000-0000-0000-000000000001', 'Mi Empresa CRM')
on conflict (id) do nothing;

-- 7. Activities Table (Calendar)
create type activity_type as enum ('LLAMADA', 'REUNION', 'VISITA', 'CORREO');

create table public.activities (
    id uuid default uuid_generate_v4() primary key,
    company_id uuid references public.companies(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    activity_type activity_type not null default 'LLAMADA',
    notes text,
    scheduled_at timestamp with time zone not null,
    completed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for activities
alter table public.activities enable row level security;

-- Solo ADMIN ve todo, VENTAS ve lo propio
create policy "Activities select policy" on activities for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
    or user_id = auth.uid()
  );

create policy "Activities insert policy" on activities for insert with check (auth.role() = 'authenticated');
create policy "Activities update policy" on activities for update using (auth.role() = 'authenticated');
create policy "Activities delete policy" on activities for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
    or user_id = auth.uid()
  );

