import { useEffect, useId, useRef, useState } from 'react'

import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { porteriaDeEjemplo } from '../../datos/porteria.js'
import { hora } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-15 Crear reporte, desde portería.
// Reporte.crearReporteDeNovedad() con CategoriaReporte ACTIVA, descripcion e Inmueble opcional (RF-090).
// Incluye "Adjuntar evidencia" (RF-091): Reporte.evidencia.
// Publica EventoSistema REPORTE_CREADO · Consultar reportes propios: consultarReportesDelUsuario() (RF-092).
// Sin API todavía: datos de ejemplo.

// Igual al <style> de la vista: categorías grandes, zona para adjuntar la foto y texto de cada novedad.
const ESTILOS = `
.porteria .elecciones.grandes { grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); }
.porteria .elecciones.grandes .eleccion > span { padding: var(--e4); min-height: 5.5rem; }
.porteria .elecciones.grandes .eleccion > span b { font-size: var(--t-md); }
.porteria .elecciones.grandes .eleccion > span small { font-size: var(--t-sm); }
.porteria .elecciones[aria-invalid="true"] .eleccion > span { border-color: var(--no); }

.porteria .adjunto {
  display: flex; align-items: center; gap: var(--e4);
  padding: var(--e5);
  border: 1px dashed var(--borde);
  border-radius: var(--r-superficie);
  background: var(--fondo);
  cursor: pointer;
}
.porteria .adjunto:hover { background: var(--concreto); }
.porteria .adjunto:focus-within { outline: 2px solid var(--convivir); outline-offset: 2px; }
.porteria .adjunto.arrastrando { border-color: var(--convivir); background: var(--convivir-c); }
.porteria .adjunto[aria-invalid="true"] { border-color: var(--no); }
.porteria .adjunto svg { width: 40px; height: 40px; flex: none; color: var(--acero); }
.porteria .adjunto b { display: block; font-weight: 600; font-size: var(--t-md); line-height: 1.3; }
.porteria .adjunto small { display: block; color: var(--acero); font-size: var(--t-sm); }
.porteria .adjunto-listo {
  display: flex; align-items: center; gap: var(--e4); flex-wrap: wrap;
  padding: var(--e3);
  border: 1px solid var(--borde);
  border-radius: var(--r-superficie);
  background: var(--papel);
}
.porteria .adjunto-listo img {
  width: 96px; height: 72px; object-fit: cover; flex: none;
  border: 1px solid var(--borde); border-radius: var(--r-control); background: var(--concreto);
}
.porteria .adjunto-listo .nombre { flex: 1; min-width: 10rem; overflow-wrap: anywhere; }
.porteria .adjunto-listo .nombre b { display: block; font-weight: 600; font-size: var(--t-sm); }
.porteria .adjunto-listo .nombre span { display: block; color: var(--acero); font-size: var(--t-xs); }

.porteria .lista .principal > .novedad-texto { color: var(--tinta); font-size: var(--t-sm); margin-top: 2px; }
`

const MAXIMO = 10 * 1024 * 1024

const ESTADOS = {
  ABIERTO: { tono: 'al', texto: 'Abierto, sin asignar' },
  EN_PROCESO: { tono: 'ne', texto: 'En proceso' },
  CERRADO: { tono: 'ok', texto: 'Cerrado' },
}

const sinTildes = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const esCodigo = (texto) => /^[A-Z]-\d+$/.test(texto)

/** 2516582 -> "2,4 MB". */
function peso(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

/** Pone en IBM Plex Mono los códigos de unidad que aparecen en un texto, como "A-0710". */
function ConIdentificadores({ texto }) {
  return texto.split(/([A-Z]-\d{3,4})/).map((parte, i) => (i % 2 ? <span key={i} className="identificador">{parte}</span> : parte))
}

export default function Reportar() {
  const consulta = useConsulta(() => Promise.all([
    porteriaDeEjemplo.consultarCategoriasReporte(),
    porteriaDeEjemplo.consultarZonasComunes(),
    porteriaDeEjemplo.consultarNovedadesDelTurno(),
  ]))

  if (!consulta.datos) {
    return (
      <main className="pagina">
        <AvisoDatosDeEjemplo casoDeUso="CU-15" />
        <Encabezado titulo="Reportar novedad" />
        <div className="superficie">
          {consulta.cargando && <Cargando />}
          {consulta.error && <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} />}
        </div>
      </main>
    )
  }

  const [categorias, zonas, turno] = consulta.datos
  return <ReportarCargada categorias={categorias} zonas={zonas} inicioTurno={turno.inicioTurno} novedades={turno.novedades} />
}

