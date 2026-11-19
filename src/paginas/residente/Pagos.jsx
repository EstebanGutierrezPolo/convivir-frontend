import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'

import { useSesion } from '../../aplicacion/sesion.jsx'
import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga } from '../../componentes/Basicos.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { HOY, INMUEBLE, diasEntre, fechaLarga, pagosApi } from '../../datos/residente.js'
import { hora, pesos } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-12 Consultar obligación y pagar
// Inmueble.calcularSaldoPendienteDelInmueble() (RF-070 a RF-073)
// Obligacion.determinarSiHaySolidaridadDelArrendatario(): el arrendatario solo paga CUOTA_ORDINARIA (RN-22, 422)
// Pago(valor, PASARELA, EN_LINEA), asignarPasarela(), procesarPagoDeLaObligacion() → PENDIENTE (RF-074, RF-075, RF-123)
// Pago.validarResultadoDeLaPasarela() → CONFIRMADO: Obligacion.registrarAbonoALaObligacion(), Pago.generarComprobanteDePago()
//   (RF-076, RF-077, RN-23, RN-42)
// Decisión abierta 9: la pasarela es simulada detrás de PasarelaPago / AdaptadorPasarelaExterna. Datos de ejemplo.

// Renglón de obligación con casilla, valor y abono editable, y la impresión del comprobante. Solo tokens.
const ESTILOS = `
.obligacion { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--e2) var(--e4); padding: var(--e4) var(--e5); border-bottom: 1px solid var(--borde-f); }
.obligacion:last-child { border-bottom: 0; }
.obligacion .opcion b { display: block; font-size: var(--t-base); font-weight: 600; }
.obligacion .monto { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.obligacion .monto small { display: block; font-weight: 400; color: var(--acero); font-size: var(--t-xs); }
.obligacion .debajo { grid-column: 1 / -1; padding-left: calc(18px + var(--e3)); }
.obligacion.bloqueada .opcion { cursor: not-allowed; }
.obligacion.bloqueada .opcion input { opacity: .45; }
.obligacion .campo { max-width: 16rem; }
@media (max-width: 40rem) {
  .obligacion { padding-left: var(--e4); padding-right: var(--e4); }
  .obligacion .debajo { padding-left: 0; }
  .obligacion .campo { max-width: none; }
}
@media print {
  body:has(dialog[open] .documento-impreso) #root > :not(main),
  body:has(dialog[open] .documento-impreso) main.pagina > :not(dialog:has(.documento-impreso)) { display: none !important; }
  body:has(dialog[open] .documento-impreso) main.pagina { padding: 0; max-width: none; }
  dialog.dialogo[open]:has(.documento-impreso) { position: static; display: block; width: auto; max-height: none; border: 0; overflow: visible; }
  dialog.dialogo:has(.documento-impreso) .cabeza, dialog.dialogo:has(.documento-impreso) .pie { display: none; }
  dialog.dialogo:has(.documento-impreso) .cuerpo { padding: 0; overflow: visible; }
}
`

const PASOS = [
  { paso: 'elegir', texto: 'Elige qué pagar' },
  { paso: 'pasarela', texto: 'Paga en la pasarela' },
  { paso: 'resultado', texto: 'Resultado' },
]

/** 412000 -> "412 000", para el campo del valor. */
const sinSigno = (n) => pesos(n).replace(/^\$\s/, '')
const leerValor = (texto) => parseInt(String(texto).replace(/\D/g, ''), 10) || 0

