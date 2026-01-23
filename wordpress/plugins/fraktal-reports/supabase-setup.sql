-- =============================================================================
-- SUPABASE SETUP FOR FRAKTAL REPORTS WORDPRESS PLUGIN
-- =============================================================================
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- Proyecto: asgnyckayusnmbozocxh
-- =============================================================================

-- 1. CREAR TABLA profiles (si no existe)
-- Esta tabla almacena usuarios sincronizados desde WordPress
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_user_id INTEGER UNIQUE,
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    subscription_tier VARCHAR(20) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_profiles_wp_user_id ON profiles(wp_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 2. CREAR TABLA reports (si no existe)
-- Esta tabla almacena informes en cola y completados
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

-- Crear índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_reports_session_id ON reports(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_wp_user_id ON reports(wp_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- 3. HABILITAR RLS (Row Level Security)
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS PARA profiles
-- =============================================================================

-- Permitir SELECT para usuarios autenticados (su propio perfil)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Permitir acceso completo para service_role (usado por WordPress)
DROP POLICY IF EXISTS "Service role has full access to profiles" ON profiles;
CREATE POLICY "Service role has full access to profiles" ON profiles
    USING (auth.role() = 'service_role');

-- 5. POLÍTICAS RLS PARA reports
-- =============================================================================

-- Permitir SELECT para usuarios autenticados (sus propios reportes)
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (auth.uid() = user_id);

-- Permitir acceso completo para service_role (usado por WordPress y WP-Cron)
DROP POLICY IF EXISTS "Service role has full access to reports" ON reports;
CREATE POLICY "Service role has full access to reports" ON reports
    USING (auth.role() = 'service_role');

-- 6. FUNCIÓN TRIGGER PARA updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger a reports
DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. VERIFICACIÓN
-- =============================================================================

-- Verificar que las tablas existen
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'reports');

-- =============================================================================
-- FIN DEL SCRIPT
-- =============================================================================
-- Después de ejecutar este script:
-- 1. Ir a Storage > Create new bucket > "reports" (privado)
-- 2. Desplegar Edge Functions (ver instrucciones en DEPLOYMENT.md)
-- =============================================================================
