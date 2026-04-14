-- =========================================================================
-- PARCHE DE ACCESO MAESTRO Y SEGURIDAD TOTAL (V3 - FINAL)
-- =========================================================================

-- 1. ASEGURAR ENUM DE ROLES
DO $$ 
BEGIN
  BEGIN
    ALTER TYPE user_role ADD VALUE 'ADMIN';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE user_role ADD VALUE 'VENTAS';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 2. FUNCIÓN DE ROL RESILIENTE (get_my_role)
-- Si no hay perfil, devuelve 'VENTAS' por defecto para evitar pantallas blancas
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'VENTAS'::user_role);
END;
$$;

-- 3. HABILITAR RLS EN TABLAS CRÍTICAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACCESO (Apertura de Puertas)

-- 4.1 Perfiles: Cada uno ve el suyo, Admin ve todos
DROP POLICY IF EXISTS "Profiles access" ON public.profiles;
CREATE POLICY "Profiles access" ON public.profiles
  FOR ALL USING (id = auth.uid() OR public.get_my_role() = 'ADMIN');

-- 4.2 Empresas: Admin ve todo, Ventas ve lo suyo
DROP POLICY IF EXISTS "Companies access" ON public.companies;
CREATE POLICY "Companies access" ON public.companies
  FOR ALL USING (public.get_my_role() = 'ADMIN' OR created_by = auth.uid() OR public.get_my_role() = 'VENTAS');

-- 4.3 Negocios: Admin ve todo, Ventas ve lo suyo
DROP POLICY IF EXISTS "Deals access" ON public.deals;
CREATE POLICY "Deals access" ON public.deals
  FOR ALL USING (public.get_my_role() = 'ADMIN' OR user_id = auth.uid() OR public.get_my_role() = 'VENTAS');

-- 4.4 Actividades: Acceso compartido para colaboración
DROP POLICY IF EXISTS "Activities access" ON public.activities;
CREATE POLICY "Activities access" ON public.activities
  FOR ALL USING (public.get_my_role() IN ('ADMIN', 'VENTAS'));

-- 4.5 Configuración: Lectura universal, Escritura Admin
DROP POLICY IF EXISTS "Settings access" ON public.app_settings;
CREATE POLICY "Settings access" ON public.app_settings
  FOR SELECT USING (TRUE);
CREATE POLICY "Settings admin setup" ON public.app_settings
  FOR ALL USING (public.get_my_role() = 'ADMIN');

-- 5. TRIGGERS DE SINCRONIZACIÓN (Mano de Hierro)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.profiles WHERE email = new.email AND id != new.id;
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Operador'),
    new.email, 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'VENTAS'::user_role)
  )
  ON CONFLICT (id) DO UPDATE 
  SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, role = EXCLUDED.role;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = old.id;
  RETURN old;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted AFTER DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();
