-- =====================================================
-- SCRIPT PARA PAGOS INTERNOS ENTRE FIRMAS (VH <-> VC)
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar campo pagado_proveedor a cuenta_interna
-- Indica si la factura ya fue pagada al proveedor externo
ALTER TABLE cuenta_interna
ADD COLUMN IF NOT EXISTS pagado_proveedor BOOLEAN DEFAULT false;

-- 2. Agregar campo factura_id para vincular con la factura original
ALTER TABLE cuenta_interna
ADD COLUMN IF NOT EXISTS factura_id INTEGER REFERENCES facturas(id);

-- 3. Crear tabla para registrar pagos internos entre firmas
CREATE TABLE IF NOT EXISTS pagos_internos (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pagador VARCHAR(2) NOT NULL CHECK (pagador IN ('VH', 'VC')),
  receptor VARCHAR(2) NOT NULL CHECK (receptor IN ('VH', 'VC')),
  monto DECIMAL(15,2) NOT NULL,
  monto_aplicado DECIMAL(15,2) DEFAULT 0,
  saldo_a_favor DECIMAL(15,2) DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES usuarios(id)
);

-- Si la tabla ya existe, agregar las columnas nuevas
ALTER TABLE pagos_internos ADD COLUMN IF NOT EXISTS monto_aplicado DECIMAL(15,2) DEFAULT 0;
ALTER TABLE pagos_internos ADD COLUMN IF NOT EXISTS saldo_a_favor DECIMAL(15,2) DEFAULT 0;

-- 4. Crear tabla para el detalle de qué facturas se pagaron con cada pago interno
CREATE TABLE IF NOT EXISTS pagos_internos_detalle (
  id SERIAL PRIMARY KEY,
  pago_interno_id INTEGER NOT NULL REFERENCES pagos_internos(id) ON DELETE CASCADE,
  cuenta_interna_id INTEGER NOT NULL REFERENCES cuenta_interna(id),
  monto_aplicado DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_pagos_internos_fecha ON pagos_internos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_pagos_internos_pagador ON pagos_internos(pagador);
CREATE INDEX IF NOT EXISTS idx_pagos_internos_detalle_pago ON pagos_internos_detalle(pago_interno_id);
CREATE INDEX IF NOT EXISTS idx_cuenta_interna_pagado ON cuenta_interna(pagado);
CREATE INDEX IF NOT EXISTS idx_cuenta_interna_pagado_proveedor ON cuenta_interna(pagado_proveedor);

-- 6. Comentarios para documentación
COMMENT ON COLUMN cuenta_interna.pagado IS 'Indica si la deuda interna fue saldada entre VH y VC';
COMMENT ON COLUMN cuenta_interna.pagado_proveedor IS 'Indica si la factura original ya fue pagada al proveedor externo';
COMMENT ON TABLE pagos_internos IS 'Registro de pagos realizados entre VH y VC para saldar deudas internas';
COMMENT ON TABLE pagos_internos_detalle IS 'Detalle de qué facturas de cuenta_interna se pagaron con cada pago interno';