export default function Pagos() {
  const { sesion } = useSesion()
  const inmueble = sesion.inmuebles?.[0]?.nombre
  const obligaciones = useConsulta(() => pagosApi.obligaciones())
  const historial = useConsulta(() => pagosApi.historial())
  const { hash } = useLocation()
  const [etapa, setEtapa] = useState('elegir')
  const [comprobante, setComprobante] = useState(null)
  const refPasos = useRef(null)
  const refHistorial = useRef(null)
  const primeraVez = useRef(true)

  // Cada cambio de paso lleva a la lista de pasos, como la vista.
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return }
    refPasos.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [etapa])

  // Desde Inicio, "Ver historial de pagos" llega con #historial.
  const hayHistorial = !!historial.datos
  useEffect(() => {
    if (hash === '#historial' && hayHistorial) refHistorial.current?.scrollIntoView({ block: 'start' })
  }, [hash, hayHistorial])

  const paso = etapa === 'confirmado' || etapa === 'rechazado' ? 'resultado' : etapa
  const indice = PASOS.findIndex((p) => p.paso === paso)

  const alResolver = () => {
    obligaciones.recargar()
    historial.recargar()
  }

  return (
    <main className="pagina media">
      <style href="convivir-residente-pagos" precedence="default">{ESTILOS}</style>
      <AvisoDatosDeEjemplo casoDeUso="CU-12" />
      <Encabezado titulo="Pagos" guia={`${inmueble} · periodo de noviembre de 2026`} />

      <ol className="pasos" ref={refPasos} aria-label="Pasos del pago">
        {PASOS.map((p, i) => (
          <li key={p.paso} className={i < indice ? 'hecho' : undefined} aria-current={i === indice ? 'step' : undefined}>{p.texto}</li>
        ))}
      </ol>

      {!obligaciones.datos && obligaciones.cargando && <div className="superficie"><Cargando texto="Cargando tus obligaciones…" /></div>}
      {obligaciones.error && <div className="superficie"><ErrorDeCarga error={obligaciones.error} alReintentar={obligaciones.recargar} /></div>}
      {obligaciones.datos && (
        <Pago obligaciones={obligaciones.datos} inmueble={inmueble} etapa={etapa} irA={setEtapa}
          alResolver={alResolver} alVerComprobante={setComprobante} />
      )}

      {/* Historial de pagos del inmueble */}
      <section className="seccion" id="historial" ref={refHistorial}>
        <div className="encabezado"><h2>Historial de pagos</h2></div>
        <div className="superficie">
          {!historial.datos && historial.cargando && <Cargando texto="Cargando tus pagos…" />}
          {historial.error && <ErrorDeCarga error={historial.error} alReintentar={historial.recargar} />}
          <ul className="lista">
            {(historial.datos || []).map((p) => {
              const confirmado = p.estado === 'CONFIRMADO'
              return (
                <li key={p.id}>
                  <div className="principal">
                    <b>{p.concepto}</b>
                    <span>{fechaLarga(p.fecha, { conAnio: true })}, {hora(p.fecha)} · pasarela en línea</span>
                    <span className="identificador">{confirmado ? `${p.comprobante} · ` : ''}{p.referenciaPasarela}</span>
                  </div>
                  <div className="fila" style={{ gap: 'var(--e3)' }}>
                    <span className="num fuerte">{pesos(p.valor)}</span>
                    {confirmado ? <Pildora tono="ok">Confirmado</Pildora> : <Pildora tono="no">Rechazado</Pildora>}
                    {confirmado && (
                      <button className="btn texto chico" type="button" onClick={() => setComprobante(p)}>Comprobante</button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <Comprobante pago={comprobante} alCerrar={() => setComprobante(null)} inmueble={inmueble} sesion={sesion} />
    </main>
  )
}

function Pago({ obligaciones, inmueble, etapa, irA, alResolver, alVerComprobante }) {
  const cuota = obligaciones.find((o) => o.concepto === 'CUOTA_ORDINARIA')
  const multa = obligaciones.find((o) => o.concepto === 'MULTA')
  const [marcada, setMarcada] = useState(true)
  const [valorTexto, setValorTexto] = useState(null)
  const [errorValor, setErrorValor] = useState(null)
  const [errorMulta, setErrorMulta] = useState(false)
  const [enCurso, setEnCurso] = useState(null)
  const [resultado, setResultado] = useState(null)
  const refValor = useRef(null)

  const pagada = cuota.saldoPendiente === 0
  const elegida = !pagada && marcada
  const texto = valorTexto ?? sinSigno(cuota.saldoPendiente)
  const valor = elegida ? leerValor(texto) : 0
  const cuotaCorta = cuota.descripcion.replace('Cuota de administración', 'cuota')
  const vence = fechaLarga(cuota.fechaVencimiento)
  const saldoInmueble = cuota.saldoPendiente + (multa ? multa.saldoPendiente : 0)

  let pildora = <Pildora tono="ok">Al día</Pildora>
  if (pagada) pildora = <Pildora tono="ok">Pagada</Pildora>
  else if (cuota.estado === 'PAGADA_PARCIALMENTE') pildora = <Pildora tono="al">Pagada en parte</Pildora>

  let resumenConcepto = 'Elige la cuota para pagarla'
  if (pagada) resumenConcepto = 'Nada pendiente a tu cargo'
  else if (elegida) resumenConcepto = cuota.descripcion

  // ---------- Iniciar pago: POST /api/pagos → 202 PENDIENTE ----------
  const pagar = async () => {
    const v = leerValor(texto)
    setErrorValor(null)
    if (v > cuota.saldoPendiente) {
      setErrorValor(`El valor no puede pasar del saldo de la cuota, ${pesos(cuota.saldoPendiente)}. Si quieres pagarla completa, escribe ${sinSigno(cuota.saldoPendiente)}.`)
      refValor.current?.focus()
      return
    }
    if (v <= 0) {
      setErrorValor(`Escribe cuánto quieres pagar, por ejemplo ${sinSigno(cuota.saldoPendiente)} para la cuota completa.`)
      refValor.current?.focus()
      return
    }
    const pago = await pagosApi.iniciar(cuota.id, v)
    setEnCurso({ ...pago, abono: v < cuota.saldoPendiente })
    irA('pasarela')
  }

  // ---------- Resultado: GET /api/pagos/{id} → CONFIRMADO o RECHAZADO (RN-23) ----------
  const resolver = async (estado) => {
    if (!enCurso) return
    const pago = await pagosApi.resolver(enCurso.referenciaPasarela, estado)
    setResultado(pago)
    setEnCurso(null)
    alResolver()
    irA(estado === 'CONFIRMADO' ? 'confirmado' : 'rechazado')
  }

  const volver = () => {
    setEnCurso(null)
    setResultado(null)
    setErrorMulta(false)
    setValorTexto(null)
    setMarcada(true)
    irA('elegir')
  }

  return (
    <>
      {/* Paso 1: obligaciones y saldo */}
      {etapa === 'elegir' && (
        <section className="lado" aria-label="Elige qué pagar">
          <div className="superficie">
            <div className="cabeza">
              <h2>Obligaciones del apartamento</h2>
              <span className="guia">Saldo pendiente del inmueble <b className="num">{pesos(saldoInmueble)}</b></span>
            </div>
            <div>
              {/* CUOTA_ORDINARIA: la puede pagar o abonar la arrendataria */}
              <div className="obligacion">
                <label className="opcion">
                  <input type="checkbox" checked={elegida} disabled={pagada}
                    onChange={(e) => setMarcada(e.target.checked)} />
                  <span>
                    <b>{cuota.descripcion}</b>
                    <small>{pagada ? `Pagada el ${fechaLarga(cuota.fechaPago)}` : `Vence el ${vence}, en ${diasEntre(HOY, cuota.fechaVencimiento)} días`}</small>
                  </span>
                </label>
                <div className="monto">
                  <span>{pesos(cuota.saldoPendiente)}</span>
                  <small>
                    {pagada ? 'pagada' : cuota.saldoPendiente < cuota.valor ? `pendiente de ${pesos(cuota.valor)}` : `de ${pesos(cuota.valor)}`}
                  </small>
                </div>
                <div className="debajo pila chica">
                  <div>{pildora}</div>
                  {elegida && (
                    <label className="campo">
                      <span>Valor a pagar</span>
                      <span className="con-prefijo">
                        <span>$</span>
                        <input ref={refValor} className="num" inputMode="numeric" autoComplete="off" value={texto}
                          aria-invalid={errorValor ? 'true' : undefined} aria-describedby="ayuda-valor"
                          onChange={(e) => { setValorTexto(e.target.value); setErrorValor(null) }}
                          onBlur={() => { const v = leerValor(texto); if (v) setValorTexto(sinSigno(v)) }} />
                      </span>
                      <span className="ayuda" id="ayuda-valor">Puedes abonar una parte. Lo que falte sigue pendiente con el mismo vencimiento.</span>
                      {errorValor && <span className="error">{errorValor}</span>}
                    </label>
                  )}
                </div>
              </div>

              {/* MULTA: a cargo exclusivo del propietario (RN-22) */}
              {multa && (
                <div className="obligacion bloqueada">
                  <label className="opcion">
                    <input type="checkbox" checked={false} readOnly aria-disabled="true" aria-describedby="porque-multa"
                      onClick={(e) => { e.preventDefault(); setErrorMulta(true) }} />
                    <span>
                      <b>{multa.descripcion}</b>
                      <small>Impuesta el {fechaLarga(multa.fechaImposicion)} · vence el {fechaLarga(multa.fechaVencimiento)}</small>
                    </span>
                  </label>
                  <div className="monto">{pesos(multa.saldoPendiente)}<small>a cargo del propietario</small></div>
                  <div className="debajo pila chica">
                    <div><span className="etiqueta">La paga {multa.aCargoDe}</span></div>
                    <p className="guia" id="porque-multa">
                      Como arrendataria solo puedes pagar la cuota de administración. Las multas, las cuotas extraordinarias y los
                      intereses de mora los paga el propietario.
                    </p>
                    {/* El arrendatario no puede seleccionar la multa: es la respuesta 422 de RN-22, a la vista. */}
                    {errorMulta && (
                      <div className="aviso no" role="alert">
                        <p><b>No puedes pagar esta multa.</b></p>
                        <p>
                          Quien vive en arriendo solo paga expensas comunes ordinarias, es decir, la cuota de administración. Esta multa
                          le corresponde a {multa.aCargoDe}, propietario de {inmueble}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="superficie" aria-labelledby="titulo-resumen">
            <div className="cabeza"><h2 id="titulo-resumen">Resumen</h2></div>
            <div className="cuerpo pila">
              <dl className="datos fila-unica">
                <div><dt>Pagas</dt><dd>{resumenConcepto}</dd></div>
                <div><dt>Medio</dt><dd>Pasarela en línea: PSE o tarjeta</dd></div>
                <div><dt>Queda pendiente</dt><dd className="num">{pesos(elegida ? Math.max(cuota.saldoPendiente - valor, 0) : cuota.saldoPendiente)}</dd></div>
              </dl>
              <button className="btn ancho" type="button" onClick={pagar} disabled={pagada || !elegida || valor <= 0}>
                {pagada ? 'Estás al día' : `Pagar ${pesos(valor)}`}
              </button>
              <p className="guia">Te llevamos a la pasarela. El pago queda en firme cuando tu banco lo confirma.</p>
            </div>
          </aside>
        </section>
      )}

      {/* Paso 2: pago PENDIENTE en la pasarela */}
      {etapa === 'pasarela' && enCurso && (
        <section className="pila" style={{ gap: 'var(--e5)' }} aria-live="polite">
          <div className="veredicto v-al">
            <div className="palabra">Esperando a tu banco</div>
            <div className="quien">{pesos(enCurso.valor)} · {enCurso.abono ? 'abono a la ' : ''}{cuotaCorta}</div>
            <div className="donde">Referencia {enCurso.referenciaPasarela}</div>
            <div className="porque">Termina el pago en la ventana de la pasarela. No pagues otra vez mientras este pago esté pendiente.</div>
          </div>
          <div className="superficie">
            <div className="cabeza">
              <h2>Pasarela de pagos</h2>
              <span className="etiqueta">Simulada para pruebas</span>
            </div>
            <div className="cuerpo pila">
              <p className="guia">Aquí iría la página del banco. Elige qué responde la pasarela para ver cada resultado.</p>
              <div className="fila">
                <button className="btn exito" type="button" onClick={() => resolver('CONFIRMADO')}>Aprobar pago</button>
                <button className="btn riesgo" type="button" onClick={() => resolver('RECHAZADO')}>Rechazar pago</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Paso 3: resultado de la transacción */}
      {etapa === 'confirmado' && resultado && (
        <section className="pila" style={{ gap: 'var(--e4)' }} aria-live="polite">
          <div className="veredicto v-ok">
            <div className="palabra">Pago confirmado</div>
            <div className="quien">{pesos(resultado.valor)} · {resultado.concepto.toLowerCase()}</div>
            <div className="donde">Comprobante {resultado.comprobante} · {resultado.referenciaPasarela}</div>
            <div className="porque">
              {resultado.saldoDespues === 0
                ? `La ${cuotaCorta} quedó pagada. No tienes nada más pendiente a tu cargo.`
                : `Abonaste ${pesos(resultado.valor)}. De la ${cuotaCorta} quedan ${pesos(resultado.saldoDespues)}, que vencen el ${vence}.`}
            </div>
          </div>
          <div className="fila">
            <button className="btn" type="button" onClick={() => alVerComprobante(resultado)}>Ver comprobante</button>
            <button className="btn segundo" type="button" onClick={volver}>Volver a mis pagos</button>
          </div>
        </section>
      )}

      {etapa === 'rechazado' && resultado && (
        <section className="pila" style={{ gap: 'var(--e4)' }} aria-live="polite">
          <div className="veredicto v-no">
            <div className="palabra">Pago rechazado</div>
            <div className="quien">{pesos(resultado.valor)} · {resultado.concepto.toLowerCase()}</div>
            <div className="donde">Referencia {resultado.referenciaPasarela}</div>
            <div className="porque">
              Tu banco no aprobó la transacción y no se descontó nada. La cuota sigue pendiente por {pesos(resultado.saldoDespues)}.
              Revisa el saldo o el cupo con tu banco e inténtalo de nuevo, o paga con otra cuenta o tarjeta.
            </div>
          </div>
          <div className="fila">
            <button className="btn" type="button" onClick={volver}>Intentar de nuevo</button>
            <button className="btn segundo" type="button" onClick={volver}>Volver a mis pagos</button>
          </div>
        </section>
      )}
    </>
  )
}

// ---------- Comprobante: Pago.generarComprobanteDePago() (RF-077) ----------

function Comprobante({ pago: p, alCerrar, inmueble, sesion }) {
  const vinculo = sesion.inmuebles?.[0]?.vinculo?.split(' ')[0].toLowerCase()
  return (
    <Dialogo abierto={!!p} alCerrar={alCerrar} ancho titulo="Comprobante de pago"
      guia="Para descargarlo, elige Guardar como PDF en la ventana de impresión."
      pie={<>
        <button className="btn segundo" type="button" onClick={alCerrar}>Cerrar</button>
        <button className="btn" type="button" onClick={() => window.print()}>Descargar comprobante</button>
      </>}>
      {p && (
        <article className="documento-impreso">
          <div className="encabezado-doc">
            <div>
              <div className="fuerte">Copropiedad Villa Campestre</div>
              <div className="guia">NIT <span className="identificador">900 456 789-1</span></div>
              <div className="guia">Comprobante de pago en línea</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="identificador fuerte">{p.comprobante}</div>
              <div className="guia">{fechaLarga(p.fecha, { conAnio: true })}, {hora(p.fecha)}</div>
            </div>
          </div>
          <dl className="datos">
            <div><dt>Inmueble</dt><dd>{inmueble} <span className="identificador guia">{INMUEBLE.identificacion}</span></dd></div>
            <div><dt>Pagó</dt><dd>{sesion.persona}{vinculo ? `, ${vinculo}` : ''}</dd></div>
            <div><dt>Medio y canal</dt><dd>Pasarela, en línea</dd></div>
            <div><dt>Referencia de la pasarela</dt><dd className="identificador">{p.referenciaPasarela}</dd></div>
            <div><dt>Concepto</dt><dd>{p.concepto}</dd></div>
            <div><dt>Saldo de la obligación después del pago</dt><dd className="num">{pesos(p.saldoDespues)}</dd></div>
          </dl>
          <div className="total">
            <span className="fuerte">Total pagado</span>
            <span className="valor">{pesos(p.valor)}</span>
          </div>
          <p className="guia" style={{ marginTop: 'var(--e4)' }}>
            Este comprobante acredita el pago de la obligación indicada. No reemplaza el paz y salvo, que expide la administración.
          </p>
        </article>
      )}
    </Dialogo>
  )
}
