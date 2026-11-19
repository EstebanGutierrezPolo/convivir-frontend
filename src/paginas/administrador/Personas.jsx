import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { AvisoDatosDeEjemplo, Buscador, Cargando, Encabezado, ErrorDeCarga, Segmentos, Vacio } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { HOY, personasEjemplo } from '../../datos/inmuebles-personas.js'
import { fecha } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-03 Gestionar integrantes. FabricaIntegrante.crearIntegrante(rol, documento, nombres, apellidos),
// Empleado.registrarIntegranteEnLaCopropiedad(integrante), Integrante.modificarDatosDeContacto(),
// Empleado.desactivarIntegrantePorMotivo(integrante, motivo), Integrante.obtenerRolDelIntegrante().
// Sin API todavía: usa datos de ejemplo.

const ROLES = [
  { valor: 'PROPIETARIO', texto: 'Propietario', detalle: 'Dueño de un inmueble' },
  { valor: 'ARRENDATARIO', texto: 'Arrendatario', detalle: 'Vive en arriendo' },
  { valor: 'RESIDENTE', texto: 'Residente autorizado', detalle: 'Familiar o acompañante' },
  { valor: 'CONSEJO', texto: 'Miembro del consejo', detalle: 'Elegido por la asamblea' },
  { valor: 'EMPLEADO', texto: 'Empleado', detalle: 'Administración o vigilancia' },
]
const ESTADOS = [
  { valor: 'ACTIVO', texto: 'Activas' },
  { valor: 'INACTIVO', texto: 'Desactivadas' },
  { valor: '', texto: 'Todas' },
]
const TIPOS_DOCUMENTO = [
  { valor: 'CC', texto: 'Cédula de ciudadanía' },
  { valor: 'CE', texto: 'Cédula de extranjería' },
  { valor: 'PA', texto: 'Pasaporte' },
  { valor: 'TI', texto: 'Tarjeta de identidad' },
  { valor: 'NIT', texto: 'NIT, si es una empresa' },
]
const GENEROS = { F: 'Femenino', M: 'Masculino', NB: 'No binario' }
const PARENTESCOS = ['Hijo o hija', 'Cónyuge o compañero', 'Padre o madre', 'Hermano o hermana', 'Otro familiar', 'Sin parentesco']
const CARGOS_CONSEJO = ['Presidente', 'Vicepresidente', 'Tesorero', 'Secretario', 'Vocal']
const TURNOS = ['Día, de 6:00 a. m. a 6:00 p. m.', 'Noche, de 6:00 p. m. a 6:00 a. m.', 'Relevo']
const PAISES = ['Colombia', 'Venezuela', 'Estados Unidos', 'España', 'Otro país']
const CORREO_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Botón que se ve como el enlace de la fila (.tabla a.fila-enlace solo aplica a <a>).
const ESTILO_ENLACE = {
  background: 'none', border: 0, padding: 0, font: 'inherit', color: 'var(--tinta)', fontWeight: 600,
  cursor: 'pointer', textAlign: 'left',
}

// ---------- Utilidades ----------

/** Fecha en español, siempre con el año. */
function fechaLarga(iso) {
  const texto = fecha(iso)
  const anio = iso.slice(0, 4)
  return texto.endsWith(anio) ? texto : `${texto} de ${anio}`
}
const agrupar = (n) => n.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
function documento(p) {
  if (p.tipoDocumento === 'NIT') return `NIT ${agrupar(p.documento.slice(0, -1))}-${p.documento.slice(-1)}`
  return `${p.tipoDocumento} ${/^\d+$/.test(p.documento) ? agrupar(p.documento) : p.documento}`
}
const nombre = (p) => p.razonSocial || `${p.nombres} ${p.apellidos}`
const femenino = (p) => p.genero === 'F'

/** Integrante.obtenerRolDelIntegrante(): sale de la subclase. */
function rolTexto(p) {
  const f = femenino(p)
  switch (p.rol) {
    case 'PROPIETARIO': return f ? 'Propietaria' : 'Propietario'
    case 'ARRENDATARIO': return f ? 'Arrendataria' : 'Arrendatario'
    case 'RESIDENTE': return f ? 'Residente autorizada' : 'Residente autorizado'
    case 'CONSEJO': return 'Miembro del consejo'
    default: return f ? 'Empleada' : 'Empleado'
  }
}
function cargoTexto(p) {
  if (p.propios.cargo === 'ADMINISTRADOR') return femenino(p) ? 'Administradora' : 'Administrador'
  return 'Vigilante'
}
function detalleRol(p) {
  const x = p.propios
  switch (p.rol) {
    case 'ARRENDATARIO': return <>Contrato <span className="identificador">{x.contrato}</span></>
    case 'RESIDENTE': return x.parentesco
    case 'CONSEJO': return x.cargo
    case 'EMPLEADO': return cargoTexto(p) + (x.turno ? ` · turno ${x.turno.split(',')[0].toLowerCase()}` : '')
    default: return ''
  }
}
/** El vínculo con cada inmueble se deduce del rol y de esResidente. */
function vinculoTexto(p, v) {
  if (p.rol === 'PROPIETARIO' && !['A', 'B', 'C'].includes(v.inmueble.charAt(0))) return rolTexto(p)
  return rolTexto(p) + (v.residente ? ' residente' : ' no residente')
}
function CuentaPildora({ cuenta }) {
  if (cuenta === 'ACTIVA') return <Pildora tono="ok">Activa</Pildora>
  if (cuenta === 'BLOQUEADA') return <Pildora tono="no">Bloqueada</Pildora>
  if (cuenta === 'INACTIVA') return <Pildora>Inactiva</Pildora>
  return <span className="guia">Sin cuenta</span>
}
const EstadoPildora = ({ p }) => (p.estado === 'ACTIVO' ? <Pildora tono="ok">Activa</Pildora> : <Pildora>Desactivada</Pildora>)