function ReportarCargada({ categorias, zonas, inicioTurno, ...props }) {
  const confirmar = useConfirmar()
  const idErrorCategoria = useId()
  const idErrorEvidencia = useId()
  const [novedades, setNovedades] = useState(props.novedades)
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [inmueble, setInmueble] = useState('')
  const [evidencia, setEvidencia] = useState(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [errores, setErrores] = useState({})

  const primeraCategoria = useRef(null)
  const campoDescripcion = useRef(null)
  const campoInmueble = useRef(null)
  const archivo = useRef(null)

  // La vista previa vive mientras la foto esté elegida.
  useEffect(() => () => { if (evidencia) URL.revokeObjectURL(evidencia.url) }, [evidencia])

  const quitarError = (campo) => setErrores((previos) => ({ ...previos, [campo]: null }))

  // Inmueble relacionado: unidad, parqueadero, depósito o zona común del conjunto. '' si no se escribió, null si no existe.
  const inmuebleValido = (texto) => {
    if (!texto) return ''
    const codigo = texto.toUpperCase().replace(/\s+/g, '')
    if (/^[ABC]-\d{4}$/.test(codigo) || /^P-\d{3}$/.test(codigo) || /^V-\d{2}$/.test(codigo) || /^D-\d{3}$/.test(codigo)) return codigo
    return zonas.find((z) => sinTildes(z) === sinTildes(texto.trim())) || null
  }

  // ---------- Evidencia (RF-091) ----------
  const quitarEvidencia = () => {
    setEvidencia(null)
    if (archivo.current) archivo.current.value = ''
  }

  const recibir = (file) => {
    quitarError('evidencia')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      quitarEvidencia()
      setErrores((previos) => ({ ...previos, evidencia: `${file.name} no es una imagen. Adjunta una foto en JPG o PNG.` }))
      return
    }
    if (file.size > MAXIMO) {
      quitarEvidencia()
      setErrores((previos) => ({ ...previos, evidencia: `La foto pesa ${peso(file.size)}. Adjunta una de hasta 10 MB o tómala con menos resolución.` }))
      return
    }
    setEvidencia({ archivo: file, url: URL.createObjectURL(file) })
  }

  const arrastrar = (e) => { e.preventDefault(); setArrastrando(true) }
  const soltar = (e) => {
    e.preventDefault()
    setArrastrando(false)
    recibir(e.dataTransfer.files?.[0])
  }

  // ---------- Crear reporte: Reporte.crearReporteDeNovedad() ----------
  const crear = (e) => {
    e.preventDefault()
    const relacionado = inmuebleValido(inmueble.trim())
    const nuevos = { evidencia: errores.evidencia }
    if (!categoria) nuevos.categoria = 'Elige qué pasó. Así la administración sabe quién debe atenderlo.'
    if (!descripcion.trim()) nuevos.descripcion = 'Describe lo que pasó: qué viste, dónde y a qué hora.'
    if (relacionado === null) {
      nuevos.inmueble = `No encontramos «${inmueble.trim()}» en el conjunto. Escribe una unidad como C-0908, un parqueadero como P-022 o elige una zona común de la lista.`
    }
    setErrores(nuevos)
    if (nuevos.categoria) { primeraCategoria.current.focus(); return }
    if (nuevos.descripcion) { campoDescripcion.current.focus(); return }
    if (nuevos.inmueble) { campoInmueble.current.focus(); return }

    setNovedades([{
      id: `${Date.now()}-${Math.random()}`, categoria, hora: new Date(), inmueble: relacionado, conFoto: !!evidencia,
      estado: 'ABIERTO', descripcion: descripcion.trim(),
    }, ...novedades])
    confirmar(`Reporte creado: ${categoria}${relacionado ? ` en ${relacionado}` : ''}. Queda abierto para la administración.`)
    setCategoria('')
    setDescripcion('')
    setInmueble('')
    quitarEvidencia()
    setErrores({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="pagina">
      <style href="convivir-vigilante-reportar" precedence="pagina">{ESTILOS}</style>
      <AvisoDatosDeEjemplo casoDeUso="CU-15" />
      <Encabezado titulo="Reportar novedad"
        guia="Llega a la administración con tu nombre y la hora. Queda abierta hasta que alguien la atienda." />

      <div className="lado">
        <form className="superficie relleno" noValidate onSubmit={crear}>
          <div className="formulario" style={{ gap: 'var(--e5)' }}>
            <fieldset className="campo">
              <legend className="rotulo" style={{ fontSize: 'var(--t-base)', fontWeight: 600 }}>¿Qué pasó?</legend>
              <div className="elecciones grandes" aria-invalid={errores.categoria ? 'true' : undefined}>
                {categorias.map((c, i) => (
                  <label key={c.id} className="eleccion">
                    <input ref={i === 0 ? primeraCategoria : undefined} type="radio" name="categoria" value={c.nombre}
                      checked={categoria === c.nombre} aria-describedby={errores.categoria ? idErrorCategoria : undefined}
                      onChange={() => { setCategoria(c.nombre); quitarError('categoria') }} />
                    <span><b>{c.nombre}</b><small>{c.descripcion}</small></span>
                  </label>
                ))}
              </div>
              {errores.categoria && <span className="error" role="alert" id={idErrorCategoria}>{errores.categoria}</span>}
            </fieldset>

            <Campo rotulo="Descripción" ayuda="Qué viste, dónde y a qué hora. Si hablaste con alguien, di con quién." error={errores.descripcion}>
              <textarea ref={campoDescripcion} rows={4} value={descripcion}
                placeholder="El ascensor de la Torre A se detuvo entre los pisos 6 y 7 a las 9:50 p. m. No había nadie adentro."
                onChange={(e) => { setDescripcion(e.target.value); if (e.target.value.trim()) quitarError('descripcion') }} />
            </Campo>

            <Campo rotulo="Inmueble relacionado" opcional error={errores.inmueble}
              ayuda="Una unidad, un parqueadero o una zona común. Desde portería puedes relacionar cualquiera del conjunto.">
              <input ref={campoInmueble} list="lista-inmuebles" autoComplete="off" placeholder="C-0908 o Zona BBQ" value={inmueble}
                onChange={(e) => { setInmueble(e.target.value); quitarError('inmueble') }} />
            </Campo>
            <datalist id="lista-inmuebles">
              {zonas.map((z) => <option key={z} value={z} />)}
            </datalist>

            <div className="campo">
              <span className="rotulo">Evidencia <span className="opcional">(opcional)</span></span>
              <label className={`adjunto${arrastrando ? ' arrastrando' : ''}`} hidden={!!evidencia}
                aria-invalid={errores.evidencia ? 'true' : undefined}
                onDragEnter={arrastrar} onDragOver={arrastrar} onDragLeave={() => setArrastrando(false)} onDrop={soltar}>
                <input ref={archivo} type="file" className="solo-lectores" accept="image/*"
                  aria-describedby={errores.evidencia ? idErrorEvidencia : undefined}
                  onChange={(e) => recibir(e.target.files[0])} />
                <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 13h6l3-4h10l3 4h6v18H6z" /><circle cx="20" cy="21" r="6" />
                </svg>
                <span>
                  <b>Toma una foto o elige una imagen</b>
                  <small>Una sola imagen en JPG o PNG, de hasta 10 MB. También puedes arrastrarla aquí.</small>
                </span>
              </label>
              {evidencia && (
                <div className="adjunto-listo">
                  <img src={evidencia.url} alt="Vista previa de la evidencia" />
                  <div className="nombre">
                    <b>{evidencia.archivo.name}</b>
                    <span>{peso(evidencia.archivo.size)} · lista para adjuntar</span>
                  </div>
                  <div className="fila" style={{ gap: 'var(--e1)' }}>
                    <button className="btn segundo chico" type="button" onClick={() => archivo.current.click()}>Cambiar foto</button>
                    <button className="btn texto chico" type="button"
                      onClick={() => { quitarEvidencia(); requestAnimationFrame(() => archivo.current?.focus()) }}>
                      Quitar foto
                    </button>
                  </div>
                </div>
              )}
              {errores.evidencia && <span className="error" role="alert" id={idErrorEvidencia}>{errores.evidencia}</span>}
            </div>
          </div>

          <div className="fila" style={{ marginTop: 'var(--e6)' }}>
            <button className="btn grande" type="submit">Crear reporte</button>
          </div>
        </form>

        <aside className="superficie" aria-labelledby="titulo-turno">
          <div className="cabeza">
            <h2 id="titulo-turno">Novedades de mi turno</h2>
            <span className="guia">{novedades.length} desde las {hora(inicioTurno)}</span>
          </div>
          <ul className="lista">
            {novedades.map((n) => (
              <li key={n.id}>
                <div className="principal">
                  <b>{n.categoria}</b>
                  <span>
                    <span className="dato">{hora(n.hora)}</span>
                    {n.inmueble && <> · {esCodigo(n.inmueble) ? <span className="identificador">{n.inmueble}</span> : n.inmueble}</>}
                    {n.conFoto && ' · con foto'}
                  </span>
                  <span className="novedad-texto">{n.descripcion}</span>
                  {n.seguimiento && <span><ConIdentificadores texto={n.seguimiento} /></span>}
                </div>
                <Pildora tono={ESTADOS[n.estado].tono}>{ESTADOS[n.estado].texto}</Pildora>
              </li>
            ))}
          </ul>
          <div className="pie">Las atiende la administración. Aquí ves en qué van.</div>
        </aside>
      </div>
    </main>
  )
}
