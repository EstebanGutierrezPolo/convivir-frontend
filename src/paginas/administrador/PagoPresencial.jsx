import { useEffect, useId, useState } from 'react'
import { useSearchParams } from 'react-router'

import { AvisoDatosDeEjemplo, Cargando, ErrorDeCarga, Vacio } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { useSesion } from '../../aplicacion/sesion.jsx'
import { HOY, MEDIOS, diasEntre, nombreObligacion, carteraDeEjemplo } from '../../datos/cartera.js'
import { cifra, fecha, hora, pesos } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'
import { CampoPesos, ListaInmuebles, fechaConAnio, leerPesos } from './Obligaciones.jsx'

// CU-13 Registrar pago presencial. Datos de ejemplo hasta que exista la API.
// new Pago(valor, medioPago, PRESENCIAL) · Pago.procesarPagoDeLaObligacion(), generarComprobanteDePago()
// Obligacion.registrarAbonoALaObligacion(valorAbono) · 422 si el valor supera el saldo pendiente (RN-24, RN-27)
// Anular: Obligacion.revertirAbonoDeLaObligacion(valorAbono), que llama Pago.anularPagoPorMotivo(motivo)

const MEDIOS_PRESENCIALES = ['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE']
const PASOS = ['Inmueble', 'Obligación y pago', 'Recibo de caja']
const EJEMPLOS = ['A-1104', 'A-0902', 'C-1201', 'B-0302']

// Opción de obligación: concepto a la izquierda, saldo a la derecha
const ESTILOS = `
  .obligaciones-opciones { grid-template-columns: minmax(0, 1fr); }
  .opcion-obligacion { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--e3); }
  .opcion-obligacion .num { white-space: nowrap; font-weight: 600; }
  .opcion-obligacion .pildora { margin-top: var(--e1); }
`

/** Cuándo se hizo un pago: "hoy, 10:42 a. m.", "ayer, 4:30 p. m." o "12 de noviembre, 9:10 a. m.". */
export function cuando(dia, horaDelDia, { coma = true, horaSiempre = true } = {}) {
  const h = horaDelDia ? hora(`${dia}T${horaDelDia}:00`) : null
  const separador = coma ? ', ' : ' '
  const atras = diasEntre(dia, HOY)
  if (atras === 0) return h ? `hoy${separador}${h}` : 'hoy'
  if (atras === 1) return h ? `ayer${separador}${h}` : 'ayer'
  return h && horaSiempre ? `${fecha(dia)}, ${h}` : fecha(dia)
}

