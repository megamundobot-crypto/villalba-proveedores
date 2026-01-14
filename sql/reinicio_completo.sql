-- =====================================================
-- SCRIPT COMPLETO: Reinicio de datos desde Excel
-- Fecha: 2025-01-14
-- =====================================================

-- PASO 1: Limpiar todas las tablas
TRUNCATE TABLE pagos CASCADE;
TRUNCATE TABLE facturas CASCADE;
TRUNCATE TABLE cuenta_interna CASCADE;
TRUNCATE TABLE proveedores CASCADE;

-- PASO 2: Insertar proveedores
INSERT INTO proveedores (id, nombre) VALUES (1, 'AEROCOR');
INSERT INTO proveedores (id, nombre) VALUES (2, 'ALBERTO SCOLARI');
INSERT INTO proveedores (id, nombre) VALUES (3, 'ARTESANIAS MERCADO');
INSERT INTO proveedores (id, nombre) VALUES (4, 'BENABI');
INSERT INTO proveedores (id, nombre) VALUES (5, 'BERKMA');
INSERT INTO proveedores (id, nombre) VALUES (6, 'BIC');
INSERT INTO proveedores (id, nombre) VALUES (7, 'CAMPAGNA');
INSERT INTO proveedores (id, nombre) VALUES (8, 'CONOMETAL');
INSERT INTO proveedores (id, nombre) VALUES (9, 'DAKESIAN DELFINA');
INSERT INTO proveedores (id, nombre) VALUES (10, 'DICHA S.A');
INSERT INTO proveedores (id, nombre) VALUES (11, 'DISTRIBUIDORA PIRAMIDE');
INSERT INTO proveedores (id, nombre) VALUES (12, 'EL MUNDO DEL BAZAR');
INSERT INTO proveedores (id, nombre) VALUES (13, 'ELIPLAST');
INSERT INTO proveedores (id, nombre) VALUES (14, 'EMERPLAST');
INSERT INTO proveedores (id, nombre) VALUES (15, 'ESTRADA');
INSERT INTO proveedores (id, nombre) VALUES (16, 'GRADUA');
INSERT INTO proveedores (id, nombre) VALUES (17, 'GRIFLOR');
INSERT INTO proveedores (id, nombre) VALUES (18, 'GRIFLOR B');
INSERT INTO proveedores (id, nombre) VALUES (19, 'HORIZONTE');
INSERT INTO proveedores (id, nombre) VALUES (20, 'IDEAS RODECA');
INSERT INTO proveedores (id, nombre) VALUES (21, 'IMAGEN PARTY');
INSERT INTO proveedores (id, nombre) VALUES (22, 'IMPO. AMERICANA');
INSERT INTO proveedores (id, nombre) VALUES (23, 'IND. PLASTICAS RAO');
INSERT INTO proveedores (id, nombre) VALUES (24, 'INDUS. TECNOMATRIC');
INSERT INTO proveedores (id, nombre) VALUES (25, 'IRIS MODA B');
INSERT INTO proveedores (id, nombre) VALUES (26, 'LA NACIONAL');
INSERT INTO proveedores (id, nombre) VALUES (27, 'MAGENTA COMPANY');
INSERT INTO proveedores (id, nombre) VALUES (28, 'MATRICERIA JL');
INSERT INTO proveedores (id, nombre) VALUES (29, 'ME INTERNATIONAL');
INSERT INTO proveedores (id, nombre) VALUES (30, 'MODAX');
INSERT INTO proveedores (id, nombre) VALUES (31, 'MOLDURAS DEL PLATA');
INSERT INTO proveedores (id, nombre) VALUES (32, 'MULPLAST SRL');
INSERT INTO proveedores (id, nombre) VALUES (33, 'MULTIMAX');
INSERT INTO proveedores (id, nombre) VALUES (34, 'NAGUS S.R.L');
INSERT INTO proveedores (id, nombre) VALUES (35, 'OLDCLAN');
INSERT INTO proveedores (id, nombre) VALUES (36, 'PANA PACK');
INSERT INTO proveedores (id, nombre) VALUES (37, 'PERFILPLAST');
INSERT INTO proveedores (id, nombre) VALUES (38, 'PLASTICOS GLAGO');
INSERT INTO proveedores (id, nombre) VALUES (39, 'POKA B');
INSERT INTO proveedores (id, nombre) VALUES (40, 'QUALITET SA');
INSERT INTO proveedores (id, nombre) VALUES (41, 'SHIPY');
INSERT INTO proveedores (id, nombre) VALUES (42, 'SORLUZ');
INSERT INTO proveedores (id, nombre) VALUES (43, 'TSUNAMI');
INSERT INTO proveedores (id, nombre) VALUES (44, 'VELAS DE LOS MILAGROS');

