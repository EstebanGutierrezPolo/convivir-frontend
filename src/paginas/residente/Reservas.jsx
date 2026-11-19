import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useSesion } from '../../aplicacion/sesion.jsx'
import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga, Pestanas, Vacio } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { HOY, INMUEBLE, MES, fechaLarga, horaDe, nombreMes, reservasApi } from '../../datos/residente.js'
import { pesos } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-20 Reservar zona común
// Consultar disponibilidad: Inmueble.obtenerDisponibilidadEnPeriodo(), AsignacionInmueble.consultarPeriodosOcupadosDelInmueble() (RF-115)
// Solicitar: AsignacionInmueble(fechaInicio, fechaFin), ProgramacionAsignacion(diaSemana, horaInicio, horaFin),
//   Reserva(asignacionInmueble, inmuebleQuePaga).registrarReservaDeZonaComun(), validarQueElIntegranteSeaResidente() (RN-43),
//   validarDisponibilidadDeLaZona() (RN-38), tipo sin permiteReserva (RN-37), FabricaEstrategiaTarifa.obtenerEstrategia() (RF-116)
// Cancelar reserva propia: Reserva.cancelarReservaPorMotivo(motivo), según su ComportamientoReserva (RF-118)
// Decisión abierta 8: la obligación ALQUILER_ZONA se genera al confirmar (RN-39); aquí solo se anuncia.
// ?estado=no-residente muestra el 403 de RN-43. Para el 409 de RN-38, pide el salón social el sábado 5 de diciembre
// en la tarde y noche. Datos de ejemplo.

// El resumen acompaña al formulario mientras se desplaza en pantallas anchas.
const ESTILOS = '@media (min-width: 64.01rem) { #resumen-reserva { position: sticky; top: calc(56px + var(--e4)); } }'

const SEMANA_CORTA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const SIN_ELEGIR = { zona: null, fecha: null, claves: [] }
const ACTIVAS = ['SOLICITADA', 'CONFIRMADA']

const ESTADOS = {
  SOLICITADA: <Pildora tono="al">Por confirmar</Pildora>,
  CONFIRMADA: <Pildora tono="ok">Confirmada</Pildora>,
  CANCELADA: <Pildora tono="ne">Cancelada</Pildora>,
  FINALIZADA: <Pildora tono="ne">Finalizada</Pildora>,
  INCUMPLIDA: <Pildora tono="no">Incumplida</Pildora>,
}

