-- =============================================================================
-- MIGRACIÓN DE SUPABASE PARA WORDPRESS PLUGIN
-- =============================================================================
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- Proyecto: asgnyckayusnmbozocxh
--
-- IMPORTANTE: Este script es SEGURO de ejecutar múltiples veces
-- Agrega columnas faltantes y crea tablas que no existen
-- =============================================================================

-- 1. AGREGAR COLUMNAS FALTANTES A profiles
-- =============================================================================
-- La tabla profiles ya existe, pero le faltan columnas para WordPress

-- Agregar wp_user_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'wp_user_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN wp_user_id INTEGER UNIQUE;
        RAISE NOTICE 'Columna wp_user_id agregada a profiles';
    ELSE
        RAISE NOTICE 'Columna wp_user_id ya existe en profiles';
    END IF;
END $$;

-- Agregar subscription_tier si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE profiles ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
        RAISE NOTICE 'Columna subscription_tier agregada a profiles';
    ELSE
        RAISE NOTICE 'Columna subscription_tier ya existe en profiles';
    END IF;
END $$;

-- Crear índice para wp_user_id (idempotente)
CREATE INDEX IF NOT EXISTS idx_profiles_wp_user_id ON profiles(wp_user_id);

-- 2. CREAR TABLA reports (para cola de generación)
-- =============================================================================

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID DEFAULT gen_random_uuid() UNIQUE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    wp_user_id INTEGER,
    report_type VARCHAR(50) DEFAULT 'individual',
    status VARCHAR(20) DEFAULT 'queued',
    progress_percent INTEGER DEFAULT 0,
    current_module VARCHAR(100),
    chart_name VARCHAR(255),
    birth_data JSONB,
    file_path VARCHAR(500),
    file_url VARCHAR(500),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Crear índices para reports (idempotentes)
CREATE INDEX IF NOT EXISTS idx_reports_session_id ON reports(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_wp_user_id ON reports(wp_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- 3. HABILITAR RLS EN reports
-- =============================================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS PARA reports
-- =============================================================================

-- Política para que service_role tenga acceso completo (WordPress)
DROP POLICY IF EXISTS "Service role has full access to reports" ON reports;
CREATE POLICY "Service role has full access to reports" ON reports
    USING (true)
    WITH CHECK (true);

-- Política para que usuarios vean sus propios reportes
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (auth.uid() = user_id);

-- 5. TRIGGER PARA updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a reports
DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. VERIFICACIÓN
-- =============================================================================

SELECT '=== VERIFICACIÓN DE MIGRACIÓN ===' as info;

-- Verificar columnas de profiles
SELECT 'profiles.' || column_name as columna, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('wp_user_id', 'subscription_tier');

-- Verificar tabla reports
SELECT 'Tabla reports existe: ' ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports')
    THEN 'SÍ' ELSE 'NO' END as verificacion;

-- Contar columnas en reports
SELECT 'Columnas en reports: ' || COUNT(*)::text as info
FROM information_schema.columns WHERE table_name = 'reports';

-- =============================================================================
-- FIN DE MIGRACIÓN
-- =============================================================================
--
-- PRÓXIMOS PASOS:
-- 1. Ir a Storage > Create new bucket > "reports" (hacer privado)
-- 2. Desplegar Edge Functions con Supabase CLI:
--    supabase functions deploy wordpress-report-webhook
--    supabase functions deploy calculate-chart
--    supabase functions deploy generate-report-content
--
-- =============================================================================
