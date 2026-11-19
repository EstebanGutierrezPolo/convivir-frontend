import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import { aLas, comoEntro, nombreDeUnidad, normalizarPlaca, porteriaDeEjemplo, TIPOS_INGRESO } from '../../datos/porteria.js'
import { cifra, hora } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-07 Registrar ingreso y salida de visitantes y autorizados.
// AutorizacionAcceso.validarVigenciaDeLaAutorizacion(), validarDiaYHorarioPermitido() (RF-043)
// MovimientoAcceso.registrarIngresoAlConjunto(), registrarSalidaDelConjunto()
// Ingreso sin autorización previa con motivoExcepcion (RF-035, RN-12). Sin API todavía: datos de ejemplo.

const EJEMPLOS = ['1045887332', '8772104', '52114877', '79881230']

export default function Porteria() {
  const consulta = useConsulta(() => Promise.all([
    porteriaDeEjemplo.consultarPresentes(),
    porteriaDeEjemplo.consultarParqueaderosVisitantes(),
    porteriaDeEjemplo.consultarMovimientosPersonas(),
  ]))

  if (!consulta.datos) {
    return (
      <main className="pagina">
        <AvisoDatosDeEjemplo casoDeUso="CU-07" />
        <Encabezado titulo="¿Quién llega?" guia="Portería principal" />
        <div className="superficie">
          {consulta.cargando && <Cargando />}
          {consulta.error && <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} />}
        </div>
      </main>
    )
  }

  const [presentes, parqueaderos, movimientos] = consulta.datos
  return (
    <PorteriaCargada presentes={presentes.presentes} movimientos={movimientos}
      libres={parqueaderos.filter((p) => !p.placa).map((p) => p.codigo)} />
  )
}

const EXCEPCION_VACIA = { nombre: '', unidad: '', motivo: '', placa: '' }

