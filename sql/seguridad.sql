-- =====================================================
-- SISTEMA DE SEGURIDAD - Villalba Proveedores
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- PASO 1: Eliminar tablas si existen (para empezar limpio)
DROP TABLE IF EXISTS auditoria CASCADE;
DROP TABLE IF EXISTS sesiones CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- PASO 2: Crear tabla de usuarios (independiente de Supabase Auth)
CREATE TABLE usuarios (
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

-- PASO 3: Crear tabla de sesiones
CREATE TABLE sesiones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PASO 4: Crear tabla de auditoría
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nombre VARCHAR(100),
    accion VARCHAR(50) NOT NULL,
    tabla_afectada VARCHAR(50),
    registro_id INTEGER,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PASO 5: Crear índices para mejor rendimiento
CREATE INDEX idx_sesiones_token ON sesiones(token);
CREATE INDEX idx_sesiones_expires ON sesiones(expires_at);
CREATE INDEX idx_sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(created_at);
CREATE INDEX idx_auditoria_tabla ON auditoria(tabla_afectada);
CREATE INDEX idx_usuarios_username ON usuarios(username);

-- PASO 6: Crear usuario administrador inicial
-- Password: admin123 (hasheado con bcrypt)
-- IMPORTANTE: Cambiar esta contraseña después del primer login!
INSERT INTO usuarios (username, password_hash, nombre_completo, nivel)
VALUES ('admin', '$2b$10$2kx0j7UNB6DdqUClzZ0/EelOK0oZVUN/AD97Lm/J45Gnt/qzorkym', 'Administrador', 'admin');

-- PASO 7: Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION limpiar_sesiones_expiradas()
RETURNS void AS $$
BEGIN
    DELETE FROM sesiones WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecutar para verificar:
SELECT 'Tablas creadas correctamente' AS resultado;
SELECT * FROM usuarios;