const iso = (a, m, d) => `${a}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const dosDigitos = (h) => `${String(h).padStart(2, '0')}:00`
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1)
/** "el salón social" -> "del salón social"; "la zona BBQ" -> "de la zona BBQ". */
const deLa = (frase) => (frase.startsWith('el ') ? `del ${frase.slice(3)}` : `de ${frase}`)

/** Claves que se pueden reservar en un día: franjas del evento u horas de apertura. */
function clavesDe(z) {
  if (z.unidadTarifa === 'POR_EVENTO') return z.franjas.map((f) => f.clave)
  const lista = []
  for (let h = z.abre; h < z.cierra; h++) lista.push(h)
  return lista
}

/** Tarifa: FabricaEstrategiaTarifa → TarifaPorEvento o TarifaPorHora. */
function calcularTarifa(z, claves) {
  if (!claves.length) return null
  if (z.unidadTarifa === 'POR_EVENTO') return { total: z.valorTarifa, detalle: `${pesos(z.valorTarifa)} por evento` }
  const horas = claves.length
  if (!z.valorTarifa) return { total: 0, detalle: 'Sin costo' }
  return { total: z.valorTarifa * horas, detalle: `${pesos(z.valorTarifa)} por hora × ${horas} ${horas === 1 ? 'hora' : 'horas'}` }
}

function rango(z, claves) {
  if (z.unidadTarifa === 'POR_EVENTO') {
    const f = z.franjas.find((x) => x.clave === claves[0])
    return { desde: f.desde, hasta: f.hasta }
  }
  const orden = [...claves].sort((a, b) => a - b)
  return { desde: dosDigitos(orden[0]), hasta: dosDigitos(orden[orden.length - 1] + 1) }
}

export default function Reservas() {
  const consulta = useConsulta(() => reservasApi.consultar())
  const [pestana, setPestana] = useState('reservar')
  const [cancelando, setCancelando] = useState(null)

  const datos = consulta.datos
  const activas = datos ? datos.reservas.filter((r) => ACTIVAS.includes(r.estado)).length : undefined

  return (
    <main className="pagina">
      <style href="convivir-residente-reservas" precedence="default">{ESTILOS}</style>
      <AvisoDatosDeEjemplo casoDeUso="CU-20" />
      <Encabezado titulo="Reservas" guia="Zonas comunes de Villa Campestre. La administración revisa y confirma cada solicitud." />

      <Pestanas etiqueta="Reservas" activa={pestana} alCambiar={setPestana}
        pestanas={[{ id: 'reservar', texto: 'Reservar zona común' }, { id: 'mias', texto: 'Mis reservas', cuenta: activas }]} />

      {!datos && consulta.cargando && <div className="superficie"><Cargando texto="Cargando las zonas comunes…" /></div>}
      {consulta.error && <div className="superficie"><ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /></div>}

      {datos && (
        <section role="tabpanel" aria-label="Reservar zona común" hidden={pestana !== 'reservar'}>
          <Reservar datos={datos} alCambiar={consulta.recargar} alSolicitar={() => { consulta.recargar(); setPestana('mias') }} />
        </section>
      )}
      {datos && (
        <section role="tabpanel" aria-label="Mis reservas" hidden={pestana !== 'mias'}>
          <MisReservas datos={datos} alCancelar={setCancelando} />
        </section>
      )}

      <Cancelar reserva={cancelando} zonas={datos?.zonas || []} alCerrar={() => setCancelando(null)} alCancelar={consulta.recargar} />
    </main>
  )
}

// ---------- Reservar ----------

function Reservar({ datos, alCambiar, alSolicitar }) {
  const { sesion } = useSesion()
  const inmueble = sesion.inmuebles?.[0]?.nombre
  const [parametros] = useSearchParams()
  const noResidente = parametros.get('estado') === 'no-residente'
  const confirmar = useConfirmar()
  const [eleccion, setEleccion] = useState(SIN_ELEGIR)
  const [mes, setMes] = useState(10)
  const anio = 2026
  const [avisoOcupado, setAvisoOcupado] = useState(null)
  const [errorSolicitud, setErrorSolicitud] = useState(null)
  const [finalidad, setFinalidad] = useState('')
  const [inmuebleQuePaga, setInmuebleQuePaga] = useState(INMUEBLE.identificacion)
  const [errores, setErrores] = useState({})
  const refHora = useRef(null)
  const refError = useRef(null)
  const refDatos = useRef(null)

  const z = eleccion.zona ? datos.zonas.find((x) => x.clave === eleccion.zona) : null
  const reservable = !!z && z.permiteReserva !== false

  useEffect(() => {
    if (eleccion.fecha) refHora.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [eleccion.fecha])
  useEffect(() => {
    if (errorSolicitud) refError.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [errorSolicitud])

  // Disponibilidad: Inmueble.obtenerDisponibilidadEnPeriodo()
  const ocupacion = (dia) => ({
    otros: datos.ocupadas[eleccion.zona]?.[dia] || [],
    mias: datos.reservas.filter((r) => r.zona === eleccion.zona && r.fecha === dia && ACTIVAS.includes(r.estado)).flatMap((r) => r.claves),
  })

  const elegirZona = (clave) => {
    setEleccion({ zona: clave, fecha: null, claves: [] })
    setAvisoOcupado(null)
    setErrorSolicitud(null)
  }
  const elegirDia = (dia) => {
    setEleccion({ ...eleccion, fecha: dia, claves: [] })
    setAvisoOcupado(null)
    setErrorSolicitud(null)
  }

  const elegirFranja = (f, ocupada, mia) => {
    if (ocupada) {
      // Periodo ocupado (RN-38): se dice cuál y qué hacer.
      setAvisoOcupado(mia ? { mia: true } : { texto: f.texto })
      return
    }
    setAvisoOcupado(null)
    setErrorSolicitud(null)
    const clave = f.clave
    const c = eleccion.claves
    let claves
    if (z.unidadTarifa === 'POR_EVENTO') claves = c[0] === clave ? [] : [clave]
    else if (!c.length) claves = [clave]
    else {
      const min = Math.min(...c)
      const max = Math.max(...c)
      if (clave === min - 1 || clave === max + 1) claves = [...c, clave]
      else if (clave === min && c.length > 1) claves = c.filter((x) => x !== min)
      else if (clave === max && c.length > 1) claves = c.filter((x) => x !== max)
      else if (clave === min && c.length === 1) claves = []
      else claves = [clave]
    }
    setEleccion({ ...eleccion, claves })
  }

  const tarifa = reservable ? calcularTarifa(z, eleccion.claves) : null
  const r = tarifa ? rango(z, eleccion.claves) : null

  const falta = []
  if (!z) falta.push('la zona', 'el día', 'el horario')
  else if (reservable) {
    if (!eleccion.fecha) falta.push('el día')
    if (!eleccion.claves.length) falta.push('el horario')
  }
  let guiaFalta = null
  if (z && !reservable) guiaFalta = 'La piscina no se reserva. Elige otra zona.'
  else if (falta.length) guiaFalta = `Te falta elegir ${falta.length > 1 ? `${falta.slice(0, -1).join(', ')} y ${falta[falta.length - 1]}` : falta[0]}.`

  // ---------- Solicitar: POST /api/reservas ----------
  const solicitar = async (e) => {
    e.preventDefault()
    setErrorSolicitud(null)
    const nuevos = {}
    if (!finalidad.trim()) nuevos.finalidad = 'Cuéntale a la administración para qué es la reserva. La usa para confirmarla.'
    if (!inmuebleQuePaga) nuevos.inmuebleQuePaga = 'Elige el inmueble al que llegará el cobro de la reserva.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length) {
      setTimeout(() => refDatos.current?.querySelector('[aria-invalid="true"]')?.focus(), 0)
      return
    }
    try {
      await reservasApi.solicitar({
        zona: eleccion.zona, fecha: eleccion.fecha, desde: r.desde, hasta: r.hasta, claves: [...eleccion.claves],
        finalidad: finalidad.trim(), valorTarifa: tarifa.total, inmuebleQuePaga,
      }, { noResidente })
      confirmar('Reserva solicitada. Queda por confirmar hasta que la administración la revise.')
      setEleccion(SIN_ELEGIR)
      setFinalidad('')
      setInmuebleQuePaga(INMUEBLE.identificacion)
      alSolicitar()
    } catch (error) {
      if (error.estado === 403) setErrorSolicitud({ estado: 403 })
      else if (error.estado === 409) {
        // validarDisponibilidadDeLaZona() (RN-38): otra reserva se confirmó mientras elegías.
        setErrorSolicitud({ estado: 409, frase: z.frase, fecha: eleccion.fecha, desde: r.desde, hasta: r.hasta })
        setEleccion({ ...eleccion, claves: [] })
        alCambiar()
      } else throw error
    }
  }

  return (
    <form className="lado" noValidate onSubmit={solicitar}>
      <div className="pila" style={{ gap: 'var(--e5)' }}>
        <div className="superficie">
          <div className="cabeza"><h2 id="titulo-zona">Zona</h2></div>
          <div className="cuerpo">
            <div className="elecciones" role="radiogroup" aria-labelledby="titulo-zona">
              {datos.zonas.map((zona) => (
                <label key={zona.clave} className="eleccion">
                  <input type="radio" name="zona" value={zona.clave} checked={eleccion.zona === zona.clave}
                    onChange={() => elegirZona(zona.clave)} />
                  <span>
                    <b>{zona.nombre}</b>
                    <small><DescripcionTarifa zona={zona} /></small>
                    <small>{zona.ubicacion}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* RN-37: el tipo de inmueble no permite reserva */}
        {z && !reservable && (
          <div className="aviso no" role="alert">
            <p><b>{mayuscula(z.frase)} no se reserva.</b></p>
            <p>
              Es de uso libre para todos los residentes en su horario, así que nadie la puede apartar. Elige el salón social, la zona
              BBQ o la cancha si necesitas un espacio solo para ti.
            </p>
          </div>
        )}

        {!z && (
          <div className="superficie">
            <div className="vacio">
              <svg className="simbolo" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="6" y="9" width="28" height="25" rx="3" /><path d="M6 16h28M13 5v7M27 5v7" /><circle cx="20" cy="25" r="2" />
              </svg>
              <h3>Elige una zona para ver qué días tiene libres</h3>
              <p>Verás el mes con la disponibilidad de cada día y luego las horas libres.</p>
            </div>
          </div>
        )}

        {reservable && (
          <div className="superficie">
            <div className="cabeza">
              <h2>Día</h2>
              <div className="fila" style={{ gap: 'var(--e1)' }}>
                <button className="btn segundo chico" type="button" aria-label="Mes anterior" disabled={mes === 10}
                  onClick={() => setMes(10)}>‹</button>
                <span className="fuerte" style={{ minWidth: '9.5rem', textAlign: 'center' }} aria-live="polite">{nombreMes(anio, mes)}</span>
                <button className="btn segundo chico" type="button" aria-label="Mes siguiente" disabled={mes === 11}
                  onClick={() => setMes(11)}>›</button>
              </div>
            </div>
            <div className="cuerpo pila">
              <Calendario anio={anio} mes={mes} zona={z} elegida={eleccion.fecha} ocupacion={ocupacion} alElegir={elegirDia} />
              <div className="fila" style={{ gap: 'var(--e2)' }}>
                <Pildora tono="al">Algunas horas ocupadas</Pildora>
                <Pildora tono="no">Sin horas libres</Pildora>
              </div>
            </div>
          </div>
        )}

        {reservable && eleccion.fecha && (
          <div className="superficie" ref={refHora}>
            <div className="cabeza">
              <h2>Horario del {fechaLarga(eleccion.fecha, { conDia: true }).toLowerCase()}</h2>
              <span className="guia">
                {z.unidadTarifa === 'POR_EVENTO' ? 'Se reserva por evento: elige una franja.' : 'Se reserva por hora: elige una o varias horas seguidas.'}
              </span>
            </div>
            <div className="cuerpo pila">
              {avisoOcupado && (
                <div className="aviso no" role="alert">
                  {avisoOcupado.mia ? (
                    <>
                      <p><b>Ya tienes este horario.</b></p>
                      <p>Lo encuentras en Mis reservas. Elige otra hora si necesitas más tiempo.</p>
                    </>
                  ) : (
                    <>
                      <p><b>Ya hay una reserva de {avisoOcupado.texto} en {z.frase}.</b></p>
                      <p>Elige otro horario libre o mira otro día en el calendario.</p>
                    </>
                  )}
                </div>
              )}
              <Franjas zona={z} ocupacion={ocupacion(eleccion.fecha)} elegidas={eleccion.claves} alElegir={elegirFranja} />
            </div>
          </div>
        )}

        {reservable && eleccion.claves.length > 0 && (
          <div className="superficie">
            <div className="cabeza"><h2>Datos de la reserva</h2></div>
            <div className="cuerpo">
              <div className="formulario" ref={refDatos}>
                <Campo rotulo="Finalidad" error={errores.finalidad}>
                  <textarea value={finalidad} placeholder="Cumpleaños de mi hermano, unas 20 personas."
                    onChange={(e) => { setFinalidad(e.target.value); setErrores({ ...errores, finalidad: null }) }} />
                </Campo>
                <Campo rotulo="Inmueble al que se cobra" ayuda="Solo aparecen los inmuebles en los que vives." error={errores.inmuebleQuePaga}>
                  <select value={inmuebleQuePaga}
                    onChange={(e) => { setInmuebleQuePaga(e.target.value); setErrores({ ...errores, inmuebleQuePaga: null }) }}>
                    <option value={INMUEBLE.identificacion}>{inmueble}</option>
                  </select>
                </Campo>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="superficie" id="resumen-reserva" aria-labelledby="titulo-resumen">
        <div className="cabeza"><h2 id="titulo-resumen">Resumen</h2></div>
        <div className="cuerpo pila">
          <dl className="datos fila-unica">
            <div><dt>Zona</dt><dd>{z ? z.nombre : 'Sin elegir'}</dd></div>
            <div><dt>Día</dt><dd>{eleccion.fecha ? fechaLarga(eleccion.fecha, { conDia: true }) : 'Sin elegir'}</dd></div>
            <div><dt>Horario</dt><dd>{r ? `${horaDe(r.desde)} a ${horaDe(r.hasta)}` : 'Sin elegir'}</dd></div>
            <div><dt>Tarifa</dt><dd>{tarifa ? tarifa.detalle : '—'}</dd></div>
          </dl>
          <div className="fila entre" style={{ borderTop: '1px solid var(--borde)', paddingTop: 'var(--e3)' }}>
            <span className="fuerte">Valor de la reserva</span>
            <span className="fuerte num" style={{ fontSize: 'var(--t-md)' }}>{tarifa ? (tarifa.total ? pesos(tarifa.total) : 'Sin costo') : '—'}</span>
          </div>
          {tarifa && (
            <p className="guia">
              {tarifa.total
                ? `Cuando la administración la confirme, se cobran ${pesos(tarifa.total)} a ${inmueble}. Como vives en arriendo, ese cobro y la multa por incumplir las condiciones de uso, de ${pesos(z.valorMulta)}, le corresponden al propietario, ${INMUEBLE.propietario}.`
                : `${mayuscula(z.frase)} no tiene costo. Si no vas a usarla, cancélala para que otro residente pueda reservar.`}
            </p>
          )}
          {errorSolicitud && (
            <div className="aviso no" role="alert" ref={refError}>
              {errorSolicitud.estado === 403 ? (
                <>
                  <p><b>No puedes reservar zonas comunes.</b></p>
                  <p>
                    Solo reserva quien vive en la copropiedad con una vinculación vigente, y la tuya con {inmueble} no aparece vigente.
                    Si ya renovaste el contrato de arriendo, pídele a la administración que actualice tu vinculación.
                  </p>
                </>
              ) : (
                <>
                  <p><b>Ese horario se acaba de ocupar.</b></p>
                  <p>
                    La administración confirmó otra reserva en {errorSolicitud.frase} para
                    el {fechaLarga(errorSolicitud.fecha, { conDia: true }).toLowerCase()} de {horaDe(errorSolicitud.desde)} a {horaDe(errorSolicitud.hasta)}.
                    Elige otro horario u otro día; tus datos se conservan.
                  </p>
                </>
              )}
            </div>
          )}
          <button className="btn ancho" type="submit" disabled={!reservable || !tarifa}>Solicitar reserva</button>
          {guiaFalta && <p className="guia">{guiaFalta}</p>}
        </div>
      </aside>
    </form>
  )
}

function DescripcionTarifa({ zona }) {
  if (zona.permiteReserva === false) return 'No se reserva'
  if (zona.unidadTarifa === 'POR_EVENTO') return <>Por evento · <span className="num">{pesos(zona.valorTarifa)}</span></>
  if (!zona.valorTarifa) return 'Por hora · sin costo'
  return <>Por hora · <span className="num">{pesos(zona.valorTarifa)}</span> la hora</>
}

function Calendario({ anio, mes, zona, elegida, ocupacion, alElegir }) {
  const primero = new Date(anio, mes, 1)
  const diasMes = new Date(anio, mes + 1, 0).getDate()
  const vacios = (primero.getDay() + 6) % 7
  const todas = clavesDe(zona).length
  const dias = Array.from({ length: diasMes }, (_, i) => i + 1)

  return (
    <div className="calendario" role="group" aria-label="Días del mes">
      {SEMANA_CORTA.map((d) => <span key={d} className="dia-semana" aria-hidden="true">{d}</span>)}
      {Array.from({ length: vacios }, (_, i) => (
        <button key={`fuera-${i}`} type="button" className="fuera" tabIndex={-1} aria-hidden="true" />
      ))}
      {dias.map((d) => {
        const dia = iso(anio, mes, d)
        const o = ocupacion(dia)
        const usadas = o.otros.length + o.mias.length
        const clases = []
        let estado = 'libre'
        if (usadas >= todas) { clases.push('lleno'); estado = 'sin horas libres' } else if (usadas > 0) { clases.push('parcial'); estado = 'algunas horas ocupadas' }
        if (dia === HOY) clases.push('hoy')
        const pasado = dia < HOY
        return (
          <button key={dia} type="button" className={clases.join(' ') || undefined} disabled={pasado}
            aria-pressed={elegida === dia}
            aria-label={`${d} de ${MES[mes]}${dia === HOY ? ', hoy' : ''}, ${pasado ? 'ya pasó' : estado}`}
            onClick={() => alElegir(dia)}>
            <span>{d}</span><span className="marca-dia" />
          </button>
        )
      })}
    </div>
  )
}

function Franjas({ zona, ocupacion, elegidas, alElegir }) {
  const lista = zona.unidadTarifa === 'POR_EVENTO'
    ? zona.franjas.map((f) => ({ clave: f.clave, texto: `${horaDe(f.desde)} a ${horaDe(f.hasta)}`, nombre: f.nombre }))
    : clavesDe(zona).map((h) => ({ clave: h, texto: `${horaDe(h)} a ${horaDe(h + 1)}` }))

  return (
    <div className="franjas">
      {lista.map((f) => {
        const deOtro = ocupacion.otros.includes(f.clave)
        const mia = ocupacion.mias.includes(f.clave)
        const elegida = elegidas.includes(f.clave)
        const ocupada = deOtro || mia
        const estado = mia ? 'Tu reserva' : deOtro ? 'Reservada' : elegida ? 'Elegida' : 'Libre'
        return (
          <button key={f.clave} type="button" className={`franja${ocupada ? ' ocupada' : ''}`}
            aria-disabled={ocupada ? 'true' : undefined} aria-pressed={ocupada ? undefined : elegida}
            onClick={() => alElegir(f, ocupada, mia)}>
            <span>{f.nombre && <><b className="fuerte">{f.nombre}</b> · </>}<span className="hora">{f.texto}</span></span>
            <span className={elegida ? 'fuerte' : 'guia'}>{estado}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---------- Mis reservas (RF-117, RF-118) ----------

function MisReservas({ datos, alCancelar }) {
  const { sesion } = useSesion()
  const inmueble = sesion.inmuebles?.[0]?.nombre
  const orden = [...datos.reservas].sort((a, b) => {
    const activaA = ACTIVAS.includes(a.estado)
    const activaB = ACTIVAS.includes(b.estado)
    if (activaA !== activaB) return activaA ? -1 : 1
    return activaA ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha)
  })

  return (
    <div className="superficie">
      <ul className="lista">
        {orden.map((r) => {
          const cancelable = ACTIVAS.includes(r.estado)
          const cobro = r.valorTarifa
            ? `${pesos(r.valorTarifa)} · se cobra a ${inmueble}${r.estado === 'SOLICITADA' ? ' al confirmarse' : ''}`
            : 'Sin costo'
          return (
            <li key={r.id}>
              <div className="principal">
                <b>{datos.zonas.find((z) => z.clave === r.zona).nombre}</b>
                <span>{fechaLarga(r.fecha, { conDia: true })}, {horaDe(r.desde)} a {horaDe(r.hasta)}</span>
                <span>{r.finalidad}</span>
                <span>{r.estado === 'CANCELADA' ? `Motivo de la cancelación: ${r.motivoCancelacion}` : cobro}</span>
              </div>
              <div className="fila" style={{ gap: 'var(--e2)' }}>
                {ESTADOS[r.estado]}
                {cancelable && <button className="btn riesgo chico" type="button" onClick={() => alCancelar(r)}>Cancelar reserva</button>}
              </div>
            </li>
          )
        })}
      </ul>
      {datos.reservas.length === 0 && (
        <Vacio titulo="Todavía no has reservado zonas comunes">
          Reserva el salón social, la zona BBQ o la cancha y la administración te confirmará.
        </Vacio>
      )}
    </div>
  )
}

// ---------- Cancelar reserva: Reserva.cancelarReservaPorMotivo(motivo) ----------

function Cancelar({ reserva, zonas, alCerrar, alCancelar }) {
  const confirmar = useConfirmar()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState(null)
  const zona = reserva && zonas.find((z) => z.clave === reserva.zona)

  const cerrar = () => {
    setMotivo('')
    setError(null)
    alCerrar()
  }

  const cancelar = async () => {
    if (!motivo.trim()) {
      setError('Escribe por qué la cancelas. Queda en el registro de la reserva.')
      return
    }
    await reservasApi.cancelar(reserva.id, motivo.trim())
    confirmar('Reserva cancelada. El horario queda libre para otros residentes.')
    alCancelar()
    cerrar()
  }

  return (
    <Dialogo abierto={!!reserva} alCerrar={cerrar} alEnviar={cancelar}
      titulo={zona ? `Cancelar la reserva ${deLa(zona.frase)}` : 'Cancelar reserva'}
      guia={reserva && `${fechaLarga(reserva.fecha, { conDia: true })}, ${horaDe(reserva.desde)} a ${horaDe(reserva.hasta)}. El horario queda libre para otros residentes y no se puede deshacer.`}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Conservar reserva</button>
        <button className="btn riesgo" type="submit">Cancelar reserva</button>
      </>}>
      <Campo rotulo="Motivo de la cancelación" error={error}>
        <textarea value={motivo} placeholder="Se aplazó la reunión."
          onChange={(e) => { setMotivo(e.target.value); setError(null) }} />
      </Campo>
    </Dialogo>
  )
}
