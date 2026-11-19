import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router'

import { useSesion } from '../../aplicacion/sesion.jsx'
import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga, Segmentos } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { INMUEBLE, fechaLarga, momento, reportesApi } from '../../datos/residente.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-15 Crear reporte · Reporte(descripcion).crearReporteDeNovedad() (RF-090), evidencia (RF-091)
// CategoriaReporte ACTIVA; inmueble opcional con vinculación vigente (RN-33, 403). Para ver el 403, crea un reporte,
// elige Otro inmueble y escribe B-0402.
// Consultar reportes propios y del inmueble con su SeguimientoReporte (RF-092, RF-093), solo lectura. Datos de ejemplo.

// Campo para adjuntar una imagen y seguimiento a todo el ancho del renglón. Solo tokens.
const ESTILOS = `
.adjunto {
  display: flex; align-items: center; gap: var(--e3); flex-wrap: wrap;
  padding: var(--e3);
  border: 1px dashed var(--borde);
  border-radius: var(--r-control);
  background: var(--fondo);
  cursor: pointer;
  min-width: 0;
}
.adjunto:hover { background: var(--concreto); }
.adjunto:focus-within { outline: 2px solid var(--convivir); outline-offset: 2px; }
.adjunto.con-archivo { border-style: solid; background: var(--papel); }
.adjunto[aria-invalid="true"] { border-color: var(--no); }
.adjunto img { width: 48px; height: 48px; object-fit: cover; border-radius: var(--r-control); border: 1px solid var(--borde); flex: none; }
.adjunto .nombre-archivo { min-width: 0; flex: 1; font-size: var(--t-sm); overflow-wrap: anywhere; }
.adjunto .nombre-archivo small { display: block; color: var(--acero); font-size: var(--t-xs); }
.lista > li > .seguimiento { flex-basis: 100%; padding-top: var(--e3); }
`

const FILTROS = [
  { valor: 'curso', texto: 'En curso' },
  { valor: 'CERRADO', texto: 'Cerrados' },
  { valor: '', texto: 'Todos' },
]
const ESTADOS = {
  ABIERTO: <Pildora tono="al">Abierto</Pildora>,
  EN_PROCESO: <Pildora tono="ne">En proceso</Pildora>,
  CERRADO: <Pildora tono="ok">Cerrado</Pildora>,
}
const MAXIMO = 5 * 1024 * 1024

export default function Reportes() {
  const { hash } = useLocation()
  const consulta = useConsulta(() => reportesApi.consultar())
  const [filtro, setFiltro] = useState('curso')
  const [abiertos, setAbiertos] = useState({})
  const [creando, setCreando] = useState(hash === '#crear')

  const reportes = consulta.datos?.reportes || []
  const visibles = reportes.filter((r) => (filtro === 'curso' ? r.estado !== 'CERRADO' : !filtro || r.estado === filtro))
  let tituloVacio = 'Todavía no has creado reportes'
  if (filtro === 'CERRADO') tituloVacio = 'No tienes reportes cerrados'
  else if (filtro === 'curso') tituloVacio = 'No tienes reportes en curso'

  const crearReporte = <button className="btn" type="button" onClick={() => setCreando(true)}>Crear reporte</button>

  return (
    <main className="pagina media">
      <style href="convivir-residente-reportes" precedence="default">{ESTILOS}</style>
      <AvisoDatosDeEjemplo casoDeUso="CU-15" />
      <Encabezado titulo="Reportes"
        guia="Daños, problemas de seguridad o de convivencia. La administración los asigna y te cuenta cómo van."
        acciones={crearReporte} />

      <div className="filtros">
        <Segmentos etiqueta="Estado" opciones={FILTROS} valor={filtro} alCambiar={setFiltro} />
      </div>

      <div className="superficie">
        {!consulta.datos && consulta.cargando && <Cargando texto="Cargando tus reportes…" />}
        {consulta.error && <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} />}
        <ul className="lista">
          {visibles.map((r) => (
            <Reporte key={r.id} reporte={r} abierto={!!abiertos[r.id]}
              alAlternar={() => setAbiertos({ ...abiertos, [r.id]: !abiertos[r.id] })} />
          ))}
        </ul>
        {consulta.datos && visibles.length === 0 && (
          <div className="vacio">
            <svg className="simbolo" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M10 5h14l7 7v23H10z" /><path d="M24 5v7h7M15 20h11M15 26h8" />
            </svg>
            <h3>{tituloVacio}</h3>
            <p>
              Si ves un daño o algo que afecte la convivencia, repórtalo aquí y no por el grupo de WhatsApp: queda registrado y sabes
              en qué va.
            </p>
            <button className="btn segundo" type="button" onClick={() => setCreando(true)}>Crear reporte</button>
          </div>
        )}
      </div>

      <CrearReporte abierto={creando} alCerrar={() => setCreando(false)} categorias={consulta.datos?.categorias || []}
        alCrear={() => { if (filtro === 'CERRADO') setFiltro('curso'); consulta.recargar() }} />
    </main>
  )
}