/** Lleva el foco al primer campo con error del diálogo abierto. */
function enfocarError() {
  requestAnimationFrame(() => document.querySelector('dialog[open] [aria-invalid="true"]')?.focus())
}

// ---------- Página ----------

export default function Personas() {
  const consulta = useConsulta(() => personasEjemplo.consultar())
  const [cambiadas, setCambiadas] = useState(null)
  const [texto, setTexto] = useState('')
  const [rol, setRol] = useState('')
  const [estado, setEstado] = useState('ACTIVO')
  const [fichaId, setFichaId] = useState(null)
  const [dialogo, setDialogo] = useState(null)

  const datos = consulta.datos
  const personas = useMemo(() => cambiadas ?? datos?.personas ?? [], [cambiadas, datos])

  const visibles = useMemo(() => {
    const busca = texto.trim().toLowerCase().replace(/[.\s](?=\d)/g, '')
    return personas.filter((p) => {
      if (estado && p.estado !== estado) return false
      if (rol && p.rol !== rol) return false
      if (!busca) return true
      const inmuebles = p.vinculos.map((v) => v.inmueble).join(' ')
      return `${nombre(p)} ${p.documento} ${inmuebles} ${p.correo}`.toLowerCase().includes(busca)
    })
  }, [personas, texto, rol, estado])

  if (consulta.cargando && !datos) return <main className="pagina"><Cargando texto="Cargando personas…" /></main>
  if (consulta.error) {
    return <main className="pagina"><div className="superficie"><ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /></div></main>
  }

  // La página muestra una muestra; el resto de las personas de la copropiedad está en las páginas siguientes.
  const activas = personas.filter((p) => p.estado === 'ACTIVO').length + datos.otrasActivas
  const desactivadas = personas.filter((p) => p.estado === 'INACTIVO').length + datos.otrasDesactivadas
  let universo = `${activas + desactivadas} personas`
  if (estado === 'ACTIVO') universo = `${activas} personas activas`
  if (estado === 'INACTIVO') universo = `${desactivadas} personas desactivadas`

  const actual = personas.find((p) => p.id === fichaId)
  const cambiar = (id, cambios) => setCambiadas(personas.map((p) => (p.id === id ? { ...p, ...cambios } : p)))
  const limpiar = () => { setTexto(''); setRol(''); setEstado('') }

  return (
    <main className="pagina">
      <AvisoDatosDeEjemplo casoDeUso="CU-03" />
      <Encabezado titulo="Personas"
        guia={`${activas} personas activas: propietarios, arrendatarios, residentes, consejo y empleados de Villa Campestre.`}
        acciones={<button className="btn" type="button" onClick={() => setDialogo('registrar')}>Registrar persona</button>} />

      <div className="filtros">
        <Buscador valor={texto} alCambiar={setTexto} placeholder="Nombre, documento o unidad" etiqueta="Buscar persona" />
        <label className="campo">
          <span className="solo-lectores">Rol</span>
          <select value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="">Todos los roles</option>
            {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.texto}</option>)}
          </select>
        </label>
        <Segmentos etiqueta="Estado" opciones={ESTADOS} valor={estado} alCambiar={setEstado} />
      </div>

      <div className="superficie">
        {visibles.length > 0 ? (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Persona</th><th>Documento</th><th>Rol</th><th>Inmuebles</th><th>Contacto</th><th>Cuenta</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => <FilaPersona key={p.id} p={p} alAbrir={() => setFichaId(p.id)} />)}
              </tbody>
            </table>
          </div>
        ) : (
          <Vacio titulo="Ninguna persona coincide con la búsqueda"
            accion={<button className="btn segundo" type="button" onClick={limpiar}>Quitar filtros</button>}>
            Busca por nombre, por documento sin puntos, por ejemplo <span className="identificador">1032418765</span>, o por
            unidad, por ejemplo <span className="identificador">B-0302</span>.
          </Vacio>
        )}
        <div className="pie">
          <span>{visibles.length} de {universo}</span>
          <div className="fila" style={{ gap: 'var(--e1)' }}>
            <button className="btn segundo chico" type="button" disabled>Anterior</button>
            <button className="btn segundo chico" type="button" disabled>Siguiente</button>
          </div>
        </div>
      </div>

      <RegistrarPersona abierto={dialogo === 'registrar'} alCerrar={() => setDialogo(null)} personas={personas}
        alRegistrar={(nueva) => {
          setCambiadas([{ ...nueva, id: Math.max(0, ...personas.map((p) => p.id)) + 1 }, ...personas])
          setTexto('')
          setRol('')
          setEstado('ACTIVO')
        }}
        alVerFicha={(id) => { setDialogo(null); setFichaId(id) }} />

      <Ficha persona={actual} alCerrar={() => setFichaId(null)}
        alModificarContacto={() => setDialogo('contacto')} alDesactivar={() => setDialogo('desactivar')} />

      <ModificarContacto persona={dialogo === 'contacto' ? actual : null} alCerrar={() => setDialogo(null)}
        alGuardar={(cambios) => cambiar(actual.id, cambios)} />

      <DesactivarPersona persona={dialogo === 'desactivar' ? actual : null} alCerrar={() => setDialogo(null)}
        alDesactivar={(motivo) => cambiar(actual.id, { estado: 'INACTIVO', motivo, fechaDesactivacion: HOY })} />
    </main>
  )
}

