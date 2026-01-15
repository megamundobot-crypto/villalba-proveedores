'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import ProtectedRoute from '@/components/ProtectedRoute'
import Link from 'next/link'
import { getBancoFromCBU } from '@/lib/bancos-argentina'

// Datos del Excel procesados
const CBUS_EXCEL = [
  { nombre: "AEROCOR", cbu: "2850306430000000078255", titular: null },
  { nombre: "ALBERTO SCOLARI", cbu: "0070071930004032021858", titular: null },
  { nombre: "ARTESANIAS MERCADO", cbu: "0070152120000004696566", titular: null },
  { nombre: "BAL PLAS", cbu: "2850891540094603580928", titular: "BAL PLAS S A" },
  { nombre: "BECHAR", cbu: "0170111720000001228843", titular: null },
  { nombre: "BENABI", cbu: "0170111720000001131907", titular: "BENABI S.R.L." },
  { nombre: "BERKMA", cbu: "0070327520000009591279", titular: null },
  { nombre: "BIC", cbu: "2590050910078498010017", titular: "BIC ARGENTINA SA" },
  { nombre: "CAMPAGNA", cbu: "1910037755003701770928", titular: null },
  { nombre: "CASTILLO - CORIZZO", cbu: "0720757288000004502636", titular: "CASTILLO SERGIO GABRIEL" },
  { nombre: "CONOMETAL", cbu: "1910029255002902582628", titular: null },
  { nombre: "DAKESIAN DELFINA", cbu: "0070017730004026023178", titular: "DAKESIAN DELFINA LUNA" },
  { nombre: "DESPOL", cbu: "0070016020000010923360", titular: "DESPOL" },
  { nombre: "DICHA S.A", cbu: "0720044120000000412818", titular: null },
  { nombre: "DISEÑO", cbu: "2850792930094055209421", titular: "DISEÑO R Y D S.R.L." },
  { nombre: "DISTRIBUIDORA PIRAMIDE", cbu: "1910029255002901173746", titular: null },
  { nombre: "EL MUNDO DEL BAZAR", cbu: "1910375855037501749932", titular: null },
  { nombre: "ELIPLAST", cbu: "0140030401509802075489", titular: null },
  { nombre: "EMERPLAST", cbu: "0170081740000044402543", titular: null },
  { nombre: "EMPRENDIMIENTOS HOW WENS", cbu: "0720044120000000368890", titular: "EMPRENDIMIENTOS HOW WENS" },
  { nombre: "ESTRADA", cbu: "0070999020000038175059", titular: "ANGEL ESTRADA Y CIA S A" },
  { nombre: "FUNTOYS", cbu: "0170111720000001298925", titular: null },
  { nombre: "GRIFLOR", cbu: "0070102620000010509528", titular: "J I GRIFLOR" },
  { nombre: "HORIZONTE", cbu: "0070109520000003921597", titular: "HORIZONTE" },
  { nombre: "IBICO", cbu: "0170334220000030233634", titular: "IBICO SRL" },
  { nombre: "IDEAS RODECA", cbu: "1910005655000501688428", titular: null },
  { nombre: "IMAGEN PARTY", cbu: "0720119220000002173418", titular: null },
  { nombre: "IMPO. AMERICANA", cbu: "0720025020000000392154", titular: "IMPORTADORA AMERICANA SRL" },
  { nombre: "IMPORTAL GROUP", cbu: "0170111720000001441893", titular: "IMPORTAL GROUP" },
  { nombre: "IND. PLASTICAS RAO", cbu: "0170014520000002892997", titular: null },
  { nombre: "INDUS. TECNOMATRIC", cbu: "1910044555004403789300", titular: null },
  { nombre: "INDUST.PLASTICOS SCARPINO", cbu: "1910069855006901492928", titular: "IND PLAST SCARPINO" },
  { nombre: "IRIS MODA", cbu: "0170111720000001836543", titular: null },
  { nombre: "LA NACIONAL", cbu: "0720082320000000445490", titular: "PUGLIESE CARLOS ALBERTO" },
  { nombre: "LA PORTEÑA", cbu: "1910095755009501543432", titular: "DISTRIBUIDORA GM SRL" },
  { nombre: "LIVORNO", cbu: "0150505402000106442975", titular: "SACK MARTINA" },
  { nombre: "M.E. INTERNATIONAL", cbu: "2850326230094174906641", titular: "M.E. INTERNATIONAL" },
  { nombre: "MAGENTA COMPANY", cbu: "0720267620000000197636", titular: null },
  { nombre: "MAGIKA", cbu: "0070124820000003526808", titular: "RO DUBI SRL" },
  { nombre: "MATRICERIA JL", cbu: "1910033955003300902478", titular: null },
  { nombre: "ME INTERNATIONAL", cbu: "1910041455004101700632", titular: null },
  { nombre: "MODAX", cbu: "1910153055015301097600", titular: "MODAX SRL" },
  { nombre: "MOLDURAS DEL PLATA SRL", cbu: "0070054220000004586391", titular: "MOLDURAS DEL PLATA SRL" },
  { nombre: "MULPLAST SRL", cbu: "0150523802000104075032", titular: null },
  { nombre: "MULTIMAX", cbu: "0000003100011916605405", titular: "MULTIMAX SAS" },
  { nombre: "MUNDO PLASTIC", cbu: "0170149020000000571238", titular: "MUNDO PLASTIC SRL" },
  { nombre: "NAGUS S.R.L", cbu: "1910005655000500585850", titular: null },
  { nombre: "OLDCLAN", cbu: "0170309020000030206388", titular: null },
  { nombre: "OTA SUCESION", cbu: "0340026500260625820005", titular: "OTA SUCES DOMINGO CASCASI" },
  { nombre: "PANA PACK", cbu: "0720082320000000420240", titular: null },
  { nombre: "PANAPACK", cbu: "0720082320000000420240", titular: "PANAPACK" },
  { nombre: "PELIKAN", cbu: "0170470320000000343855", titular: "PELIKAN ARG. S.A." },
  { nombre: "PERFIL PLAST", cbu: "0170296740000030257793", titular: "RABINOVICHMARIO HUGO" },
  { nombre: "PLASTICOS GLAGO", cbu: "0720058888000036199536", titular: "PLASTICOS GLAGO" },
  { nombre: "PLASTICOS MV", cbu: "0070027620000004431011", titular: "LOPARDO GUSTAVO A" },
  { nombre: "PLASTIPRESS", cbu: "0150517702000000005137", titular: "PLASTI PRESS S.R.L." },
  { nombre: "POKA", cbu: "0070327520000009592913", titular: "POKA SA" },
  { nombre: "QUALITET", cbu: "1910061255006100362228", titular: "QUALITET SA" },
  { nombre: "RIGOLLEAU SA", cbu: "1910021655002101649878", titular: "RIGOLLEAU SA" },
  { nombre: "SAO LEOPOLDO", cbu: "1910122655012201113414", titular: "SAO LEOPOLDO SA" },
  { nombre: "SEBIGUS", cbu: "0720044120000000373018", titular: "SEBIGUS SRL" },
  { nombre: "SERV INTEGRAL GRAF - NB", cbu: "1910003255000301010300", titular: "SERV INT GRAFICO GEREZ SRL" },
  { nombre: "SHAMIR", cbu: "1910006355000602330428", titular: "SHAMIR SA" },
  { nombre: "SHIPY", cbu: "0070327520000009595042", titular: "SHIPY GALICIA" },
  { nombre: "TICORAL", cbu: "1910026155002601243532", titular: "TICORAL SRL" },
  { nombre: "TROKELITOS", cbu: "0170013820000001886050", titular: null },
  { nombre: "TSUNAMI", cbu: "0170111720000000471743", titular: "TSUNAMI GROUP SRL" },
  { nombre: "VELAS DE LOS MILAGROS", cbu: "1910003255000300136896", titular: null },
]