// ---------- Mis reportes (RF-092, RF-093) ----------

function Reporte({ reporte: r, abierto, alAlternar }) {
  const datos = [`Creado el ${fechaLarga(r.fechaCreacion)}`]
  if (r.inmueble) datos.push(<span className="identificador">{r.inmueble}</span>)
  if (r.evidencia) datos.push('con foto')
  const seguimiento = [...r.seguimiento].reverse()

  return (
    <li>
      <div className="principal">
        <b>{r.categoria} <span className="identificador guia">{r.id}</span></b>
        <p style={{ fontSize: 'var(--t-sm)', margin: '2px 0' }}>{r.descripcion}</p>
        <span>{datos.map((d, i) => <Fragment key={i}>{i > 0 && ' · '}{d}</Fragment>)}</span>
        <span>{r.responsable ? `Lo atiende ${r.responsable}` : 'Sin responsable todavía'}</span>
      </div>
      <div className="fila" style={{ gap: 'var(--e2)' }}>
        {ESTADOS[r.estado]}
        <button className="btn texto chico" type="button" aria-expanded={abierto} aria-controls={`seg-${r.id}`} onClick={alAlternar}>
          {abierto ? 'Ocultar seguimiento' : 'Ver seguimiento'}
        </button>
      </div>
      <div className="seguimiento" id={`seg-${r.id}`} hidden={!abierto}>
        <ol className="linea-tiempo">
          {seguimiento.map((s, i) => (
            <li key={`${s.fecha}-${i}`} className={s.cerrado ? 'ok' : i === 0 ? 'az' : undefined}>
              <div className="cuando">{momento(s.fecha)}</div>
              <div className="que">{s.que}</div>
              {s.detalle && <div className="detalle">{s.detalle}</div>}
            </li>
          ))}
        </ol>
      </div>
    </li>
  )
}

// ---------- Crear reporte: new Reporte(descripcion), crearReporteDeNovedad() ----------

const VACIO = { categoria: '', descripcion: '', inmueble: '', otroInmueble: '' }

