import { useState } from 'react'

import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga, Pestanas, Segmentos } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { HOY_DE_EJEMPLO, OBLIGADO_DEL_PAGO, notificacionesDeEjemplo } from '../../datos/administracion.js'
import { hora } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-17 Configurar notificaciones: NotificacionServicio.configurarEvento(evento, destinatario, estaHabilitada) (RF-107, RN-28, RN-29).
// new ConfiguracionNotificacion(evento, destinatario) si el evento no tiene configuración; configurarEventoDeNotificacion().
// Historial: Notificacion.resultadoEnvio (ENVIADA, FALLIDA, SIN_CONFIRMACION); reintento con enviarNotificacionAlDestinatario()
// y registrarResultadoDelEnvio(resultadoEnvio) (RN-30).
// Sin API todavía: datos de ejemplo de src/datos/administracion.js.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
  'noviembre', 'diciembre']
const RESULTADOS = { ENVIADA: ['ok', 'Enviada'], FALLIDA: ['no', 'Fallida'], SIN_CONFIRMACION: ['al', 'Sin confirmación'] }
const FILTRO_RESULTADO = [
  { valor: '', texto: 'Todas' },
  { valor: 'FALLIDA', texto: 'Fallidas' },
  { valor: 'SIN_CONFIRMACION', texto: 'Sin confirmación' },
  { valor: 'ENVIADA', texto: 'Enviadas' },
]
const AYUDA_RESIDENTES = 'Residentes del inmueble son los propietarios residentes y los arrendatarios con vinculación vigente.'

