import { useState } from 'react'

import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga, Vacio } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { useSesion } from '../../aplicacion/sesion.jsx'
import { HOY, diasEntre, normalizarPlaca, vehiculosApi } from '../../datos/residente.js'
import { fecha } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-08 Gestionar vehículos desde el residente, con "Registrar vehículo del propio inmueble" (RF-046)
// y el parqueadero que usa por cesión (CU-09). Modificar y dar de baja son del administrador (RF-049, RF-050).

const TIPOS = ['Automóvil', 'Camioneta', 'Motocicleta']
const PLACA_VALIDA = /^[A-Z]{3} \d{2}[A-Z0-9]$/

export default function Vehiculos() {
  const { sesion } = useSesion()
  const nombreInmueble = sesion.inmuebles?.[0]?.nombre || 'tu apartamento'
  const consulta = useConsulta(() => vehiculosApi.consultar())
  const [registrando, setRegistrando] = useState(false)

  if (consulta.cargando && !consulta.datos) return <main className="pagina media"><Cargando texto="Cargando tus vehículos…" /></main>
  if (consulta.error) return <main className="pagina media"><ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /></main>

  const { cesion, vehiculos, vinculados } = consulta.datos
  const ordenados = [...vehiculos].sort((a, b) => (a.estado === b.estado ? 0 : a.estado === 'ACTIVO' ? -1 : 1))
  const abrir = () => setRegistrando(true)

  return (
    <main className="pagina media">
      <AvisoDatosDeEjemplo casoDeUso="CU-08" />
      <Encabezado titulo="Vehículos" guia={`Vehículos de ${nombreInmueble}. Portería los reconoce por la placa.`}
        acciones={<button className="btn" type="button" onClick={abrir}>Registrar vehículo</button>} />

      {cesion && <Parqueadero cesion={cesion} nombreInmueble={nombreInmueble} />}

      <section className="seccion">
        <div className="encabezado"><h2>Vehículos del apartamento</h2></div>
        <div className="superficie">
          {ordenados.length === 0 ? (
            <Vacio titulo="No hay vehículos registrados en el apartamento"
              accion={<button className="btn segundo" type="button" onClick={abrir}>Registrar vehículo</button>}>
              Registra tu carro o tu moto para que portería lo reconozca al entrar.
            </Vacio>
          ) : (
            <ul className="lista">
              {ordenados.map((v) => <Renglon key={v.id} vehiculo={v} cesion={cesion} />)}
            </ul>
          )}
          <div className="pie">
            <span>Para corregir los datos de un vehículo o darlo de baja, pídeselo a la administración. Solo ella puede cambiarlos.</span>
          </div>
        </div>
      </section>

      <Registrar abierto={registrando} alCerrar={() => setRegistrando(false)} vinculados={vinculados}
        alRegistrar={consulta.recargar} nombreInmueble={nombreInmueble} />
    </main>
  )
}

function Parqueadero({ cesion, nombreInmueble }) {
  const dias = diasEntre(HOY, cesion.fechaFin)
  const porVencer = dias <= 30
  return (
    <section aria-label="Parqueadero que usas">
      <div className={`ficha ${porVencer ? 'al' : 'ok'}`}>
        <div className="fila entre" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="titular">Parqueadero <span className="identificador">{cesion.parqueadero}</span></div>
            <div className="meta">{cesion.ubicacion} · cedido por {cesion.cedente}, propietario, hasta el {fecha(cesion.fechaFin)}</div>
          </div>
          <Pildora tono={porVencer ? 'al' : 'ok'}>{porVencer ? `Vence en ${dias} días` : 'Vigente'}</Pildora>
        </div>
        <dl className="datos" style={{ marginTop: 'var(--e4)' }}>
          <div><dt>Cedido a</dt><dd>{nombreInmueble}</dd></div>
          <div><dt>Vigencia</dt><dd>{fecha(cesion.fechaInicio)} al {fecha(cesion.fechaFin)}</dd></div>
          <div><dt>Vehículo que ampara</dt><dd className="identificador">{cesion.placa}</dd></div>
        </dl>
        {porVencer && (
          <p className="guia" style={{ marginTop: 'var(--e4)' }}>
            Al vencer, el apartamento deja de tener el uso de este parqueadero, salvo que se renueve la cesión. Si lo
            vas a seguir usando, pídele a {cesion.cedente} que la renueve con la administración.
          </p>
        )}
      </div>
    </section>
  )
}