SELECT setval('proveedores_id_seq', 44);

-- PASO 3: Insertar facturas de Villalba Hermanos SRL
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (1, 6, '194186', 'VH', 39039251.36, '2025-11-10');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (2, 6, '194243', 'VH', 2122789.76, '2025-11-11');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (3, 18, '4346', 'VH', 140400.0, '2025-11-13');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (4, 15, '130565', 'VH', 50371787.93, '2025-10-29');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (5, 44, '201163', 'VH', 11251114.05, '2025-12-09');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (6, 21, '21794', 'VH', 3815190.5, '2025-12-10');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (7, 2, '1414', 'VH', 2845955.68, '2025-12-15');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (8, 39, '46224', 'VH', 1106111.89, '2025-12-15');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (9, 39, '61124', 'VH', 1792712.53, '2025-12-15');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (10, 41, '61124', 'VH', 1792712.53, '2025-12-15');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (11, 25, '3324', 'VH', 2720055.0, '2025-12-16');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (12, 38, '2930', 'VH', 3220548.1, '2025-12-17');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (13, 39, '61226', 'VH', 307027.95, '2025-12-17');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (14, 41, '61226', 'VH', 307027.95, '2025-12-17');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (15, 24, '4883', 'VH', 687395.92, '2025-12-18');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (16, 36, '24420', 'VH', 786535.2, '2025-12-18');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (17, 26, '4385', 'VH', 1143192.56, '2025-12-19');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (18, 31, '16997', 'VH', 2136223.3, '2025-12-19');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (19, 33, '5354', 'VH', 4037376.75, '2025-12-20');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (20, 33, '5310', 'VH', 3893705.59, '2025-12-23');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (21, 15, '131028', 'VH', 10717555.97, '2025-11-20');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (22, 43, '7581', 'VH', 2521500.3, '2025-12-23');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (23, 9, '284', 'VH', 928662.9, '2025-12-30');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (24, 29, '19836', 'VH', 12084899.2, '2025-12-16');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (25, 30, '54757', 'VH', 1132946.6, '2025-12-10');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (26, 30, '54763', 'VH', 2249710.65, '2025-12-10');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (27, 30, '54880', 'VH', 2157080.31, '2025-12-15');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (28, 30, '55252', 'VH', 582582.33, '2025-12-29');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (29, 8, '13649', 'VH', 2029417.01, '2025-12-04');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (30, 11, '15846', 'VH', 496669.8, '2025-12-04');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (31, 4, '42084', 'VH', 4052453.96, '2025-12-26');