function FilaPersona({ p, alAbrir }) {
  const vigentes = p.vinculos.filter((v) => !v.hasta)
  let inmuebles = <span className="guia">Sin inmuebles</span>
  if (vigentes.length) {
    inmuebles = vigentes.map((v, i) => <span key={v.inmueble}>{i > 0 && ', '}<span className="identificador">{v.inmueble}</span></span>)
  } else if (p.vinculos.length) {
    inmuebles = <>
      <span className="guia">Ninguno vigente</span>
      <span className="sub">Estuvo en <span className="identificador">{p.vinculos[0].inmueble}</span></span>
    </>
  }
  const detalle = detalleRol(p)

  return (
    <tr>
      <td>
        <button className="fila-enlace" type="button" style={ESTILO_ENLACE} onClick={alAbrir}>{nombre(p)}</button>
        {p.razonSocial && <span className="sub">Empresa</span>}
      </td>
      <td className="mono">{documento(p)}</td>
      <td><span className="etiqueta">{rolTexto(p)}</span>{detalle && <span className="sub">{detalle}</span>}</td>
      <td>{inmuebles}</td>
      <td>{p.telefono}<span className="sub">{p.correo}</span></td>
      <td><CuentaPildora cuenta={p.cuenta} /></td>
      <td><EstadoPildora p={p} /></td>
    </tr>
  )
}

// ---------- Ficha de la persona ----------

/** Igual que Dialogo, pero con el estado junto al nombre en la cabeza, como en la vista. */
function DialogoFicha({ abierto, alCerrar, titulo, estado, guia, pie, children }) {
  const ref = useRef(null)
  const idTitulo = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  return (
    <dialog ref={ref} className="dialogo ancho" aria-labelledby={idTitulo} onClose={() => abierto && alCerrar()}>
      {abierto && (
        <div className="contenido">
          <div className="cabeza">
            <div>
              <div className="fila" style={{ gap: 'var(--e3)' }}>
                <h2 id={idTitulo}>{titulo}</h2>
                {estado}
              </div>
              <p className="guia">{guia}</p>
            </div>
            <button className="cerrar" type="button" onClick={alCerrar} aria-label="Cerrar">×</button>
          </div>
          <div className="cuerpo">{children}</div>
          <div className="pie">{pie}</div>
        </div>
      )}
    </dialog>
  )
}

function Datos({ pares }) {
  return (
    <dl className="datos">
      {pares.filter(Boolean).map(([dt, dd]) => <div key={dt}><dt>{dt}</dt><dd>{dd}</dd></div>)}
    </dl>
  )
}

function Bloque({ titulo, children }) {
  return <section><h4 style={{ marginBottom: 'var(--e3)' }}>{titulo}</h4>{children}</section>
}

