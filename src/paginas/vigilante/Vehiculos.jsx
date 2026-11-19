import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { aLas, nombreDeUnidad, normalizarPlaca, porteriaDeEjemplo, TIPOS_INGRESO } from '../../datos/porteria.js'
import { cifra, hora } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-10 Registrar movimiento vehicular.
// Consultar vehículo por placa (RF-051): Vehiculo con el Inmueble que lo posee.
// Incluye "Consultar uso vigente del parqueadero" (RF-063, RN-19): Inmueble.obtenerInmuebleConUsoVigente().
// MovimientoAcceso.registrarIngresoAlConjunto(), registrarSalidaDelConjunto() (RF-052, RF-053), ocupa parqueadero.
// Visita: AutorizacionAcceso.validarVigenciaDeLaAutorizacion() por documento, usaParqueaderoVisitantes, placaVisitante.
// Sin autorización: ingreso con motivoExcepcion (RF-035, RN-12). Sin API todavía: datos de ejemplo.

const EJEMPLOS = ['BQA 47F', 'WEQ 731', 'JKT 512', 'HZM 908']
const EJEMPLOS_DOCUMENTO = ['1045887332', '8772104']

// Mapa de parqueaderos de visitantes, igual al <style> de la vista: no está en la hoja común.
const ESTILOS = `
.porteria .puestos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
  gap: var(--e2);
  padding: var(--e4) var(--e5);
}
.porteria .puesto {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  min-height: 4.5rem;
  padding: var(--e2) var(--e3);
  border: 1px solid var(--borde);
  border-left: 4px solid var(--acero);
  border-radius: var(--r-control);
  background: var(--papel);
  color: var(--tinta);
  text-align: left;
}
.porteria button.puesto { cursor: pointer; }
.porteria button.puesto:hover { background: var(--concreto); }
.porteria .puesto.libre { border-left-color: var(--ok); }
.porteria .puesto .numero { font-family: var(--dato); font-weight: 600; letter-spacing: .04em; }
.porteria .puesto .ocupa { font-family: var(--dato); font-size: var(--t-xs); letter-spacing: .04em; color: var(--acero); }
@media (max-width: 40rem) { .porteria .puestos { padding-left: var(--e4); padding-right: var(--e4); } }
`

export default function Vehiculos() {
  const consulta = useConsulta(() => Promise.all([
    porteriaDeEjemplo.consultarVehiculosResidentes(),
    porteriaDeEjemplo.consultarVehiculosDentro(),
    porteriaDeEjemplo.consultarParqueaderosVisitantes(),
    porteriaDeEjemplo.consultarMovimientosVehiculos(),
  ]))

  if (!consulta.datos) {
    return (
      <main className="pagina">
        <AvisoDatosDeEjemplo casoDeUso="CU-10" />
        <Encabezado titulo="¿Qué vehículo llega?" guia="Portería vehicular" />
        <div className="superficie">
          {consulta.cargando && <Cargando />}
          {consulta.error && <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} />}
        </div>
      </main>
    )
  }

  const [residentes, dentro, parqueaderos, movimientos] = consulta.datos
  return (
    <VehiculosCargada residentes={residentes} dentro={dentro} movimientos={movimientos}
      parqueaderos={parqueaderos.map((p) => p.codigo)} />
  )
}

