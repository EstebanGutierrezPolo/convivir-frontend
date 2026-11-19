import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { AvisoDatosDeEjemplo, Buscador, Cargando, Encabezado, ErrorDeCarga, Segmentos, Vacio } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { HOY, parqueaderosEjemplo } from '../../datos/inmuebles-personas.js'
import { fecha } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-09 Gestionar parqueaderos y cesiones de uso. Inmueble.obtenerInmuebleConUsoVigente() (RF-063),
// CesionUso.registrarCesionDeUso() (RF-060) con RN-17 y RN-18, CesionUso.finalizarCesionDeUso(fechaFin) (RF-061).
// Sin API todavía: usa datos de ejemplo.

const NATURALEZAS = [
  { valor: '', texto: 'Todos' },
  { valor: 'BIEN_PRIVADO', texto: 'Privados' },
  { valor: 'USO_EXCLUSIVO', texto: 'Uso exclusivo' },
  { valor: 'USO_GENERAL', texto: 'Visitantes' },
]
const NATURALEZA = { BIEN_PRIVADO: 'Bien privado', USO_EXCLUSIVO: 'Uso exclusivo', USO_GENERAL: 'Visitantes' }

/** Fecha en español; con conAnio siempre lleva el año. */
function fechaLarga(iso, conAnio) {
  const texto = fecha(iso)
  const anio = iso.slice(0, 4)
  return conAnio && !texto.endsWith(anio) ? `${texto} de ${anio}` : texto
}
const dias = (desde, hasta) => Math.round((new Date(hasta) - new Date(desde)) / 86400000)
function siguiente(iso) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}
const enDias = (n) => `${n}${n === 1 ? ' día' : ' días'}`

/** Lleva el foco al primer campo con error del diálogo abierto. */
function enfocarError() {
  requestAnimationFrame(() => document.querySelector('dialog[open] [aria-invalid="true"]')?.focus())
}

/** Inmueble.obtenerInmuebleConUsoVigente(): la cesión vigente que cubre hoy, si la hay. */
function cesionDeHoy(cesiones, id) {
  return cesiones.find((c) => c.cede === id && c.estado === 'VIGENTE' && c.fechaInicio <= HOY && c.fechaFin >= HOY)
}

