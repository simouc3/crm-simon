-- =========================================================================
-- MIGRACIÓN DE SEGURIDAD "TURBO": VELOCIDAD Y ACCESO GARANTIZADO
-- =========================================================================

-- 1. CURACIÓN ATÓMICA DEL ENUM (Para evitar errores de "invalid value")
DO $$ 
BEGIN
  -- Intentamos añadir roles uno por uno de forma aislada
  BEGIN
    ALTER TYPE user_role ADD VALUE 'ADMIN';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TYPE user_role ADD VALUE 'VENTAS';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TYPE user_role ADD VALUE 'PENDIENTE';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 2. FUNCIÓN DE ROL OPTIMIZADA (El "Turbo" del RLS)
-- Esta función cachea el rol del usuario para evitar subconsultas lentas en cada fila
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. POLÍTICAS DE PERFILES (Desbloqueo Maestro)
-- Esto permite que el usuario pueda ver su propio rol para que el resto de reglas funcionen
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Perfil visible por el propio usuario" ON public.profiles;
CREATE POLICY "Perfil visible por el propio usuario" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin ve todos los perfiles" ON public.profiles;
CREATE POLICY "Admin ve todos los perfiles" ON public.profiles
  FOR ALL USING (public.get_my_role() = 'ADMIN');

-- 4. REFACTORIZACIÓN DE POLÍTICAS RLS (Optimización de Velocidad)
-- Usamos get_my_role() que es mucho más rápido que subqueries manuales

-- 4.1 Empresas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Companies select policy" ON public.companies;
CREATE POLICY "Companies select policy" ON public.companies FOR SELECT
  USING (
    public.get_my_role() = 'ADMIN' 
    OR (created_by = auth.uid() AND public.get_my_role() = 'VENTAS')
  );

-- 4.2 Negocios
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deals select policy" ON public.deals;
CREATE POLICY "Deals select policy" ON public.deals FOR SELECT
  USING (
    public.get_my_role() = 'ADMIN' 
    OR (user_id = auth.uid() AND public.get_my_role() = 'VENTAS')
  );

-- 4.3 Actividades
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Activities select policy" ON public.activities;
CREATE POLICY "Activities select policy" ON public.activities FOR SELECT
  USING (
    public.get_my_role() = 'ADMIN' 
    OR (user_id = auth.uid() AND public.get_my_role() = 'VENTAS')
  );

-- 4.4 Configuración
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read app_settings restricted" ON public.app_settings;
CREATE POLICY "Read app_settings restricted" ON public.app_settings FOR SELECT 
USING (public.get_my_role() IN ('ADMIN', 'VENTAS'));

-- 5. TRIGGER DE SINCRONIZACIÓN (Direct Access Mode)
-- Otorga acceso inmediato como 'VENTAS' a todo nuevo registro externo.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Operador'),
    new.email, 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'VENTAS'::user_role)
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ACTIVACIÓN DEL TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
