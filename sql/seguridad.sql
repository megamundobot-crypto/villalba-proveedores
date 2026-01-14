-- =====================================================
-- SISTEMA DE SEGURIDAD - Villalba Proveedores
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- PASO 1: Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    nivel VARCHAR(20) NOT NULL DEFAULT 'consulta',
    activo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP,
    intentos_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT nivel_valido CHECK (nivel IN ('admin', 'operador', 'consulta'))
);

-- PASO 2: Crear tabla de sesiones
CREATE TABLE IF NOT EXISTS sesiones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PASO 3: Crear tabla de auditoría
CREATE TABLE IF NOT EXISTS auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    usuario_nombre VARCHAR(100),
    accion VARCHAR(50) NOT NULL,
    tabla_afectada VARCHAR(50),
    registro_id INTEGER,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PASO 4: Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones(token);
CREATE INDEX IF NOT EXISTS idx_sesiones_expires ON sesiones(expires_at);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(created_at);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON auditoria(tabla_afectada);

-- PASO 5: Crear usuario administrador inicial
-- Password: admin123 (hasheado con bcrypt)
-- IMPORTANTE: Cambiar esta contraseña después del primer login!
INSERT INTO usuarios (username, password_hash, nombre_completo, nivel)
VALUES ('admin', '$2b$10$2kx0j7UNB6DdqUClzZ0/EelOK0oZVUN/AD97Lm/J45Gnt/qzorkym', 'Administrador', 'admin')
ON CONFLICT (username) DO NOTHING;

-- PASO 6: Función para limpiar sesiones expiradas (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION limpiar_sesiones_expiradas()
RETURNS void AS $$
BEGIN
    DELETE FROM sesiones WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- PASO 7: Habilitar RLS (Row Level Security) en las tablas principales
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuenta_interna ENABLE ROW LEVEL SECURITY;

-- PASO 8: Crear políticas RLS (permitir acceso solo a usuarios autenticados)
-- Nota: Estas políticas se activarán cuando implementemos la autenticación completa

-- Por ahora, crear política permisiva para no bloquear el sistema actual
CREATE POLICY "Permitir todo temporalmente" ON facturas FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON pagos FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON proveedores FOR ALL USING (true);
CREATE POLICY "Permitir todo temporalmente" ON cuenta_interna FOR ALL USING (true);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecutar después para verificar que todo se creó correctamente:
-- SELECT * FROM usuarios;
-- SELECT * FROM information_schema.tables WHERE table_name IN ('usuarios', 'sesiones', 'auditoria');
