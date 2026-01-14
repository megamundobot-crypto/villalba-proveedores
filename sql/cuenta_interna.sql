-- Script para crear/actualizar la tabla cuenta_interna
-- Ejecutar en Supabase SQL Editor

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS cuenta_interna (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL DEFAULT 'deuda', -- 'deuda' o 'pago_interno'
  factura_id INTEGER REFERENCES facturas(id),
  proveedor_id INTEGER REFERENCES proveedores(id),
  pagador VARCHAR(2), -- 'VH' o 'VC' (quien paga)
  receptor VARCHAR(2), -- 'VH' o 'VC' (quien recibe)
  debe_vh NUMERIC(15,2) DEFAULT 0, -- Monto que VH debe
  debe_vc NUMERIC(15,2) DEFAULT 0, -- Monto que VC debe
  monto NUMERIC(15,2), -- Para pagos internos
  fecha DATE,
  pagado BOOLEAN DEFAULT FALSE,
  observaciones TEXT,
  facturas_imputadas INTEGER[], -- Array de IDs de facturas imputadas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_cuenta_interna_tipo ON cuenta_interna(tipo);
CREATE INDEX IF NOT EXISTS idx_cuenta_interna_pagador ON cuenta_interna(pagador);
CREATE INDEX IF NOT EXISTS idx_cuenta_interna_pagado ON cuenta_interna(pagado);

-- Comentarios
COMMENT ON TABLE cuenta_interna IS 'Gestión de deudas internas entre VH y VC (regla 65/35)';
COMMENT ON COLUMN cuenta_interna.tipo IS 'Tipo de registro: deuda (originada de factura) o pago_interno';
COMMENT ON COLUMN cuenta_interna.debe_vh IS 'Monto que VH debe a VC (65% del neto de facturas VC)';
COMMENT ON COLUMN cuenta_interna.debe_vc IS 'Monto que VC debe a VH (35% del neto de facturas VH)';
COMMENT ON COLUMN cuenta_interna.facturas_imputadas IS 'IDs de facturas a las que se imputó un pago interno';