export default function Parqueaderos() {
  const consulta = useConsulta(() => parqueaderosEjemplo.consultar())
  const [cambiadas, setCambiadas] = useState(null)
  const [texto, setTexto] = useState('')
  const [naturaleza, setNaturaleza] = useState('')
  const [estadoCesiones, setEstadoCesiones] = useState('VIGENTE')
  const [registrando, setRegistrando] = useState(false)
  const [finalizando, setFinalizando] = useState(null)

  const datos = consulta.datos
  const cesiones = useMemo(() => cambiadas ?? datos?.cesiones ?? [], [cambiadas, datos])
  const parqueaderos = useMemo(() => datos?.parqueaderos ?? [], [datos])
  const unidades = useMemo(() => datos?.unidades ?? [], [datos])

  const ocupanteDe = (id) => unidades.find((u) => u.identificacion === id)?.ocupante ?? ''
  const propietarioDe = (id) => parqueaderos.find((p) => p.identificacion === id)?.titular
    ?? datos?.cedibles.find((c) => c.identificacion === id)?.titular ?? 'bien común'

  const visibles = useMemo(() => {
    const busca = texto.trim().toLowerCase()
    return parqueaderos.filter((p) => {
      if (naturaleza && p.naturaleza !== naturaleza) return false
      if (!busca) return true
      const c = cesionDeHoy(cesiones, p.identificacion)
      const buscable = [p.identificacion, p.titular, p.unidad, p.vehiculo, c && `${c.usa} ${c.vehiculo}`,
        p.visita && `${p.visita.placa} ${p.visita.unidad}`].filter(Boolean).join(' ').toLowerCase()
      return buscable.includes(busca)
    })
  }, [parqueaderos, cesiones, texto, naturaleza])

  const listaCesiones = useMemo(() => cesiones
    .filter((c) => c.estado === estadoCesiones)
    .sort((a, b) => (estadoCesiones === 'VIGENTE' ? (a.fechaFin < b.fechaFin ? -1 : 1) : (a.fechaFin < b.fechaFin ? 1 : -1))),
  [cesiones, estadoCesiones])

  if (consulta.cargando && !datos) return <main className="pagina"><Cargando texto="Cargando parqueaderos…" /></main>
  if (consulta.error) {
    return <main className="pagina"><div className="superficie"><ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /></div></main>
  }

  const o = datos.ocupacion
  const cedidos = cesiones.filter((c) => c.estado === 'VIGENTE' && c.cede.startsWith('P') && c.fechaInicio <= HOY && c.fechaFin >= HOY).length
  const nVigentes = cesiones.filter((c) => c.estado === 'VIGENTE').length
  const nFinalizadas = cesiones.filter((c) => c.estado === 'FINALIZADA').length

  const limpiar = () => { setTexto(''); setNaturaleza('') }

  const registrar = (nueva) => {
    setCambiadas([...cesiones, { ...nueva, id: Math.max(0, ...cesiones.map((c) => c.id)) + 1 }])
    setEstadoCesiones('VIGENTE')
  }
  const finalizar = (cesion, fechaFin) => {
    setCambiadas(cesiones.map((c) => (c.id !== cesion.id ? c : {
      ...c,
      fechaFin,
      fechaPactada: fechaFin !== c.fechaFin ? c.fechaFin : c.fechaPactada,
      estado: 'FINALIZADA',
    })))
  }

  const botonRegistrar = <button className="btn" type="button" onClick={() => setRegistrando(true)}>Registrar cesión</button>

  return (
    <main className="pagina">
      <AvisoDatosDeEjemplo casoDeUso="CU-09" />
      <Encabezado titulo="Parqueaderos y cesiones"
        guia="Sótanos 1 y 2 · un propietario puede ceder el uso de su parqueadero a otro inmueble por un tiempo."
        acciones={botonRegistrar} />

      <div className="rejilla r3" aria-label="Ocupación">
        <div className="superficie cifra">
          <div className="etiqueta">Privados</div>
          <div className="valor">{o.privados}</div>
          <div className="proporcion" aria-hidden="true"><span style={{ width: `${(cedidos / o.privados * 100).toFixed(1)}%` }} /></div>
          <div className="meta">
            <span>{cedidos}{cedidos === 1 ? ' cedido' : ' cedidos'} a otro inmueble · {o.privados - cedidos} los usa su propietario</span>
          </div>
        </div>
        <div className="superficie cifra">
          <div className="etiqueta">Uso exclusivo</div>
          <div className="valor">{o.usoExclusivo}</div>
          <div className="proporcion" aria-hidden="true"><span style={{ width: '100%' }} /></div>
          <div className="meta">
            Comunes, asignados a una unidad · <span className="identificador">UE-01</span> a <span className="identificador">UE-08</span>
          </div>
        </div>
        <div className="superficie cifra">
          <div className="etiqueta">Visitantes ocupados ahora</div>
          <div className="valor">
            {o.visitantesOcupados} <span className="guia" style={{ fontSize: 'var(--t-md)', fontWeight: 500 }}>de {o.visitantes}</span>
          </div>
          <div className="proporcion" aria-hidden="true">
            <span style={{ width: `${(o.visitantesOcupados / o.visitantes * 100).toFixed(1)}%` }} />
          </div>
          <div className="meta">
            {`${o.visitantesLibres.length} libres: `}
            {o.visitantesLibres.map((v, i) => (
              <Fragment key={v}>{i > 0 && ', '}<span className="identificador">{v}</span></Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Parqueaderos con su uso vigente */}
      <section className="seccion" aria-labelledby="titulo-parqueaderos">
        <div className="encabezado">
          <div>
            <h2 id="titulo-parqueaderos">Quién usa cada parqueadero hoy</h2>
            <p className="guia">Si hay una cesión vigente, lo usa el inmueble que lo recibió; si no, su propietario.</p>
          </div>
        </div>

        <div className="filtros">
          <Buscador valor={texto} alCambiar={setTexto} placeholder="Parqueadero, unidad, persona o placa" etiqueta="Buscar parqueadero" />
          <Segmentos etiqueta="Naturaleza" opciones={NATURALEZAS} valor={naturaleza} alCambiar={setNaturaleza} />
        </div>

        <div className="superficie">
          {visibles.length > 0 ? (
            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Parqueadero</th><th>Naturaleza</th><th>Propietario o asignación</th>
                    <th>Lo usa hoy</th><th>Vehículo</th><th>Cesión</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((p) => <FilaParqueadero key={p.identificacion} p={p} cesiones={cesiones} />)}
                </tbody>
              </table>
            </div>
          ) : (
            <Vacio titulo="Ningún parqueadero coincide con la búsqueda"
              accion={<button className="btn segundo" type="button" onClick={limpiar}>Quitar filtros</button>}>
              Busca por el número, por ejemplo <span className="identificador">P-022</span>, por la unidad que lo usa o por la placa.
            </Vacio>
          )}
          <div className="pie">
            <span>{visibles.length} de {o.totalParqueaderos} parqueaderos</span>
            <div className="fila" style={{ gap: 'var(--e1)' }}>
              <button className="btn segundo chico" type="button" disabled>Anterior</button>
              <button className="btn segundo chico" type="button" disabled>Siguiente</button>
            </div>
          </div>
        </div>
      </section>

      {/* Cesiones de uso */}
      <section className="seccion" aria-labelledby="titulo-cesiones">
        <div className="encabezado">
          <div>
            <h2 id="titulo-cesiones">Cesiones de uso</h2>
            <p className="guia">Una cesión finalizada queda en el historial de los dos inmuebles.</p>
          </div>
          <Segmentos etiqueta="Estado de la cesión" valor={estadoCesiones} alCambiar={setEstadoCesiones} opciones={[
            { valor: 'VIGENTE', texto: <>Vigentes <span className="dato">{nVigentes}</span></> },
            { valor: 'FINALIZADA', texto: <>Finalizadas <span className="dato">{nFinalizadas}</span></> },
          ]} />
        </div>
        <div className="superficie">
          {listaCesiones.length > 0 ? (
            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Inmueble que cede</th><th>Inmueble que lo usa</th><th>Desde</th><th>Hasta</th>
                    <th>Vehículo amparado</th><th>Estado</th><th><span className="solo-lectores">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {listaCesiones.map((c) => (
                    <FilaCesion key={c.id} c={c} propietario={propietarioDe(c.cede)} ocupante={ocupanteDe(c.usa)}
                      alFinalizar={() => setFinalizando(c)} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Vacio titulo={estadoCesiones === 'VIGENTE' ? 'No hay cesiones vigentes' : 'Todavía no hay cesiones finalizadas'}
              accion={estadoCesiones === 'VIGENTE' ? botonRegistrar : null}>
              Cuando un propietario preste su parqueadero a otro inmueble, regístralo para que portería sepa quién puede usarlo.
            </Vacio>
          )}
        </div>
      </section>

      <RegistrarCesion abierto={registrando} alCerrar={() => setRegistrando(false)} datos={datos} cesiones={cesiones}
        ocupanteDe={ocupanteDe} alRegistrar={registrar}
        alFinalizarCruzada={(c) => { setRegistrando(false); setFinalizando(c) }} />

      <FinalizarCesion cesion={finalizando} alCerrar={() => setFinalizando(null)} ocupanteDe={ocupanteDe}
        propietarioDe={propietarioDe} alFinalizar={finalizar} />
    </main>
  )
}

function FilaParqueadero({ p, cesiones }) {
  const c = cesionDeHoy(cesiones, p.identificacion)
  let usa
  let vehiculo
  let cesion

  if (p.naturaleza === 'USO_GENERAL') {
    usa = p.visita
      ? <><span className="identificador">{p.visita.unidad}</span><span className="sub">Visita, desde las {p.visita.desde}</span></>
      : <span className="guia">Libre</span>
    vehiculo = p.visita ? <span className="identificador">{p.visita.placa}</span> : <span className="guia">—</span>
    cesion = <span className="guia">No se cede</span>
  } else if (c) {
    const faltan = dias(HOY, c.fechaFin)
    usa = <><span className="identificador">{c.usa}</span><span className="sub">Por cesión de {p.titular}</span></>
    vehiculo = c.vehiculo ? <span className="identificador">{c.vehiculo}</span> : <span className="guia">Sin vehículo amparado</span>
    cesion = faltan <= 20
      ? <><Pildora tono="al">Vence en {enDias(faltan)}</Pildora><span className="sub">El {fechaLarga(c.fechaFin)}</span></>
      : <><Pildora tono="ok">Cedido</Pildora><span className="sub">Hasta el {fechaLarga(c.fechaFin)}</span></>
  } else {
    const exclusivo = p.naturaleza === 'USO_EXCLUSIVO'
    usa = <><span className="identificador">{p.unidad}</span><span className="sub">{exclusivo ? 'Uso exclusivo asignado' : 'Su propietario'}</span></>
    vehiculo = p.vehiculo ? <span className="identificador">{p.vehiculo}</span> : <span className="guia">Sin vehículo registrado</span>
    const proxima = cesiones.find((x) => x.cede === p.identificacion && x.estado === 'VIGENTE' && x.fechaInicio > HOY)
    cesion = proxima
      ? <><Pildora tono="al">Cesión desde el {fechaLarga(proxima.fechaInicio)}</Pildora><span className="sub">A {proxima.usa}</span></>
      : <span className="guia">{exclusivo ? 'No aplica' : 'Sin cesión'}</span>
  }

  return (
    <tr>
      <td><span className="identificador fuerte">{p.identificacion}</span><span className="sub">{p.ubicacion}</span></td>
      <td><span className="etiqueta">{NATURALEZA[p.naturaleza]}</span></td>
      <td>{p.titular}</td>
      <td>{usa}</td>
      <td>{vehiculo}</td>
      <td>{cesion}</td>
    </tr>
  )
}

function FilaCesion({ c, propietario, ocupante, alFinalizar }) {
  const vigente = c.estado === 'VIGENTE'
  let pildora
  if (!vigente) {
    pildora = <><Pildora>Finalizada</Pildora>{c.fechaPactada && <span className="sub">Antes de lo pactado ({fechaLarga(c.fechaPactada)})</span>}</>
  } else if (c.fechaInicio > HOY) {
    pildora = <><Pildora tono="ok">Vigente</Pildora><span className="sub">Empieza el {fechaLarga(c.fechaInicio)}</span></>
  } else {
    const faltan = dias(HOY, c.fechaFin)
    pildora = faltan <= 20 ? <Pildora tono="al">Vence en {enDias(faltan)}</Pildora> : <Pildora tono="ok">Vigente</Pildora>
  }

  return (
    <tr>
      <td><span className="identificador fuerte">{c.cede}</span><span className="sub">De {propietario}</span></td>
      <td>
        <Link className="fila-enlace identificador" to="/administrador/inmuebles">{c.usa}</Link>
        <span className="sub">{ocupante}</span>
      </td>
      <td>{fechaLarga(c.fechaInicio, true)}</td>
      <td>{fechaLarga(c.fechaFin, true)}</td>
      <td>{c.vehiculo ? <span className="identificador">{c.vehiculo}</span> : <span className="guia">Ninguno</span>}</td>
      <td>{pildora}</td>
      <td className="acciones-fila">
        {vigente && <button className="btn texto chico" type="button" onClick={alFinalizar}>Finalizar</button>}
      </td>
    </tr>
  )
}

// ---------- Registrar cesión: 422 si el tipo no permite cesión (RN-17) o se superpone (RN-18) ----------

function RegistrarCesion({ abierto, alCerrar, datos, cesiones, ocupanteDe, alRegistrar, alFinalizarCruzada }) {
  const confirmar = useConfirmar()
  const vacio = { cede: '', usa: '', desde: HOY, hasta: '', vehiculo: '' }
  const [valores, setValores] = useState(vacio)
  const [errores, setErrores] = useState({})
  const [regla, setRegla] = useState(null)

  const cedibles = datos?.cedibles ?? []
  const unidades = datos?.unidades ?? []
  const grupos = [...new Set(cedibles.map((c) => c.grupo))]
  const unidad = unidades.find((u) => u.identificacion === valores.usa)

  const poner = (campo) => (e) => {
    const nuevos = { ...valores, [campo]: e.target.value }
    if (campo === 'usa') nuevos.vehiculo = ''
    setValores(nuevos)
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
    if (campo === 'cede' || campo === 'desde' || campo === 'hasta') setRegla(null)
  }

  const cerrar = () => {
    setValores(vacio)
    setErrores({})
    setRegla(null)
    alCerrar()
  }

  // Ayuda del inmueble que cede: quién lo usa hoy.
  let usoActual = 'Al elegirlo verás quién lo usa hoy.'
  if (valores.cede) {
    const c = cesionDeHoy(cesiones, valores.cede)
    const p = datos.parqueaderos.find((x) => x.identificacion === valores.cede)
    if (c) usoActual = `Hoy lo usa ${c.usa} por cesión hasta el ${fechaLarga(c.fechaFin)}.`
    else if (p?.unidad) usoActual = `Hoy lo usa su propietario, ${p.titular} (${p.unidad}).`
    else usoActual = `Tipo ${cedibles.find((x) => x.identificacion === valores.cede)?.tipoInmueble}.`
  }

  const registrar = () => {
    setRegla(null)
    const nuevos = {}
    if (!valores.cede) nuevos.cede = 'Elige el parqueadero o inmueble que se va a ceder.'
    if (!valores.usa) nuevos.usa = 'Elige el inmueble que va a usar el parqueadero.'
    if (!valores.desde) nuevos.desde = 'Elige la fecha en que empieza la cesión.'
    if (!valores.hasta) nuevos.hasta = 'Elige la fecha en que termina la cesión. Siempre tiene fin.'
    else if (valores.desde && valores.hasta < valores.desde) {
      nuevos.hasta = `La cesión termina antes de empezar. Elige una fecha desde el ${fechaLarga(valores.desde)}.`
    }
    setErrores(nuevos)
    if (Object.keys(nuevos).length) { enfocarError(); return }

    const id = valores.cede
    // RN-17: CesionUso.validarQueElTipoDeInmueblePermitaCesion() lee TipoInmueble.permiteCesion
    const cedible = cedibles.find((c) => c.identificacion === id)
    if (!cedible.permiteCesion) {
      setRegla({
        texto: <><b>{id} no se puede ceder.</b> Es de tipo {cedible.tipoInmueble}, y ese tipo no permite cesión de uso.</>,
        salida: <>Elige un parqueadero privado. Si el reglamento cambió, actívalo en <Link to="/administrador/tipos-inmueble">Tipos de inmueble</Link>.</>,
      })
      return
    }

    // RN-18: CesionUso.validarQueNoSeSuperpongaConOtraCesion()
    const cruce = cesiones.find((c) => c.cede === id && c.estado === 'VIGENTE' && c.fechaInicio <= valores.hasta && c.fechaFin >= valores.desde)
    if (cruce) {
      setRegla({
        texto: <><b>Esas fechas se cruzan con otra cesión.</b> {id} ya está cedido a <span className="identificador">{cruce.usa}</span> ({ocupanteDe(cruce.usa)}) del {fechaLarga(cruce.fechaInicio, true)} al {fechaLarga(cruce.fechaFin, true)}.</>,
        salida: `Elige fechas desde el ${fechaLarga(siguiente(cruce.fechaFin), true)}, o finaliza esa cesión primero.`,
        cruce,
      })
      return
    }

    alRegistrar({ cede: id, usa: valores.usa, fechaInicio: valores.desde, fechaFin: valores.hasta, vehiculo: valores.vehiculo, estado: 'VIGENTE' })
    confirmar(`Cesión registrada: ${id} lo usa ${valores.usa} del ${fechaLarga(valores.desde)} al ${fechaLarga(valores.hasta, true)}.`)
    cerrar()
  }

  const finalizarCruzada = () => {
    const cruce = regla.cruce
    setValores(vacio)
    setErrores({})
    setRegla(null)
    alFinalizarCruzada(cruce)
  }

  let textoVehiculo = 'Primero elige el inmueble que lo usa'
  if (unidad) textoVehiculo = unidad.vehiculos.length ? 'Sin vehículo amparado' : 'Este inmueble no tiene vehículos registrados'

  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} titulo="Registrar cesión de uso" alEnviar={registrar}
      guia="El propietario sigue siendo el mismo. Solo cambia quién lo usa durante esas fechas."
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit">Registrar cesión</button>
      </>}>
      {regla && (
        <div className="aviso no" role="alert" style={{ marginBottom: 'var(--e4)' }}>
          <p>{regla.texto}</p>
          <p>{regla.salida}</p>
          {regla.cruce && (
            <div className="fila" style={{ marginTop: 'var(--e3)' }}>
              <button className="btn segundo chico" type="button" onClick={finalizarCruzada}>Finalizar esa cesión</button>
            </div>
          )}
        </div>
      )}
      <div className="formulario dos">
        <Campo rotulo="Inmueble que cede" className="completo" ayuda={usoActual} error={errores.cede}>
          <select value={valores.cede} onChange={poner('cede')}>
            <option value="">Elige el inmueble</option>
            {grupos.map((g) => (
              <optgroup key={g} label={g}>
                {cedibles.filter((c) => c.grupo === g).map((c) => (
                  <option key={c.identificacion} value={c.identificacion}>{c.identificacion} · {c.titular}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Inmueble que lo usa" className="completo" error={errores.usa}>
          <select value={valores.usa} onChange={poner('usa')}>
            <option value="">Elige el inmueble</option>
            {unidades.map((u) => <option key={u.identificacion} value={u.identificacion}>{u.identificacion} · {u.ocupante}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Desde" error={errores.desde}>
          <input type="date" value={valores.desde} onChange={poner('desde')} />
        </Campo>
        <Campo rotulo="Hasta" error={errores.hasta}>
          <input type="date" value={valores.hasta} onChange={poner('hasta')} />
        </Campo>
        <Campo rotulo="Vehículo amparado" opcional className="completo" ayuda="Portería deja entrar ese vehículo al parqueadero cedido.">
          <select value={valores.vehiculo} onChange={poner('vehiculo')} disabled={!unidad || !unidad.vehiculos.length}>
            <option value="">{textoVehiculo}</option>
            {(unidad?.vehiculos ?? []).map((v) => <option key={v.placa} value={v.placa}>{v.placa} · {v.descripcion}</option>)}
          </select>
        </Campo>
      </div>
    </Dialogo>
  )
}

// ---------- Finalizar cesión: CesionUso.finalizarCesionDeUso(fechaFin) ----------

function FinalizarCesion({ cesion, alCerrar, ocupanteDe, propietarioDe, alFinalizar }) {
  const confirmar = useConfirmar()
  const [fechaFin, setFechaFin] = useState(null)
  const [error, setError] = useState(null)

  const inicial = !cesion ? '' : HOY < cesion.fechaInicio ? cesion.fechaInicio : HOY > cesion.fechaFin ? cesion.fechaFin : HOY
  const valor = fechaFin ?? inicial

  const cerrar = () => {
    setFechaFin(null)
    setError(null)
    alCerrar()
  }

  const finalizar = () => {
    let mensaje = null
    if (!valor) mensaje = 'Elige el día en que el inmueble deja de usar el parqueadero.'
    else if (valor < cesion.fechaInicio) mensaje = `La cesión empezó el ${fechaLarga(cesion.fechaInicio, true)}. Elige esa fecha o una posterior.`
    else if (valor > cesion.fechaFin) {
      mensaje = `La cesión ya termina el ${fechaLarga(cesion.fechaFin, true)}. Para extenderla, registra una cesión nueva desde el ${fechaLarga(siguiente(cesion.fechaFin), true)}.`
    }
    setError(mensaje)
    if (mensaje) { enfocarError(); return }

    alFinalizar(cesion, valor)
    confirmar(`Cesión finalizada el ${fechaLarga(valor)}. ${cesion.cede} vuelve a su propietario.`)
    cerrar()
  }

  const c = cesion
  return (
    <Dialogo abierto={!!cesion} alCerrar={cerrar} titulo={c ? `Finalizar la cesión de ${c.cede}` : 'Finalizar cesión'}
      guia={c && `Cedido a ${c.usa} (${ocupanteDe(c.usa)}) del ${fechaLarga(c.fechaInicio, true)} al ${fechaLarga(c.fechaFin, true)}.`}
      alEnviar={finalizar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn riesgo" type="submit">Finalizar cesión</button>
      </>}>
      {c && (
        <div className="formulario">
          <Campo rotulo="Fecha de terminación" error={error}
            ayuda={`Entre el ${fechaLarga(c.fechaInicio, true)} y el ${fechaLarga(c.fechaFin, true)}.`}>
            <input type="date" value={valor} min={c.fechaInicio} max={c.fechaFin}
              onChange={(e) => { setFechaFin(e.target.value); setError(null) }} />
          </Campo>
          <div className="aviso">
            {c.cede} vuelve a su propietario, {propietarioDe(c.cede)}. La cesión queda en el historial de {c.cede} y de {c.usa}.
          </div>
        </div>
      )}
    </Dialogo>
  )
}
