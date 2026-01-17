-- =====================================================
-- TABLA PARA FACTURAS DESTACADAS/ANCLADAS
-- =====================================================

CREATE TABLE IF NOT EXISTS facturas_destacadas (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id),
  nota TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(factura_id) -- Una factura solo puede estar anclada una vez
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_facturas_destacadas_factura ON facturas_destacadas(factura_id);
CREATE INDEX IF NOT EXISTS idx_facturas_destacadas_usuario ON facturas_destacadas(usuario_id);

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================
ALTER TABLE facturas_destacadas ENABLE ROW LEVEL SECURITY;

-- Política para permitir todo (ajustar según necesidad)
DROP POLICY IF EXISTS "Allow all on facturas_destacadas" ON facturas_destacadas;
CREATE POLICY "Allow all on facturas_destacadas" ON facturas_destacadas FOR ALL USING (true);

-- =====================================================
-- FUNCIÓN PARA AUTO-ELIMINAR FACTURAS DESTACADAS PAGADAS
-- Se ejecuta cuando se actualiza una factura a estado 'pagada'
-- =====================================================
CREATE OR REPLACE FUNCTION eliminar_destacada_si_pagada()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'pagada' AND OLD.estado != 'pagada' THEN
    DELETE FROM facturas_destacadas WHERE factura_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que ejecuta la función
DROP TRIGGER IF EXISTS tr_eliminar_destacada_si_pagada ON facturas;
CREATE TRIGGER tr_eliminar_destacada_si_pagada
  AFTER UPDATE ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION eliminar_destacada_si_pagada();
