-- Crear tabla para lotes de pago (para confirmar transferencias)
-- Ejecutar en Supabase SQL Editor

-- Tabla de lotes de pago
CREATE TABLE IF NOT EXISTS lotes_pago (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMP DEFAULT NOW(),
  empresa VARCHAR(2) NOT NULL CHECK (empresa IN ('VH', 'VC')),
  total DECIMAL(15,2) NOT NULL,
  cantidad_pagos INTEGER NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'anulado')),
  archivo_txt VARCHAR(100),
  fecha_confirmacion TIMESTAMP,
  usuario_id INTEGER REFERENCES usuarios(id),
  observaciones TEXT
);

-- Tabla de detalle de pagos por lote (antes de confirmar)
CREATE TABLE IF NOT EXISTS lotes_pago_detalle (
  id SERIAL PRIMARY KEY,
  lote_id INTEGER REFERENCES lotes_pago(id) ON DELETE CASCADE,
  factura_id INTEGER REFERENCES facturas(id),
  proveedor_id INTEGER REFERENCES proveedores(id),
  proveedor_nombre VARCHAR(200),
  factura_numero VARCHAR(50),
  cbu VARCHAR(22),
  banco VARCHAR(50),
  monto DECIMAL(15,2) NOT NULL,
  tipo VARCHAR(20) CHECK (tipo IN ('cancela', 'a_cuenta')),
  confirmado BOOLEAN DEFAULT FALSE,
  fecha_confirmacion TIMESTAMP,
  observaciones TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lotes_pago_estado ON lotes_pago(estado);
CREATE INDEX IF NOT EXISTS idx_lotes_pago_empresa ON lotes_pago(empresa);
CREATE INDEX IF NOT EXISTS idx_lotes_pago_fecha ON lotes_pago(fecha);
CREATE INDEX IF NOT EXISTS idx_lotes_detalle_lote ON lotes_pago_detalle(lote_id);
CREATE INDEX IF NOT EXISTS idx_lotes_detalle_confirmado ON lotes_pago_detalle(confirmado);

-- Ver lotes existentes
SELECT 'Tablas creadas correctamente' as mensaje;
