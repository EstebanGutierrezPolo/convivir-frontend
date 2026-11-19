import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga, Vacio } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { COPROPIEDAD, useSesion } from '../../aplicacion/sesion.jsx'
import { CONCEPTOS, HOY, ULTIMO_CORTE, diasEntre, carteraDeEjemplo } from '../../datos/cartera.js'
import { cifra, fecha, pesos } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'
import { EstiloCifras } from './Inicio.jsx'
import { ListaInmuebles, fechaConAnio } from './Obligaciones.jsx'

// CU-14 Consultar cartera e información financiera. Datos de ejemplo hasta que exista la API.
// Inmueble.calcularSaldoPendienteDelInmueble(), Obligacion.calcularDiasDeMora(), Obligacion.generarInformeDeCartera(minDias, maxDias)
// Gasto.consultarGastosDelPeriodo(periodo) · Inmueble.expedirPazYSalvoAFechaDeCorte(fechaCorte) (409 si hay pendientes, RN-34)
// Con soloConsulta la ve el miembro del consejo: consulta y descarga; registrar pagos y expedir paz y salvo se ocultan.

const RANGOS = [
  { id: '', nombre: 'Toda la cartera', min: 1, max: null },
  { id: '1-30', nombre: '1 a 30 días', min: 1, max: 30 },
  { id: '31-60', nombre: '31 a 60 días', min: 31, max: 60 },
  { id: '61-90', nombre: '61 a 90 días', min: 61, max: 90 },
  { id: '91', nombre: 'Más de 90 días', min: 91, max: null },
]
const enRango = (fila, r) => fila.diasDeMora >= r.min && (r.max === null || fila.diasDeMora <= r.max)
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const EJEMPLOS_PAZ = [
  { inmueble: 'A-0401', corte: HOY, texto: 'A-0401' },
  { inmueble: 'B-0302', corte: HOY, texto: 'B-0302' },
  { inmueble: 'A-1104', corte: HOY, texto: 'A-1104' },
  { inmueble: 'C-0705', corte: '2026-11-30', texto: 'C-0705 al 30 de noviembre' },
]

// Rangos de días de mora: botones que filtran la tabla y muestran su parte de la cartera
const ESTILO_RANGOS = `
  .rangos { display: grid; gap: var(--e3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr)); margin-bottom: var(--e4); }
  .rango {
    display: block; width: 100%; text-align: left; cursor: pointer;
    padding: var(--e3) var(--e4);
    border: 1px solid var(--borde); border-radius: var(--r-superficie);
    background: var(--papel); color: var(--tinta);
  }
  .rango:hover { background: var(--concreto); }
  .rango[aria-pressed="true"] { border-color: var(--convivir); background: var(--convivir-c); outline: 1px solid var(--convivir); outline-offset: -2px; }
  .rango .nombre-rango { display: block; font-size: var(--t-sm); font-weight: 500; color: var(--acero); }
  .rango .monto { display: block; font-size: var(--t-md); font-weight: 700; letter-spacing: -.01em; font-variant-numeric: tabular-nums; margin-top: var(--e1); }
  .rango .cuantos { display: block; font-size: var(--t-xs); color: var(--acero); }
  .rango .proporcion { margin-top: var(--e2); height: 6px; }
`

const inmuebles = (n) => `${n} ${n === 1 ? 'inmueble' : 'inmuebles'}`
const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0)
const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1)

