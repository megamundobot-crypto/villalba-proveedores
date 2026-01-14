-- Script para agregar columnas faltantes a cuenta_interna
-- Ejecutar en Supabase SQL Editor

-- Agregar columna tipo si no existe
ALTER TABLE cuenta_interna
ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'deuda';

-- Agregar columna pagador si no existe
ALTER TABLE cuenta_interna
ADD COLUMN IF NOT EXISTS pagador VARCHAR(2);

-- Agregar columna receptor si no existe
ALTER TABLE cuenta_interna
ADD COLUMN IF NOT EXISTS receptor VARCHAR(2);

-- Agregar columna monto si no existe
ALTER TABLE cuenta_interna
ADD COLUMN IF NOT EXISTS monto NUMERIC(15,2);

-- Agregar columna fecha si no existe
ALTER TABLE cuenta_interna
ADD COLUMN IF NOT EXISTS fecha DATE;

-- Agregar columna observaciones si no existe
ALTER TABLE cuenta_interna
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Agregar columna facturas_imputadas si no existe
ALTER TABLE cuenta_interna
ADD COLUMN IF NOT EXISTS facturas_imputadas INTEGER[];

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_cuenta_interna_tipo ON cuenta_interna(tipo);
CREATE INDEX IF NOT EXISTS idx_cuenta_interna_pagador ON cuenta_interna(pagador);
