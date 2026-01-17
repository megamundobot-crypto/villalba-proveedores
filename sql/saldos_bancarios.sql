-- =====================================================
-- TABLA PARA SALDOS BANCARIOS (simplificada)
-- =====================================================

-- Tabla de cuentas bancarias con saldo actual
CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  id SERIAL PRIMARY KEY,
  banco VARCHAR(100) NOT NULL,
  empresa VARCHAR(20) NOT NULL CHECK (empresa IN ('VH', 'VC', 'MEGA', 'CRICNOGAP')),
  icono VARCHAR(100),
  orden INTEGER DEFAULT 0,
  activa BOOLEAN DEFAULT true,
  saldo_actual NUMERIC(15,2) DEFAULT 0,
  moneda VARCHAR(3) DEFAULT 'ARS' CHECK (moneda IN ('ARS', 'USD')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si la tabla ya existe, agregar columna moneda
ALTER TABLE cuentas_bancarias ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) DEFAULT 'ARS';

-- =====================================================
-- DATOS INICIALES - Cuentas bancarias
-- =====================================================

-- Villalba Hermanos SRL (VH)
INSERT INTO cuentas_bancarias (banco, empresa, icono, orden, saldo_actual) VALUES
('Río', 'VH', 'rio.png', 1, 0),
('NBCH', 'VH', 'nbch.png', 2, 0),
('Nación', 'VH', 'nacion.png', 3, 0),
('Formosa', 'VH', 'formosa.png', 4, 0),
('Mercado Pago', 'VH', 'mercadopago.png', 5, 0)
ON CONFLICT DO NOTHING;

-- Villalba Cristino (VC)
INSERT INTO cuentas_bancarias (banco, empresa, icono, orden, saldo_actual) VALUES
('NBCH Cristino', 'VC', 'nbch.png', 1, 0),
('Nación Cristino', 'VC', 'nacion.png', 2, 0),
('Mercado Pago Cristino', 'VC', 'mercadopago.png', 3, 0)
ON CONFLICT DO NOTHING;

-- Megamundo SA (MEGA)
INSERT INTO cuentas_bancarias (banco, empresa, icono, orden, saldo_actual) VALUES
('NBCH Mega SA', 'MEGA', 'nbch.png', 1, 0),
('Mercado Pago Mega SA', 'MEGA', 'mercadopago.png', 2, 0)
ON CONFLICT DO NOTHING;

-- Cricnogap SRL
INSERT INTO cuentas_bancarias (banco, empresa, icono, orden, saldo_actual, moneda) VALUES
('NBCH $', 'CRICNOGAP', 'nbch.png', 1, 0, 'ARS'),
('NBCH USD', 'CRICNOGAP', 'nbch.png', 2, 0, 'USD')
ON CONFLICT DO NOTHING;

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_cuentas_bancarias_empresa ON cuentas_bancarias(empresa);
CREATE INDEX IF NOT EXISTS idx_cuentas_bancarias_activa ON cuentas_bancarias(activa);

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================
ALTER TABLE cuentas_bancarias ENABLE ROW LEVEL SECURITY;

-- Política para permitir todo (ajustar según necesidad)
DROP POLICY IF EXISTS "Allow all on cuentas_bancarias" ON cuentas_bancarias;
CREATE POLICY "Allow all on cuentas_bancarias" ON cuentas_bancarias FOR ALL USING (true);