/** "13:05" del reloj del equipo, para la hora del recibo. */
function horaActual() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function PagoPresencial() {
  const confirmar = useConfirmar()
  const [parametros] = useSearchParams()
  const recientes = useConsulta(() => carteraDeEjemplo.pagosPresenciales())
  const [paso, setPaso] = useState(1)
  const [texto, setTexto] = useState('')
  const [errorInmueble, setErrorInmueble] = useState(null)
  const [alDia, setAlDia] = useState(null)
  const [cuenta, setCuenta] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [anulando, setAnulando] = useState(null)
  const idLista = useId()

  const irAPaso = (n) => { setPaso(n); window.scrollTo(0, 0) }

  // GET /api/inmuebles/id/obligaciones
  const buscar = async (valor = texto) => {
    setAlDia(null)
    if (!valor.trim()) { setErrorInmueble('Escribe el inmueble que paga, por ejemplo A-1104.'); return }
    try {
      const datos = await carteraDeEjemplo.obligacionesDelInmueble(valor)
      setTexto(datos.inmueble.identificacion)
      setErrorInmueble(null)
      if (!datos.obligaciones.length) { setAlDia(datos.inmueble); return }
      setCuenta(datos)
      irAPaso(2)
    } catch (e) {
      setErrorInmueble(e.estado === 404
        ? `No hay un inmueble activo con la identificación ${valor.trim()}. Escríbela como en la escritura, por ejemplo A-1104.`
        : e.message)
    }
  }

  // Desde Cartera se llega con ?inmueble=A-1104
  useEffect(() => {
    const pedido = parametros.get('inmueble')
    if (pedido) { setTexto(pedido); buscar(pedido) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametros])

  const volver = () => {
    setCuenta(null)
    setResultado(null)
    setTexto('')
    setAlDia(null)
    irAPaso(1)
  }

  const registrado = (r) => {
    setResultado(r)
    recientes.recargar()
    confirmar(`Pago registrado: ${r.pago.comprobante} por ${pesos(r.pago.valor)}.`)
    irAPaso(3)
  }

  const anulado = async (pago) => {
    recientes.recargar()
    // Si se está registrando un pago del mismo inmueble, la obligación vuelve a mostrar su saldo
    if (paso === 2 && cuenta?.inmueble.identificacion === pago.inmueble) {
      setCuenta(await carteraDeEjemplo.obligacionesDelInmueble(pago.inmueble))
    }
  }

  return (
    <main className="pagina">
      <style href="convivir-pago-presencial" precedence="default">{ESTILOS}</style>
      <div className="encabezado no-imprimir">
        <div>
          <h1>Registrar pago presencial</h1>
          <p className="guia">Dinero que se recibe en la oficina de administración: efectivo, transferencia o cheque</p>
        </div>
      </div>

      <div className="no-imprimir"><AvisoDatosDeEjemplo casoDeUso="CU-13" /></div>

      <div className="lado">
        <div>
          <ol className="pasos no-imprimir">
            {PASOS.map((nombre, i) => (
              <li key={nombre} className={i + 1 < paso ? 'hecho' : undefined} aria-current={i + 1 === paso ? 'step' : undefined}>{nombre}</li>
            ))}
          </ol>

          {paso === 1 && (
            <section className="superficie relleno pila" style={{ gap: 'var(--e4)' }} aria-label="Buscar el inmueble">
              <form className="formulario" noValidate onSubmit={(e) => { e.preventDefault(); buscar() }}>
                <div style={{ maxWidth: '24rem' }}>
                  <Campo rotulo="¿De qué inmueble es el pago?" ayuda="Torre, guion, piso y apartamento, como en la escritura."
                    error={errorInmueble}>
                    <input className="identificador" list={idLista} value={texto} placeholder="A-1104" autoComplete="off"
                      onChange={(e) => { setTexto(e.target.value); setErrorInmueble(null); setAlDia(null) }} />
                  </Campo>
                </div>
                <div className="fila">
                  <button className="btn" type="submit">Buscar obligaciones</button>
                </div>
              </form>
              <ListaInmuebles id={idLista} />
              <p className="guia">
                Ejemplos de esta vista:{' '}
                {EJEMPLOS.map((id) => (
                  <button key={id} className="btn texto chico identificador" type="button" onClick={() => { setTexto(id); buscar(id) }}>{id}</button>
                ))}
              </p>
              {alDia && (
                <div className="aviso ok" aria-live="polite">
                  <p><b><span className="identificador">{alDia.identificacion}</span> está al día.</b> No tiene obligaciones pendientes, así que no hay nada que registrar.</p>
                  <p>{alDia.nota}</p>
                </div>
              )}
            </section>
          )}

          {paso === 2 && cuenta && (
            <DatosDelPago key={cuenta.inmueble.identificacion + cuenta.obligaciones.map((o) => o.saldoPendiente).join()}
              cuenta={cuenta} alRegistrar={registrado} alVolver={volver} />
          )}

          {paso === 3 && resultado && <Recibo resultado={resultado} alVolver={volver} />}
        </div>

        <aside className="superficie no-imprimir" aria-labelledby="titulo-recientes">
          <div className="cabeza">
            <h2 id="titulo-recientes">Pagos presenciales recientes</h2>
          </div>
          {recientes.cargando && !recientes.datos && <Cargando texto="Cargando pagos…" />}
          {recientes.error && <ErrorDeCarga error={recientes.error} alReintentar={recientes.recargar} />}
          {recientes.datos && recientes.datos.pagos.length === 0 && (
            <Vacio titulo="Todavía no hay pagos presenciales">Cuando registres el primero, aparecerá aquí con su recibo.</Vacio>
          )}
          {recientes.datos && recientes.datos.pagos.length > 0 && (
            <ul className="lista">
              {recientes.datos.pagos.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <div className="principal">
                    <b><span className="identificador">{p.comprobante}</span> · <span className="identificador">{p.inmueble}</span></b>
                    <span>
                      {p.pagador} · {MEDIOS[p.medioPago].texto.toLowerCase()}
                      {p.referencia && <> <span className="identificador">{p.referencia}</span></>} · {cuando(p.fecha, p.hora)}
                    </span>
                    <span>{p.abono}</span>
                    {p.estado === 'ANULADO' && <span>Motivo: {p.motivoAnulacion}</span>}
                  </div>
                  <div className="pila chica" style={{ justifyItems: 'end' }}>
                    <span className="num fuerte"
                      style={p.estado === 'ANULADO' ? { textDecoration: 'line-through', color: 'var(--acero)' } : undefined}>
                      {pesos(p.valor)}
                    </span>
                    {p.estado === 'ANULADO'
                      ? <Pildora tono="ne">Anulado</Pildora>
                      : <button className="btn riesgo chico" type="button" onClick={() => setAnulando(p)}>Anular pago</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {recientes.datos && <div className="pie"><span>{recientes.datos.enElMes} pagos presenciales en noviembre</span></div>}
        </aside>
      </div>

      <AnularPago pago={anulando} alCerrar={() => setAnulando(null)} alAnular={anulado} />
    </main>
  )
}

// ---------- Paso 2: elegir la obligación y registrar el pago ----------

function DatosDelPago({ cuenta, alRegistrar, alVolver }) {
  const { sesion } = useSesion()
  const { inmueble, obligaciones } = cuenta
  const [obligacionId, setObligacionId] = useState(obligaciones[0].id)
  const elegida = obligaciones.find((o) => o.id === obligacionId)
  const [datos, setDatos] = useState({
    valor: cifra(obligaciones[0].saldoPendiente), fecha: HOY, medio: 'EFECTIVO', referencia: '', pagador: inmueble.propietario, documento: '',
  })
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)

  const poner = (campo, valor) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: null }))
  }
  const elegir = (o) => {
    setObligacionId(o.id)
    poner('valor', cifra(o.saldoPendiente))
    setErrores((e) => ({ ...e, valor: null }))
  }

  // Lo que debe el inmueble: vencido, días de mora de la más antigua y total pendiente
  const vencidas = obligaciones.filter((o) => o.fechaVencimiento < HOY)
  const vencido = vencidas.reduce((s, o) => s + o.saldoPendiente, 0)
  const total = obligaciones.reduce((s, o) => s + o.saldoPendiente, 0)
  const quien = inmueble.propietario
    ? `${inmueble.propietario}, ${inmueble.vinculo}${inmueble.ocupa ? `. Ocupa ${inmueble.ocupa}` : ''}`
    : 'Propietario registrado'

  // POST /api/pagos/presenciales
  const registrar = async () => {
    const valor = leerPesos(datos.valor)
    const nuevos = {}
    if (!datos.valor.trim()) nuevos.valor = 'Escribe el valor que recibiste, por ejemplo 610 000.'
    else if (!(valor > 0)) nuevos.valor = 'Escribe el valor solo con números y mayor que cero, por ejemplo 610 000.'
    if (!datos.fecha) nuevos.fecha = 'Elige la fecha en que se recibió el dinero.'
    else if (datos.fecha > HOY) nuevos.fecha = 'La fecha del pago no puede ser posterior a hoy, 14 de noviembre.'
    if (datos.medio !== 'EFECTIVO' && !datos.referencia.trim()) {
      nuevos.referencia = 'Escribe la referencia. Sin ella no se puede cruzar el pago con el extracto del banco.'
    }
    if (!datos.pagador.trim()) nuevos.pagador = 'Escribe el nombre de quien entrega el dinero. Queda en el recibo.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length) return

    setEnviando(true)
    try {
      const r = await carteraDeEjemplo.registrarPagoPresencial({
        obligacionId, valor, fecha: datos.fecha, medioPago: datos.medio, hora: horaActual(),
        referencia: datos.medio === 'EFECTIVO' ? null : datos.referencia.trim(),
        pagador: datos.pagador.trim(), documentoPagador: datos.documento.replace(/\D/g, ''),
      })
      alRegistrar({ ...r, inmueble })
    } catch (e) {
      // alt del diagrama de secuencia: el valor supera el saldo pendiente → 422
      setErrores({ valor: e.message })
      setEnviando(false)
    }
  }

  return (
    <section className="pila" style={{ gap: 'var(--e5)' }} aria-label="Obligación y pago">
      <div className={`ficha ${vencido ? 'no' : 'al'}`}>
        <div className="fila entre" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="titular">{inmueble.unidad} · <span className="identificador">{inmueble.identificacion}</span></div>
            <div className="meta">
              {quien} ·{' '}
              {vencido
                ? <><span className="dato">{pesos(vencido)}</span> vencidos · {diasEntre(vencidas[0].fechaVencimiento, HOY)} días en mora · {pesos(total)} pendientes en total</>
                : `sin saldo vencido · ${pesos(total)} por vencer`}
            </div>
          </div>
          <button className="btn texto chico" type="button" onClick={alVolver}>Cambiar inmueble</button>
        </div>
      </div>

      <form className="pila" style={{ gap: 'var(--e5)' }} noValidate onSubmit={(e) => { e.preventDefault(); registrar() }}>
        <div className="superficie">
          <div className="cabeza">
            <h2 id="titulo-opciones">¿Qué obligación paga?</h2>
            <span className="guia">Cada pago abona a una sola obligación</span>
          </div>
          <div className="cuerpo">
            <div className="elecciones obligaciones-opciones" role="radiogroup" aria-labelledby="titulo-opciones">
              {obligaciones.map((o) => {
                const parcial = o.saldoPendiente < o.valor
                const mora = o.diasDeMora
                return (
                  <label key={o.id} className="eleccion">
                    <input type="radio" name="obligacion" checked={o.id === obligacionId} onChange={() => elegir(o)} />
                    <span>
                      <span className="opcion-obligacion">
                        <span>
                          <b>{nombreObligacion(o)}</b>
                          <small>
                            {mora ? `Venció el ${fecha(o.fechaVencimiento)}` : `Vence el ${fecha(o.fechaVencimiento)}`}
                            {parcial && ` · valor ${pesos(o.valor)}`}
                          </small>
                          {parcial
                            ? <Pildora tono="al">Pagada parcialmente{mora ? ` · ${mora} días en mora` : ''}</Pildora>
                            : mora ? <Pildora tono="no">{mora} días en mora</Pildora> : <Pildora tono="al">Vence el {fecha(o.fechaVencimiento)}</Pildora>}
                        </span>
                        <span className="num">{pesos(o.saldoPendiente)}</span>
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        <div className="superficie">
          <div className="cabeza"><h2>Datos del pago</h2></div>
          <div className="cuerpo">
            <div className="formulario dos">
              <CampoPesos rotulo="Valor recibido" value={datos.valor} error={errores.valor}
                onChange={(e) => poner('valor', e.target.value)}
                onBlur={() => { const v = leerPesos(datos.valor); if (v > 0) poner('valor', cifra(v)) }}
                ayuda={`Saldo pendiente de esta obligación: ${pesos(elegida.saldoPendiente)}. Puedes registrar un abono menor.`} />
              <Campo rotulo="Fecha del pago" error={errores.fecha}>
                <input type="date" value={datos.fecha} max={HOY} onChange={(e) => poner('fecha', e.target.value)} />
              </Campo>
              <div className="campo completo">
                <span className="rotulo" id="rotulo-medio">Medio de pago</span>
                <div className="elecciones" role="radiogroup" aria-labelledby="rotulo-medio">
                  {MEDIOS_PRESENCIALES.map((m) => (
                    <label key={m} className="eleccion">
                      <input type="radio" name="medio" value={m} checked={datos.medio === m} onChange={() => poner('medio', m)} />
                      <span><b>{MEDIOS[m].texto}</b><small>{MEDIOS[m].detalle}</small></span>
                    </label>
                  ))}
                </div>
              </div>
              {datos.medio !== 'EFECTIVO' && (
                <Campo className="completo" error={errores.referencia}
                  rotulo={datos.medio === 'TRANSFERENCIA' ? 'Número de la transferencia' : 'Número del cheque y banco'}
                  ayuda={datos.medio === 'TRANSFERENCIA'
                    ? 'El número de aprobación que aparece en el comprobante del banco.'
                    : 'Revisa que el cheque esté a nombre de la copropiedad y con la fecha de hoy o anterior.'}>
                  <input className="identificador" value={datos.referencia} autoComplete="off"
                    placeholder={datos.medio === 'TRANSFERENCIA' ? '0048213377' : '7781023 · banco que lo emite'}
                    onChange={(e) => poner('referencia', e.target.value)} />
                </Campo>
              )}
              <Campo rotulo="Quién paga" ayuda="Puede ser el propietario, el arrendatario u otra persona." error={errores.pagador}>
                <input value={datos.pagador} autoComplete="off" onChange={(e) => poner('pagador', e.target.value)} />
              </Campo>
              <Campo rotulo="Cédula de quien paga" opcional>
                <input className="identificador" inputMode="numeric" autoComplete="off" placeholder="72145880"
                  value={datos.documento} onChange={(e) => poner('documento', e.target.value)} />
              </Campo>
            </div>
          </div>
          <div className="pie">
            <span>Se registra a nombre de {sesion?.persona || 'Paula Ortega'}</span>
            <div className="fila" style={{ gap: 'var(--e2)' }}>
              <button className="btn segundo" type="button" onClick={alVolver}>Cambiar inmueble</button>
              <button className="btn" type="submit" disabled={enviando}>Registrar pago</button>
            </div>
          </div>
        </div>
      </form>
    </section>
  )
}

// ---------- Paso 3: recibo de caja imprimible ----------

function Recibo({ resultado, alVolver }) {
  const { sesion } = useSesion()
  const { pago, obligacion, saldoAnterior, pendienteDelInmueble, inmueble } = resultado
  const documento = pago.documentoPagador ? pago.documentoPagador.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : null

  return (
    <section className="pila" style={{ gap: 'var(--e5)' }} aria-label="Recibo de caja">
      <div className="aviso ok no-imprimir" aria-live="polite">
        <p>
          <b>Pago registrado: {pago.comprobante} por {pesos(pago.valor)}.</b>{' '}
          {obligacion.saldoPendiente === 0
            ? 'La obligación quedó pagada.'
            : `La obligación quedó pagada parcialmente, con saldo de ${pesos(obligacion.saldoPendiente)}.`}
        </p>
        <p>
          <span className="identificador">{pago.inmueble}</span>
          {pendienteDelInmueble ? ` todavía debe ${pesos(pendienteDelInmueble)} en total.` : ' quedó sin obligaciones pendientes.'}
        </p>
      </div>

      <article className="documento-impreso" aria-label="Recibo de caja">
        <div className="encabezado-doc">
          <div>
            <div className="fuerte">Copropiedad Villa Campestre</div>
            <div className="guia">Administración · recibo de caja</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="identificador fuerte">{pago.comprobante}</div>
            <div className="guia">{fechaConAnio(pago.fecha)}{pago.hora ? `, ${hora(`${pago.fecha}T${pago.hora}:00`)}` : ''}</div>
          </div>
        </div>
        <dl className="datos">
          <div><dt>Recibido de</dt><dd>{pago.pagador}{documento && <><br /><span className="identificador guia">CC {documento}</span></>}</dd></div>
          <div><dt>Inmueble</dt><dd><span className="identificador">{pago.inmueble}</span><br /><span className="guia">{inmueble.unidad}</span></dd></div>
          <div><dt>Propietario</dt><dd>{inmueble.propietario || 'Propietario registrado'}</dd></div>
          <div><dt>Abono a</dt><dd>{pago.abono}<br /><span className="guia">Vence el {fechaConAnio(obligacion.fechaVencimiento)}</span></dd></div>
          <div><dt>Medio de pago</dt><dd>{MEDIOS[pago.medioPago].texto}{pago.referencia && <><br /><span className="identificador guia">{pago.referencia}</span></>}</dd></div>
          <div><dt>Saldo de la obligación</dt><dd className="num">Antes {pesos(saldoAnterior)}<br />Después {pesos(obligacion.saldoPendiente)}</dd></div>
        </dl>
        <div className="total">
          <span className="fuerte">Valor recibido</span>
          <span className="valor">{pesos(pago.valor)}</span>
        </div>
        <p className="guia" style={{ marginTop: 'var(--e4)' }}>
          Registró {sesion?.persona || 'Paula Ortega'}, {(sesion?.cargo || 'Administradora').toLowerCase()}. Este recibo es el comprobante del pago; consérvalo.
        </p>
      </article>

      <div className="fila no-imprimir">
        <button className="btn" type="button" onClick={() => window.print()}>Imprimir recibo</button>
        <button className="btn segundo" type="button" onClick={alVolver}>Registrar otro pago</button>
      </div>
    </section>
  )
}

// ---------- Anular un pago (RF-081, RN-27) ----------

function AnularPago({ pago: p, alCerrar, alAnular }) {
  const confirmar = useConfirmar()
  const [motivo, setMotivo] = useState('')
  const [falta, setFalta] = useState(false)

  const cerrar = () => { setMotivo(''); setFalta(false); alCerrar() }
  const anular = async () => {
    if (!motivo.trim()) { setFalta(true); return }
    await carteraDeEjemplo.anularPago(p.id, motivo.trim())
    confirmar(`Pago anulado: ${p.comprobante}. ${pesos(p.valor)} volvieron al saldo de la obligación y el motivo queda en la auditoría.`)
    alAnular(p)
    cerrar()
  }

  return (
    <Dialogo abierto={!!p} alCerrar={cerrar} titulo="Anular pago" alEnviar={anular}
      guia={p && <><span className="identificador">{p.comprobante}</span> · <span className="identificador">{p.inmueble}</span> · {pesos(p.valor)} · {cuando(p.fecha, p.hora)}</>}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn riesgo" type="submit">Anular pago</button>
      </>}>
      {p && (
        <div className="pila">
          <dl className="datos">
            <div><dt>Pagó</dt><dd>{p.pagador}, {MEDIOS[p.medioPago].texto.toLowerCase()}</dd></div>
            <div><dt>Abono a</dt><dd>{p.abono}</dd></div>
          </dl>
          <div className="aviso al">
            <p><b>El valor vuelve al saldo de la obligación.</b> Se le suman de nuevo {pesos(p.valor)} y el pago queda anulado con su motivo.</p>
            <p>No se puede deshacer. Si el dinero sí se recibió, registra el pago otra vez con los datos correctos.</p>
          </div>
          <Campo rotulo="Motivo" error={falta ? 'Escribe por qué se anula. Es obligatorio y queda en la auditoría junto al pago.' : null}>
            <textarea value={motivo} onChange={(e) => { setMotivo(e.target.value); setFalta(false) }}
              placeholder="El banco devolvió el cheque por fondos insuficientes." />
          </Campo>
        </div>
      )}
    </Dialogo>
  )
}