function Renglon({ vehiculo: v, cesion }) {
  const activo = v.estado === 'ACTIVO'
  return (
    <li>
      <div className="principal">
        <b className="identificador" style={{ fontSize: 'var(--t-md)' }}>{v.placa}</b>
        <span style={{ fontSize: 'var(--t-sm)', color: 'var(--tinta)' }}>
          {v.marca} · {v.color.toLowerCase()} · {v.tipoVehiculo.toLowerCase()}
        </span>
        <span>
          {activo
            ? `${v.responsable ? `Responsable: ${v.responsable}` : 'Sin responsable'} · registrado el ${fecha(v.fechaRegistro)}`
            : `Dado de baja el ${fecha(v.fechaBaja)} · ${v.motivoBaja}`}
        </span>
        {activo && v.parqueadero && cesion && (
          <span>Parquea en <span className="identificador">{v.parqueadero}</span> por cesión, hasta el {fecha(cesion.fechaFin)}</span>
        )}
      </div>
      {activo ? <Pildora tono="ok">Activo</Pildora> : <Pildora>Dado de baja</Pildora>}
    </li>
  )
}

function Registrar({ abierto, alCerrar, vinculados, alRegistrar, nombreInmueble }) {
  const confirmar = useConfirmar()
  const vacio = { placa: '', tipoVehiculo: '', marca: '', color: '', responsable: vinculados[0] || '' }
  const [datos, setDatos] = useState(vacio)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)

  const poner = (campo) => (e) => {
    setDatos({ ...datos, [campo]: e.target.value })
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }
  const cerrar = () => { setDatos(vacio); setErrores({}); alCerrar() }

  const registrar = async () => {
    const placa = normalizarPlaca(datos.placa)
    const nuevos = {}
    if (!placa) nuevos.placa = 'Escribe la placa como aparece en el vehículo, por ejemplo BQA 471.'
    else if (!PLACA_VALIDA.test(placa)) nuevos.placa = `${placa} no es una placa completa. Escribe tres letras y tres caracteres, por ejemplo BQA 471 o, si es moto, RTY 22E.`
    if (!datos.tipoVehiculo) nuevos.tipoVehiculo = 'Elige el tipo de vehículo.'
    if (!datos.marca.trim()) nuevos.marca = 'Escribe la marca, por ejemplo Mazda 2.'
    if (!datos.color.trim()) nuevos.color = 'Escribe el color como lo vería portería, por ejemplo gris.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length) return

    setEnviando(true)
    try {
      await vehiculosApi.registrar({
        placa, tipoVehiculo: datos.tipoVehiculo, marca: datos.marca.trim(), color: datos.color.trim(),
        responsable: datos.responsable || null,
      })
      confirmar(`Vehículo ${placa} registrado. Portería ya lo reconoce por la placa.`)
      alRegistrar()
      cerrar()
    } catch (error) {
      setErrores({ placa: error.message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} titulo="Registrar vehículo" guia={`Queda asociado a ${nombreInmueble}.`}
      alEnviar={registrar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit" disabled={enviando}>Registrar vehículo</button>
      </>}>
      <div className="formulario dos">
        <Campo rotulo="Placa" error={errores.placa}>
          <input className="identificador placa" value={datos.placa} onChange={poner('placa')} maxLength={7}
            autoComplete="off" placeholder="BQA 471" />
        </Campo>
        <Campo rotulo="Tipo" error={errores.tipoVehiculo}>
          <select value={datos.tipoVehiculo} onChange={poner('tipoVehiculo')}>
            <option value="">Elige el tipo</option>
            {TIPOS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Marca y línea" error={errores.marca}>
          <input value={datos.marca} onChange={poner('marca')} autoComplete="off" placeholder="Mazda 2" />
        </Campo>
        <Campo rotulo="Color" error={errores.color}>
          <input value={datos.color} onChange={poner('color')} autoComplete="off" placeholder="Gris" />
        </Campo>
        <Campo rotulo="Inmueble">
          <input value={nombreInmueble} disabled />
        </Campo>
        <Campo rotulo="Responsable" opcional ayuda="Entre las personas vinculadas al apartamento.">
          <select value={datos.responsable} onChange={poner('responsable')}>
            <option value="">Sin responsable</option>
            {vinculados.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Campo>
      </div>
    </Dialogo>
  )
}
