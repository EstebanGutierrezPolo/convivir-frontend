import { useState } from 'react'

import { AvisoDatosDeEjemplo, Buscador, Cargando, Encabezado, ErrorDeCarga, Pestanas, Segmentos } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { HOY_DE_EJEMPLO, reportesDeEjemplo } from '../../datos/administracion.js'
import { hora } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-16 Gestionar reporte: Reporte.asignarResponsableDelReporte(responsable), Reporte.cambiarEstadoDelReporte(nuevoEstado),
// SeguimientoReporte(observacion).registrarObservacionDeSeguimiento(), Reporte.cerrarReporteConSolucion(solucion).
// Extensión Administrar categorías de reporte (RF-100, RF-110, RF-111).
// Sin API todavía: datos de ejemplo de src/datos/administracion.js.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
  'noviembre', 'diciembre']
const ESTADOS = { ABIERTO: ['al', 'Abierto'], EN_PROCESO: ['ne', 'En proceso'], CERRADO: ['ok', 'Cerrado'] }
const FILTRO_ESTADO = [
  { valor: '', texto: 'Todos' },
  { valor: 'ABIERTO', texto: 'Abiertos' },
  { valor: 'EN_PROCESO', texto: 'En proceso' },
  { valor: 'CERRADO', texto: 'Cerrados' },
]
const SIN_FILTRO = { texto: '', estado: '', categoria: '', sinAsignar: false }

