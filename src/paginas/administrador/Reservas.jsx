import { useState } from 'react'
import { Link } from 'react-router'

import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga, Pestanas } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { HOY_DE_EJEMPLO, reservasDeEjemplo } from '../../datos/administracion.js'
import { hora, pesos } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-21 Gestionar reservas: confirmar, cancelar, finalizar y aplicar multa.
// Patrón State (ReservaSolicitada, ReservaConfirmada, ReservaCerrada) y Strategy (EstrategiaTarifa).
// Sin API todavía: datos de ejemplo de src/datos/administracion.js.

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
  'noviembre', 'diciembre']
const UNIDADES = { POR_HORA: 'Por hora', POR_DIA: 'Por día', POR_EVENTO: 'Por evento' }
const CERRADOS = ['CANCELADA', 'FINALIZADA', 'INCUMPLIDA']
const ESTADO_CERRADA = { CANCELADA: ['ne', 'Cancelada'], FINALIZADA: ['ne', 'Finalizada'], INCUMPLIDA: ['no', 'Incumplida'] }

// ---------- Fechas ----------
/** "2026-11-21T16:00" o "2026-11-27" a fecha local. */
function leer(texto) {
  const [anio, mes, dia, h = 0, m = 0] = texto.split(/[-T:]/).map(Number)
  return new Date(anio, mes - 1, dia, h, m)
}
const HOY = leer(HOY_DE_EJEMPLO)
const fechaConDia = (d) => `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
const horaCorta = (d) => (d.getHours() === 12 && d.getMinutes() === 0 ? '12:00 m.' : hora(d))
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const soloDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
function relativo(d) {
  const diferencia = Math.round((soloDia(d) - HOY) / 86400000)
  return diferencia === 0 ? 'Hoy' : diferencia === 1 ? 'Mañana' : diferencia === -1 ? 'Ayer' : ''
}
const porDia = (zona) => zona.unidadTarifa === 'POR_DIA'
const dias = (r) => Math.round((leer(r.fin) - leer(r.inicio)) / 86400000) + 1
const horas = (r) => Math.round((leer(r.fin) - leer(r.inicio)) / 3600000)

/** Periodo que ocupa la reserva (AsignacionInmueble): las de día ocupan el día completo. */
function periodo(r, zona) {
  const inicio = leer(r.inicio)
  let fin = leer(r.fin)
  if (porDia(zona)) fin = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() + 1)
  return [inicio, fin]
}

function cuando(r, zona) {
  const i = leer(r.inicio)
  const f = leer(r.fin)
  if (porDia(zona)) {
    const mismoMes = i.getMonth() === f.getMonth()
    return `Del ${DIAS[i.getDay()]} ${i.getDate()}${mismoMes ? '' : ` de ${MESES[i.getMonth()]}`} al ${fechaConDia(f)}`
  }
  return `${mayuscula(fechaConDia(i))}, ${horaCorta(i)} a ${horaCorta(f)}`
}

// ---------- EstrategiaTarifa: la elige FabricaEstrategiaTarifa según la unidad del tipo ----------
const ESTRATEGIAS = {
  // TarifaPorHora.calcular(valorTarifa, asignacionInmueble)
  POR_HORA: (valor, r) => { const h = horas(r); return { total: valor * h, detalle: `${h}${h === 1 ? ' hora' : ' horas'} × ${pesos(valor)}` } },
  // TarifaPorDia.calcular(valorTarifa, asignacionInmueble)
  POR_DIA: (valor, r) => { const d = dias(r); return { total: valor * d, detalle: `${d}${d === 1 ? ' día' : ' días'} × ${pesos(valor)}` } },
  // TarifaPorEvento.calcular(valorTarifa, asignacionInmueble)
  POR_EVENTO: (valor) => ({ total: valor, detalle: 'Tarifa por evento' }),
}
const calcularTarifa = (r, zona) => ESTRATEGIAS[zona.unidadTarifa](zona.valorTarifa, r)

const grupo = (r) => (CERRADOS.includes(r.estado) ? 'CERRADA' : r.estado)
const Unidad = ({ children }) => <span className="identificador">{children}</span>
const pidio = (r) => `${r.solicitante}, ${r.vinculo}`

/** Lleva el foco al primer campo con error del diálogo abierto. */
function enfocarPrimerError() {
  requestAnimationFrame(() => {
    const abiertos = document.querySelectorAll('dialog[open]')
    abiertos[abiertos.length - 1]?.querySelector('[aria-invalid="true"]')?.focus()
  })
}

const PANELES = [
  {
    grupo: 'SOLICITADA', texto: 'Por confirmar',
    vacio: ['No hay reservas por confirmar', 'Cuando un residente pida una zona común, la solicitud aparece aquí para que la confirmes o la canceles.'],
    pie: 'Confirma solo si la zona está libre: dos reservas confirmadas no pueden cruzarse en la misma zona.',
  },
  {
    grupo: 'CONFIRMADA', texto: 'Confirmadas',
    vacio: ['No hay reservas confirmadas', 'Las reservas que confirmes quedan aquí hasta que las finalices, las canceles o apliques una multa.'],
    pie: 'Cuando la reserva termine, finalízala. Si no se respetó el horario o hubo daños, aplica la multa en su lugar.',
  },
  {
    grupo: 'CERRADA', texto: 'Cerradas',
    vacio: ['Todavía no hay reservas cerradas', 'Aquí quedan las reservas canceladas, finalizadas o incumplidas, con su motivo y su multa.'],
  },
]

export default function Reservas() {
  const consulta = useConsulta(() => reservasDeEjemplo.consultar())
  const confirmar = useConfirmar()
  const [editadas, setEditadas] = useState(null)
  const [pestana, setPestana] = useState('SOLICITADA')
  const [zonaFiltro, setZonaFiltro] = useState('')
  const [dialogo, setDialogo] = useState(null)

  const datos = consulta.datos
  const reservas = editadas || datos?.reservas || []
  const zonas = datos?.zonas || []
  const zonaDe = (r) => zonas.find((z) => z.clave === r.zona)

  const cambiar = (id, cambios) => setEditadas(reservas.map((r) => (r.id === id ? { ...r, ...cambios } : r)))
  const cerrarDialogo = () => setDialogo(null)

  if (!datos) {
    return (
      <main className="pagina">
        <AvisoDatosDeEjemplo casoDeUso="CU-21" />
        <Encabezado titulo="Reservas de zonas comunes" />
        <div className="superficie">
          {consulta.error ? <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /> : <Cargando texto="Cargando reservas…" />}
        </div>
      </main>
    )
  }

  const listas = {}
  PANELES.forEach(({ grupo: g }) => {
    listas[g] = reservas
      .filter((r) => grupo(r) === g && (!zonaFiltro || r.zona === zonaFiltro))
      .sort((a, b) => (g === 'CERRADA' ? leer(b.inicio) - leer(a.inicio) : leer(a.inicio) - leer(b.inicio)))
  })
  const pendientes = reservas.filter((r) => r.estado === 'SOLICITADA').length
  const resumen = `${pendientes ? `${pendientes}${pendientes === 1 ? ' solicitud' : ' solicitudes'} por confirmar` : 'Sin solicitudes por confirmar'}`
    + ' · la tarifa y la multa salen del tipo de cada zona'

  // Reserva.validarDisponibilidadDeLaZona(): ninguna confirmada de la misma zona se cruza (RN-38).
  const choqueCon = (r) => {
    const a = periodo(r, zonaDe(r))
    return reservas.find((o) => {
      if (o.id === r.id || o.estado !== 'CONFIRMADA' || o.zona !== r.zona) return false
      const b = periodo(o, zonaDe(o))
      return a[0] < b[1] && b[0] < a[1]
    })
  }

  const alConfirmar = (r) => {
    const t = calcularTarifa(r, zonaDe(r))
    cambiar(r.id, { estado: 'CONFIRMADA' })
    confirmar(t.total
      ? `Reserva confirmada. Se generó la obligación de alquiler por ${pesos(t.total)} a cargo de ${r.inmuebleQuePaga}.`
      : 'Reserva confirmada. Es sin costo, no se generó obligación.')
    cerrarDialogo()
  }
  const alCancelar = (r, motivo) => {
    cambiar(r.id, { estado: 'CANCELADA', motivoCancelacion: motivo })
    confirmar(`Reserva cancelada. ${r.solicitante} ve el motivo en su historial.`)
    cerrarDialogo()
  }
  const alFinalizar = (r) => {
    cambiar(r.id, { estado: 'FINALIZADA' })
    confirmar(`Reserva finalizada. ${zonaDe(r).nombre} queda libre.`)
    cerrarDialogo()
  }
  const alMultar = (r, motivo) => {
    const multa = zonaDe(r).valorMulta
    cambiar(r.id, { estado: 'INCUMPLIDA', motivoMulta: motivo })
    confirmar(multa
      ? `Multa aplicada: ${pesos(multa)} a cargo de ${r.propietario} de ${r.inmuebleQuePaga}.`
      : 'Reserva marcada como incumplida, sin cobro.')
    cerrarDialogo()
  }

  const abrir = (tipo, r) => setDialogo({ tipo, reserva: r })
  const panel = PANELES.find((p) => p.grupo === pestana)
  const lista = listas[pestana]

  return (
    <main className="pagina">
      <AvisoDatosDeEjemplo casoDeUso="CU-21" />
      <Encabezado titulo="Reservas de zonas comunes" guia={resumen}
        acciones={<Link className="btn segundo" to="/administrador/tipos-inmueble">Tarifas y multas por zona</Link>} />

      <Pestanas etiqueta="Reservas por estado" activa={pestana} alCambiar={setPestana}
        pestanas={PANELES.map((p) => ({ id: p.grupo, texto: p.texto, cuenta: listas[p.grupo].length }))} />

      <div className="filtros">
        <label className="campo">
          <span className="solo-lectores">Zona común</span>
          <select value={zonaFiltro} onChange={(e) => setZonaFiltro(e.target.value)}>
            <option value="">Todas las zonas</option>
            {zonas.map((z) => <option key={z.clave} value={z.clave}>{z.nombre}</option>)}
          </select>
        </label>
      </div>

      <section role="tabpanel" aria-label={panel.texto}>
        <div className="superficie">
          {lista.length > 0 ? (
            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Zona</th><th>Fecha y franja</th><th>Quién la pidió</th><th>Finalidad</th><th className="num">Tarifa</th>
                    {pestana === 'CERRADA'
                      ? <th>Cómo terminó</th>
                      : <><th>Estado</th><th><span className="solo-lectores">Acciones</span></th></>}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((r) => <FilaReserva key={r.id} reserva={r} zona={zonaDe(r)} alAbrir={abrir} />)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="vacio">
              <h3>{panel.vacio[0]}</h3>
              <p>{panel.vacio[1]}</p>
            </div>
          )}
          {panel.pie && <div className="pie"><span>{panel.pie}</span></div>}
        </div>
      </section>

      <ConfirmarReserva reserva={dialogo?.tipo === 'confirmar' ? dialogo.reserva : null} zonaDe={zonaDe} choqueCon={choqueCon}
        alCerrar={cerrarDialogo} alConfirmar={alConfirmar}
        alCancelarPorChoque={(r) => setDialogo({
          tipo: 'cancelar', reserva: r, motivo: 'La zona ya está reservada en esa franja. Te pedimos elegir otro horario.',
        })} />
      <CancelarReserva reserva={dialogo?.tipo === 'cancelar' ? dialogo.reserva : null} motivoInicial={dialogo?.motivo}
        zonaDe={zonaDe} alCerrar={cerrarDialogo} alCancelar={alCancelar} />
      <FinalizarReserva reserva={dialogo?.tipo === 'finalizar' ? dialogo.reserva : null} zonaDe={zonaDe}
        alCerrar={cerrarDialogo} alFinalizar={alFinalizar} />
      <AplicarMulta reserva={dialogo?.tipo === 'multa' ? dialogo.reserva : null} zonaDe={zonaDe}
        vencimiento={datos.vencimientoMultas} alCerrar={cerrarDialogo} alMultar={alMultar} />
    </main>
  )
}

function FilaReserva({ reserva: r, zona, alAbrir }) {
  const i = leer(r.inicio)
  const f = leer(r.fin)
  const t = calcularTarifa(r, zona)
  const fechaTexto = porDia(zona) ? cuando(r, zona) : mayuscula(fechaConDia(i))
  const franja = porDia(zona) ? `${dias(r)} días` : `${horaCorta(i)} a ${horaCorta(f)}`
  const rel = relativo(i)

  const celdas = (
    <>
      <td><span className="fuerte">{zona.nombre}</span><span className="sub">{UNIDADES[zona.unidadTarifa]}</span></td>
      <td>{fechaTexto}<span className="sub">{rel ? `${rel} · ` : ''}{franja}</span></td>
      <td>{r.solicitante}<span className="sub">Paga <Unidad>{r.inmuebleQuePaga}</Unidad> · {r.vinculo}</span></td>
      <td className="finalidad" style={{ minWidth: '13rem', maxWidth: '20rem' }}>{r.finalidad}</td>
      <td className="num">
        {t.total ? pesos(t.total) : 'Sin costo'}
        {/* La tarifa va en monoespaciada, pero su explicación ("por evento") es texto corriente. */}
        <span className="sub" style={{ fontFamily: 'var(--texto)' }}>{t.detalle}</span>
      </td>
    </>
  )

  if (r.estado === 'SOLICITADA') {
    return (
      <tr>
        {celdas}
        <td><Pildora tono="al">Por confirmar</Pildora></td>
        <td className="acciones-fila">
          <button className="btn chico" type="button" onClick={() => alAbrir('confirmar', r)}>Confirmar</button>{' '}
          <button className="btn segundo chico" type="button" onClick={() => alAbrir('cancelar', r)}>Cancelar reserva</button>
        </td>
      </tr>
    )
  }
  if (r.estado === 'CONFIRMADA') {
    return (
      <tr>
        {celdas}
        <td>
          <Pildora tono="ok">Confirmada</Pildora>
          <span className="sub">{t.total ? <>Alquiler cobrado a <Unidad>{r.inmuebleQuePaga}</Unidad></> : 'Sin cobro'}</span>
        </td>
        <td className="acciones-fila">
          <button className="btn segundo chico" type="button" onClick={() => alAbrir('finalizar', r)}>Finalizar</button>{' '}
          <button className="btn segundo chico" type="button" onClick={() => alAbrir('multa', r)}>Aplicar multa</button>{' '}
          <button className="btn texto chico" type="button" onClick={() => alAbrir('cancelar', r)}>Cancelar reserva</button>
        </td>
      </tr>
    )
  }

  const [tono, texto] = ESTADO_CERRADA[r.estado]
  let detalle = ''
  if (r.estado === 'CANCELADA') detalle = `Motivo: ${r.motivoCancelacion}`
  if (r.estado === 'INCUMPLIDA') {
    detalle = `${zona.valorMulta ? `Multa de ${pesos(zona.valorMulta)} a ${r.propietario.split(',')[0]}. ` : 'Sin multa. '}${r.motivoMulta}`
  }
  if (r.estado === 'FINALIZADA') detalle = 'Se usó sin novedades'
  return (
    <tr>
      {celdas}
      <td className="cierre" style={{ minWidth: '14rem' }}><Pildora tono={tono}>{texto}</Pildora><span className="sub">{detalle}</span></td>
    </tr>
  )
}

// Confirmar: Reserva.confirmarReserva() → validarDisponibilidadDeLaZona(), calcularTarifaDeLaReserva(),
// FabricaObligacion.crearObligacionPorReserva(reserva)
function ConfirmarReserva({ reserva: r, zonaDe, choqueCon, alCerrar, alConfirmar, alCancelarPorChoque }) {
  const [choque, setChoque] = useState(null)
  const zona = r && zonaDe(r)
  const t = r && calcularTarifa(r, zona)

  const cerrar = () => { setChoque(null); alCerrar() }
  const enviar = () => {
    // Si la zona está ocupada, la reserva sigue SOLICITADA y se explica el choque (422, RN-38).
    const otra = choqueCon(r)
    if (otra) { setChoque(otra); return }
    setChoque(null)
    alConfirmar(r)
  }

  return (
    <Dialogo abierto={!!r} alCerrar={cerrar} titulo="Confirmar reserva" alEnviar={enviar}
      guia={r && `${zona.nombre} · ${cuando(r, zona)}`}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Volver</button>
        <button className="btn" type="submit">Confirmar reserva</button>
      </>}>
      {r && (
        <div className="pila">
          {choque && (
            <div className="aviso no" role="alert">
              <p>
                <b>La zona ya está reservada en ese periodo.</b>{' '}
                Ya está confirmada para <Unidad>{choque.inmuebleQuePaga}</Unidad> ({choque.solicitante}) el {fechaConDia(leer(choque.inicio))} de{' '}
                {horaCorta(leer(choque.inicio))} a {horaCorta(leer(choque.fin))}. Dos reservas confirmadas no pueden cruzarse.
                Pídele a {r.solicitante} otra franja o cancela esta solicitud.
              </p>
              <p>
                <button className="btn texto chico" type="button" onClick={() => { setChoque(null); alCancelarPorChoque(r) }}>
                  Cancelar esta solicitud
                </button>
              </p>
            </div>
          )}
          <dl className="datos fila-unica">
            <div><dt>Quién la pidió</dt><dd>{pidio(r)}</dd></div>
            <div><dt>Inmueble que paga</dt><dd><Unidad>{r.inmuebleQuePaga}</Unidad></dd></div>
            <div><dt>Finalidad</dt><dd>{r.finalidad}</dd></div>
            <div>
              <dt>Tarifa</dt>
              <dd>
                {t.total ? <span className="dato">{pesos(t.total)}</span> : 'Sin costo'}
                <span className="guia" style={{ display: 'block' }}>
                  {t.detalle}, {UNIDADES[zona.unidadTarifa].toLowerCase()} según el tipo {zona.nombre}
                </span>
              </dd>
            </div>
          </dl>
          {t.total ? (
            <div className="ficha az">
              <div className="titular">Se genera una obligación de <span className="dato">{pesos(t.total)}</span></div>
              <div className="meta">
                Alquiler de zona común a cargo de <Unidad>{r.inmuebleQuePaga}</Unidad> · vence el {fechaConDia(leer(r.inicio))}, el día de la reserva.
              </div>
            </div>
          ) : (
            <div className="ficha">
              <div className="titular">Sin costo</div>
              <div className="meta">La {zona.nombre.toLowerCase()} no tiene tarifa, así que al confirmar no se genera ninguna obligación.</div>
            </div>
          )}
        </div>
      )}
    </Dialogo>
  )
}

// Cancelar: Reserva.cancelarReservaPorMotivo(motivo) → ComportamientoReserva.cancelar(reserva, motivo)
function CancelarReserva({ reserva: r, motivoInicial, zonaDe, alCerrar, alCancelar }) {
  const [motivo, setMotivo] = useState(null)
  const [error, setError] = useState(null)
  const zona = r && zonaDe(r)
  const t = r && calcularTarifa(r, zona)
  const valor = motivo ?? (motivoInicial || '')

  const cerrar = () => { setMotivo(null); setError(null); alCerrar() }
  const enviar = () => {
    if (!valor.trim()) {
      setError('Escribe el motivo. Quien pidió la reserva lo ve en su historial.')
      enfocarPrimerError()
      return
    }
    alCancelar(r, valor.trim())
    setMotivo(null)
    setError(null)
  }

  return (
    <Dialogo abierto={!!r} alCerrar={cerrar} titulo="Cancelar reserva" alEnviar={enviar}
      guia={r && `${zona.nombre} · ${cuando(r, zona)}`}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Volver</button>
        <button className="btn riesgo" type="submit">Cancelar reserva</button>
      </>}>
      {r && (
        <div className="pila">
          <p className="guia">La pidió {pidio(r)}, con cargo a <Unidad>{r.inmuebleQuePaga}</Unidad>.</p>
          {r.estado === 'CONFIRMADA' && t.total > 0 && (
            <div className="aviso al">
              <p>
                Al confirmarla se generó una obligación de alquiler por <span className="dato">{pesos(t.total)}</span> a cargo
                de <Unidad>{r.inmuebleQuePaga}</Unidad>. Si no se va a cobrar, anúlala en Cartera.
              </p>
            </div>
          )}
          <Campo rotulo="Motivo de la cancelación" ayuda="Quien pidió la reserva lo ve en su historial." error={error}>
            <textarea value={valor} placeholder="La residente la canceló por pronóstico de lluvia."
              onChange={(e) => { setMotivo(e.target.value); if (e.target.value.trim()) setError(null) }} />
          </Campo>
        </div>
      )}
    </Dialogo>
  )
}

// Finalizar: Reserva.finalizarReserva() → ComportamientoReserva.finalizar(reserva)
function FinalizarReserva({ reserva: r, zonaDe, alCerrar, alFinalizar }) {
  const zona = r && zonaDe(r)
  const t = r && calcularTarifa(r, zona)

  return (
    <Dialogo abierto={!!r} alCerrar={alCerrar} titulo="Finalizar reserva" alEnviar={() => alFinalizar(r)}
      guia={r && `${zona.nombre} · ${cuando(r, zona)}`}
      pie={<>
        <button className="btn segundo" type="button" onClick={alCerrar}>Volver</button>
        <button className="btn" type="submit">Finalizar reserva</button>
      </>}>
      {r && (
        <div className="pila">
          <dl className="datos fila-unica">
            <div><dt>Quién la pidió</dt><dd>{pidio(r)}</dd></div>
            <div><dt>Inmueble que paga</dt><dd><Unidad>{r.inmuebleQuePaga}</Unidad></dd></div>
            <div><dt>Tarifa cobrada</dt><dd>{t.total ? <span className="dato">{pesos(t.total)}</span> : 'Sin costo'}</dd></div>
          </dl>
          <p className="guia">
            La reserva pasa a cerradas y la zona queda libre. Si no se respetó el horario o la zona quedó con daños, vuelve y
            aplica la multa en lugar de finalizarla.
          </p>
        </div>
      )}
    </Dialogo>
  )
}

// Multa: Reserva.aplicarMultaPorIncumplimiento(motivo) → ComportamientoReserva.marcarIncumplida(reserva, motivo),
// FabricaObligacion.crearObligacionIndividual(MULTA, valorMulta, fechaVencimiento)
function AplicarMulta({ reserva: r, zonaDe, vencimiento, alCerrar, alMultar }) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState(null)
  const zona = r && zonaDe(r)

  const cerrar = () => { setMotivo(''); setError(null); alCerrar() }
  const enviar = () => {
    if (!motivo.trim()) {
      setError('Escribe el motivo de la multa. Queda en la obligación y lo ve el propietario.')
      enfocarPrimerError()
      return
    }
    alMultar(r, motivo.trim())
    setMotivo('')
    setError(null)
  }

  return (
    <Dialogo abierto={!!r} alCerrar={cerrar} titulo="Aplicar multa por incumplimiento" alEnviar={enviar}
      guia={r && `${zona.nombre} · ${cuando(r, zona)}`}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Volver</button>
        <button className="btn riesgo" type="submit">{zona?.valorMulta ? 'Aplicar multa' : 'Marcar como incumplida'}</button>
      </>}>
      {r && (
        <div className="pila">
          {zona.valorMulta ? (
            <div className="ficha no">
              <div className="titular"><span className="dato">{pesos(zona.valorMulta)}</span></div>
              <div className="meta">Multa del tipo {zona.nombre} · vence el {fechaConDia(leer(vencimiento))}, con la cuota del periodo.</div>
            </div>
          ) : (
            <div className="ficha">
              <div className="titular">Esta zona no tiene multa</div>
              <div className="meta">El tipo {zona.nombre} tiene la multa en $ 0. La reserva queda incumplida y no se genera cobro.</div>
            </div>
          )}
          <dl className="datos fila-unica">
            <div><dt>A cargo de</dt><dd>{r.propietario} · <Unidad>{r.inmuebleQuePaga}</Unidad></dd></div>
            <div><dt>Quién la pidió</dt><dd>{pidio(r)}</dd></div>
          </dl>
          <p className="guia">
            La multa la paga siempre el propietario del inmueble que paga la reserva, aunque la haya pedido un arrendatario o un
            residente autorizado.
          </p>
          <Campo rotulo="Motivo de la multa" ayuda="Di qué pasó y a qué hora. Queda en la obligación y lo ve el propietario." error={error}>
            <textarea value={motivo} placeholder="Entregó el salón a la 1:30 a. m., fuera del horario, con dos sillas rotas."
              onChange={(e) => { setMotivo(e.target.value); if (e.target.value.trim()) setError(null) }} />
          </Campo>
        </div>
      )}
    </Dialogo>
  )
}
