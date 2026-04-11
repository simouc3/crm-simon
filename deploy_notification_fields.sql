-- Añadir correo de operaciones a la configuración de la empresa
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS operations_email TEXT;

-- Añadir control de despliegue a la tabla de negocios (deals)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_deployed BOOLEAN DEFAULT FALSE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMPTZ;

-- Comentario informativo
COMMENT ON COLUMN app_settings.operations_email IS 'Correo electrónico del departamento de operaciones para el traspaso de proyectos.';
COMMENT ON COLUMN deals.is_deployed IS 'Indica si el negocio ya fue notificado al departamento de operaciones para despliegue.';
