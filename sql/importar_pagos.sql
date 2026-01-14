-- Script para insertar pagos desde Excel
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2025-01-14

-- IMAGEN PARTY  - FC 21794 (VH) - $1,500,000.00
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 1500000.0, 'Transferencia', 'Pago importado desde Excel - IMAGEN PARTY '
FROM facturas 
WHERE numero = '21794' AND empresa = 'VH'
LIMIT 1;

-- ALBERTO SCOLARI  - FC 1414 (VH) - $1,500,000.00
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 1500000.0, 'Transferencia', 'Pago importado desde Excel - ALBERTO SCOLARI '
FROM facturas 
WHERE numero = '1414' AND empresa = 'VH'
LIMIT 1;

-- MULTIMAX  - FC 5310 (VH) - $3,603,819.00
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 3603819.0, 'Transferencia', 'Pago importado desde Excel - MULTIMAX '
FROM facturas 
WHERE numero = '5310' AND empresa = 'VH'
LIMIT 1;

-- QUALITET SA - FC 64999 (VC) - $444,008.81
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 444008.81, 'Transferencia', 'Pago importado desde Excel - QUALITET SA'
FROM facturas 
WHERE numero = '64999' AND empresa = 'VC'
LIMIT 1;

-- QUALITET SA - FC 65000 (VC) - $415,588.32
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 415588.32, 'Transferencia', 'Pago importado desde Excel - QUALITET SA'
FROM facturas 
WHERE numero = '65000' AND empresa = 'VC'
LIMIT 1;

-- PLASTICOS GLAGO  - FC 2904 (VC) - $2,879,601.56
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 2879601.56, 'Transferencia', 'Pago importado desde Excel - PLASTICOS GLAGO '
FROM facturas 
WHERE numero = '2904' AND empresa = 'VC'
LIMIT 1;

-- IDEAS RODECA  - FC 21482 (VC) - $3,147,550.00
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 3147550.0, 'Transferencia', 'Pago importado desde Excel - IDEAS RODECA '
FROM facturas 
WHERE numero = '21482' AND empresa = 'VC'
LIMIT 1;

-- IMPO. AMERICANA  - FC 131270 (VC) - $2,341,453.04
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 2341453.04, 'Transferencia', 'Pago importado desde Excel - IMPO. AMERICANA '
FROM facturas 
WHERE numero = '131270' AND empresa = 'VC'
LIMIT 1;

-- PLASTICOS GLAGO  - FC 2907 (VC) - $451,513.92
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 451513.92, 'Transferencia', 'Pago importado desde Excel - PLASTICOS GLAGO '
FROM facturas 
WHERE numero = '2907' AND empresa = 'VC'
LIMIT 1;

-- BIC  - FC 194185 (VC) - $2,000,000.00
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 2000000.0, 'Transferencia', 'Pago importado desde Excel - BIC '
FROM facturas 
WHERE numero = '194185' AND empresa = 'VC'
LIMIT 1;

-- MAGENTA COMPANY  - FC 11458 (VC) - $1,503,828.69
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 1503828.69, 'Transferencia', 'Pago importado desde Excel - MAGENTA COMPANY '
FROM facturas 
WHERE numero = '11458' AND empresa = 'VC'
LIMIT 1;

-- TSUNAMI  - FC 7553 (VC) - $776,399.27
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 776399.27, 'Transferencia', 'Pago importado desde Excel - TSUNAMI '
FROM facturas 
WHERE numero = '7553' AND empresa = 'VC'
LIMIT 1;

-- ARTESANIAS MERCADO  - FC 2774 (VC) - $450,225.61
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 450225.61, 'Transferencia', 'Pago importado desde Excel - ARTESANIAS MERCADO '
FROM facturas 
WHERE numero = '2774' AND empresa = 'VC'
LIMIT 1;

-- ARTESANIAS MERCADO  - FC 2776 (VC) - $453,766.70
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 453766.7, 'Transferencia', 'Pago importado desde Excel - ARTESANIAS MERCADO '
FROM facturas 
WHERE numero = '2776' AND empresa = 'VC'
LIMIT 1;

-- EL MUNDO DEL BAZAR  - FC 8870 (VC) - $1,214,598.00
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 1214598.0, 'Transferencia', 'Pago importado desde Excel - EL MUNDO DEL BAZAR '
FROM facturas 
WHERE numero = '8870' AND empresa = 'VC'
LIMIT 1;

-- CAMPAGNA  - FC 59107 (VC) - $2,718,684.72
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 2718684.72, 'Transferencia', 'Pago importado desde Excel - CAMPAGNA '
FROM facturas 
WHERE numero = '59107' AND empresa = 'VC'
LIMIT 1;

-- IDEAS RODECA  - FC 21691 (VC) - $1,730,803.20
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 1730803.2, 'Transferencia', 'Pago importado desde Excel - IDEAS RODECA '
FROM facturas 
WHERE numero = '21691' AND empresa = 'VC'
LIMIT 1;

-- DICHA S.A  - FC 5828 (VC) - $1,049,921.71
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 1049921.71, 'Transferencia', 'Pago importado desde Excel - DICHA S.A '
FROM facturas 
WHERE numero = '5828' AND empresa = 'VC'
LIMIT 1;

-- MOLDURAS DEL PLATA  - FC 16940194 (VC) - $1,662,398.92
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 1662398.92, 'Transferencia', 'Pago importado desde Excel - MOLDURAS DEL PLATA '
FROM facturas 
WHERE numero = '16940194' AND empresa = 'VC'
LIMIT 1;

-- EMERPLAST  - FC 706 (VC) - $706,640.00
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 706640.0, 'Transferencia', 'Pago importado desde Excel - EMERPLAST '
FROM facturas 
WHERE numero = '706' AND empresa = 'VC'
LIMIT 1;

-- ESTRADA  - FC 130556 (VC) - $16,925,495.00
INSERT INTO pagos (factura_id, fecha, monto, medio_pago, observaciones)
SELECT id, CURRENT_DATE, 16925495.0, 'Transferencia', 'Pago importado desde Excel - ESTRADA '
FROM facturas 
WHERE numero = '130556' AND empresa = 'VC'
LIMIT 1;