// ---------- Fechas ----------
function leer(texto) {
  const [anio, mes, dia, h = 0, m = 0] = texto.split(/[-T:]/).map(Number)
  return new Date(anio, mes - 1, dia, h, m)
}
const HOY = leer(HOY_DE_EJEMPLO)
const horaCorta = (d) => (d.getHours() === 12 && d.getMinutes() === 0 ? '12:00 m.' : hora(d))
const diasDesde = (d) => Math.round((HOY - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
function fechaRelativa(d) {
  const n = diasDesde(d)
  return n === 0 ? 'Hoy' : n === 1 ? 'Ayer' : `${d.getDate()} de ${MESES[d.getMonth()]}`
}
function hace(d) {
  const n = diasDesde(d)
  return n === 0 ? 'hoy' : n === 1 ? 'hace 1 día' : `hace ${n} días`
}
/** El día de ejemplo con la hora de ahora, para el seguimiento nuevo. */
function ahora() {
  const d = new Date()
  return `${HOY_DE_EJEMPLO}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const sinAsignar = (r) => !r.responsable && r.estado !== 'CERRADO'
const EstadoReporte = ({ estado }) => <Pildora tono={ESTADOS[estado][0]}>{ESTADOS[estado][1]}</Pildora>
const Inmueble = ({ texto }) => (/^[A-Z]-\d+$/.test(texto) ? <span className="identificador">{texto}</span> : texto)

function enfocarPrimerError() {
  requestAnimationFrame(() => {
    const abiertos = document.querySelectorAll('dialog[open]')
    abiertos[abiertos.length - 1]?.querySelector('[aria-invalid="true"]')?.focus()
  })
}

export default function Reportes() {
  const consulta = useConsulta(() => reportesDeEjemplo.consultar())
  const confirmar = useConfirmar()
  const [editados, setEditados] = useState(null)
  const [pestana, setPestana] = useState('reportes')
  const [filtro, setFiltro] = useState(SIN_FILTRO)
  const [detalleId, setDetalleId] = useState(null)
  const [accion, setAccion] = useState(null)
  const [categoriaEditando, setCategoriaEditando] = useState(null)
  const [desactivando, setDesactivando] = useState(null)

  const datos = editados || consulta.datos
  if (!datos) {
    return (
      <main className="pagina">
        <AvisoDatosDeEjemplo casoDeUso="CU-16" />
        <Encabezado titulo="Reportes" />
        <div className="superficie">
          {consulta.error ? <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /> : <Cargando texto="Cargando reportes…" />}
        </div>
      </main>
    )
  }

  const { reportes, categorias, responsables } = datos
  const categoria = (id) => categorias.find((c) => c.id === id)
  const cargo = (nombre) => responsables.find((p) => p.nombre === nombre)?.cargo
  const actual = reportes.find((r) => r.id === detalleId) || null

  const cambiarReporte = (cambios) => setEditados({
    ...datos, reportes: reportes.map((r) => (r.id === detalleId ? { ...r, ...cambios } : r)),
  })
  const poner = (campo, valor) => setFiltro({ ...filtro, [campo]: valor })

  const busca = filtro.texto.trim().toLowerCase()
  const visibles = reportes.filter((r) =>
    (!busca || `${r.id} ${r.descripcion} ${r.inmueble} ${r.creadoPor} ${r.responsable || ''}`.toLowerCase().includes(busca))
    && (!filtro.estado || r.estado === filtro.estado)
    && (!filtro.categoria || r.categoriaId === Number(filtro.categoria))
    && (!filtro.sinAsignar || sinAsignar(r)))

  const sin = reportes.filter(sinAsignar).length
  const enProceso = reportes.filter((r) => r.estado === 'EN_PROCESO').length
  const cerrados = reportes.filter((r) => r.estado === 'CERRADO').length
  const resumen = `${sin ? `${sin} sin asignar` : 'Todos tienen responsable'} · ${enProceso} en proceso · ${cerrados} cerrados este mes`

  // ---------- Acciones sobre el reporte ----------
  const asignar = (responsable) => {
    cambiarReporte({ responsable })
    confirmar(`Responsable asignado: ${responsable}. Le avisamos por correo.`)
    setAccion(null)
  }
  const registrarSeguimiento = (nuevoEstado, observacion) => {
    const cambiaEstado = accion === 'estado'
    cambiarReporte({
      estado: cambiaEstado ? nuevoEstado : actual.estado,
      seguimientos: [...actual.seguimientos, { fecha: ahora(), observacion }],
    })
    confirmar(cambiaEstado
      ? `Estado cambiado a ${ESTADOS[nuevoEstado][1].toLowerCase()}. La observación quedó en el seguimiento.`
      : 'Observación registrada en el seguimiento.')
    setAccion(null)
  }
  const cerrarConSolucion = (solucion) => {
    cambiarReporte({ estado: 'CERRADO', solucion })
    confirmar(`Reporte cerrado. Le avisamos a ${actual.creadoPor} con la solución.`)
    setAccion(null)
  }

  // ---------- Categorías ----------
  const guardarCategoria = (nombre, descripcion) => {
    if (categoriaEditando.id) {
      setEditados({ ...datos, categorias: categorias.map((c) => (c.id === categoriaEditando.id ? { ...c, nombre, descripcion } : c)) })
      confirmar(`Categoría modificada: ${nombre}.`)
    } else {
      const id = Math.max(0, ...categorias.map((c) => c.id)) + 1
      setEditados({ ...datos, categorias: [...categorias, { id, nombre, descripcion, reportes: 0, estado: 'ACTIVO' }] })
      confirmar(`Categoría creada: ${nombre}. Ya aparece al crear un reporte.`)
    }
    setCategoriaEditando(null)
  }
  const desactivarCategoria = () => {
    setEditados({ ...datos, categorias: categorias.map((c) => (c.id === desactivando.id ? { ...c, estado: 'INACTIVO' } : c)) })
    confirmar(`Categoría desactivada: ${desactivando.nombre}.`)
    setDesactivando(null)
  }
  const abiertosDe = (c) => reportes.filter((r) => r.categoriaId === c.id && r.estado !== 'CERRADO').length

  return (
    <main className="pagina">
      <AvisoDatosDeEjemplo casoDeUso="CU-16" />
      <Encabezado titulo="Reportes" guia={resumen} />

      <Pestanas etiqueta="Reportes y categorías" activa={pestana} alCambiar={setPestana} pestanas={[
        { id: 'reportes', texto: 'Reportes', cuenta: reportes.length },
        { id: 'categorias', texto: 'Categorías', cuenta: categorias.length },
      ]} />

      {pestana === 'reportes' && (
        <section role="tabpanel" aria-label="Reportes">
          <div className="filtros">
            <Buscador valor={filtro.texto} alCambiar={(v) => poner('texto', v)} placeholder="Descripción, inmueble o persona"
              etiqueta="Buscar reporte" />
            <Segmentos etiqueta="Estado" opciones={FILTRO_ESTADO} valor={filtro.estado} alCambiar={(v) => poner('estado', v)} />
            <label className="campo">
              <span className="solo-lectores">Categoría</span>
              <select value={filtro.categoria} onChange={(e) => poner('categoria', e.target.value)}>
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}{c.estado === 'INACTIVO' ? ' (inactiva)' : ''}</option>
                ))}
              </select>
            </label>
            <label className="opcion">
              <input type="checkbox" checked={filtro.sinAsignar} onChange={(e) => poner('sinAsignar', e.target.checked)} /> Solo sin asignar
            </label>
          </div>

          <div className="superficie">
            {visibles.length > 0 ? (
              <div className="tabla-envoltura">
                <table className="tabla">
                  <thead>
                    <tr><th>Reporte</th><th>Categoría</th><th>Inmueble</th><th>Creado</th><th>Responsable</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {visibles.map((r) => {
                      const creado = leer(r.creado)
                      return (
                        <tr key={r.id}>
                          {/* La descripción se corta a dos líneas en la tabla; completa se lee en el detalle. */}
                          <td className="descripcion" style={{ minWidth: '16rem', maxWidth: '26rem' }}>
                            <a className="fila-enlace identificador" href={`#${r.id}`}
                              onClick={(e) => { e.preventDefault(); setDetalleId(r.id) }}>{r.id}</a>
                            <span className="sub resumen" style={{
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>{r.descripcion}</span>
                          </td>
                          <td><span className="etiqueta">{categoria(r.categoriaId).nombre}</span></td>
                          <td><Inmueble texto={r.inmueble} /></td>
                          <td>{fechaRelativa(creado)}, {horaCorta(creado)}<span className="sub">{r.creadoPor}</span></td>
                          <td>
                            {r.responsable
                              ? <>{r.responsable}<span className="sub">{cargo(r.responsable)}</span></>
                              : r.estado === 'CERRADO' ? <span className="guia">Nadie</span> : <Pildora tono="al">Sin asignar</Pildora>}
                          </td>
                          <td>
                            <EstadoReporte estado={r.estado} />
                            {r.estado !== 'CERRADO' && <span className="sub">Abierto {hace(creado)}</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="vacio">
                <h3>Ningún reporte coincide con los filtros</h3>
                <p>Prueba con otro estado o categoría, o busca por la unidad, por ejemplo <span className="identificador">B-0302</span>.</p>
                <button className="btn segundo" type="button" onClick={() => setFiltro(SIN_FILTRO)}>Quitar filtros</button>
              </div>
            )}
            <div className="pie">
              <span>{visibles.length} de {reportes.length} reportes de noviembre</span>
              <span>Los reportes cerrados conservan su seguimiento.</span>
            </div>
          </div>
        </section>
      )}

      {pestana === 'categorias' && (
        <section role="tabpanel" aria-label="Categorías">
          <div className="fila entre" style={{ marginBottom: 'var(--e4)' }}>
            <p className="guia">Los residentes y los vigilantes eligen una categoría activa al crear un reporte.</p>
            <button className="btn" type="button" onClick={() => setCategoriaEditando({})}>Crear categoría</button>
          </div>
          <div className="superficie">
            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr><th>Categoría</th><th>Descripción</th><th className="num">Reportes</th><th>Estado</th><th><span className="solo-lectores">Acciones</span></th></tr>
                </thead>
                <tbody>
                  {categorias.map((c) => {
                    const activa = c.estado === 'ACTIVO'
                    return (
                      <tr key={c.id}>
                        <td className="fuerte">{c.nombre}</td>
                        <td style={{ minWidth: '16rem' }}>{c.descripcion}</td>
                        <td className="num">{c.reportes}</td>
                        <td>{activa ? <Pildora tono="ok">Activa</Pildora> : <Pildora tono="ne">Inactiva</Pildora>}</td>
                        <td className="acciones-fila">
                          {activa ? (
                            <>
                              <button className="btn segundo chico" type="button" onClick={() => setCategoriaEditando(c)}>Modificar</button>{' '}
                              <button className="btn texto chico" type="button" onClick={() => setDesactivando(c)}>Desactivar</button>
                            </>
                          ) : <span className="guia">Ya no se puede elegir</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Detalle del reporte (RF-095): descripción, evidencia y SeguimientoReporte */}
      <Dialogo abierto={!!actual} alCerrar={() => { setAccion(null); setDetalleId(null) }} ancho
        titulo={<>Reporte <span className="identificador">{actual?.id}</span></>}
        guia={actual && `${categoria(actual.categoriaId).nombre} · creado ${fechaRelativa(leer(actual.creado)).toLowerCase().replace(/^(\d)/, 'el $1')} a las ${horaCorta(leer(actual.creado))}`}
        pie={actual && (actual.estado === 'CERRADO'
          ? <button className="btn segundo" type="button" onClick={() => setDetalleId(null)}>Volver a la lista</button>
          : <>
            <button className="btn segundo" type="button" onClick={() => setAccion('responsable')}>
              {actual.responsable ? 'Cambiar responsable' : 'Asignar responsable'}
            </button>
            <button className="btn segundo" type="button" onClick={() => setAccion('estado')}>Cambiar estado</button>
            <button className="btn segundo" type="button" onClick={() => setAccion('observacion')}>Registrar observación</button>
            <button className="btn" type="button" onClick={() => setAccion('cerrar')}>Cerrar con solución</button>
          </>)}>
        {actual && <DetalleReporte reporte={actual} cargo={cargo} />}
      </Dialogo>

      <AsignarResponsable reporte={accion === 'responsable' ? actual : null} responsables={responsables}
        alCerrar={() => setAccion(null)} alAsignar={asignar} />
      <RegistrarSeguimiento reporte={accion === 'estado' || accion === 'observacion' ? actual : null} modo={accion}
        alCerrar={() => setAccion(null)} alRegistrar={registrarSeguimiento} />
      <CerrarReporte reporte={accion === 'cerrar' ? actual : null} alCerrar={() => setAccion(null)} alCerrarReporte={cerrarConSolucion} />

      <EditarCategoria categoria={categoriaEditando} alCerrar={() => setCategoriaEditando(null)} alGuardar={guardarCategoria} />

      {/* Desactivar categoría: CategoriaReporte.desactivarCategoriaDeReporte() */}
      <Dialogo abierto={!!desactivando} alCerrar={() => setDesactivando(null)} titulo="Desactivar categoría"
        guia={desactivando?.nombre} alEnviar={desactivarCategoria}
        pie={<>
          <button className="btn segundo" type="button" onClick={() => setDesactivando(null)}>Volver</button>
          <button className="btn riesgo" type="submit">Desactivar categoría</button>
        </>}>
        {desactivando && (
          <p>
            Los {desactivando.reportes} reportes que ya la tienen la conservan
            {abiertosDe(desactivando) ? `, incluidos ${abiertosDe(desactivando)} que siguen abiertos` : ''}.
            Desde ahora nadie podrá elegirla al crear un reporte.
          </p>
        )}
      </Dialogo>
    </main>
  )
}

function DetalleReporte({ reporte: r, cargo }) {
  const creado = leer(r.creado)
  return (
    <div className="pila" style={{ gap: 'var(--e5)' }}>
      <div className="fila">
        <EstadoReporte estado={r.estado} />
        {sinAsignar(r) && <>{' '}<Pildora tono="al">Sin asignar</Pildora></>}
        {r.estado !== 'CERRADO' && <>{' '}<span className="guia">Abierto {hace(creado)}</span></>}
      </div>
      <p>{r.descripcion}</p>
      <dl className="datos">
        <div><dt>Inmueble</dt><dd><Inmueble texto={r.inmueble} /></dd></div>
        <div><dt>Lo creó</dt><dd>{r.creadoPor}<span className="guia" style={{ display: 'block' }}>{r.rolCreador}</span></dd></div>
        <div>
          <dt>Responsable</dt>
          <dd>
            {r.responsable
              ? <>{r.responsable}<span className="guia" style={{ display: 'block' }}>{cargo(r.responsable)}</span></>
              : r.estado === 'CERRADO' ? 'Nadie' : <Pildora tono="al">Sin asignar</Pildora>}
          </dd>
        </div>
        <div>
          <dt>Evidencia</dt>
          <dd>
            {r.evidencia
              ? <span className="dato" style={{ fontSize: 'var(--t-sm)' }}>{r.evidencia}</span>
              : <span className="guia">Sin evidencia adjunta</span>}
          </dd>
        </div>
      </dl>
      {r.estado === 'CERRADO' && (
        <div className="ficha ok">
          <div className="fuerte">Solución aplicada</div>
          <div className="meta" style={{ color: 'var(--tinta)' }}>{r.solucion}</div>
        </div>
      )}
      <div>
        <h3 style={{ fontSize: 'var(--t-base)', marginBottom: 'var(--e4)' }}>Seguimiento</h3>
        <ol className="linea-tiempo">
          <li className="az">
            <div className="cuando">{fechaRelativa(creado)}, {horaCorta(creado)}</div>
            <div className="que">Reporte creado por {r.creadoPor}</div>
          </li>
          {r.seguimientos.map((s, i) => {
            const f = leer(s.fecha)
            return (
              <li key={i}>
                <div className="cuando">{fechaRelativa(f)}, {horaCorta(f)}</div>
                <div className="detalle">{s.observacion}</div>
              </li>
            )
          })}
          {!r.seguimientos.length && r.estado !== 'CERRADO' && (
            <li><div className="detalle guia">Todavía no hay observaciones. Registra la primera cuando empiece la atención.</div></li>
          )}
        </ol>
      </div>
    </div>
  )
}

const GuiaReporte = ({ reporte }) => reporte && <><span className="identificador">{reporte.id}</span> · {reporte.descripcion}</>

// Asignar responsable: Reporte.asignarResponsableDelReporte(responsable) → EventoSistema REPORTE_ASIGNADO
function AsignarResponsable({ reporte, responsables, alCerrar, alAsignar }) {
  const [elegido, setElegido] = useState(null)
  const [error, setError] = useState(null)
  const valor = elegido ?? (reporte?.responsable || '')

  const cerrar = () => { setElegido(null); setError(null); alCerrar() }
  const enviar = () => {
    if (!valor) { setError('Elige quién va a atender el reporte.'); enfocarPrimerError(); return }
    alAsignar(valor)
    setElegido(null)
    setError(null)
  }

  return (
    <Dialogo abierto={!!reporte} alCerrar={cerrar} titulo="Asignar responsable" guia={<GuiaReporte reporte={reporte} />}
      alEnviar={enviar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Volver</button>
        <button className="btn" type="submit">Asignar responsable</button>
      </>}>
      <Campo rotulo="Responsable" ayuda="Le avisamos por correo que tiene este reporte a su cargo." error={error}>
        <select value={valor} onChange={(e) => { setElegido(e.target.value); if (e.target.value) setError(null) }}>
          <option value="">Elige una persona</option>
          {responsables.map((p) => <option key={p.nombre} value={p.nombre}>{p.nombre} · {p.cargo}</option>)}
        </select>
      </Campo>
    </Dialogo>
  )
}

// Cambiar estado y registrar observación: registrarSeguimiento(reporteId, nuevoEstado, observacion)
function RegistrarSeguimiento({ reporte, modo, alCerrar, alRegistrar }) {
  const [estado, setEstado] = useState(null)
  const [observacion, setObservacion] = useState('')
  const [errores, setErrores] = useState({})
  const cambiaEstado = modo === 'estado'
  const nuevoEstado = estado ?? (reporte?.estado === 'ABIERTO' ? 'EN_PROCESO' : 'ABIERTO')
  const titulo = cambiaEstado ? 'Cambiar estado' : 'Registrar observación'

  const cerrar = () => { setEstado(null); setObservacion(''); setErrores({}); alCerrar() }
  const enviar = () => {
    const nuevos = {}
    if (!observacion.trim()) nuevos.observacion = 'Escribe la observación. Queda en el seguimiento y la ve quien creó el reporte.'
    else if (cambiaEstado && nuevoEstado === reporte.estado) {
      nuevos.estado = `El reporte ya está ${ESTADOS[reporte.estado][1].toLowerCase()}. Elige otro estado, o usa Registrar observación para anotar sin cambiarlo.`
    }
    setErrores(nuevos)
    if (Object.keys(nuevos).length) { enfocarPrimerError(); return }
    alRegistrar(nuevoEstado, observacion.trim())
    setEstado(null)
    setObservacion('')
  }

  return (
    <Dialogo abierto={!!reporte} alCerrar={cerrar} titulo={titulo} guia={<GuiaReporte reporte={reporte} />} alEnviar={enviar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Volver</button>
        <button className="btn" type="submit">{titulo}</button>
      </>}>
      <div className="formulario">
        {cambiaEstado && (
          <Campo rotulo="Nuevo estado" ayuda="Para cerrarlo usa Cerrar con solución: la solución es obligatoria." error={errores.estado}>
            <select value={nuevoEstado} onChange={(e) => { setEstado(e.target.value); setErrores({ ...errores, estado: null }) }}>
              <option value="ABIERTO">Abierto</option>
              <option value="EN_PROCESO">En proceso</option>
            </select>
          </Campo>
        )}
        <Campo rotulo="Observación" ayuda="Queda en el seguimiento y la ve quien creó el reporte." error={errores.observacion}>
          <textarea value={observacion} placeholder="Se pidió cotización para cambiar las dos luminarias."
            onChange={(e) => { setObservacion(e.target.value); if (e.target.value.trim()) setErrores({ ...errores, observacion: null }) }} />
        </Campo>
      </div>
    </Dialogo>
  )
}

// Cerrar: Reporte.cerrarReporteConSolucion(solucion) → EventoSistema REPORTE_CERRADO
function CerrarReporte({ reporte, alCerrar, alCerrarReporte }) {
  const [solucion, setSolucion] = useState('')
  const [error, setError] = useState(null)

  const cerrar = () => { setSolucion(''); setError(null); alCerrar() }
  const enviar = () => {
    if (!solucion.trim()) { setError('Escribe la solución aplicada. Sin ella no se puede cerrar el reporte.'); enfocarPrimerError(); return }
    alCerrarReporte(solucion.trim())
    setSolucion('')
  }

  return (
    <Dialogo abierto={!!reporte} alCerrar={cerrar} titulo="Cerrar con solución" guia={<GuiaReporte reporte={reporte} />}
      alEnviar={enviar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Volver</button>
        <button className="btn" type="submit">Cerrar reporte</button>
      </>}>
      <Campo rotulo="Solución aplicada" error={error}
        ayuda={reporte && `La ve ${reporte.creadoPor}, que creó el reporte. Le avisamos por correo al cerrarlo.`}>
        <textarea value={solucion} placeholder="Se cambiaron las dos luminarias del pasillo por unas LED."
          onChange={(e) => { setSolucion(e.target.value); if (e.target.value.trim()) setError(null) }} />
      </Campo>
    </Dialogo>
  )
}

// Crear o modificar categoría: new CategoriaReporte(nombre).crearCategoriaDeReporte(), modificarCategoriaDeReporte()
function EditarCategoria({ categoria, alCerrar, alGuardar }) {
  const [datos, setDatos] = useState(null)
  const [errores, setErrores] = useState({})
  const esNueva = !categoria?.id
  const valores = datos || { nombre: categoria?.nombre || '', descripcion: categoria?.descripcion || '' }

  const poner = (campo) => (e) => {
    setDatos({ ...valores, [campo]: e.target.value })
    if (e.target.value.trim() && errores[campo]) setErrores({ ...errores, [campo]: null })
  }
  const cerrar = () => { setDatos(null); setErrores({}); alCerrar() }
  const enviar = () => {
    const nuevos = {}
    if (!valores.nombre.trim()) nuevos.nombre = 'Escribe el nombre de la categoría, por ejemplo Ascensores.'
    if (!valores.descripcion.trim()) nuevos.descripcion = 'Escribe una descripción corta. Ayuda a elegir bien la categoría al crear un reporte.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length) { enfocarPrimerError(); return }
    alGuardar(valores.nombre.trim(), valores.descripcion.trim())
    setDatos(null)
  }

  return (
    <Dialogo abierto={!!categoria} alCerrar={cerrar} titulo={esNueva ? 'Crear categoría' : 'Modificar categoría'}
      guia="Quien crea un reporte la ve en la lista con su descripción." alEnviar={enviar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Volver</button>
        <button className="btn" type="submit">{esNueva ? 'Crear categoría' : 'Guardar cambios'}</button>
      </>}>
      <div className="formulario">
        <Campo rotulo="Nombre" error={errores.nombre}>
          <input value={valores.nombre} onChange={poner('nombre')} placeholder="Ascensores" autoComplete="off" />
        </Campo>
        <Campo rotulo="Descripción" error={errores.descripcion}>
          <textarea value={valores.descripcion} onChange={poner('descripcion')}
            placeholder="Fallas, ruidos o atrapamientos en los ascensores de las torres." />
        </Campo>
      </div>
    </Dialogo>
  )
}