export default function Cartera({ soloConsulta = false }) {
  const confirmar = useConfirmar()
  const location = useLocation()
  const cartera = useConsulta(() => carteraDeEjemplo.cartera())
  const [rango, setRango] = useState(RANGOS[0])
  const [paz, setPaz] = useState({ abierto: false, inicial: '', vuelta: 0 })
  const [imprimiendo, setImprimiendo] = useState(false)

  const abrirPaz = (inicial = '') => setPaz((p) => ({ abierto: true, inicial, vuelta: p.vuelta + 1 }))

  // Desde el inicio se llega con ?inmueble=A-0401#paz-y-salvo: el diálogo se abre con el inmueble listo
  useEffect(() => {
    if (soloConsulta || location.hash !== '#paz-y-salvo') return
    abrirPaz(new URLSearchParams(location.search).get('inmueble') || '')
  }, [location.key, location.hash, location.search, soloConsulta])

  // Imprimir solo el documento: se copia fuera del diálogo y se oculta la página
  useEffect(() => {
    if (!imprimiendo) return undefined
    const despues = () => setImprimiendo(false)
    window.addEventListener('afterprint', despues)
    window.print()
    return () => window.removeEventListener('afterprint', despues)
  }, [imprimiendo])

  const filas = useMemo(() => cartera.datos?.filas || [], [cartera.datos])
  const visibles = filas.filter((f) => enRango(f, rango))
  const sumaVisible = visibles.reduce((s, f) => s + f.saldoVencido, 0)

  // Descargar informe: Obligacion.generarInformeDeCartera(minDias, maxDias), armado en el navegador como CSV
  const descargar = () => {
    const datos = [['Inmueble', 'Propietario', 'Saldo vencido', 'Vencido desde', 'Días de mora', 'Qué debe']]
    visibles.forEach((f) => datos.push([f.inmueble, f.propietario, f.saldoVencido, f.vencidoDesde, f.diasDeMora, f.queDebe]))
    datos.push(['Total', inmuebles(visibles.length), sumaVisible, '', '', ''])
    const csv = `﻿${datos.map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')}`
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    enlace.download = `cartera-villa-campestre-${cartera.datos.corte}${rango.id ? `-${rango.id}-dias` : ''}.csv`
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000)
    confirmar(`Informe descargado: ${inmuebles(visibles.length)}, ${rango.nombre.toLowerCase()}.`)
  }

  let contenido
  if (cartera.cargando && !cartera.datos) contenido = <div className="superficie"><Cargando texto="Cargando la cartera…" /></div>
  else if (cartera.error) contenido = <div className="superficie"><ErrorDeCarga error={cartera.error} alReintentar={cartera.recargar} /></div>
  else {
    const d = cartera.datos
    const total = filas.reduce((s, f) => s + f.saldoVencido, 0)
    const masDe90 = filas.filter((f) => enRango(f, RANGOS[4]))
    const montoMasDe90 = masDe90.reduce((s, f) => s + f.saldoVencido, 0)
    const recaudoPct = porcentaje(d.recaudo.total, d.recaudo.facturado)
    const totalGastos = d.gastos.reduce((s, g) => s + g.valor, 0)

    contenido = (
      <>
        <div className="cifras">
          <div className="superficie cifra">
            <div className="etiqueta">Cartera vencida</div>
            <div className="valor">{pesos(total)}</div>
            <div className="meta">
              {filas.length ? <Pildora tono="no">{inmuebles(filas.length)} en mora</Pildora> : <Pildora tono="ok">Nadie en mora</Pildora>}
            </div>
          </div>
          <div className="superficie cifra">
            <div className="etiqueta">Más de 90 días en mora</div>
            <div className="valor">{pesos(montoMasDe90)}</div>
            <div className="meta"><span>{inmuebles(masDe90.length)} · {porcentaje(montoMasDe90, total)} % de la cartera vencida</span></div>
          </div>
          <div className="superficie cifra">
            <div className="etiqueta">Recaudo de noviembre</div>
            <div className="valor">{pesos(d.recaudo.total)}</div>
            <div className="proporcion" role="img" aria-label={`${recaudoPct} por ciento de lo facturado`}>
              <span style={{ width: `${Math.min(recaudoPct, 100)}%` }} />
            </div>
            <div className="meta"><span>{recaudoPct} % de <span className="num">{pesos(d.recaudo.facturado)}</span> facturados</span></div>
          </div>
          <div className="superficie cifra">
            <div className="etiqueta">Gastos de noviembre</div>
            <div className="valor">{pesos(totalGastos)}</div>
            <div className="meta"><span>{d.gastos.length} gastos registrados al {fecha(d.corte)}</span></div>
          </div>
        </div>

        <section className="seccion" aria-labelledby="titulo-mora">
          <div className="encabezado">
            <div>
              <h2 id="titulo-mora">Cartera por días de mora</h2>
              <p className="guia">Elige un rango para ver solo esos inmuebles. Los días se cuentan desde la obligación vencida más antigua.</p>
            </div>
          </div>

          <div className="rangos" role="group" aria-label="Rango de días de mora">
            {RANGOS.map((r) => {
              const delRango = filas.filter((f) => enRango(f, r))
              const monto = delRango.reduce((s, f) => s + f.saldoVencido, 0)
              const parte = porcentaje(monto, total)
              const tono = r.id === '1-30' ? 'al' : r.id ? 'no' : undefined
              return (
                <button key={r.nombre} className="rango" type="button" aria-pressed={rango === r} onClick={() => setRango(r)}>
                  <span className="nombre-rango">{r.nombre}</span>
                  <span className="monto">{pesos(monto)}</span>
                  <span className="cuantos">{inmuebles(delRango.length)}{r.id ? ` · ${parte} %` : ''}</span>
                  <span className="proporcion" aria-hidden="true"><span className={tono} style={{ width: `${r.id ? parte : 100}%` }} /></span>
                </button>
              )
            })}
          </div>

          <div className="superficie">
            <div className="cabeza">
              <div>
                <h3>{rango.id ? `Inmuebles con ${rango.nombre.toLowerCase()} de mora` : 'Inmuebles en mora'}</h3>
                <p className="guia">{inmuebles(visibles.length)} · {pesos(sumaVisible)} vencidos</p>
              </div>
              <button className="btn segundo chico" type="button" onClick={descargar}>Descargar informe</button>
            </div>
            {visibles.length === 0 ? (
              filas.length === 0
                ? <Vacio titulo="Ningún inmueble está en mora">Todos los inmuebles activos pagaron lo que se les venció hasta el {fecha(d.corte)}.</Vacio>
                : (
                  <Vacio titulo={`Ningún inmueble tiene ${rango.nombre.toLowerCase()} de mora`}
                    accion={<button className="btn segundo" type="button" onClick={() => setRango(RANGOS[0])}>Ver toda la cartera</button>}>
                    Elige otro rango para ver a los inmuebles que sí deben.
                  </Vacio>
                )
            ) : (
              <div className="tabla-envoltura">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Inmueble</th><th>Propietario</th><th className="num">Saldo vencido</th>
                      <th>Vencido desde</th><th>Mora</th><th>Qué debe</th>
                      {!soloConsulta && <th><span className="solo-lectores">Acciones</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((f) => (
                      <tr key={f.inmueble}>
                        <td><span className="identificador fuerte">{f.inmueble}</span><span className="sub">{f.unidad}</span></td>
                        <td>
                          {f.propietario || 'Propietario registrado'}
                          <span className="sub">{f.vinculo && mayuscula(f.vinculo)}{f.ocupa ? ` · ocupa ${f.ocupa}` : ''}</span>
                        </td>
                        <td className="num">{cifra(f.saldoVencido)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fecha(f.vencidoDesde)}</td>
                        <td>{f.diasDeMora > 30
                          ? <Pildora tono="no">{f.diasDeMora} días en mora</Pildora>
                          : <Pildora tono="al">{f.diasDeMora} días</Pildora>}</td>
                        <td style={{ minWidth: '16rem' }}>{f.queDebe}</td>
                        {!soloConsulta && (
                          <td className="acciones-fila">
                            <Link className="btn texto chico" to={`/administrador/pago-presencial?inmueble=${f.inmueble}`}>Registrar pago</Link>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}>Total · {inmuebles(visibles.length)}</td>
                      <td className="num">{cifra(sumaVisible)}</td>
                      <td colSpan={soloConsulta ? 3 : 4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="seccion" aria-labelledby="titulo-periodo">
          <div className="encabezado">
            <div>
              <h2 id="titulo-periodo">Recaudo y gastos de noviembre</h2>
              <p className="guia">Del 1 al {fechaConAnio(d.corte)}</p>
            </div>
          </div>

          <div className="lado izquierda">
            <div className="superficie">
              <div className="cabeza"><h3>Recaudo por canal</h3></div>
              <ul className="lista">
                <li>
                  <div className="principal">
                    <b>En línea</b>
                    <span>{d.recaudo.enLinea.pagos} pagos confirmados por la pasarela</span>
                    <div className="proporcion" role="img" aria-label={`${porcentaje(d.recaudo.enLinea.valor, d.recaudo.total)} por ciento del recaudo`}>
                      <span style={{ width: `${porcentaje(d.recaudo.enLinea.valor, d.recaudo.total)}%` }} />
                    </div>
                  </div>
                  <span className="num fuerte">{pesos(d.recaudo.enLinea.valor)}</span>
                </li>
                <li>
                  <div className="principal">
                    <b>Presencial</b>
                    <span>{d.recaudo.presencial.pagos} pagos en la oficina de administración</span>
                    <div className="proporcion" role="img" aria-label={`${porcentaje(d.recaudo.presencial.valor, d.recaudo.total)} por ciento del recaudo`}>
                      <span style={{ width: `${porcentaje(d.recaudo.presencial.valor, d.recaudo.total)}%` }} />
                    </div>
                  </div>
                  <span className="num fuerte">{pesos(d.recaudo.presencial.valor)}</span>
                </li>
                <li>
                  <div className="principal"><b>Total recaudado</b><span>{d.recaudo.pagos} pagos</span></div>
                  <span className="num fuerte">{pesos(d.recaudo.total)}</span>
                </li>
              </ul>
              <div className="pie">
                <span>Recaudo menos gastos</span>
                <span className="num fuerte" style={{ color: 'var(--tinta)' }}>{pesos(d.recaudo.total - totalGastos)}</span>
              </div>
            </div>

            <div className="superficie">
              <div className="cabeza">
                <h3>Gastos del periodo</h3>
                <span className="etiqueta">Solo consulta</span>
              </div>
              <div className="tabla-envoltura">
                <table className="tabla">
                  <thead><tr><th>Concepto</th><th>Fecha</th><th className="num">Valor</th></tr></thead>
                  <tbody>
                    {d.gastos.map((g) => (
                      <tr key={g.id}>
                        <td>{g.concepto}<span className="sub">{g.detalle}</span></td>
                        <td>{fecha(g.fecha)}</td>
                        <td className="num">{cifra(g.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={2}>Total de gastos</td><td className="num">{cifra(totalGastos)}</td></tr></tfoot>
                </table>
              </div>
              <div className="pie"><span>Los gastos vienen de la contabilidad de la copropiedad. Aquí se consultan; no se registran ni se editan.</span></div>
            </div>
          </div>
        </section>
      </>
    )
  }

  const [anio, mes, dia] = HOY.split('-').map(Number)
  const corteTexto = `${DIAS[new Date(anio, mes - 1, dia).getDay()]} ${fechaConAnio(HOY)}`

  return (
    <>
      <main className={`pagina${imprimiendo ? ' no-imprimir' : ''}`}>
        <EstiloCifras />
        <style href="convivir-cartera-rangos" precedence="default">{ESTILO_RANGOS}</style>

        <Encabezado titulo="Estado de cartera"
          guia={`Corte al ${corteTexto} · ${cartera.datos?.inmueblesActivos ?? 184} inmuebles activos`}
          acciones={!soloConsulta && <>
            <Link className="btn segundo" to="/administrador/pago-presencial">Registrar pago</Link>
            <button className="btn" type="button" onClick={() => abrirPaz()}>Expedir paz y salvo</button>
          </>} />

        <AvisoDatosDeEjemplo casoDeUso="CU-14" />

        {soloConsulta && (
          <div className="aviso" style={{ marginBottom: 'var(--e5)' }}>
            Estás viendo la cartera como miembro del consejo. Puedes consultarla y descargar el informe; los pagos y los paz y salvo los gestiona la administración.
          </div>
        )}

        {contenido}
      </main>

      {!soloConsulta && (
        <PazYSalvo estado={paz} imprimiendo={imprimiendo} alImprimir={() => setImprimiendo(true)}
          alCerrar={() => setPaz((p) => ({ ...p, abierto: false }))} />
      )}
    </>
  )
}

// ---------- Paz y salvo: Inmueble.expedirPazYSalvoAFechaDeCorte(fechaCorte) · solo administrador ----------

function PazYSalvo({ estado, imprimiendo, alImprimir, alCerrar }) {
  const confirmar = useConfirmar()
  const { sesion } = useSesion()
  const idLista = useId()
  const [inmueble, setInmueble] = useState('')
  const [corte, setCorte] = useState(HOY)
  const [errores, setErrores] = useState({})
  const [resultado, setResultado] = useState(null)
  const expide = sesion?.persona || 'Paula Ortega'

  // GET /api/inmuebles/id/paz-y-salvo?fechaCorte
  const expedir = async (texto = inmueble, fechaCorte = corte) => {
    setResultado(null)
    const nuevos = {}
    if (!texto.trim()) nuevos.inmueble = 'Escribe el inmueble, por ejemplo A-0401.'
    if (!fechaCorte) nuevos.corte = 'Elige la fecha de corte. El paz y salvo certifica que no debía nada vencido a esa fecha.'
    else if (fechaCorte > ULTIMO_CORTE) nuevos.corte = 'La fecha de corte puede ir hasta el 31 de diciembre de 2026, el último periodo configurado.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length) return
    try {
      const doc = await carteraDeEjemplo.pazYSalvo(texto, fechaCorte, expide)
      setInmueble(doc.inmueble)
      setResultado({ doc })
      confirmar(`Paz y salvo expedido: ${doc.numero} para ${doc.inmueble}.`)
    } catch (e) {
      // alt del diagrama de secuencia: el inmueble tiene obligaciones pendientes a la fecha → 409
      if (e.estado === 409) { setInmueble(e.detalle.inmueble); setResultado({ pendiente: e.detalle }) }
      else if (e.estado === 404) {
        setErrores({ inmueble: `No hay un inmueble activo con la identificación ${texto.trim()}. Escríbela como en la escritura, por ejemplo A-0401.` })
      } else setErrores({ inmueble: e.message })
    }
  }

  // Al abrir: campos limpios, o el inmueble que pidió el inicio, ya consultado
  useEffect(() => {
    if (!estado.abierto) return
    setInmueble(estado.inicial)
    setCorte(HOY)
    setErrores({})
    setResultado(null)
    if (estado.inicial) expedir(estado.inicial, HOY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.vuelta])

  const cambiarInmueble = (valor) => { setInmueble(valor); setResultado(null); setErrores((e) => ({ ...e, inmueble: null })) }
  const cambiarCorte = (valor) => { setCorte(valor); setResultado(null); setErrores((e) => ({ ...e, corte: null })) }

  return (
    <>
      <Dialogo abierto={estado.abierto && !imprimiendo} alCerrar={alCerrar} ancho titulo="Expedir paz y salvo"
        guia="Se expide si el inmueble no tiene obligaciones vencidas sin pagar a la fecha de corte." alEnviar={() => expedir()}
        pie={<>
          <button className="btn segundo" type="button" onClick={alCerrar}>Cerrar</button>
          {resultado?.doc && <button className="btn segundo" type="button" onClick={alImprimir}>Imprimir paz y salvo</button>}
          <button className="btn" type="submit">Expedir paz y salvo</button>
        </>}>
        <div className="pila" style={{ gap: 'var(--e5)' }}>
          <div className="formulario dos">
            <Campo rotulo="Inmueble" error={errores.inmueble}>
              <input className="identificador" list={idLista} value={inmueble} placeholder="A-0401" autoComplete="off"
                onChange={(e) => cambiarInmueble(e.target.value)} />
            </Campo>
            <Campo rotulo="Fecha de corte" error={errores.corte}>
              <input type="date" value={corte} max={ULTIMO_CORTE} onChange={(e) => cambiarCorte(e.target.value)} />
            </Campo>
          </div>
          <ListaInmuebles id={idLista} />
          <p className="guia">
            Ejemplos de esta vista:{' '}
            {EJEMPLOS_PAZ.map((e) => (
              <button key={e.texto} className="btn texto chico identificador" type="button"
                onClick={() => { setInmueble(e.inmueble); setCorte(e.corte); expedir(e.inmueble, e.corte) }}>{e.texto}</button>
            ))}
          </p>
          <div aria-live="polite">
            {resultado?.pendiente && <Pendientes detalle={resultado.pendiente} />}
            {resultado?.doc && (
              <div className="pila">
                <div className="aviso ok">
                  <b>Paz y salvo expedido: {resultado.doc.numero}.</b> Imprímelo o descárgalo como PDF desde la ventana de impresión.
                  {resultado.doc.porVencerDespues > 0 && (
                    <p>Ten en cuenta que tiene {pesos(resultado.doc.porVencerDespues)} que vencen después de la fecha de corte; el paz y salvo no los cubre.</p>
                  )}
                </div>
                <DocumentoPazYSalvo doc={resultado.doc} />
              </div>
            )}
          </div>
        </div>
      </Dialogo>

      {/* Copia del documento que se imprime sin el resto de la página */}
      {imprimiendo && resultado?.doc && (
        <div className="pagina angosta"><DocumentoPazYSalvo doc={resultado.doc} /></div>
      )}
    </>
  )
}

/** Lo que debe a la fecha de corte: cuánto, desde cuándo y el detalle. */
function Pendientes({ detalle }) {
  const { inmueble, fechaCorte, pendientes } = detalle
  const debe = pendientes.reduce((s, o) => s + o.saldoPendiente, 0)
  const antigua = pendientes[0]
  const dias = diasEntre(antigua.fechaVencimiento, fechaCorte)
  return (
    <div className="pila">
      <div className="aviso no">
        <p><b>No se puede expedir: <span className="identificador">{inmueble}</span> tiene obligaciones pendientes al {fechaConAnio(fechaCorte)}.</b></p>
        <p>
          Debe {pesos(debe)} en {pendientes.length} {pendientes.length === 1 ? 'obligación' : 'obligaciones'}. La más antigua{' '}
          {dias > 0
            ? `venció el ${fecha(antigua.fechaVencimiento)}: ${dias} días en mora a esa fecha.`
            : `vence el ${fecha(antigua.fechaVencimiento)}, el mismo día del corte.`}
        </p>
        <p>Cuando pague, vuelve a expedirlo.</p>
      </div>
      <div className="superficie">
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead><tr><th>Obligación</th><th>Vence</th><th className="num">Saldo</th></tr></thead>
            <tbody>
              {pendientes.map((o) => (
                <tr key={o.id}>
                  <td>{CONCEPTOS[o.concepto]}<span className="sub">{o.descripcion}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fecha(o.fechaVencimiento)}</td>
                  <td className="num">{cifra(o.saldoPendiente)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={2}>Total pendiente al corte</td><td className="num">{cifra(debe)}</td></tr></tfoot>
          </table>
        </div>
      </div>
      <div>
        <Link className="btn segundo" to={`/administrador/pago-presencial?inmueble=${inmueble}`}>Registrar pago de {inmueble}</Link>
      </div>
    </div>
  )
}

/** Documento de paz y salvo (RN-34). */
function DocumentoPazYSalvo({ doc }) {
  return (
    <article className="documento-impreso" aria-label="Paz y salvo">
      <div className="encabezado-doc">
        <div>
          <div className="fuerte">Copropiedad {COPROPIEDAD}</div>
          <div className="guia">Administración</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="identificador fuerte">{doc.numero}</div>
          <div className="guia">Expedido el {fechaConAnio(doc.fechaExpedicion)}</div>
        </div>
      </div>
      <h3 style={{ marginBottom: 'var(--e3)' }}>Paz y salvo</h3>
      <p>
        La administración de la copropiedad {COPROPIEDAD} certifica que el inmueble <span className="identificador">{doc.inmueble}</span>,{' '}
        {doc.unidad}{doc.propietario ? `, de propiedad de ${doc.propietario},` : ''} está a paz y salvo por cuotas ordinarias y extraordinarias,
        multas, intereses de mora y alquiler de zonas comunes, con fecha de corte del {fechaConAnio(doc.fechaCorte)}.
      </p>
      <div className="total"><span className="fuerte">Saldo vencido a la fecha de corte</span><span className="valor">$ 0</span></div>
      <p className="guia" style={{ marginTop: 'var(--e4)' }}>
        Expide {doc.expide}, administradora. No cubre obligaciones que venzan después de la fecha de corte.
      </p>
    </article>
  )
}
