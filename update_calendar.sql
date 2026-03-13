-- 1. Crear el tipo de actividad si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
        CREATE TYPE activity_type AS enum ('LLAMADA', 'REUNION', 'VISITA', 'CORREO');
    END IF;
END$$;

-- 2. Crear la tabla de actividades
CREATE TABLE IF NOT EXISTS public.activities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    activity_type activity_type NOT NULL DEFAULT 'LLAMADA',
    notes text,
    scheduled_at timestamp with time zone NOT NULL,
    completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar seguridad RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 4. Definir políticas de acceso (Admin ve todo, VENTAS ve lo propio)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Activities select policy" ON activities;
    CREATE POLICY "Activities select policy" ON activities FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
        OR user_id = auth.uid()
      );

    DROP POLICY IF EXISTS "Activities insert policy" ON activities;
    CREATE POLICY "Activities insert policy" ON activities FOR INSERT WITH CHECK (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Activities update policy" ON activities;
    CREATE POLICY "Activities update policy" ON activities FOR UPDATE USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Activities delete policy" ON activities;
    CREATE POLICY "Activities delete policy" ON activities FOR DELETE
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
        OR user_id = auth.uid()
      );
END$$;