function leer(texto) {
  const [anio, mes, dia, h = 0, m = 0] = texto.split(/[-T:]/).map(Number)
  return new Date(anio, mes - 1, dia, h, m)
}
const HOY = leer(HOY_DE_EJEMPLO)
const horaCorta = (d) => (d.getHours() === 12 && d.getMinutes() === 0 ? '12:00 m.' : hora(d))
function fechaRelativa(d) {
  const n = Math.round((HOY - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
  return n === 0 ? 'Hoy' : n === 1 ? 'Ayer' : `${d.getDate()} de ${MESES[d.getMonth()]}`
}

/** "Obligado del pago del inmueble" -> "al obligado del pago del inmueble". */
function aQuien(destinatario) {
  const d = destinatario.charAt(0).toLowerCase() + destinatario.slice(1)
  if (/^(obligado|responsable|titular|consejo)/.test(d)) return `al ${d}`
  if (/^residentes/.test(d)) return `a los ${d}`
  if (/^administración/.test(d)) return `a la ${d}`
  return `a ${d}`
}

function ConIdentificadores({ texto }) {
  return texto.split(/\b([A-Z]-[0-9]{2,4})\b/).map((parte, i) => (i % 2 ? <span key={i} className="identificador">{parte}</span> : parte))
}

function enfocarPrimerError() {
  requestAnimationFrame(() => {
    const abiertos = document.querySelectorAll('dialog[open]')
    abiertos[abiertos.length - 1]?.querySelector('[aria-invalid="true"]')?.focus()
  })
}

export default function Notificaciones() {
  const consulta = useConsulta(() => notificacionesDeEjemplo.consultar())
  const confirmar = useConfirmar()
  const [editados, setEditados] = useState(null)
  const [pestana, setPestana] = useState('configuracion')
  const [filtroResultado, setFiltroResultado] = useState('')
  const [configurando, setConfigurando] = useState(null)

  const datos = editados || consulta.datos
  if (!datos) {
    return (
      <main className="pagina">
        <AvisoDatosDeEjemplo casoDeUso="CU-17" />
        <Encabezado titulo="Notificaciones" />
        <div className="superficie">
          {consulta.error ? <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /> : <Cargando texto="Cargando notificaciones…" />}
        </div>
      </main>
    )
  }

  const { eventos, destinatarios, configuraciones, notificaciones } = datos
  const configuracion = (evento) => configuraciones.find((c) => c.evento === evento)

  const habilitadas = configuraciones.filter((c) => c.estaHabilitada).length
  const fallidas = notificaciones.filter((n) => n.resultadoEnvio === 'FALLIDA').length
  const resumen = `${configuraciones.length} eventos configurados · ${habilitadas} avisos encendidos · `
    + `${fallidas ? `${fallidas}${fallidas === 1 ? ' envío fallido por reintentar' : ' envíos fallidos por reintentar'}` : 'ningún envío fallido'}`
  const visibles = notificaciones.filter((n) => !filtroResultado || n.resultadoEnvio === filtroResultado)

  const encender = (c, estaHabilitada) => {
    setEditados({ ...datos, configuraciones: configuraciones.map((x) => (x.evento === c.evento ? { ...x, estaHabilitada } : x)) })
    const nombre = eventos[c.evento].nombre.toLowerCase()
    confirmar(`Aviso de ${nombre}${estaHabilitada ? ' encendido.' : ' apagado. Ese evento ya no avisa a nadie.'}`, estaHabilitada ? undefined : 'al')
  }

  const guardar = (evento, destinatario, estaHabilitada) => {
    // new ConfiguracionNotificacion(evento, destinatario) si el evento todavía no tiene configuración.
    const nueva = { evento, destinatario, estaHabilitada }
    setEditados({
      ...datos,
      configuraciones: configuracion(evento)
        ? configuraciones.map((c) => (c.evento === evento ? nueva : c))
        : [...configuraciones, nueva],
    })
    confirmar(`Configuración guardada: ${eventos[evento].nombre.toLowerCase()} avisa ${aQuien(destinatario)}${estaHabilitada ? '.' : ', por ahora apagado.'}`)
    setConfigurando(null)
  }

  // Notificacion.enviarNotificacionAlDestinatario() y registrarResultadoDelEnvio(ENVIADA)
  const reintentar = (n) => {
    setEditados({
      ...datos,
      notificaciones: notificaciones.map((x) => (x.id === n.id ? { ...x, resultadoEnvio: 'ENVIADA', reintento: `hoy, ${hora(new Date())}` } : x)),
    })
    confirmar(`Notificación reenviada a ${n.destinatario}. El envío quedó registrado como enviado.`)
  }

  return (
    <main className="pagina">
      <AvisoDatosDeEjemplo casoDeUso="CU-17" />
      <Encabezado titulo="Notificaciones" guia={resumen}
        acciones={<button className="btn" type="button" onClick={() => setConfigurando({ evento: '' })}>Configurar evento</button>} />

      <Pestanas etiqueta="Notificaciones" activa={pestana} alCambiar={setPestana} pestanas={[
        { id: 'configuracion', texto: 'Qué se avisa y a quién', cuenta: configuraciones.length },
        { id: 'historial', texto: 'Enviadas', cuenta: notificaciones.length },
      ]} />

      {pestana === 'configuracion' && (
        <section role="tabpanel" aria-label="Qué se avisa y a quién">
          <div className="superficie">
            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr><th>Evento</th><th>A quién se le avisa</th><th>Aviso</th><th><span className="solo-lectores">Acciones</span></th></tr>
                </thead>
                <tbody>
                  {configuraciones.map((c) => {
                    const e = eventos[c.evento]
                    return (
                      <tr key={c.evento}>
                        <td><span className="fuerte">{e.nombre}</span><span className="sub">{e.cuando}</span></td>
                        <td>{c.destinatario}{e.cobro && <span className="sub">Aviso de cobro</span>}</td>
                        <td>
                          <label className="interruptor">
                            <input type="checkbox" checked={c.estaHabilitada} onChange={(ev) => encender(c, ev.target.checked)}
                              aria-label={`Avisar cuando ocurra ${e.nombre.toLowerCase()}`} />
                            <span>{c.estaHabilitada ? 'Se envía' : 'No se envía'}</span>
                          </label>
                        </td>
                        <td className="acciones-fila">
                          <button className="btn segundo chico" type="button" onClick={() => setConfigurando({ evento: c.evento })}>Configurar</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="pie">
              <span>
                Los avisos de cobro van siempre al obligado del pago. Los avisos operativos, a los propietarios residentes y arrendatarios
                vigentes del inmueble.
              </span>
            </div>
          </div>
        </section>
      )}

      {pestana === 'historial' && (
        <section role="tabpanel" aria-label="Enviadas">
          <div className="filtros">
            <Segmentos etiqueta="Resultado del envío" opciones={FILTRO_RESULTADO} valor={filtroResultado} alCambiar={setFiltroResultado} />
          </div>
          <div className="superficie">
            {visibles.length > 0 ? (
              <div className="tabla-envoltura">
                <table className="tabla">
                  <thead>
                    <tr><th>Fecha y hora</th><th>Evento</th><th>Destinatario</th><th>Contenido</th><th>Resultado</th><th><span className="solo-lectores">Acciones</span></th></tr>
                  </thead>
                  <tbody>
                    {visibles.map((n) => {
                      const d = leer(n.fechaHora)
                      const [tono, texto] = RESULTADOS[n.resultadoEnvio]
                      return (
                        <tr key={n.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{fechaRelativa(d)}<span className="sub num">{horaCorta(d)}</span></td>
                          <td><span className="etiqueta">{eventos[n.evento].nombre}</span></td>
                          <td>
                            {n.destinatario}
                            {n.unidad ? <span className="sub identificador">{n.unidad}</span> : <span className="sub">Vigilante</span>}
                          </td>
                          <td style={{ minWidth: '18rem' }}><ConIdentificadores texto={n.contenido} /></td>
                          <td><Pildora tono={tono}>{texto}</Pildora>{n.reintento && <span className="sub">Reintentada {n.reintento}</span>}</td>
                          <td className="acciones-fila">
                            {n.resultadoEnvio === 'FALLIDA' && (
                              <button className="btn segundo chico" type="button" onClick={() => reintentar(n)}>Reintentar</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="vacio">
                <h3>No hay notificaciones con ese resultado</h3>
                <p>Cuando un envío falle, aparece aquí para que lo reintentes.</p>
              </div>
            )}
            <div className="pie">
              <span>{visibles.length} de {notificaciones.length} notificaciones de noviembre</span>
              <span>Sin confirmación: el correo salió, pero el proveedor no informó si llegó.</span>
            </div>
          </div>
        </section>
      )}

      <ConfigurarEvento inicial={configurando} eventos={eventos} destinatarios={destinatarios} configuracion={configuracion}
        alCerrar={() => setConfigurando(null)} alGuardar={guardar} />
    </main>
  )
}

// Configurar evento: configurarEvento(evento, destinatario, estaHabilitada)
function ConfigurarEvento({ inicial, eventos, destinatarios, configuracion, alCerrar, alGuardar }) {
  const [valores, setValores] = useState(null)
  const [errores, setErrores] = useState({})

  /** Lo que muestra el diálogo al elegir un evento: su configuración actual o una nueva encendida. */
  const alElegir = (evento) => {
    const c = configuracion(evento)
    const e = eventos[evento]
    return {
      evento,
      destinatario: e?.cobro ? OBLIGADO_DEL_PAGO : (c?.destinatario || ''),
      estaHabilitada: c ? c.estaHabilitada : true,
    }
  }
  const actual = valores || (inicial ? alElegir(inicial.evento) : { evento: '', destinatario: '', estaHabilitada: true })
  const evento = eventos[actual.evento]
  const existente = configuracion(actual.evento)
  const configurados = Object.keys(eventos).filter((k) => configuracion(k))
  const nuevos = Object.keys(eventos).filter((k) => !configuracion(k))
  const opcion = (k) => <option key={k} value={k}>{eventos[k].nombre}</option>

  const cerrar = () => { setValores(null); setErrores({}); alCerrar() }
  const enviar = () => {
    const faltan = {}
    if (!actual.evento) faltan.evento = 'Elige el evento que dispara el aviso.'
    if (!actual.destinatario) faltan.destinatario = 'Elige a quién le llega el aviso.'
    setErrores(faltan)
    if (Object.keys(faltan).length) { enfocarPrimerError(); return }
    alGuardar(actual.evento, actual.destinatario, actual.estaHabilitada)
    setValores(null)
  }

  return (
    <Dialogo abierto={!!inicial} alCerrar={cerrar} titulo="Configurar evento"
      guia="Elige qué evento avisa, a quién y si el aviso está encendido." alEnviar={enviar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit">Guardar configuración</button>
      </>}>
      <div className="formulario">
        <Campo rotulo="Evento" error={errores.evento}
          ayuda={evento && `Se dispara cuando: ${evento.cuando.charAt(0).toLowerCase()}${evento.cuando.slice(1)}.`}>
          <select value={actual.evento} onChange={(e) => { setValores(alElegir(e.target.value)); setErrores({}) }}>
            <option value="">Elige un evento</option>
            <optgroup label="Ya configurados">{configurados.map(opcion)}</optgroup>
            {nuevos.length > 0 && <optgroup label="Sin configurar">{nuevos.map(opcion)}</optgroup>}
          </select>
        </Campo>
        {/* Avisos de cobro: siempre al obligado del pago (RN-28). */}
        <Campo rotulo="A quién se le avisa" error={errores.destinatario}
          ayuda={evento?.cobro ? 'Es un aviso de cobro: siempre le llega al obligado del pago del inmueble.' : AYUDA_RESIDENTES}>
          <select value={actual.destinatario} disabled={!!evento?.cobro}
            onChange={(e) => { setValores({ ...actual, destinatario: e.target.value }); setErrores({ ...errores, destinatario: null }) }}>
            <option value="">Elige un destinatario</option>
            {destinatarios.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Campo>
        <label className="interruptor">
          <input type="checkbox" checked={actual.estaHabilitada} onChange={(e) => setValores({ ...actual, estaHabilitada: e.target.checked })} />
          <span>Enviar este aviso cuando ocurra el evento</span>
        </label>
        {evento && (
          <div className="aviso">
            <p>
              {existente
                ? `Cambias la configuración actual: hoy avisa ${aQuien(existente.destinatario)} y ${existente.estaHabilitada ? 'está encendido.' : 'está apagado.'}`
                : 'Este evento todavía no avisa a nadie. Su configuración se crea al guardar.'}
            </p>
          </div>
        )}
      </div>
    </Dialogo>
  )
}
