import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { AvisoDatosDeEjemplo, Buscador, Cargando, Encabezado, ErrorDeCarga, Segmentos, Vacio } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { vehiculosEjemplo } from '../../datos/inmuebles-personas.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-08 Gestionar vehículos (desde el administrador). new Vehiculo(placa, tipoVehiculo, marca, color),
// Vehiculo.registrarVehiculo(), Vehiculo.modificarDatosDelVehiculo(), Vehiculo.darDeBajaVehiculoPorMotivo(motivo).
// Placa única (RN-14). Sin API todavía: usa datos de ejemplo.

const TIPOS = ['Carro', 'Camioneta', 'Moto']
const ESTADOS = [
  { valor: 'ACTIVO', texto: 'Activos' },
  { valor: 'INACTIVO', texto: 'Dados de baja' },
  { valor: '', texto: 'Todos' },
]

const unidadLarga = (id) => { const [torre, apto] = id.split('-'); return `Torre ${torre} · Apto ${apto}` }

/** "bqa47f" -> "BQA 47F"; null si no tiene el formato colombiano. */
function normalizarPlaca(texto) {
  const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^[A-Z]{3}[0-9]{2}[0-9A-Z]$/.test(limpio) ? `${limpio.slice(0, 3)} ${limpio.slice(3)}` : null
}

/** Lleva el foco al primer campo con error del diálogo abierto. */
function enfocarError() {
  requestAnimationFrame(() => document.querySelector('dialog[open] [aria-invalid="true"]')?.focus())
}