function VehiculosCargada({ parqueaderos, ...props }) {
  const confirmar = useConfirmar()
  const [placa, setPlaca] = useState('')
  const [errorPlaca, setErrorPlaca] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [residentes, setResidentes] = useState(props.residentes)
  const [dentro, setDentro] = useState(props.dentro)
  const [movimientos, setMovimientos] = useState(props.movimientos)
  const [documento, setDocumento] = useState('')
  const [visitasUsadas, setVisitasUsadas] = useState({})
  const [parqueaderoVisita, setParqueaderoVisita] = useState('')
  const [excepcion, setExcepcion] = useState({ unidad: '', parqueadero: '', motivo: '' })
  const [errores, setErrores] = useState({})

  const refs = { placa: useRef(null), documento: useRef(null), unidad: useRef(null), parqueadero: useRef(null), motivo: useRef(null) }

  useEffect(() => {
    const foco = resultado ? resultado.foco : 'placa'
    if (foco) refs[foco].current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado])

  // Puestos de visitantes y la placa que ocupa cada uno, según los ingresos abiertos.
  const puestos = parqueaderos.map((codigo) => ({ codigo, vehiculo: dentro.find((d) => d.parqueadero === codigo) }))
  const libres = puestos.filter((p) => !p.vehiculo).map((p) => p.codigo)
  const visitasDentro = dentro.filter((d) => d.tipo !== 'RESIDENTE').length

  const reiniciar = () => {
    setPlaca('')
    setErrorPlaca(null)
    setResultado(null)
  }

  const anotar = (placaMovimiento, unidad, detalle, parqueadero, sentido) => {
    setMovimientos((lista) => [{ id: `${Date.now()}-${Math.random()}`, placa: placaMovimiento, unidad, detalle, parqueadero, sentido, hora: new Date() }, ...lista])
  }

  // ---------- Consultar vehículo por placa (RF-051) ----------
  const buscar = (valor = placa) => {
    const normalizada = normalizarPlaca(valor)
    setErrorPlaca(null)
    if (!normalizada) { refs.placa.current.focus(); return }
    if (!/^[A-Z]{3} \d{2}[A-Z0-9]$/.test(normalizada)) {
      setErrorPlaca(`${normalizada} no es una placa completa. Escribe tres letras y luego tres caracteres, por ejemplo JKT 512 o, si es moto, RTY 22E.`)
      refs.placa.current.focus()
      return
    }
    setPlaca(normalizada)
    if (dentro.some((d) => d.placa === normalizada)) { setResultado({ tipo: 'dentro', placa: normalizada }); return }
    if (residentes.some((v) => v.placa === normalizada)) { setResultado({ tipo: 'residente', placa: normalizada }); return }
    setDocumento('')
    setResultado({ tipo: 'sin', placa: normalizada, foco: 'documento' })
  }

  const usarEjemplo = (valor) => {
    setPlaca(valor)
    buscar(valor)
  }

  const escribirPlaca = (e) => {
    const campo = e.target
    const posicion = campo.selectionStart
    campo.value = campo.value.toUpperCase()
    campo.setSelectionRange(posicion, posicion)
    setPlaca(campo.value)
    setErrorPlaca(null)
  }

  const tocarPuesto = (placaPuesto) => {
    setPlaca(placaPuesto)
    buscar(placaPuesto)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ---------- Visita: se busca la autorización por documento ----------
  const buscarVisita = async (valor = documento) => {
    const numero = valor.replace(/\D/g, '')
    if (!numero) { refs.documento.current.focus(); return }
    const autorizacion = await porteriaDeEjemplo.consultarAutorizacion(numero)
    if (autorizacion?.estado === 'VIGENTE' && !visitasUsadas[numero]) {
      setParqueaderoVisita(libres[0] || '')
      setResultado({ tipo: 'visita', placa: resultado.placa, autorizacion, documento: numero })
      return
    }
    let donde = `CC ${cifra(numero)} · sin autorización para hoy`
    if (visitasUsadas[numero]) donde = `CC ${cifra(numero)} · su visita de hoy ya se usó ${aLas(visitasUsadas[numero])} ${hora(visitasUsadas[numero])}`
    else if (autorizacion?.estado === 'FUERA_DE_HORARIO') donde = `CC ${cifra(numero)} · fuera de su horario`
    mostrarExcepcion(donde)
  }

  const usarDocumento = (numero) => {
    setDocumento(numero)
    buscarVisita(numero)
  }

  const mostrarExcepcion = (donde) => {
    setExcepcion({ unidad: '', parqueadero: libres[0] || '', motivo: '' })
    setErrores({})
    setResultado({ tipo: 'excepcion', placa: resultado.placa, donde, foco: 'unidad' })
  }

  // ---------- Registrar ingreso de un vehículo de residente (RF-052) ----------
  const ingresoResidente = () => {
    const v = residentes.find((r) => r.placa === resultado.placa)
    const ahora = new Date()
    setDentro([{
      placa: v.placa, quien: `${v.descripcion} · ${v.responde}`, unidad: v.unidad, unidadNombre: v.unidadNombre,
      tipo: 'RESIDENTE', como: 'vehículo de residente', horaIngreso: ahora, parqueadero: v.parqueadero,
    }, ...dentro])
    setResidentes(residentes.map((r) => (r.placa === v.placa ? { ...r, ultimoMovimiento: { sentido: 'INGRESO', hora: ahora } } : r)))
    anotar(v.placa, v.unidad, 'residente', v.parqueadero, 'INGRESO')
    confirmar(`Ingreso registrado: ${v.placa} a ${v.parqueadero}, ${hora(ahora)}.`)
    reiniciar()
  }

  // ---------- Registrar ingreso de la visita con su parqueadero de visitantes ----------
  const ingresoVisita = () => {
    if (!parqueaderoVisita) return
    const { autorizacion: a, documento: numero, placa: placaVisita } = resultado
    const ahora = new Date()
    setDentro([{
      placa: placaVisita, quien: a.nombre, unidad: a.unidad, unidadNombre: a.unidadNombre,
      tipo: 'VISITA', como: `visita de ${a.autorizadaPor}`, horaIngreso: ahora, parqueadero: parqueaderoVisita,
    }, ...dentro])
    setVisitasUsadas({ ...visitasUsadas, [numero]: ahora })
    anotar(placaVisita, a.unidad, 'visita', parqueaderoVisita, 'INGRESO')
    confirmar(`Ingreso registrado: ${placaVisita} en ${parqueaderoVisita}, visita de ${a.unidad}, ${hora(ahora)}.`)
    reiniciar()
  }

  // ---------- Registrar salida (RF-053): libera el parqueadero de visitantes si lo ocupaba ----------
  const salida = () => {
    const d = dentro.find((o) => o.placa === resultado.placa)
    const ahora = new Date()
    const libera = d.parqueadero.startsWith('V-')
    setDentro(dentro.filter((o) => o.placa !== d.placa))
    setResidentes(residentes.map((r) => (r.placa === d.placa ? { ...r, ultimoMovimiento: { sentido: 'SALIDA', hora: ahora } } : r)))
    anotar(d.placa, d.unidad, TIPOS_INGRESO[d.tipo].toLowerCase(), d.parqueadero, 'SALIDA')
    confirmar(`Salida registrada: ${d.placa}, ${hora(ahora)}.${libera ? ` ${d.parqueadero} queda libre.` : ''}`)
    reiniciar()
  }

  // ---------- Ingreso como excepción (RF-035, RN-12) ----------
  const cambiar = (campo) => (e) => {
    setExcepcion({ ...excepcion, [campo]: e.target.value })
    if (errores[campo] && e.target.value.trim()) setErrores({ ...errores, [campo]: null })
  }

  const registrarExcepcion = (e) => {
    e.preventDefault()
    const unidad = excepcion.unidad.trim().toUpperCase()
    setExcepcion({ ...excepcion, unidad })
    const nuevos = {}
    if (!unidad) nuevos.unidad = 'Escribe la unidad a la que va, por ejemplo A-1104.'
    if (!excepcion.parqueadero) {
      nuevos.parqueadero = libres.length
        ? 'Elige el parqueadero de visitantes donde va a quedar.'
        : 'No quedan parqueaderos de visitantes libres. Pídele que parquee afuera y registra solo a la persona en Personas.'
    }
    if (!excepcion.motivo.trim()) nuevos.motivo = 'Escribe el motivo. Es obligatorio cuando no hay autorización previa.'
    if (!Object.keys(nuevos).length && !/^[ABC]-\d{4}$/.test(unidad)) {
      nuevos.unidad = `No encontramos la unidad ${unidad}. Escríbela como torre y apartamento, por ejemplo A-1104.`
    }
    setErrores(nuevos)
    const primero = ['unidad', 'parqueadero', 'motivo'].find((c) => nuevos[c])
    if (primero) { refs[primero].current.focus(); return }

    const placaExcepcion = resultado.placa
    const pq = excepcion.parqueadero
    setDentro([{
      placa: placaExcepcion, quien: 'Ingreso por excepción', unidad, unidadNombre: nombreDeUnidad(unidad),
      tipo: 'EXCEPCION', como: 'excepción', horaIngreso: new Date(), parqueadero: pq, motivoExcepcion: excepcion.motivo.trim(),
    }, ...dentro])
    anotar(placaExcepcion, unidad, 'excepción', pq, 'INGRESO')
    confirmar(`Ingreso registrado como excepción: ${placaExcepcion} a ${unidad}, ${pq}. Queda en auditoría.`)
    reiniciar()
  }

  const otra = <button className="btn grande segundo" type="button" onClick={reiniciar}>Buscar otra placa</button>
  const opcionesLibres = libres.length
    ? libres.map((p) => <option key={p} value={p}>{p} · libre</option>)
    : <option value="">Ningún parqueadero de visitantes libre</option>

  const residente = resultado?.tipo === 'residente' && residentes.find((v) => v.placa === resultado.placa)
  const vehiculoDentro = resultado?.tipo === 'dentro' && dentro.find((d) => d.placa === resultado.placa)
  const pildoraLibres = libres.length === 0
    ? <Pildora tono="no">Ningún libre</Pildora>
    : <Pildora tono={libres.length <= 2 ? 'al' : 'ok'}>{libres.length === 1 ? '1 libre' : `${libres.length} libres`}</Pildora>

  return (
    <main className="pagina">
      <style href="convivir-vigilante-vehiculos" precedence="pagina">{ESTILOS}</style>
      <AvisoDatosDeEjemplo casoDeUso="CU-10" />
      <Encabezado titulo="¿Qué vehículo llega?"
        guia={`Portería vehicular · ${visitasDentro} vehículos de visitantes dentro · ${libres.length} parqueaderos de visitantes libres`} />

      <div className="lado">
        <div className="pila" style={{ gap: 'var(--e5)' }}>
          <form className="buscador-grande" role="search" noValidate onSubmit={(e) => { e.preventDefault(); buscar() }}>
            <label className="solo-lectores" htmlFor="placa">Placa del vehículo</label>
            <input id="placa" ref={refs.placa} className="identificador" autoComplete="off" autoCapitalize="characters"
              spellCheck="false" maxLength={8} placeholder="Placa del vehículo" autoFocus value={placa} onChange={escribirPlaca} />
            <button className="btn grande" type="submit">Buscar</button>
          </form>
          {errorPlaca && <p className="aviso no" role="alert" style={{ marginTop: 'calc(-1 * var(--e3))' }}>{errorPlaca}</p>}
          <p className="guia" style={{ marginTop: 'calc(-1 * var(--e3))' }}>
            Tres letras y tres caracteres. Ejemplos de esta vista:
            {EJEMPLOS.map((valor) => (
              <Fragment key={valor}>
                {' '}
                <button className="btn texto chico identificador" type="button" onClick={() => usarEjemplo(valor)}>{valor}</button>
              </Fragment>
            ))}
          </p>

          {!resultado && (
            <div className="superficie">
              <div className="vacio">
                <svg className="simbolo" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M7 25v-6l4-8h18l4 8v6" /><rect x="5" y="19" width="30" height="8" rx="2" />
                  <circle cx="11" cy="29" r="3" /><circle cx="29" cy="29" r="3" /><path d="M15 23h10" />
                </svg>
                <h3>Escribe la placa del vehículo que llega</h3>
                <p>Convivir revisa si es de un residente y qué parqueadero usa hoy, si ya está dentro o si viene de visita.</p>
              </div>
            </div>
          )}

          {/* Vehículo de un residente: Vehiculo → Inmueble que lo posee → parqueadero con uso vigente */}
          {residente && (
            <section className="pila" aria-live="polite">
              <div className="veredicto v-ok">
                <div className="palabra">Puede entrar</div>
                <div className="quien">{residente.descripcion} · {residente.responde}</div>
                <div className="donde">{residente.placa} · {residente.unidadNombre}</div>
                <div className="porque">{residente.porque}</div>
              </div>
              <div className="superficie">
                <div className="cabeza">
                  <h2>Parqueadero que usa hoy</h2>
                  <Pildora tono="ok">{residente.estadoUso}</Pildora>
                </div>
                <dl className="datos cuerpo">
                  <div>
                    <dt>Parqueadero</dt>
                    <dd><span className="identificador fuerte">{residente.parqueadero}</span> <span className="guia">· {residente.ubicacion}</span></dd>
                  </div>
                  <div><dt>Quién tiene el uso</dt><dd>{residente.uso}</dd></div>
                  <div><dt>Titular del parqueadero</dt><dd>{residente.titular}</dd></div>
                  <div>
                    <dt>Último movimiento</dt>
                    <dd>
                      {residente.ultimoMovimiento.sentido === 'INGRESO' ? 'Ingreso' : 'Salida'} hoy {aLas(residente.ultimoMovimiento.hora)} {hora(residente.ultimoMovimiento.hora)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="fila">
                <button className="btn grande exito" type="button" onClick={ingresoResidente}>Registrar ingreso</button>
                {otra}
              </div>
            </section>
          )}

          {/* Ya está dentro: lo que corresponde es la salida */}
          {vehiculoDentro && (
            <section className="pila" aria-live="polite">
              <div className="veredicto v-ok">
                <div className="palabra">Está dentro del conjunto</div>
                <div className="quien">{vehiculoDentro.quien}</div>
                <div className="donde">{vehiculoDentro.placa} · {vehiculoDentro.unidadNombre}</div>
                <div className="porque">
                  Entró hoy {aLas(vehiculoDentro.horaIngreso)} {hora(vehiculoDentro.horaIngreso)} como {vehiculoDentro.como} y ocupa
                  el parqueadero {vehiculoDentro.parqueadero.startsWith('V-') ? 'de visitantes ' : ''}{vehiculoDentro.parqueadero}.
                  Lo que corresponde es registrar la salida.
                </div>
              </div>
              <div className="fila">
                <button className="btn grande" type="button" onClick={salida}>Registrar salida</button>
                {otra}
              </div>
            </section>
          )}

          {/* Placa sin registro: se busca la visita por el documento de quien conduce */}
          {resultado?.tipo === 'sin' && (
            <section className="pila" aria-live="polite">
              <div className="veredicto v-al">
                <div className="palabra">Placa sin registro</div>
                <div className="quien identificador">{resultado.placa}</div>
                <div className="porque">
                  No es el vehículo de ningún residente y no tiene un ingreso abierto. Si viene de visita, busca su autorización con
                  el documento de quien conduce. Si no, puedes registrarlo como excepción.
                </div>
              </div>
              <form className="superficie relleno pila" noValidate onSubmit={(e) => { e.preventDefault(); buscarVisita() }}>
                <h2 style={{ fontSize: 'var(--t-md)', fontWeight: 600 }}>¿Viene de visita?</h2>
                <div className="buscador-grande">
                  <label className="solo-lectores" htmlFor="documento">Documento de quien conduce</label>
                  <input id="documento" ref={refs.documento} className="identificador" inputMode="numeric" autoComplete="off"
                    placeholder="Documento de quien conduce" value={documento} onChange={(e) => setDocumento(e.target.value)} />
                  <button className="btn grande" type="submit">Buscar visita</button>
                </div>
                <p className="guia">
                  Sin puntos ni espacios. Ejemplos:
                  {EJEMPLOS_DOCUMENTO.map((numero) => (
                    <Fragment key={numero}>
                      {' '}
                      <button className="btn texto chico identificador" type="button" onClick={() => usarDocumento(numero)}>{numero}</button>
                    </Fragment>
                  ))}
                </p>
              </form>
              <div className="fila">
                <button className="btn grande segundo" type="button" onClick={() => mostrarExcepcion('Sin registro en el conjunto')}>
                  Registrar como excepción
                </button>
                {otra}
              </div>
            </section>
          )}

          {/* Vehículo de una visita autorizada que pidió parqueadero de visitantes */}
          {resultado?.tipo === 'visita' && (
            <section className="pila" aria-live="polite">
              <div className="veredicto v-ok">
                <div className="palabra">Puede entrar</div>
                <div className="quien">{resultado.autorizacion.nombre}</div>
                <div className="donde">{resultado.placa} · CC {cifra(resultado.documento)} · {resultado.autorizacion.unidadNombre}</div>
                <div className="porque">
                  Visita autorizada por {resultado.autorizacion.autorizadaPor}, vigente hasta
                  hoy {aLas(resultado.autorizacion.vigenteHasta)} {hora(resultado.autorizacion.vigenteHasta)}.
                  {resultado.autorizacion.usaParqueaderoVisitantes
                    ? ' Pidió parqueadero de visitantes: asígnale uno libre.'
                    : ' Asígnale un parqueadero de visitantes libre.'}
                </div>
              </div>
              <div className="superficie relleno pila">
                <Campo rotulo="Parqueadero de visitantes" ayuda="La placa queda guardada en el ingreso de la visita.">
                  <select value={parqueaderoVisita} disabled={!libres.length} onChange={(e) => setParqueaderoVisita(e.target.value)}>
                    {opcionesLibres}
                  </select>
                </Campo>
                {!libres.length && (
                  <p className="aviso al">
                    <b>Los {parqueaderos.length} parqueaderos de visitantes están ocupados.</b> Pídele que parquee afuera y registra solo
                    a la persona en <Link to="/vigilante/porteria">Personas</Link>.
                  </p>
                )}
              </div>
              <div className="fila">
                <button className="btn grande exito" type="button" disabled={!libres.length} onClick={ingresoVisita}>Registrar ingreso</button>
                {otra}
              </div>
            </section>
          )}

          {/* Sin autorización: ingreso como excepción con unidad de destino, motivo y parqueadero */}
          {resultado?.tipo === 'excepcion' && (
            <section className="pila" aria-live="polite">
              <div className="veredicto v-no">
                <div className="palabra">No tiene autorización</div>
                <div className="quien identificador">{resultado.placa}</div>
                <div className="donde">{resultado.donde}</div>
                <div className="porque">
                  Puedes registrar el ingreso como excepción indicando la unidad de destino, el motivo y el parqueadero de visitantes
                  que ocupa. Queda en auditoría.
                </div>
              </div>
              <form className="superficie relleno" noValidate onSubmit={registrarExcepcion}>
                <h2 style={{ fontSize: 'var(--t-md)', fontWeight: 600, marginBottom: 'var(--e4)' }}>Ingreso como excepción</h2>
                <div className="formulario dos">
                  <Campo rotulo="Placa">
                    <input className="identificador placa" readOnly value={resultado.placa} />
                  </Campo>
                  <Campo rotulo="Unidad de destino" error={errores.unidad}>
                    <input ref={refs.unidad} className="identificador" autoComplete="off" placeholder="A-1104"
                      value={excepcion.unidad} onChange={cambiar('unidad')} />
                  </Campo>
                  <Campo rotulo="Parqueadero de visitantes" error={errores.parqueadero}>
                    <select ref={refs.parqueadero} value={excepcion.parqueadero} onChange={cambiar('parqueadero')}>
                      {opcionesLibres}
                    </select>
                  </Campo>
                  <Campo rotulo="Motivo" className="completo" ayuda="Di quién conduce y quién lo confirmó si llamaste al apartamento."
                    error={errores.motivo}>
                    <textarea ref={refs.motivo} placeholder="Trae un mercado para A-1104. Lo confirmó por teléfono Jorge Peñaranda, propietario."
                      value={excepcion.motivo} onChange={cambiar('motivo')} />
                  </Campo>
                </div>
                <div className="fila" style={{ marginTop: 'var(--e5)' }}>
                  <button className="btn grande" type="submit">Registrar como excepción</button>
                  {otra}
                </div>
              </form>
            </section>
          )}
        </div>

        <div className="pila" style={{ gap: 'var(--e5)' }}>
          <section className="superficie" aria-labelledby="titulo-puestos">
            <div className="cabeza">
              <h2 id="titulo-puestos">Parqueaderos de visitantes</h2>
              {pildoraLibres}
            </div>
            <div className="puestos">
              {puestos.map(({ codigo, vehiculo }) => (vehiculo ? (
                <button key={codigo} type="button" className="puesto" onClick={() => tocarPuesto(vehiculo.placa)}
                  aria-label={`${codigo} ocupado por ${vehiculo.placa}, registrar su salida`}>
                  <span className="numero">{codigo}</span>
                  <span className="ocupa">{vehiculo.placa}</span>
                  <span className="ocupa">{vehiculo.unidad}</span>
                </button>
              ) : (
                <div key={codigo} className="puesto libre">
                  <span className="numero">{codigo}</span>
                  <Pildora tono="ok">Libre</Pildora>
                </div>
              )))}
            </div>
            <div className="pie">Toca uno ocupado para registrar su salida.</div>
          </section>

          <aside className="superficie" aria-labelledby="titulo-movimientos">
            <div className="cabeza">
              <h2 id="titulo-movimientos">Últimos movimientos</h2>
              <Link className="btn texto chico" to="/vigilante/presentes">Ver quién está dentro</Link>
            </div>
            <ul className="lista">
              {movimientos.map((m) => (
                <li key={m.id}>
                  <div className="principal">
                    <b className="identificador">{m.placa}</b>
                    <span>
                      <span className="identificador">{m.unidad}</span> · {m.detalle} · <span className="identificador">{m.parqueadero}</span>
                    </span>
                  </div>
                  <span className="etiqueta">{m.sentido === 'INGRESO' ? 'Ingreso' : 'Salida'} <span className="dato">{hora(m.hora)}</span></span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </main>
  )
}