function PorteriaCargada(props) {
  const confirmar = useConfirmar()
  const [documento, setDocumento] = useState('')
  const [resultado, setResultado] = useState(null)
  const [dentro, setDentro] = useState(props.presentes)
  const [libres, setLibres] = useState(props.libres)
  const [movimientos, setMovimientos] = useState(props.movimientos)
  const [ingreso, setIngreso] = useState({ placa: '', parqueadero: '' })
  const [excepcion, setExcepcion] = useState(EXCEPCION_VACIA)
  const [errores, setErrores] = useState({})

  const refs = { documento: useRef(null), nombre: useRef(null), unidad: useRef(null), motivo: useRef(null) }

  // Cada resultado deja el foco donde sigue el vigilante; sin resultado, en el documento.
  useEffect(() => {
    const foco = resultado ? resultado.foco : 'documento'
    if (foco) refs[foco].current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado])

  const reiniciar = () => {
    setDocumento('')
    setResultado(null)
  }

  const anotar = (nombre, unidad, detalle, sentido) => {
    setMovimientos((lista) => [{ id: `${Date.now()}-${Math.random()}`, nombre, unidad, detalle, sentido, hora: new Date() }, ...lista])
  }

  const buscar = async (valor = documento) => {
    const numero = valor.replace(/\D/g, '')
    if (!numero) { refs.documento.current.focus(); return }

    const presente = dentro.find((p) => p.documento === numero)
    if (presente) { setResultado({ tipo: 'dentro', presente }); return }

    const autorizacion = await porteriaDeEjemplo.consultarAutorizacion(numero)
    if (autorizacion?.estado === 'VIGENTE') {
      setIngreso({ placa: '', parqueadero: libres[0] || '' })
      setResultado({ tipo: 'autorizada', autorizacion })
      return
    }
    if (autorizacion?.estado === 'FUERA_DE_HORARIO') { setResultado({ tipo: 'fuera', autorizacion }); return }

    setExcepcion(EXCEPCION_VACIA)
    setErrores({})
    setResultado({ tipo: 'sin', documento: numero, nombre: 'Persona sin registro', donde: `CC ${cifra(numero)} · sin registro para hoy`, foco: 'nombre' })
  }

  const usarEjemplo = (numero) => {
    setDocumento(numero)
    buscar(numero)
  }

  // Tiene autorización vigente: entra con su vehículo, si llega en uno, al parqueadero de visitantes elegido.
  const registrarIngreso = () => {
    const a = resultado.autorizacion
    const ahora = new Date()
    const placa = normalizarPlaca(ingreso.placa)
    const parqueadero = placa ? ingreso.parqueadero : null
    setDentro([{
      documento: a.documento, nombre: a.nombre, unidad: a.unidad, unidadNombre: a.unidadNombre, anfitrion: a.autorizadaPor,
      tipo: a.tipo, horaIngreso: ahora, placa: placa || null, parqueadero,
    }, ...dentro])
    if (parqueadero) setLibres(libres.filter((l) => l !== parqueadero))
    anotar(a.nombre, a.unidad, TIPOS_INGRESO[a.tipo].toLowerCase(), 'INGRESO')
    confirmar(`Ingreso registrado: ${a.nombre}, ${hora(ahora)}.`)
    reiniciar()
  }

  // Recurrente fuera de su horario: si el apartamento lo confirma, entra como excepción.
  const pasarAExcepcion = () => {
    const a = resultado.autorizacion
    setExcepcion({ ...EXCEPCION_VACIA, nombre: a.nombre, unidad: a.unidad })
    setErrores({})
    setResultado({ tipo: 'sin', documento: a.documento, nombre: a.nombre, donde: `CC ${cifra(a.documento)} · fuera de su horario`, foco: 'motivo' })
  }

  const cambiar = (campo) => (e) => {
    setExcepcion({ ...excepcion, [campo]: e.target.value })
    if (errores[campo] && e.target.value.trim()) setErrores({ ...errores, [campo]: null })
  }

  const registrarExcepcion = (e) => {
    e.preventDefault()
    const nuevos = {}
    if (!excepcion.nombre.trim()) nuevos.nombre = 'Escribe el nombre como aparece en el documento.'
    if (!excepcion.unidad.trim()) nuevos.unidad = 'Escribe la unidad a la que va, por ejemplo A-1104.'
    if (!excepcion.motivo.trim()) nuevos.motivo = 'Escribe el motivo. Es obligatorio cuando no hay autorización previa.'
    setErrores(nuevos)
    const primero = ['nombre', 'unidad', 'motivo'].find((c) => nuevos[c])
    if (primero) { refs[primero].current.focus(); return }

    const nombre = excepcion.nombre.trim()
    const unidad = excepcion.unidad.trim().toUpperCase()
    setDentro([{
      documento: resultado.documento, nombre, unidad, anfitrion: '', tipo: 'EXCEPCION', horaIngreso: new Date(),
      placa: normalizarPlaca(excepcion.placa) || null, parqueadero: null, motivoExcepcion: excepcion.motivo.trim(),
    }, ...dentro])
    anotar(nombre, unidad, 'excepción', 'INGRESO')
    confirmar(`Ingreso registrado como excepción: ${nombre}. Queda en auditoría.`)
    reiniciar()
  }

  const registrarSalida = () => {
    const p = resultado.presente
    setDentro(dentro.filter((o) => o.documento !== p.documento))
    anotar(p.nombre, p.unidad, TIPOS_INGRESO[p.tipo].toLowerCase(), 'SALIDA')
    confirmar(`Salida registrada: ${p.nombre}, ${hora(new Date())}.`)
    reiniciar()
  }

  const otra = <button className="btn grande segundo" type="button" onClick={reiniciar}>Buscar otra persona</button>

  return (
    <main className="pagina">
      <AvisoDatosDeEjemplo casoDeUso="CU-07" />
      <Encabezado titulo="¿Quién llega?"
        guia={`Portería principal · ${dentro.length} personas dentro del conjunto · ${libres.length} parqueaderos de visitantes libres`} />

      <div className="lado">
        <div className="pila" style={{ gap: 'var(--e5)' }}>
          <form className="buscador-grande" role="search" noValidate onSubmit={(e) => { e.preventDefault(); buscar() }}>
            <label className="solo-lectores" htmlFor="documento">Número de documento</label>
            <input id="documento" ref={refs.documento} className="identificador" inputMode="numeric" autoComplete="off"
              placeholder="Número de documento" autoFocus value={documento} onChange={(e) => setDocumento(e.target.value)} />
            <button className="btn grande" type="submit">Buscar</button>
          </form>
          <p className="guia" style={{ marginTop: 'calc(-1 * var(--e3))' }}>
            Sin puntos ni espacios. Ejemplos de esta vista:
            {EJEMPLOS.map((numero) => (
              <Fragment key={numero}>
                {' '}
                <button className="btn texto chico identificador" type="button" onClick={() => usarEjemplo(numero)}>{numero}</button>
              </Fragment>
            ))}
          </p>

          {!resultado && (
            <div className="superficie">
              <div className="vacio">
                <svg className="simbolo" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="6" y="9" width="28" height="22" rx="3" /><circle cx="15" cy="19" r="4" />
                  <path d="M10 27c1.5-3 3-4 5-4s3.5 1 5 4M24 17h6M24 22h6" />
                </svg>
                <h3>Escribe el documento de quien llega</h3>
                <p>Convivir revisa si tiene una visita o una autorización vigente para hoy y a esta hora.</p>
              </div>
            </div>
          )}

          {resultado?.tipo === 'autorizada' && (
            <section className="pila" aria-live="polite">
              <div className="veredicto v-ok">
                <div className="palabra">Puede entrar</div>
                <div className="quien">{resultado.autorizacion.nombre}</div>
                <div className="donde">CC {cifra(resultado.autorizacion.documento)} · {resultado.autorizacion.unidadNombre}</div>
                <div className="porque">
                  Visita autorizada por {resultado.autorizacion.autorizadaPor}, vigente hasta
                  hoy {aLas(resultado.autorizacion.vigenteHasta)} {hora(resultado.autorizacion.vigenteHasta)}.
                  {resultado.autorizacion.usaParqueaderoVisitantes && ' Pidió parqueadero de visitantes.'}
                </div>
              </div>
              <div className="superficie relleno">
                <div className="formulario dos">
                  <Campo rotulo={<>Placa del vehículo <span className="opcional">(si llega en carro o moto)</span></>}>
                    <input className="identificador placa" placeholder="BQA 47F" autoComplete="off" value={ingreso.placa}
                      onChange={(e) => setIngreso({ ...ingreso, placa: e.target.value })} />
                  </Campo>
                  <Campo rotulo="Parqueadero de visitantes">
                    <select value={ingreso.parqueadero} disabled={!libres.length}
                      onChange={(e) => setIngreso({ ...ingreso, parqueadero: e.target.value })}>
                      {libres.length
                        ? libres.map((p) => <option key={p} value={p}>{p} · libre</option>)
                        : <option value="">Ningún parqueadero de visitantes libre</option>}
                    </select>
                  </Campo>
                </div>
              </div>
              <div className="fila">
                <button className="btn grande exito" type="button" onClick={registrarIngreso}>Registrar ingreso</button>
                {otra}
              </div>
            </section>
          )}

          {resultado?.tipo === 'fuera' && (
            <section className="pila" aria-live="polite">
              <div className="veredicto v-no">
                <div className="palabra">Fuera de su horario</div>
                <div className="quien">{resultado.autorizacion.nombre}</div>
                <div className="donde">CC {cifra(resultado.autorizacion.documento)} · {resultado.autorizacion.unidadNombre}</div>
                <div className="porque">
                  {resultado.autorizacion.motivo} Puedes llamar al apartamento y, si lo confirman, registrar el ingreso como excepción.
                </div>
              </div>
              <div className="fila">
                <button className="btn grande segundo" type="button" onClick={pasarAExcepcion}>Registrar como excepción</button>
                {otra}
              </div>
            </section>
          )}

          {resultado?.tipo === 'sin' && (
            <section className="pila" aria-live="polite">
              <div className="veredicto v-no">
                <div className="palabra">No tiene autorización</div>
                <div className="quien">{resultado.nombre}</div>
                <div className="donde">{resultado.donde}</div>
                <div className="porque">Puedes registrar el ingreso como excepción indicando el motivo y la unidad de destino. Queda en auditoría.</div>
              </div>
              <form className="superficie relleno" noValidate onSubmit={registrarExcepcion}>
                <h2 style={{ fontSize: 'var(--t-md)', fontWeight: 600, marginBottom: 'var(--e4)' }}>Ingreso como excepción</h2>
                <div className="formulario dos">
                  <Campo rotulo="Nombre de quien llega" error={errores.nombre}>
                    <input ref={refs.nombre} value={excepcion.nombre} onChange={cambiar('nombre')} />
                  </Campo>
                  <Campo rotulo="Unidad de destino" error={errores.unidad}>
                    <input ref={refs.unidad} className="identificador" placeholder="A-1104" value={excepcion.unidad} onChange={cambiar('unidad')} />
                  </Campo>
                  <Campo rotulo="Motivo" className="completo" ayuda="Di quién lo confirmó si llamaste al apartamento." error={errores.motivo}>
                    <textarea ref={refs.motivo} placeholder="Domicilio de farmacia. Lo confirmó por citófono Marta Oviedo."
                      value={excepcion.motivo} onChange={cambiar('motivo')} />
                  </Campo>
                  <Campo rotulo="Placa" opcional>
                    <input className="identificador placa" placeholder="BQA 47F" autoComplete="off" value={excepcion.placa} onChange={cambiar('placa')} />
                  </Campo>
                </div>
                <div className="fila" style={{ marginTop: 'var(--e5)' }}>
                  <button className="btn grande" type="submit">Registrar como excepción</button>
                  {otra}
                </div>
              </form>
            </section>
          )}

          {resultado?.tipo === 'dentro' && (
            <section className="pila" aria-live="polite">
              <div className="veredicto v-ok">
                <div className="palabra">Está dentro del conjunto</div>
                <div className="quien">{resultado.presente.nombre}</div>
                <div className="donde">
                  CC {cifra(resultado.presente.documento)} · {resultado.presente.unidadNombre || nombreDeUnidad(resultado.presente.unidad)}
                </div>
                <div className="porque">
                  Entró hoy {aLas(resultado.presente.horaIngreso)} {hora(resultado.presente.horaIngreso)} como {comoEntro(resultado.presente)}
                  {resultado.presente.placa && (
                    <>, en el vehículo <span className="identificador">{resultado.presente.placa}</span>
                      {resultado.presente.parqueadero && `, parqueadero ${resultado.presente.parqueadero}`}</>
                  )}.
                </div>
              </div>
              <div className="fila">
                <button className="btn grande" type="button" onClick={registrarSalida}>Registrar salida</button>
                {otra}
              </div>
            </section>
          )}
        </div>

        <aside className="superficie" aria-labelledby="titulo-movimientos">
          <div className="cabeza">
            <h2 id="titulo-movimientos">Últimos movimientos</h2>
            <Link className="btn texto chico" to="/vigilante/presentes">Ver quién está dentro</Link>
          </div>
          <ul className="lista">
            {movimientos.map((m) => (
              <li key={m.id}>
                <div className="principal">
                  <b>{m.nombre}</b>
                  <span><span className="identificador">{m.unidad}</span> · {m.detalle}</span>
                </div>
                <span className="etiqueta">{m.sentido === 'INGRESO' ? 'Ingreso' : 'Salida'} <span className="dato">{hora(m.hora)}</span></span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  )
}