interface ResultadoCarga {
  nombre: string
  cbu: string
  estado: 'pendiente' | 'exito' | 'error' | 'ya_existe' | 'no_encontrado'
  mensaje?: string
  proveedor_id?: number
}

export default function CargarCBUsPage() {
  const [resultados, setResultados] = useState<ResultadoCarga[]>(
    CBUS_EXCEL.map(c => ({ ...c, estado: 'pendiente' as const }))
  )
  const [cargando, setCargando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [completado, setCompletado] = useState(false)

  async function cargarTodos() {
    setCargando(true)
    setProgreso(0)
    setCompletado(false)

    const nuevosResultados = [...resultados]

    for (let i = 0; i < CBUS_EXCEL.length; i++) {
      const item = CBUS_EXCEL[i]

      try {
        // Buscar proveedor por nombre (exacto o parcial)
        const { data: proveedores } = await supabase
          .from('proveedores')
          .select('id, nombre')
          .eq('activo', true)
          .ilike('nombre', `%${item.nombre}%`)
          .limit(5)

        if (!proveedores || proveedores.length === 0) {
          // Intentar búsqueda más flexible
          const nombreParts = item.nombre.split(' ')
          const { data: provs2 } = await supabase
            .from('proveedores')
            .select('id, nombre')
            .eq('activo', true)
            .ilike('nombre', `%${nombreParts[0]}%`)
            .limit(10)

          if (!provs2 || provs2.length === 0) {
            nuevosResultados[i] = {
              ...item,
              estado: 'no_encontrado',
              mensaje: 'Proveedor no encontrado en la BD'
            }
            setResultados([...nuevosResultados])
            setProgreso(((i + 1) / CBUS_EXCEL.length) * 100)
            continue
          }

          // Buscar mejor match
          const match = provs2.find(p =>
            p.nombre.toUpperCase().includes(item.nombre.toUpperCase()) ||
            item.nombre.toUpperCase().includes(p.nombre.toUpperCase())
          )

          if (!match) {
            nuevosResultados[i] = {
              ...item,
              estado: 'no_encontrado',
              mensaje: `No encontrado. Similares: ${provs2.map(p => p.nombre).join(', ')}`
            }
            setResultados([...nuevosResultados])
            setProgreso(((i + 1) / CBUS_EXCEL.length) * 100)
            continue
          }

          proveedores!.push(match)
        }

        const proveedor = proveedores![0]

        // Verificar si ya existe el CBU
        const { data: existente } = await supabase
          .from('cbus_proveedores')
          .select('id')
          .eq('proveedor_id', proveedor.id)
          .eq('cbu', item.cbu)
          .eq('activo', true)
          .single()

        if (existente) {
          nuevosResultados[i] = {
            ...item,
            estado: 'ya_existe',
            mensaje: `CBU ya existe para ${proveedor.nombre}`,
            proveedor_id: proveedor.id
          }
          setResultados([...nuevosResultados])
          setProgreso(((i + 1) / CBUS_EXCEL.length) * 100)
          continue
        }

        // Obtener banco del CBU
        const banco = getBancoFromCBU(item.cbu)

        // Insertar CBU
        const { error } = await supabase
          .from('cbus_proveedores')
          .insert({
            proveedor_id: proveedor.id,
            cbu: item.cbu,
            banco: banco?.nombreCorto || null,
            titular: item.titular,
            principal: true,
            activo: true
          })

        if (error) {
          nuevosResultados[i] = {
            ...item,
            estado: 'error',
            mensaje: error.message,
            proveedor_id: proveedor.id
          }
        } else {
          nuevosResultados[i] = {
            ...item,
            estado: 'exito',
            mensaje: `CBU agregado a ${proveedor.nombre}`,
            proveedor_id: proveedor.id
          }
        }

      } catch (err) {
        nuevosResultados[i] = {
          ...item,
          estado: 'error',
          mensaje: err instanceof Error ? err.message : 'Error desconocido'
        }
      }

      setResultados([...nuevosResultados])
      setProgreso(((i + 1) / CBUS_EXCEL.length) * 100)

      // Pequeña pausa para no saturar la BD
      await new Promise(r => setTimeout(r, 100))
    }

    setCargando(false)
    setCompletado(true)
  }

  const exitosos = resultados.filter(r => r.estado === 'exito').length
  const yaExisten = resultados.filter(r => r.estado === 'ya_existe').length
  const errores = resultados.filter(r => r.estado === 'error').length
  const noEncontrados = resultados.filter(r => r.estado === 'no_encontrado').length

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100">
        <header className="bg-slate-800 text-white p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Cargar CBUs desde Excel</h1>
              <p className="text-slate-400 text-sm">68 CBUs para insertar</p>
            </div>
            <Link href="/" className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">
              Volver
            </Link>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-6">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold">{CBUS_EXCEL.length}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg shadow border-l-4 border-emerald-500">
              <p className="text-sm text-emerald-600">Exitosos</p>
              <p className="text-2xl font-bold text-emerald-700">{exitosos}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg shadow border-l-4 border-blue-500">
              <p className="text-sm text-blue-600">Ya existen</p>
              <p className="text-2xl font-bold text-blue-700">{yaExisten}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg shadow border-l-4 border-amber-500">
              <p className="text-sm text-amber-600">No encontrados</p>
              <p className="text-2xl font-bold text-amber-700">{noEncontrados}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg shadow border-l-4 border-red-500">
              <p className="text-sm text-red-600">Errores</p>
              <p className="text-2xl font-bold text-red-700">{errores}</p>
            </div>
          </div>

          {/* Botón de carga */}
          {!completado && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <button
                onClick={cargarTodos}
                disabled={cargando}
                className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${
                  cargando
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                }`}
              >
                {cargando ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    Cargando... {Math.round(progreso)}%
                  </span>
                ) : (
                  '🚀 Cargar todos los CBUs'
                )}
              </button>

              {cargando && (
                <div className="mt-4">
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {completado && (
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-lg mb-6">
              <h2 className="text-lg font-bold text-emerald-700 mb-2">✅ Proceso completado</h2>
              <p className="text-emerald-600">
                Se procesaron {CBUS_EXCEL.length} CBUs. {exitosos} insertados correctamente.
              </p>
            </div>
          )}

          {/* Lista de resultados */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Proveedor</th>
                  <th className="px-4 py-3 text-left font-semibold">CBU</th>
                  <th className="px-4 py-3 text-left font-semibold">Banco</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((r, idx) => {
                  const banco = getBancoFromCBU(r.cbu)
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-2 font-medium">{r.nombre}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.cbu}</td>
                      <td className="px-4 py-2">
                        {banco ? (
                          <span
                            className="px-2 py-1 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: banco.colorPrimario }}
                          >
                            {banco.nombreCorto}
                          </span>
                        ) : (
                          <span className="text-slate-400">?</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {r.estado === 'pendiente' && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">Pendiente</span>
                        )}
                        {r.estado === 'exito' && (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">✓ Éxito</span>
                        )}
                        {r.estado === 'ya_existe' && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Ya existe</span>
                        )}
                        {r.estado === 'no_encontrado' && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">No encontrado</span>
                        )}
                        {r.estado === 'error' && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Error</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500 max-w-xs truncate">
                        {r.mensaje || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