/** 734003 -> "717 KB"; 2400000 -> "2,3 MB". */
function peso(bytes) {
  if (bytes < 1048576) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`
}

function CrearReporte({ abierto, alCerrar, categorias, alCrear }) {
  const { sesion } = useSesion()
  const inmueble = sesion.inmuebles?.[0]?.nombre
  const confirmar = useConfirmar()
  const idRotulo = useId()
  const idAyuda = useId()
  const formulario = useRef(null)
  const refArchivo = useRef(null)
  const refVinculo = useRef(null)
  const [datos, setDatos] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [foto, setFoto] = useState(null)
  const [errorFoto, setErrorFoto] = useState(null)
  const [sinVinculo, setSinVinculo] = useState(null)

  // La miniatura usa una URL temporal del navegador: se libera al cambiarla o al cerrar.
  useEffect(() => () => { if (foto) URL.revokeObjectURL(foto.url) }, [foto])
  useEffect(() => { if (sinVinculo) refVinculo.current?.scrollIntoView({ block: 'nearest' }) }, [sinVinculo])

  const poner = (campo, valor) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }

  const quitarFoto = () => {
    if (refArchivo.current) refArchivo.current.value = ''
    setFoto(null)
    setErrorFoto(null)
  }

  // ---------- Evidencia (RF-091) ----------
  const elegirFoto = (e) => {
    const f = e.target.files[0]
    if (!f) { quitarFoto(); return }
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      quitarFoto()
      setErrorFoto(`${f.name} no es una foto. Elige una imagen en JPG, PNG o WEBP.`)
      return
    }
    if (f.size > MAXIMO) {
      quitarFoto()
      setErrorFoto(`La foto pesa ${(f.size / 1048576).toFixed(1).replace('.', ',')} MB. Elige una de hasta 5 MB o tómala con menos resolución.`)
      return
    }
    setErrorFoto(null)
    setFoto({ nombre: f.name, peso: peso(f.size), url: URL.createObjectURL(f) })
  }

  const cerrar = () => {
    setDatos(VACIO)
    setErrores({})
    setSinVinculo(null)
    quitarFoto()
    alCerrar()
  }

  // ---------- Crear reporte: POST /api/reportes ----------
  const crear = async () => {
    const nuevos = {}
    if (!datos.categoria) nuevos.categoria = 'Elige la categoría. Así llega a la persona que lo puede resolver.'
    if (!datos.descripcion.trim()) nuevos.descripcion = 'Describe la novedad: qué pasa, dónde y desde cuándo.'
    if (datos.inmueble === 'otro' && !datos.otroInmueble.trim()) nuevos.otroInmueble = 'Escribe la identificación del inmueble, por ejemplo B-0402.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length) {
      setTimeout(() => formulario.current?.querySelector('[aria-invalid="true"]')?.focus(), 0)
      return
    }
    const relacionado = datos.inmueble === 'otro' ? datos.otroInmueble.trim().toUpperCase() : datos.inmueble
    try {
      await reportesApi.crear({
        categoria: datos.categoria, descripcion: datos.descripcion.trim(), inmueble: relacionado, evidencia: foto ? foto.nombre : '',
      })
      confirmar('Reporte creado. Te avisamos cuando la administración lo asigne.')
      alCrear()
      cerrar()
    } catch (error) {
      // Un residente solo asocia inmuebles con los que tiene vinculación vigente (RN-33, 403).
      if (error.estado === 403) setSinVinculo(relacionado)
      else throw error
    }
  }

  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} titulo="Crear reporte" alEnviar={crear}
      guia="Lo recibe la administración de Villa Campestre."
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit">Crear reporte</button>
      </>}>
      {sinVinculo && (
        <div className="aviso no" role="alert" ref={refVinculo} style={{ marginBottom: 'var(--e4)' }}>
          <p><b>No puedes relacionar el reporte con <span className="identificador">{sinVinculo}</span>.</b></p>
          <p>
            Solo puedes relacionar inmuebles con los que tienes una vinculación vigente. Si el problema viene de otro apartamento, crea el
            reporte sin inmueble y cuéntalo en la descripción: la administración lo relaciona.
          </p>
        </div>
      )}
      <div className="formulario" ref={formulario}>
        <Campo rotulo="Categoría" error={errores.categoria}>
          <select value={datos.categoria} onChange={(e) => poner('categoria', e.target.value)}>
            <option value="">Elige una categoría</option>
            {categorias.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Qué pasa" ayuda="Di qué pasa, dónde y desde cuándo." error={errores.descripcion}>
          <textarea maxLength={1000} value={datos.descripcion} onChange={(e) => poner('descripcion', e.target.value)}
            placeholder="La luminaria del sótano 1, frente al parqueadero P-022, está apagada desde el martes." />
        </Campo>
        <div className="campo">
          <span className="rotulo" id={idRotulo}>Evidencia <span className="opcional">(opcional)</span></span>
          <label className={`adjunto${foto ? ' con-archivo' : ''}`} aria-invalid={errorFoto ? 'true' : undefined}>
            <input type="file" ref={refArchivo} accept="image/jpeg,image/png,image/webp" className="solo-lectores"
              aria-labelledby={idRotulo} aria-describedby={idAyuda} onChange={elegirFoto} />
            {foto && <img src={foto.url} alt="" />}
            <span className="btn segundo chico" aria-hidden="true">{foto ? 'Cambiar foto' : 'Elegir foto'}</span>
            <span className="nombre-archivo">
              {foto ? <><span>{foto.nombre}</span><small>{foto.peso}</small></> : 'Ninguna foto elegida'}
            </span>
          </label>
          <span className="ayuda" id={idAyuda}>Una foto en JPG, PNG o WEBP de hasta 5 MB.</span>
          {errorFoto && <span className="error">{errorFoto}</span>}
          {foto && <button className="btn texto chico" type="button" onClick={quitarFoto}>Quitar foto</button>}
        </div>
        <Campo rotulo="Inmueble relacionado" opcional>
          <select value={datos.inmueble} onChange={(e) => { poner('inmueble', e.target.value); setSinVinculo(null) }}>
            <option value="">Ninguno: es de una zona común o del conjunto</option>
            <option value={INMUEBLE.identificacion}>{inmueble}, donde vives</option>
            <option value="otro">Otro inmueble</option>
          </select>
        </Campo>
        {datos.inmueble === 'otro' && (
          <Campo rotulo="Identificación del inmueble" error={errores.otroInmueble}>
            <input className="identificador" value={datos.otroInmueble} autoComplete="off" placeholder="B-0402"
              onChange={(e) => { poner('otroInmueble', e.target.value); setSinVinculo(null) }} />
          </Campo>
        )}
      </div>
    </Dialogo>
  )
}