-- PASO 4: Insertar facturas de Villalba Cristino
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (32, 40, '64999', 'VC', 444008.81, '2025-10-30');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (33, 40, '65000', 'VC', 415588.32, '2025-10-30');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (34, 38, '2904', 'VC', 2879601.56, '2025-10-31');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (35, 20, '21482', 'VC', 3147550.0, '2025-11-03');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (36, 22, '131270', 'VC', 2341453.04, '2025-11-04');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (37, 38, '2907', 'VC', 451513.92, '2025-11-04');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (38, 6, '194185', 'VC', 23843137.67, '2025-11-10');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (39, 27, '11458', 'VC', 1503828.69, '2025-11-12');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (40, 18, '4347', 'VC', 75600.0, '2025-11-13');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (41, 43, '7553', 'VC', 776399.27, '2025-11-14');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (42, 3, '2774', 'VC', 450225.61, '2025-11-17');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (43, 3, '2776', 'VC', 453766.7, '2025-11-18');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (44, 12, '8870', 'VC', 1214598.0, '2025-11-20');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (45, 17, '9032', 'VC', 1736294.4, '2025-12-19');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (46, 39, '46382', 'VC', 1106111.89, '2025-11-22');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (47, 1, '26571', 'VC', 3476088.0, '2025-11-26');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (48, 7, '59107', 'VC', 2718684.72, '2025-11-26');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (49, 7, '59108', 'VC', 1138309.92, '2025-11-26');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (50, 43, '7557', 'VC', 460000.38, '2025-11-26');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (51, 20, '21691', 'VC', 1730803.2, '2025-11-27');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (52, 34, '8368', 'VC', 568803.0, '2025-11-27');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (53, 13, '43885', 'VC', 1688741.95, '2025-12-01');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (54, 13, '43886', 'VC', 551208.24, '2025-12-01');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (55, 19, '625', 'VC', 553575.0, '2025-12-03');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (56, 10, '5828', 'VC', 1049921.71, '2025-12-09');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (57, 3, '2792', 'VC', 2071529.49, '2025-12-10');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (58, 32, '1106', 'VC', 646309.4, '2025-12-11');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (59, 22, '132109', 'VC', 5065103.84, '2025-12-12');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (60, 43, '7576', 'VC', 1540000.4, '2025-12-12');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (61, 20, '21930', 'VC', 6205374.76, '2025-12-15');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (62, 34, '8509', 'VC', 765218.65, '2025-12-15');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (63, 25, '3324', 'VC', 1464645.0, '2025-12-16');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (64, 33, '5318', 'VC', 3593558.43, '2025-12-16');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (65, 14, '706', 'VC', 706640.0, '2025-12-17');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (66, 10, '5950', 'VC', 3771027.61, '2025-12-18');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (67, 28, '1355', 'VC', 1628563.2, '2025-12-18');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (68, 23, '3849', 'VC', 2976390.55, '2025-12-19');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (69, 31, '16996', 'VC', 3218992.92, '2025-12-19');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (70, 34, '8543', 'VC', 156060.0, '2025-12-19');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (71, 34, '8544', 'VC', 311532.48, '2025-12-19');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (72, 5, '46382', 'VC', 1106111.89, '2025-12-22');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (73, 35, '5442', 'VC', 3662551.37, '2025-12-27');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (74, 15, '130556', 'VC', 34089973.87, '2025-10-29');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (75, 15, '131027', 'VC', 6829681.33, '2025-11-20');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (76, 29, '19835', 'VC', 7834120.8, '2025-12-16');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (77, 39, '61420', 'VC', 102342.65, '2025-12-23');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (78, 39, '61457', 'VC', 1655735.63, '2025-12-23');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (79, 37, '793', 'VC', 1218058.6, '2025-12-10');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (80, 41, '61420', 'VC', 102342.65, '2025-12-23');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (81, 41, '61457', 'VC', 1655735.63, '2025-12-23');
INSERT INTO facturas (id, proveedor_id, numero, empresa, monto_total, fecha) VALUES (82, 20, '22037', 'VC', 884329.71, '2025-12-23');

SELECT setval('facturas_id_seq', 82);

-- PASO 5: Insertar pagos
INSERT INTO pagos (id, factura_id, fecha, monto, medio_pago, observaciones) VALUES (1, 1, '2025-11-10', 6000001.12, 'Transferencia', 'Pago importado - BIC');
INSERT INTO pagos (id, factura_id, fecha, monto, medio_pago, observaciones) VALUES (2, 4, '2025-10-29', 30371788.90, 'Transferencia', 'Pago importado - ESTRADA');
INSERT INTO pagos (id, factura_id, fecha, monto, medio_pago, observaciones) VALUES (3, 5, '2025-12-09', 7100000.05, 'Transferencia', 'Pago importado - VELAS DE LOS MILAGROS');
INSERT INTO pagos (id, factura_id, fecha, monto, medio_pago, observaciones) VALUES (4, 6, '2025-12-10', 1500000.50, 'Transferencia', 'Pago importado - IMAGEN PARTY');
INSERT INTO pagos (id, factura_id, fecha, monto, medio_pago, observaciones) VALUES (5, 7, '2025-12-15', 1500000.68, 'Transferencia', 'Pago importado - ALBERTO SCOLARI');
INSERT INTO pagos (id, factura_id, fecha, monto, medio_pago, observaciones) VALUES (6, 19, '2025-12-20', 3893706.34, 'Transferencia', 'Pago importado - MULTIMAX');
INSERT INTO pagos (id, factura_id, fecha, monto, medio_pago, observaciones) VALUES (7, 34, '2025-10-31', 2000001.48, 'Transferencia', 'Pago importado - PLASTICOS GLAGO');
INSERT INTO pagos (id, factura_id, fecha, monto, medio_pago, observaciones) VALUES (8, 35, '2025-11-03', 2500001.67, 'Transferencia', 'Pago importado - IDEAS RODECA');
INSERT INTO pagos (id, factura_id, fecha, monto, medio_pago, observaciones) VALUES (9, 36, '2025-11-04', 1000000.88, 'Transferencia', 'Pago importado - IMPO. AMERICANA');
INSERT INTO pagos (id, factura_id, fecha, monto, medio_pago, observaciones) VALUES (10, 74, '2025-10-29', 11925496.20, 'Transferencia', 'Pago importado - ESTRADA');

SELECT setval('pagos_id_seq', 10);