function Ficha({ persona: p, alCerrar, alModificarContacto, alDesactivar }) {
  if (!p) return <DialogoFicha abierto={false} alCerrar={alCerrar} />

  const activa = p.estado === 'ACTIVO'
  const x = p.propios

  const personales = [
    ...(p.razonSocial
      ? [['Razón social', p.razonSocial], ['NIT', <span key="nit" className="identificador">{documento(p).slice(4)}</span>]]
      : [
          ['Documento', <span key="doc" className="identificador">{documento(p)}</span>],
          ['Género', GENEROS[p.genero] || '—'],
          ['Fecha de nacimiento', p.fechaNacimiento ? fechaLarga(p.fechaNacimiento) : 'Sin registrar'],
        ]),
    ['Residencia', `${p.ciudad}, ${p.pais}`],
    ['Dirección', p.direccion],
    ['Teléfono', <span key="tel" className="num">{p.telefono}</span>],
    ['Correo', p.correo],
  ]

  let propios
  switch (p.rol) {
    case 'PROPIETARIO': propios = [['Dirección de correspondencia', x.correspondencia]]; break
    case 'ARRENDATARIO': propios = [['Número de contrato', <span key="c" className="identificador">{x.contrato}</span>]]; break
    case 'RESIDENTE': propios = [['Parentesco', x.parentesco]]; break
    case 'CONSEJO': propios = [['Cargo en el consejo', x.cargo], ['Periodo', `${fechaLarga(x.inicio)} a ${fechaLarga(x.fin)}`]]; break
    default: propios = [
      ['Cargo', cargoTexto(p)], ['Fecha de ingreso', fechaLarga(x.ingreso)],
      x.empresa ? ['Empresa de seguridad', x.empresa] : null, x.turno ? ['Turno', x.turno] : null,
    ]
  }

  const textoCuenta = {
    ACTIVA: `Entra a Convivir con ${p.correo}.`,
    BLOQUEADA: 'Se bloqueó por intentos fallidos. Puede restablecer su contraseña desde la pantalla de acceso.',
    INACTIVA: 'Se desactivó con la persona.',
  }[p.cuenta] || 'No tiene cuenta. Puede pedirla a la administración.'

  return (
    <DialogoFicha abierto alCerrar={alCerrar} titulo={nombre(p)} estado={<EstadoPildora p={p} />}
      guia={<>{rolTexto(p)} · <span className="identificador">{documento(p)}</span></>}
      pie={<>
        {activa && <button className="btn riesgo" type="button" onClick={alDesactivar}>Desactivar persona</button>}
        {activa && <button className="btn segundo empuje" type="button" onClick={alModificarContacto}>Modificar contacto</button>}
        <button className="btn" type="button" onClick={alCerrar}>Cerrar</button>
      </>}>
      <div className="pila" style={{ gap: 'var(--e5)' }}>
        {!activa && (
          <div className="aviso">
            <p><b>Desactivada el {fechaLarga(p.fechaDesactivacion)}.</b> {p.motivo}</p>
            <p>Su historial en los inmuebles se conserva.</p>
          </div>
        )}
        <Bloque titulo={p.razonSocial ? 'Datos de la empresa' : 'Datos personales'}><Datos pares={personales} /></Bloque>
        <Bloque titulo={`Como ${rolTexto(p).toLowerCase()}`}><Datos pares={propios} /></Bloque>
        <Bloque titulo="Inmuebles">
          <div className="superficie">
            {!p.vinculos.length ? (
              <div className="vacio" style={{ padding: 'var(--e5)' }}>
                <h3>Todavía no está vinculada a ningún inmueble</h3>
                <p>Vincúlala desde la ficha del inmueble, en la pestaña Vinculaciones.</p>
                <Link className="btn segundo chico" to="/administrador/inmuebles">Ir a Inmuebles</Link>
              </div>
            ) : (
              <ul className="lista">
                {p.vinculos.map((v) => {
                  const cuando = v.hasta ? `del ${fechaLarga(v.desde)} al ${fechaLarga(v.hasta)}` : `desde el ${fechaLarga(v.desde)}`
                  const extra = (v.porcentaje ? ` · ${v.porcentaje} % de propiedad` : '') + (v.autoriza ? ' · autoriza accesos' : '')
                  return (
                    <li key={v.inmueble}>
                      <div className="principal">
                        <b><Link className="identificador" to="/administrador/inmuebles">{v.inmueble}</Link></b>
                        <span>{vinculoTexto(p, v)}, {cuando}{extra}</span>
                      </div>
                      {v.hasta ? <Pildora>Finalizada</Pildora> : <Pildora tono="ok">Vigente</Pildora>}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Bloque>
        <Bloque titulo="Cuenta de acceso">
          <div className="fila"><CuentaPildora cuenta={p.cuenta} /><span className="guia">{textoCuenta}</span></div>
        </Bloque>
      </div>
    </DialogoFicha>
  )
}

// ---------- Modificar contacto: Integrante.modificarDatosDeContacto() ----------

function ModificarContacto({ persona, alCerrar, alGuardar }) {
  const confirmar = useConfirmar()
  const [cambios, setCambios] = useState(null)
  const [errores, setErrores] = useState({})

  const valores = cambios ?? (persona ? { telefono: persona.telefono, correo: persona.correo } : null)
  const poner = (campo) => (e) => {
    setCambios({ ...valores, [campo]: e.target.value })
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }

  const cerrar = () => {
    setCambios(null)
    setErrores({})
    alCerrar()
  }

  const guardar = () => {
    const nuevos = {}
    if (!valores.telefono.trim()) nuevos.telefono = 'Escribe un celular para que portería pueda llamarle.'
    if (!valores.correo.trim()) nuevos.correo = 'Escribe su correo. Si tiene cuenta, con él entra a Convivir.'
    else if (!nuevos.telefono && !CORREO_VALIDO.test(valores.correo.trim())) nuevos.correo = 'Ese correo está incompleto. Escríbelo como nombre@dominio.co.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length) { enfocarError(); return }

    alGuardar({ telefono: valores.telefono.trim(), correo: valores.correo.trim() })
    confirmar(`Contacto de ${nombre(persona)} modificado`)
    cerrar()
  }

  const conCuenta = persona?.cuenta === 'ACTIVA' || persona?.cuenta === 'BLOQUEADA'
  return (
    <Dialogo abierto={!!persona} alCerrar={cerrar} titulo={persona ? `Modificar contacto de ${nombre(persona)}` : 'Modificar contacto'}
      guia="Portería y la administración usan estos datos para avisarle." alEnviar={guardar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit">Guardar contacto</button>
      </>}>
      {valores && (
        <div className="formulario">
          <Campo rotulo="Teléfono" error={errores.telefono}>
            <input type="tel" inputMode="tel" value={valores.telefono} onChange={poner('telefono')} />
          </Campo>
          <Campo rotulo="Correo" error={errores.correo}
            ayuda={conCuenta ? 'Con este correo entra a Convivir. Si lo cambias, entra con el nuevo.' : null}>
            <input type="email" value={valores.correo} onChange={poner('correo')} />
          </Campo>
        </div>
      )}
    </Dialogo>
  )
}

// ---------- Desactivar: la información del inmueble no se pierde (RN-05) ----------

function DesactivarPersona({ persona, alCerrar, alDesactivar }) {
  const confirmar = useConfirmar()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState(null)

  const cerrar = () => {
    setMotivo('')
    setError(null)
    alCerrar()
  }

  const desactivar = () => {
    if (!motivo.trim()) {
      setError('Escribe el motivo. Queda en el historial y explica por qué ya no aparece.')
      enfocarError()
      return
    }
    alDesactivar(motivo.trim())
    confirmar(`${nombre(persona)} quedó desactivada. La información de sus inmuebles se conserva.`)
    cerrar()
  }

  const vigentes = persona ? persona.vinculos.filter((v) => !v.hasta) : []
  return (
    <Dialogo abierto={!!persona} alCerrar={cerrar} titulo={persona ? `Desactivar a ${nombre(persona)}` : 'Desactivar persona'}
      guia="No se borra nada: sigue en el historial de sus inmuebles." alEnviar={desactivar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn riesgo" type="submit">Desactivar persona</button>
      </>}>
      <div className="formulario">
        {vigentes.length > 0 && (
          <div className="aviso al">
            Tiene {vigentes.length === 1 ? '1 vinculación vigente' : `${vigentes.length} vinculaciones vigentes`}:{' '}
            {vigentes.map((v, i) => <span key={v.inmueble}>{i > 0 && ', '}<span className="identificador">{v.inmueble}</span></span>)}
            . Si ya no está en el inmueble, finaliza también la vinculación desde la ficha del inmueble.
          </div>
        )}
        <Campo rotulo="Motivo" error={error}>
          <textarea value={motivo} onChange={(e) => { setMotivo(e.target.value); setError(null) }}
            placeholder="Terminó su contrato de arriendo y entregó el apartamento." />
        </Campo>
      </div>
    </Dialogo>
  )
}

// ---------- Registrar persona: 409 si el documento ya existe ----------

const VACIO = {
  rol: '', correspondencia: '', contrato: '', parentesco: '', cargoConsejo: '', periodoInicio: '', periodoFin: '',
  cargo: 'ADMINISTRADOR', ingreso: '', empresa: '', turno: '',
  tipoDocumento: 'CC', documento: '', razonSocial: '', nombres: '', apellidos: '', genero: '', fechaNacimiento: '',
  pais: 'Colombia', ciudad: 'Barranquilla', direccion: '', telefono: '', correo: '', cuenta: true,
}

/** Campos obligatorios según el rol, el tipo de documento y la cuenta, con el mensaje de cada uno. */
function obligatorios(v) {
  const nit = v.tipoDocumento === 'NIT'
  const vigilante = v.rol === 'EMPLEADO' && v.cargo === 'VIGILANTE'
  return [
    [v.rol === 'PROPIETARIO', 'correspondencia', 'Escribe a dónde le llegan las cartas de la administración. Si vive aquí, escribe su unidad.'],
    [v.rol === 'ARRENDATARIO', 'contrato', 'Escribe el número del contrato de arriendo, por ejemplo ARR-2026-0201.'],
    [v.rol === 'RESIDENTE', 'parentesco', 'Elige el parentesco con el propietario o arrendatario del inmueble.'],
    [v.rol === 'CONSEJO', 'cargoConsejo', 'Elige el cargo que le dio la asamblea.'],
    [v.rol === 'CONSEJO', 'periodoInicio', 'Elige la fecha de la asamblea que lo eligió.'],
    [v.rol === 'CONSEJO', 'periodoFin', 'Elige hasta cuándo va su periodo. Suele ser un año.'],
    [v.rol === 'EMPLEADO', 'ingreso', 'Elige el día en que empezó a trabajar en el conjunto.'],
    [vigilante, 'empresa', 'Escribe la empresa de seguridad que lo contrató.'],
    [vigilante, 'turno', 'Elige su turno para saber quién está en portería.'],
    [true, 'documento', 'Escribe el número de documento sin puntos ni espacios.'],
    [nit, 'razonSocial', 'Escribe la razón social como aparece en el RUT.'],
    [!nit, 'nombres', 'Escribe los nombres como aparecen en el documento.'],
    [!nit, 'apellidos', 'Escribe los apellidos como aparecen en el documento.'],
    [!nit, 'genero', 'Elige el género. Lo usamos para nombrar su rol, por ejemplo propietaria o propietario.'],
    [true, 'pais', 'Elige el país donde vive.'],
    [true, 'ciudad', 'Escribe la ciudad donde vive.'],
    [true, 'direccion', 'Escribe la dirección donde vive. Si vive en el conjunto, escribe su torre y apartamento.'],
    [true, 'telefono', 'Escribe un celular para que portería pueda llamarle.'],
    [v.cuenta, 'correo', 'Escribe su correo. Ahí le llega el enlace para crear su contraseña.'],
  ].filter(([aplica, campo]) => aplica && !String(v[campo]).trim())
}

function RegistrarPersona({ abierto, alCerrar, personas, alRegistrar, alVerFicha }) {
  const confirmar = useConfirmar()
  const primerRol = useRef(null)
  const [v, setV] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [repetido, setRepetido] = useState(null)

  const admiteNit = v.rol === 'PROPIETARIO' || v.rol === 'ARRENDATARIO'
  const esEmpresa = v.tipoDocumento === 'NIT'

  const poner = (campo, valor) => {
    const nuevos = { ...v, [campo]: valor }
    // Solo propietarios y arrendatarios pueden ser una empresa.
    if (campo === 'rol' && valor !== 'PROPIETARIO' && valor !== 'ARRENDATARIO' && nuevos.tipoDocumento === 'NIT') nuevos.tipoDocumento = 'CC'
    setV(nuevos)
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }
  const entrada = (campo) => (e) => poner(campo, e.target.value)

  const limpiarTodo = () => {
    setV(VACIO)
    setErrores({})
    setRepetido(null)
  }
  const cerrar = () => { limpiarTodo(); alCerrar() }

  const registrar = () => {
    setRepetido(null)
    if (!v.rol) {
      setErrores({ rol: 'Elige el rol de la persona. De él dependen los datos que se piden.' })
      primerRol.current?.focus()
      return
    }

    const faltan = obligatorios(v)
    if (faltan.length) {
      setErrores(Object.fromEntries(faltan.map(([, campo, mensaje]) => [campo, mensaje])))
      enfocarError()
      return
    }

    const numero = v.documento.replace(/[\s.-]/g, '').toUpperCase()
    if (v.tipoDocumento !== 'PA' && !/^\d{5,12}$/.test(numero)) {
      setErrores({ documento: 'El número de documento lleva solo números, entre 5 y 12. Escríbelo sin puntos ni espacios.' })
      enfocarError()
      return
    }

    // 409: ya existe un integrante con ese documento (IntegranteRepositorio.existsByDocumento)
    const existente = personas.find((p) => p.documento === numero)
    if (existente) {
      setRepetido(existente)
      setErrores({ documento: 'Ese documento ya está registrado. Revisa el número o abre su ficha.' })
      requestAnimationFrame(() => {
        document.querySelector('dialog[open] [aria-invalid="true"]')?.focus()
        const cuerpo = document.querySelector('dialog[open] .cuerpo')
        if (cuerpo) cuerpo.scrollTop = 0
      })
      return
    }

    if (v.correo.trim() && !CORREO_VALIDO.test(v.correo.trim())) {
      setErrores({ correo: 'Ese correo está incompleto. Escríbelo como nombre@dominio.co.' })
      enfocarError()
      return
    }

    let propios = {}
    if (v.rol === 'CONSEJO') {
      if (v.periodoFin <= v.periodoInicio) {
        setErrores({ periodoFin: `El periodo termina antes de empezar. Elige una fecha posterior al ${fechaLarga(v.periodoInicio)}.` })
        enfocarError()
        return
      }
      propios = { cargo: v.cargoConsejo, inicio: v.periodoInicio, fin: v.periodoFin }
    }
    if (v.rol === 'PROPIETARIO') propios = { correspondencia: v.correspondencia.trim() }
    if (v.rol === 'ARRENDATARIO') propios = { contrato: v.contrato.trim().toUpperCase() }
    if (v.rol === 'RESIDENTE') propios = { parentesco: v.parentesco }
    if (v.rol === 'EMPLEADO') {
      propios = { cargo: v.cargo, ingreso: v.ingreso }
      if (v.cargo === 'VIGILANTE') Object.assign(propios, { empresa: v.empresa.trim(), turno: v.turno })
    }

    const nueva = {
      tipoDocumento: v.tipoDocumento, documento: numero, rol: v.rol,
      nombres: esEmpresa ? '' : v.nombres.trim(),
      apellidos: esEmpresa ? '' : v.apellidos.trim(),
      razonSocial: esEmpresa ? v.razonSocial.trim() : '',
      genero: esEmpresa ? '' : v.genero,
      fechaNacimiento: esEmpresa ? '' : v.fechaNacimiento,
      pais: v.pais, ciudad: v.ciudad.trim(), direccion: v.direccion.trim(), telefono: v.telefono.trim(),
      correo: v.correo.trim() || 'Sin correo', cuenta: v.cuenta ? 'ACTIVA' : '', estado: 'ACTIVO',
      propios, vinculos: [],
    }
    alRegistrar(nueva)
    confirmar(`${nombre(nueva)} quedó registrada como ${rolTexto(nueva).toLowerCase()}.` +
      (nueva.cuenta ? ' Le enviamos el correo para crear su contraseña.' : ''))
    cerrar()
  }

  const verFicha = () => {
    const id = repetido.id
    limpiarTodo()
    alVerFicha(id)
  }

  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} ancho titulo="Registrar persona" alEnviar={registrar}
      guia="Primero elige su rol: de él dependen los datos que se piden."
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit">Registrar persona</button>
      </>}>
      {repetido && (
        <div className="aviso no" role="alert" style={{ marginBottom: 'var(--e5)' }}>
          <p>
            <b>Ya hay una persona registrada con {documento(repetido)}:</b> {nombre(repetido)}, {rolTexto(repetido).toLowerCase()}
            {repetido.estado === 'INACTIVO' ? ', desactivada.' : '.'}
          </p>
          <p>
            {repetido.rol !== v.rol
              ? 'Cada persona tiene un solo rol en Convivir. Si debe quedar con otro, revisa su ficha antes de registrarla de nuevo.'
              : 'Búscala en la lista para vincularla a otro inmueble o corregir sus datos.'}
          </p>
          <div className="fila" style={{ marginTop: 'var(--e3)' }}>
            <button className="btn segundo chico" type="button" onClick={verFicha}>Ver su ficha</button>
          </div>
        </div>
      )}

      <div className="pila" style={{ gap: 'var(--e6)' }}>
        <fieldset className="campo">
          <legend className="rotulo">Rol</legend>
          <div className="elecciones">
            {ROLES.map((r, i) => (
              <label key={r.valor} className="eleccion">
                <input ref={i === 0 ? primerRol : undefined} type="radio" name="rol" value={r.valor} checked={v.rol === r.valor}
                  onChange={() => poner('rol', r.valor)} />
                <span><b>{r.texto}</b><small>{r.detalle}</small></span>
              </label>
            ))}
          </div>
          {errores.rol && <span className="error">{errores.rol}</span>}
        </fieldset>

        {!v.rol ? (
          <div className="vacio" style={{ padding: 'var(--e5) 0' }}>
            <p>Elige el rol para ver los datos que necesitas.</p>
          </div>
        ) : (
          <div className="pila" style={{ gap: 'var(--e6)' }}>
            {/* Campos propios de cada subclase de Integrante */}
            {v.rol === 'PROPIETARIO' && (
              <fieldset>
                <legend>Como propietario</legend>
                <div className="formulario">
                  <Campo rotulo="Dirección de correspondencia" error={errores.correspondencia}
                    ayuda="Si vive en el conjunto, escribe su torre y apartamento.">
                    <input value={v.correspondencia} onChange={entrada('correspondencia')}
                      placeholder="Calle 84 # 45-30, apto 801, Barranquilla" />
                  </Campo>
                </div>
              </fieldset>
            )}

            {v.rol === 'ARRENDATARIO' && (
              <fieldset>
                <legend>Como arrendatario</legend>
                <div className="formulario dos">
                  <Campo rotulo="Número de contrato de arriendo" error={errores.contrato}
                    ayuda="Como aparece en el contrato que entregó la inmobiliaria o el propietario.">
                    <input className="identificador" value={v.contrato} onChange={entrada('contrato')}
                      placeholder="ARR-2026-0201" autoComplete="off" />
                  </Campo>
                </div>
              </fieldset>
            )}

            {v.rol === 'RESIDENTE' && (
              <fieldset>
                <legend>Como residente autorizado</legend>
                <div className="formulario dos">
                  <Campo rotulo="Parentesco con quien lo autoriza" error={errores.parentesco}>
                    <select value={v.parentesco} onChange={entrada('parentesco')}>
                      <option value="">Elige el parentesco</option>
                      {PARENTESCOS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </Campo>
                </div>
              </fieldset>
            )}

            {v.rol === 'CONSEJO' && (
              <fieldset>
                <legend>Como miembro del consejo</legend>
                <div className="formulario dos">
                  <Campo rotulo="Cargo en el consejo" className="completo" error={errores.cargoConsejo}>
                    <select value={v.cargoConsejo} onChange={entrada('cargoConsejo')}>
                      <option value="">Elige el cargo</option>
                      {CARGOS_CONSEJO.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Campo>
                  <Campo rotulo="Inicio del periodo" error={errores.periodoInicio}>
                    <input type="date" value={v.periodoInicio} onChange={entrada('periodoInicio')} />
                  </Campo>
                  <Campo rotulo="Fin del periodo" error={errores.periodoFin}>
                    <input type="date" value={v.periodoFin} onChange={entrada('periodoFin')} />
                  </Campo>
                </div>
              </fieldset>
            )}

            {v.rol === 'EMPLEADO' && (
              <fieldset>
                <legend>Como empleado</legend>
                <div className="formulario dos">
                  <fieldset className="completo">
                    <legend className="rotulo">Cargo</legend>
                    <div className="elecciones">
                      <label className="eleccion">
                        <input type="radio" name="cargo" value="ADMINISTRADOR" checked={v.cargo === 'ADMINISTRADOR'}
                          onChange={() => poner('cargo', 'ADMINISTRADOR')} />
                        <span><b>Administrador</b><small>Gestiona la copropiedad en Convivir</small></span>
                      </label>
                      <label className="eleccion">
                        <input type="radio" name="cargo" value="VIGILANTE" checked={v.cargo === 'VIGILANTE'}
                          onChange={() => poner('cargo', 'VIGILANTE')} />
                        <span><b>Vigilante</b><small>Usa la pantalla de portería</small></span>
                      </label>
                    </div>
                  </fieldset>
                  <Campo rotulo="Fecha de ingreso" error={errores.ingreso}>
                    <input type="date" value={v.ingreso} onChange={entrada('ingreso')} />
                  </Campo>
                  {v.cargo === 'VIGILANTE' && (
                    <>
                      <Campo rotulo="Empresa de seguridad" error={errores.empresa}>
                        <input value={v.empresa} onChange={entrada('empresa')} placeholder="Vigilancia Costa Segura Ltda." />
                      </Campo>
                      <Campo rotulo="Turno" error={errores.turno}>
                        <select value={v.turno} onChange={entrada('turno')}>
                          <option value="">Elige el turno</option>
                          {TURNOS.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      </Campo>
                    </>
                  )}
                </div>
              </fieldset>
            )}

            {/* Campos comunes de Integrante */}
            <fieldset>
              <legend>Identificación</legend>
              <div className="formulario dos">
                <Campo rotulo="Tipo de documento" error={errores.tipoDocumento}>
                  <select value={v.tipoDocumento} onChange={entrada('tipoDocumento')}>
                    {TIPOS_DOCUMENTO.map((t) => (
                      <option key={t.valor} value={t.valor} disabled={t.valor === 'NIT' && !admiteNit}>{t.texto}</option>
                    ))}
                  </select>
                </Campo>
                <Campo rotulo="Número de documento" error={errores.documento}
                  ayuda={esEmpresa ? 'Con el dígito de verificación, sin guion: 9004123375.' : 'Sin puntos ni espacios.'}>
                  <input className="identificador" inputMode="numeric" autoComplete="off" placeholder="1032418765"
                    value={v.documento} onChange={entrada('documento')} />
                </Campo>
                {esEmpresa ? (
                  <Campo rotulo="Razón social" className="completo" error={errores.razonSocial}>
                    <input value={v.razonSocial} onChange={entrada('razonSocial')} placeholder="Inversiones Lomas del Norte S.A.S." />
                  </Campo>
                ) : (
                  <div className="formulario dos completo">
                    <Campo rotulo="Nombres" error={errores.nombres}>
                      <input value={v.nombres} onChange={entrada('nombres')} autoComplete="off" placeholder="Lucía" />
                    </Campo>
                    <Campo rotulo="Apellidos" error={errores.apellidos}>
                      <input value={v.apellidos} onChange={entrada('apellidos')} autoComplete="off" placeholder="Mendoza Ríos" />
                    </Campo>
                    <Campo rotulo="Género" error={errores.genero}>
                      <select value={v.genero} onChange={entrada('genero')}>
                        <option value="">Elige el género</option>
                        {Object.entries(GENEROS).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                      </select>
                    </Campo>
                    <Campo rotulo="Fecha de nacimiento" opcional>
                      <input type="date" max={HOY} value={v.fechaNacimiento} onChange={entrada('fechaNacimiento')} />
                    </Campo>
                  </div>
                )}
              </div>
            </fieldset>

            <fieldset>
              <legend>Residencia y contacto</legend>
              <div className="formulario dos">
                <Campo rotulo="País de residencia" error={errores.pais}>
                  <select value={v.pais} onChange={entrada('pais')}>
                    {PAISES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Campo>
                <Campo rotulo="Ciudad de residencia" error={errores.ciudad}>
                  <input value={v.ciudad} onChange={entrada('ciudad')} />
                </Campo>
                <Campo rotulo="Dirección de residencia" className="completo" error={errores.direccion}>
                  <input value={v.direccion} onChange={entrada('direccion')} placeholder="Villa Campestre, Torre B, apto 302" />
                </Campo>
                <Campo rotulo="Teléfono" error={errores.telefono}>
                  <input type="tel" inputMode="tel" value={v.telefono} onChange={entrada('telefono')} placeholder="304 215 9087" />
                </Campo>
                <Campo rotulo="Correo" opcional={!v.cuenta} error={errores.correo}>
                  <input type="email" value={v.correo} onChange={entrada('correo')} placeholder="lucia.mendoza@correo.co" autoComplete="off" />
                </Campo>
              </div>
            </fieldset>

            <fieldset>
              <legend>Cuenta de acceso</legend>
              <label className="opcion">
                <input type="checkbox" checked={v.cuenta} onChange={(e) => poner('cuenta', e.target.checked)} />
                <span>Crear su cuenta de acceso a Convivir<small>Le llega un correo para crear su contraseña. Entra con su correo.</small></span>
              </label>
            </fieldset>
          </div>
        )}
      </div>
    </Dialogo>
  )
}