export default function Vehiculos() {
  const consulta = useConsulta(() => vehiculosEjemplo.consultar())
  const [cambiados, setCambiados] = useState(null)
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState('')
  const [estado, setEstado] = useState('ACTIVO')
  const [registrando, setRegistrando] = useState(false)
  const [modificando, setModificando] = useState(null)
  const [dandoDeBaja, setDandoDeBaja] = useState(null)

  const datos = consulta.datos
  const vehiculos = useMemo(() => cambiados ?? datos?.vehiculos ?? [], [cambiados, datos])

  const visibles = useMemo(() => {
    const busca = texto.trim().toLowerCase()
    const buscaPlaca = busca.replace(/\s/g, '')
    return vehiculos.filter((v) => {
      const buscable = `${v.placa} ${v.placa.replace(' ', '')} ${v.inmueble} ${v.responsable} ${v.marca}`.toLowerCase()
      return (!estado || v.estado === estado) && (!tipo || v.tipoVehiculo === tipo) &&
        (!busca || buscable.includes(busca) || buscable.includes(buscaPlaca))
    })
  }, [vehiculos, texto, tipo, estado])

  if (consulta.cargando && !datos) return <main className="pagina"><Cargando texto="Cargando vehículos…" /></main>
  if (consulta.error) {
    return <main className="pagina"><div className="superficie"><ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /></div></main>
  }

  const total = datos.otrosActivos + vehiculos.filter((v) => v.estado === 'ACTIVO').length
  const limpiar = () => { setTexto(''); setTipo(''); setEstado('') }
  const cambiar = (placa, cambios) => setCambiados(vehiculos.map((v) => (v.placa === placa ? { ...v, ...cambios } : v)))

  return (
    <main className="pagina">
      <AvisoDatosDeEjemplo casoDeUso="CU-08" />
      <Encabezado titulo="Vehículos" guia={`${total} vehículos activos de residentes. Portería los reconoce por la placa.`}
        acciones={<button className="btn" type="button" onClick={() => setRegistrando(true)}>Registrar vehículo</button>} />

      <div className="filtros">
        <Buscador valor={texto} alCambiar={setTexto} placeholder="Placa, unidad o responsable" etiqueta="Buscar vehículo" />
        <label className="campo">
          <span className="solo-lectores">Tipo de vehículo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => <option key={t}>{t}</option>)}
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
                  <th>Placa</th><th>Tipo</th><th>Marca</th><th>Color</th><th>Inmueble</th><th>Responsable</th>
                  <th>Estado</th><th><span className="solo-lectores">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((v) => {
                  const activo = v.estado === 'ACTIVO'
                  return (
                    <tr key={v.placa}>
                      <td className="mono">{v.placa}</td>
                      <td>{v.tipoVehiculo}</td>
                      <td>{v.marca}</td>
                      <td>{v.color}</td>
                      <td><Link className="fila-enlace identificador" to="/administrador/inmuebles">{v.inmueble}</Link></td>
                      <td>{v.responsable || <span className="guia">Sin responsable</span>}</td>
                      <td>
                        {activo
                          ? <Pildora tono="ok">Activo</Pildora>
                          : <><Pildora>Dado de baja</Pildora><span className="sub">{v.motivoBaja}</span></>}
                      </td>
                      <td className="acciones-fila">
                        {activo && (
                          <>
                            <button className="btn texto chico" type="button" onClick={() => setModificando(v)}>Modificar</button>
                            <button className="btn texto chico" type="button" onClick={() => setDandoDeBaja(v)}>Dar de baja</button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Vacio titulo="Ningún vehículo coincide con la búsqueda"
            accion={<button className="btn segundo" type="button" onClick={limpiar}>Quitar filtros</button>}>
            Revisa la placa, por ejemplo <span className="identificador">BQA 47F</span>, o busca por la unidad o el nombre del responsable.
          </Vacio>
        )}
        <div className="pie">
          <span>{visibles.length} de {total} vehículos activos</span>
          <div className="fila" style={{ gap: 'var(--e1)' }}>
            <button className="btn segundo chico" type="button" disabled>Anterior</button>
            <button className="btn segundo chico" type="button" disabled>Siguiente</button>
          </div>
        </div>
      </div>

      <RegistrarVehiculo abierto={registrando} alCerrar={() => setRegistrando(false)} vehiculos={vehiculos}
        inmuebles={datos.inmuebles}
        alRegistrar={(nuevo) => { setCambiados([nuevo, ...vehiculos]); setEstado('ACTIVO') }} />
      <ModificarVehiculo vehiculo={modificando} alCerrar={() => setModificando(null)}
        alGuardar={(cambios) => cambiar(modificando.placa, cambios)} />
      <DarDeBaja vehiculo={dandoDeBaja} alCerrar={() => setDandoDeBaja(null)}
        alDarDeBaja={(motivoBaja) => cambiar(dandoDeBaja.placa, { estado: 'INACTIVO', motivoBaja })} />
    </main>
  )
}

function ElegirTipo({ nombre, valor, alCambiar }) {
  return (
    <fieldset>
      <legend className="rotulo">Tipo</legend>
      <div className="chips">
        {TIPOS.map((t) => (
          <label key={t} className="chip">
            <input type="radio" name={nombre} value={t} checked={valor === t} onChange={() => alCambiar(t)} />
            <span>{t}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// ---------- Registrar: 409 si la placa ya existe (RN-14) ----------

function RegistrarVehiculo({ abierto, alCerrar, vehiculos, inmuebles, alRegistrar }) {
  const confirmar = useConfirmar()
  const idPlaca = useId()
  const vacio = { placa: '', tipoVehiculo: 'Carro', marca: '', color: '', inmueble: '', responsable: '' }
  const [valores, setValores] = useState(vacio)
  const [errores, setErrores] = useState({})
  const [repetido, setRepetido] = useState(null)

  const vinculados = inmuebles.find((i) => i.identificacion === valores.inmueble)?.vinculados ?? []

  const poner = (campo, valor) => {
    setValores({ ...valores, [campo]: valor, ...(campo === 'inmueble' ? { responsable: '' } : {}) })
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }

  const cerrar = () => {
    setValores(vacio)
    setErrores({})
    setRepetido(null)
    alCerrar()
  }

  const registrar = () => {
    setRepetido(null)
    const nuevos = {}
    if (!valores.placa.trim()) nuevos.placa = 'Escribe la placa como aparece en la tarjeta de propiedad, por ejemplo BQA 47F.'
    if (!valores.marca.trim()) nuevos.marca = 'Escribe la marca y la línea, por ejemplo Mazda 2.'
    if (!valores.color.trim()) nuevos.color = 'Escribe el color como aparece en la tarjeta de propiedad.'
    if (!valores.inmueble) nuevos.inmueble = 'Elige el inmueble al que pertenece el vehículo.'
    const placa = normalizarPlaca(valores.placa)
    if (!Object.keys(nuevos).length && !placa) {
      nuevos.placa = 'Esa placa no tiene el formato colombiano. Escríbela como en la tarjeta de propiedad: tres letras y tres caracteres, por ejemplo BQA 47F.'
    }
    setErrores(nuevos)
    if (Object.keys(nuevos).length) { enfocarError(); return }

    // 409: ya existe un vehículo con esa placa (RN-14)
    const existente = vehiculos.find((v) => v.placa === placa)
    if (existente) {
      setRepetido(existente)
      enfocarError()
      return
    }

    const nuevo = {
      placa, tipoVehiculo: valores.tipoVehiculo, marca: valores.marca.trim(), color: valores.color.trim(),
      inmueble: valores.inmueble, responsable: valores.responsable, estado: 'ACTIVO',
    }
    alRegistrar(nuevo)
    confirmar(`Vehículo registrado: ${placa} en ${nuevo.inmueble}. Portería ya lo reconoce.`)
    cerrar()
  }

  let primeraResponsable = 'Primero elige el inmueble'
  if (valores.inmueble) primeraResponsable = vinculados.length ? 'Sin responsable' : 'Nadie tiene vinculación vigente'
  const invalidaPlaca = !!errores.placa || !!repetido

  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} titulo="Registrar vehículo" alEnviar={registrar}
      guia="Queda a nombre del inmueble. Portería lo reconoce por la placa."
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit">Registrar vehículo</button>
      </>}>
      {repetido && (
        <div className="aviso no" role="alert" style={{ marginBottom: 'var(--e4)' }}>
          <p>
            <b>Esa placa ya está registrada en {unidadLarga(repetido.inmueble)}</b> (
            {repetido.responsable ? `${repetido.responsable}, ` : ''}{repetido.marca} {repetido.color.toLowerCase()}
            {repetido.estado === 'INACTIVO' ? ', dado de baja' : ''}). Una placa solo puede estar en un inmueble.
          </p>
          <p>
            {repetido.estado === 'INACTIVO'
              ? `La placa sigue en el historial de ${repetido.inmueble} aunque esté dada de baja. Revisa que la hayas escrito bien.`
              : `Si el vehículo cambió de inmueble, dalo de baja en ${repetido.inmueble} y regístralo aquí.`}
          </p>
        </div>
      )}
      <div className="formulario dos">
        {/* La placa se escribe a mano: queda marcada también cuando está repetida, sin mensaje debajo. */}
        <div className="campo">
          <label className="rotulo" htmlFor={idPlaca}>Placa</label>
          <input id={idPlaca} className="identificador placa" autoComplete="off" placeholder="BQA 47F" maxLength={7}
            value={valores.placa} onChange={(e) => { poner('placa', e.target.value); setRepetido(null) }}
            aria-invalid={invalidaPlaca ? 'true' : undefined}
            aria-describedby={`${idPlaca}-ayuda${errores.placa ? ` ${idPlaca}-error` : ''}`} />
          <span className="ayuda" id={`${idPlaca}-ayuda`}>Tres letras y tres caracteres. El espacio es opcional.</span>
          {errores.placa && <span className="error" id={`${idPlaca}-error`}>{errores.placa}</span>}
        </div>
        <ElegirTipo nombre="r-tipo" valor={valores.tipoVehiculo} alCambiar={(t) => poner('tipoVehiculo', t)} />
        <Campo rotulo="Marca y línea" error={errores.marca}>
          <input value={valores.marca} onChange={(e) => poner('marca', e.target.value)} placeholder="Mazda 2" />
        </Campo>
        <Campo rotulo="Color" error={errores.color}>
          <input value={valores.color} onChange={(e) => poner('color', e.target.value)} placeholder="Gris" />
        </Campo>
        <Campo rotulo="Inmueble" error={errores.inmueble}>
          <select value={valores.inmueble} onChange={(e) => poner('inmueble', e.target.value)}>
            <option value="">Elige un inmueble</option>
            {inmuebles.map((i) => (
              <option key={i.identificacion} value={i.identificacion}>
                {i.identificacion} · {i.vinculados.length ? i.vinculados[0] : 'sin residentes'}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Responsable" opcional ayuda="Solo personas con vinculación vigente en el inmueble.">
          <select value={valores.responsable} onChange={(e) => poner('responsable', e.target.value)} disabled={!vinculados.length}>
            <option value="">{primeraResponsable}</option>
            {vinculados.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Campo>
      </div>
    </Dialogo>
  )
}

// ---------- Modificar: la placa no cambia, es la llave del vehículo ----------

function ModificarVehiculo({ vehiculo, alCerrar, alGuardar }) {
  const confirmar = useConfirmar()
  const [cambios, setCambios] = useState(null)
  const [errores, setErrores] = useState({})

  const valores = cambios ?? (vehiculo ? { tipoVehiculo: vehiculo.tipoVehiculo, marca: vehiculo.marca, color: vehiculo.color } : null)
  const poner = (campo, valor) => {
    setCambios({ ...valores, [campo]: valor })
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }

  const cerrar = () => {
    setCambios(null)
    setErrores({})
    alCerrar()
  }

  const guardar = () => {
    const nuevos = {}
    if (!valores.marca.trim()) nuevos.marca = 'Escribe la marca y la línea, por ejemplo Mazda 2.'
    if (!valores.color.trim()) nuevos.color = 'Escribe el color como aparece en la tarjeta de propiedad.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length) { enfocarError(); return }

    alGuardar({ tipoVehiculo: valores.tipoVehiculo, marca: valores.marca.trim(), color: valores.color.trim() })
    confirmar(`Datos de ${vehiculo.placa} modificados`)
    cerrar()
  }

  return (
    <Dialogo abierto={!!vehiculo} alCerrar={cerrar} titulo={vehiculo ? `Modificar ${vehiculo.placa}` : 'Modificar vehículo'}
      guia="Corrige el tipo, la marca o el color." alEnviar={guardar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit">Guardar cambios</button>
      </>}>
      {valores && (
        <div className="formulario dos">
          <Campo rotulo="Placa" ayuda="La placa no se modifica. Si está mal escrita, da de baja el vehículo y regístralo de nuevo.">
            <input className="identificador" value={vehiculo.placa} disabled readOnly />
          </Campo>
          <ElegirTipo nombre="m-tipo" valor={valores.tipoVehiculo} alCambiar={(t) => poner('tipoVehiculo', t)} />
          <Campo rotulo="Marca y línea" error={errores.marca}>
            <input value={valores.marca} onChange={(e) => poner('marca', e.target.value)} />
          </Campo>
          <Campo rotulo="Color" error={errores.color}>
            <input value={valores.color} onChange={(e) => poner('color', e.target.value)} />
          </Campo>
        </div>
      )}
    </Dialogo>
  )
}

// ---------- Dar de baja: Vehiculo.darDeBajaVehiculoPorMotivo(motivo) ----------

function DarDeBaja({ vehiculo, alCerrar, alDarDeBaja }) {
  const confirmar = useConfirmar()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState(null)

  const cerrar = () => {
    setMotivo('')
    setError(null)
    alCerrar()
  }

  const darDeBaja = () => {
    if (!motivo.trim()) {
      setError('Escribe el motivo de la baja. Queda en el historial del inmueble.')
      enfocarError()
      return
    }
    alDarDeBaja(motivo.trim())
    confirmar(`${vehiculo.placa} dado de baja. Queda en el historial de ${vehiculo.inmueble}.`)
    cerrar()
  }

  const v = vehiculo
  return (
    <Dialogo abierto={!!v} alCerrar={cerrar} titulo={v ? `Dar de baja ${v.placa}` : 'Dar de baja'}
      guia={v && `${v.marca} ${v.color.toLowerCase()} de ${v.inmueble}${v.responsable ? `, a cargo de ${v.responsable}` : ''}.`}
      alEnviar={darDeBaja}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn riesgo" type="submit">Dar de baja</button>
      </>}>
      <div className="formulario">
        <Campo rotulo="Motivo" error={error}>
          <textarea value={motivo} onChange={(e) => { setMotivo(e.target.value); setError(null) }}
            placeholder="Lo vendió en octubre de 2026." />
        </Campo>
        <div className="aviso">Portería deja de reconocer la placa. El vehículo sigue en el historial del inmueble.</div>
      </div>
    </Dialogo>
  )
}
