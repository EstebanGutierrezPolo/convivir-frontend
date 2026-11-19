import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'

import { useSesion } from '../../aplicacion/sesion.jsx'
import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga, Pestanas, Vacio } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import {
  HOY, INMUEBLE, ORDEN_DIAS, autorizacionesApi, diasEntre, diasPermitidos, documentoLegible, fechaLarga, franjaHoraria, horaDe,
} from '../../datos/residente.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-05 Registrar visita ocasional · AutorizacionAcceso(nombreVisitante, documentoVisitante, OCASIONAL),
//   registrarAutorizacionDeAcceso(), validarQueElAutorizanteTengaPermiso() (RN-08), cancelarAutorizacionOcasional() (RF-030),
//   parqueaderos de visitantes disponibles (RF-064).
// CU-06 Registrar autorización recurrente · AutorizacionAcceso(…, RECURRENTE), revocarAutorizacionRecurrente() (RF-042).
// Decisión abierta 10: diasPermitidos = "MARTES,VIERNES" y horarios = "HH:mm-HH:mm".
// ?estado=sin-permiso muestra el 403 de RN-08. Datos de ejemplo.

const NOMBRES_ESTADO = { UTILIZADA: 'Utilizada', CANCELADA: 'Cancelada', REVOCADA: 'Revocada', VENCIDA: 'Vencida' }
const DIAS_CORTOS = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom' }

/** Lleva el foco al primer campo con error, como hace la vista al validar. */
function enfocarPrimerError(contenedor, otro) {
  setTimeout(() => {
    const campo = contenedor.current?.querySelector('[aria-invalid="true"]') || (otro && contenedor.current?.querySelector(otro))
    campo?.focus()
  }, 0)
}

export default function Visitas() {
  const { sesion } = useSesion()
  const inmueble = sesion.inmuebles?.[0]?.nombre
  const [parametros] = useSearchParams()
  const sinPermiso = parametros.get('estado') === 'sin-permiso'
  const { hash } = useLocation()
  const confirmar = useConfirmar()
  const consulta = useConsulta(() => autorizacionesApi.consultar())
  const [pestana, setPestana] = useState(hash === '#recurrentes' ? 'recurrentes' : 'visitas')
  const [dialogo, setDialogo] = useState(hash === '#registrar' ? 'visita' : null)
  const [terminando, setTerminando] = useState(null)

  const lista = consulta.datos || []
  const ocasionales = lista.filter((a) => a.tipoAutorizacion === 'OCASIONAL')
  const recurrentes = lista.filter((a) => a.tipoAutorizacion === 'RECURRENTE')
  const porFecha = (a, b) => (a.fechaInicio + a.horarios).localeCompare(b.fechaInicio + b.horarios)
  const proximas = ocasionales.filter((a) => a.estado === 'VIGENTE').sort(porFecha)
  const anteriores = ocasionales.filter((a) => a.estado !== 'VIGENTE').sort(porFecha).reverse()
  const vigentes = recurrentes.filter((a) => a.estado === 'VIGENTE').sort((a, b) => a.fechaFin.localeCompare(b.fechaFin))
  const pasadas = recurrentes.filter((a) => a.estado !== 'VIGENTE')

  const terminar = async () => {
    const a = terminando
    await autorizacionesApi.terminar(a.id)
    confirmar(a.tipoAutorizacion === 'OCASIONAL'
      ? 'Visita cancelada. Portería ya no la ve.'
      : `Autorización revocada. ${a.nombreVisitante} ya no puede entrar sin que la anuncies.`)
    setTerminando(null)
    consulta.recargar()
  }

  const registrarVisita = <button className="btn segundo" type="button" onClick={() => setDialogo('visita')}>Registrar visita</button>
  const registrarRecurrente = (
    <button className="btn segundo" type="button" onClick={() => setDialogo('recurrente')}>Registrar autorización recurrente</button>
  )

  return (
    <main className="pagina media">
      <AvisoDatosDeEjemplo casoDeUso="CU-05 y CU-06" />
      <Encabezado titulo="Visitas"
        guia={`Portería ve lo que registras aquí cuando busca el documento de quien llega a ${inmueble}.`}
        acciones={<>
          <button className="btn" type="button" onClick={() => setDialogo('visita')}>Registrar visita</button>
          {registrarRecurrente}
        </>} />

      <Pestanas etiqueta="Tipo de autorización" activa={pestana} alCambiar={setPestana}
        pestanas={[
          { id: 'visitas', texto: 'Visitas', cuenta: consulta.datos ? proximas.length : undefined },
          { id: 'recurrentes', texto: 'Autorizaciones recurrentes', cuenta: consulta.datos ? vigentes.length : undefined },
        ]} />

      {!consulta.datos && consulta.cargando && <div className="superficie"><Cargando texto="Cargando tus visitas…" /></div>}
      {consulta.error && <div className="superficie"><ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /></div>}

      {/* Visitas ocasionales (RF-029) */}
      {consulta.datos && pestana === 'visitas' && (
        <section role="tabpanel" aria-label="Visitas" className="pila" style={{ gap: 'var(--e5)' }}>
          <div className="superficie">
            <div className="cabeza">
              <h2>Próximas</h2>
              <span className="guia">Puedes cancelar una visita mientras no haya entrado.</span>
            </div>
            <ul className="lista">
              {proximas.map((a) => <Renglon key={a.id} autorizacion={a} alTerminar={setTerminando} />)}
            </ul>
            {proximas.length === 0 && (
              <Vacio titulo="No tienes visitas próximas" accion={registrarVisita}>
                Registra una visita para que portería deje entrar a tu invitado sin llamarte.
              </Vacio>
            )}
          </div>
          {anteriores.length > 0 && (
            <div className="superficie">
              <div className="cabeza"><h2>Anteriores</h2></div>
              <ul className="lista">
                {anteriores.map((a) => <Renglon key={a.id} autorizacion={a} alTerminar={setTerminando} />)}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Autorizaciones recurrentes (RF-041) */}
      {consulta.datos && pestana === 'recurrentes' && (
        <section role="tabpanel" aria-label="Autorizaciones recurrentes" className="pila" style={{ gap: 'var(--e5)' }}>
          <div className="superficie">
            <div className="cabeza">
              <h2>Vigentes</h2>
              <span className="guia">Al terminar su vigencia pasan solas a vencidas.</span>
            </div>
            <ul className="lista">
              {vigentes.map((a) => <Renglon key={a.id} autorizacion={a} alTerminar={setTerminando} />)}
            </ul>
            {vigentes.length === 0 && (
              <Vacio titulo="No tienes autorizaciones recurrentes vigentes" accion={registrarRecurrente}>
                Si alguien viene cada semana, como la empleada doméstica o un profesor, autorízalo una vez con sus días y su horario.
              </Vacio>
            )}
          </div>
          {pasadas.length > 0 && (
            <div className="superficie">
              <div className="cabeza"><h2>Anteriores</h2></div>
              <ul className="lista">
                {pasadas.map((a) => <Renglon key={a.id} autorizacion={a} alTerminar={setTerminando} />)}
              </ul>
            </div>
          )}
        </section>
      )}

      <RegistrarVisita abierto={dialogo === 'visita'} alCerrar={() => setDialogo(null)} inmueble={inmueble} sinPermiso={sinPermiso}
        alRegistrar={() => { consulta.recargar(); setPestana('visitas') }} />
      <RegistrarRecurrente abierto={dialogo === 'recurrente'} alCerrar={() => setDialogo(null)} inmueble={inmueble} sinPermiso={sinPermiso}
        alRegistrar={() => { consulta.recargar(); setPestana('recurrentes') }} />
      <Terminar autorizacion={terminando} alCerrar={() => setTerminando(null)} alConfirmar={terminar} />
    </main>
  )
}

function EstadoAutorizacion({ autorizacion: a }) {
  if (a.estado === 'VIGENTE') {
    const faltan = diasEntre(HOY, a.fechaFin)
    if (a.tipoAutorizacion === 'RECURRENTE' && faltan <= 7) {
      return <Pildora tono="al">Vence en {faltan} {faltan === 1 ? 'día' : 'días'}</Pildora>
    }
    return <Pildora tono="ok">Vigente</Pildora>
  }
  return <Pildora tono="ne">{NOMBRES_ESTADO[a.estado]}</Pildora>
}

function Renglon({ autorizacion: a, alTerminar }) {
  const extra = [a.motivoAcceso, a.usaParqueaderoVisitantes && 'con parqueadero de visitantes'].filter(Boolean)
  return (
    <li>
      <div className="principal">
        <b>{a.nombreVisitante}</b>
        <span className="identificador">{documentoLegible(a.documentoVisitante)}</span>
        {a.tipoAutorizacion === 'OCASIONAL' ? (
          <span>{fechaLarga(a.fechaInicio, { conDia: true, hoy: true })}, {franjaHoraria(a.horarios)}</span>
        ) : (
          <>
            <span>{diasPermitidos(a.diasPermitidos)}, {franjaHoraria(a.horarios)}</span>
            <span>Del {fechaLarga(a.fechaInicio)} al {fechaLarga(a.fechaFin)}</span>
          </>
        )}
        {extra.length > 0 && <span>{extra.join(' · ')}</span>}
      </div>
      <div className="fila" style={{ gap: 'var(--e2)' }}>
        <EstadoAutorizacion autorizacion={a} />
        {a.estado === 'VIGENTE' && (
          <button className="btn riesgo chico" type="button" onClick={() => alTerminar(a)}>
            {a.tipoAutorizacion === 'OCASIONAL' ? 'Cancelar visita' : 'Revocar'}
          </button>
        )}
      </div>
    </li>
  )
}

/** Respuesta 403 de validarQueElAutorizanteTengaPermiso() (RN-08). */
function AvisoSinPermiso({ que, inmueble }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.scrollIntoView({ block: 'nearest' }) }, [])
  return (
    <div className="aviso no" role="alert" ref={ref} style={{ marginBottom: 'var(--e4)' }}>
      <p><b>No puedes autorizar {que} en {inmueble}.</b></p>
      <p>
        Para autorizar accesos necesitas una vinculación vigente con permiso para hacerlo, y la tuya
        (contrato <span className="identificador">{INMUEBLE.contrato}</span>) no lo tiene en este momento. Pídele a la
        administración que revise tu vinculación.
      </p>
    </div>
  )
}

// ---------- Registrar visita: new AutorizacionAcceso(nombreVisitante, documentoVisitante, OCASIONAL) ----------

const VISITA_VACIA = { nombre: '', tipoDocumento: 'CC', documento: '', dia: '', desde: '', hasta: '', motivo: '', parqueadero: false }

function RegistrarVisita({ abierto, alCerrar, inmueble, sinPermiso, alRegistrar }) {
  const confirmar = useConfirmar()
  const formulario = useRef(null)
  const [datos, setDatos] = useState(VISITA_VACIA)
  const [errores, setErrores] = useState({})
  const [rechazada, setRechazada] = useState(false)
  const [libres, setLibres] = useState(null)

  const poner = (campo, valor) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }
  const cambiar = (campo) => (e) => poner(campo, e.target.value)

  const cambiarParqueadero = (e) => {
    poner('parqueadero', e.target.checked)
    // GET /api/parqueaderos/visitantes/disponibles solo si usará parqueadero (RF-064)
    if (e.target.checked) autorizacionesApi.parqueaderosLibres().then(setLibres)
  }

  const cerrar = () => {
    setDatos(VISITA_VACIA)
    setErrores({})
    setRechazada(false)
    setLibres(null)
    alCerrar()
  }

  const registrar = async () => {
    const nuevos = {}
    if (!datos.nombre.trim()) nuevos.nombre = 'Escribe el nombre como aparece en el documento. Portería lo compara al llegar.'
    if (!datos.documento.trim()) nuevos.documento = 'Escribe el número de documento. Es lo que portería busca cuando llega.'
    if (!datos.dia) nuevos.dia = 'Elige el día en que llega tu visita.'
    if (!datos.desde) nuevos.desde = 'Indica desde qué hora puede entrar.'
    if (!datos.hasta) nuevos.hasta = 'Indica hasta qué hora puede entrar.'
    if (!Object.keys(nuevos).length && datos.hasta <= datos.desde) {
      nuevos.hasta = `La hora final debe ser después de las ${horaDe(datos.desde)}. Si la visita pasa de medianoche, regístrala hasta las 11:59 p. m.`
    }
    setErrores(nuevos)
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(formulario)
      return
    }
    try {
      await autorizacionesApi.registrar({
        tipoAutorizacion: 'OCASIONAL', nombreVisitante: datos.nombre.trim(),
        documentoVisitante: `${datos.tipoDocumento} ${datos.documento.replace(/\D/g, '')}`,
        motivoAcceso: datos.motivo.trim(), usaParqueaderoVisitantes: datos.parqueadero,
        fechaInicio: datos.dia, fechaFin: datos.dia, diasPermitidos: null, horarios: `${datos.desde}-${datos.hasta}`,
      }, { sinPermiso })
      confirmar('Visita registrada. Portería ya la ve.')
      alRegistrar()
      cerrar()
    } catch (error) {
      if (error.estado === 403) setRechazada(true)
      else throw error
    }
  }

  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} titulo="Registrar visita" alEnviar={registrar}
      guia={`Para alguien que viene una vez a ${inmueble}.`}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit">Registrar visita</button>
      </>}>
      {rechazada && <AvisoSinPermiso que="visitas" inmueble={inmueble} />}
      <div className="formulario dos" ref={formulario}>
        <Campo rotulo="Nombre del visitante" className="completo" error={errores.nombre}>
          <input value={datos.nombre} onChange={cambiar('nombre')} autoComplete="off" placeholder="Camila Restrepo Ariza" />
        </Campo>
        <Campo rotulo="Tipo de documento">
          <select value={datos.tipoDocumento} onChange={cambiar('tipoDocumento')}>
            <option value="CC">Cédula de ciudadanía</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="TI">Tarjeta de identidad</option>
            <option value="PA">Pasaporte</option>
          </select>
        </Campo>
        <Campo rotulo="Número de documento" ayuda="Sin puntos ni espacios." error={errores.documento}>
          <input className="identificador" inputMode="numeric" value={datos.documento} onChange={cambiar('documento')}
            autoComplete="off" placeholder="1045887332" />
        </Campo>
        <Campo rotulo="Día de la visita" className="completo" error={errores.dia}>
          <input type="date" min={HOY} value={datos.dia} onChange={cambiar('dia')} />
        </Campo>
        <Campo rotulo="Desde" error={errores.desde}>
          <input type="time" value={datos.desde} onChange={cambiar('desde')} />
        </Campo>
        <Campo rotulo="Hasta" error={errores.hasta}>
          <input type="time" value={datos.hasta} onChange={cambiar('hasta')} />
        </Campo>
        <Campo rotulo="Motivo" opcional className="completo">
          <input value={datos.motivo} onChange={cambiar('motivo')} autoComplete="off" placeholder="Almuerzo familiar" />
        </Campo>
        <div className="completo pila chica">
          <label className="opcion">
            <input type="checkbox" checked={datos.parqueadero} onChange={cambiarParqueadero} />
            <span>Usará parqueadero de visitantes<small>Si llega en carro o moto.</small></span>
          </label>
          <div aria-live="polite">
            {datos.parqueadero && libres && (
              <div className="aviso">
                <p><b><span className="num">{libres.libres}</span> de <span className="num">{libres.total}</span> parqueaderos de visitantes están libres en este momento.</b></p>
                <p>No se apartan: portería le asigna uno libre cuando llegue.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialogo>
  )
}

// ---------- Registrar autorización recurrente: new AutorizacionAcceso(…, RECURRENTE) ----------

const RECURRENTE_VACIA = {
  nombre: '', tipoDocumento: 'CC', documento: '', motivo: '', dias: [], desde: '', hasta: '', inicio: '', fin: '', parqueadero: false,
}

function RegistrarRecurrente({ abierto, alCerrar, inmueble, sinPermiso, alRegistrar }) {
  const confirmar = useConfirmar()
  const formulario = useRef(null)
  const idMotivos = useId()
  const [datos, setDatos] = useState(RECURRENTE_VACIA)
  const [errores, setErrores] = useState({})
  const [rechazada, setRechazada] = useState(false)

  const poner = (campo, valor) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }
  const cambiar = (campo) => (e) => poner(campo, e.target.value)
  const alternarDia = (dia) => poner('dias', datos.dias.includes(dia) ? datos.dias.filter((d) => d !== dia) : [...datos.dias, dia])

  const cerrar = () => {
    setDatos(RECURRENTE_VACIA)
    setErrores({})
    setRechazada(false)
    alCerrar()
  }

  const registrar = async () => {
    const nuevos = {}
    if (!datos.nombre.trim()) nuevos.nombre = 'Escribe el nombre como aparece en el documento.'
    if (!datos.documento.trim()) nuevos.documento = 'Escribe el número de documento. Es lo que portería busca cuando llega.'
    if (!datos.motivo.trim()) nuevos.motivo = 'Escribe por qué viene, por ejemplo empleada doméstica o profesor de inglés.'
    if (!datos.desde) nuevos.desde = 'Indica desde qué hora puede entrar esos días.'
    if (!datos.hasta) nuevos.hasta = 'Indica hasta qué hora puede entrar esos días.'
    if (!datos.inicio) nuevos.inicio = 'Elige el primer día en que la autorización vale.'
    if (!datos.fin) nuevos.fin = 'Elige el último día. Después pasa sola a vencida.'
    if (!Object.keys(nuevos).length) {
      if (!datos.dias.length) nuevos.dias = 'Elige al menos un día de la semana en que puede entrar.'
      if (datos.hasta <= datos.desde) nuevos.hasta = `La hora final debe ser después de las ${horaDe(datos.desde)}.`
      if (datos.fin < datos.inicio) {
        nuevos.fin = `La vigencia termina antes de empezar. Elige un día igual o posterior al ${fechaLarga(datos.inicio)}.`
      }
    }
    setErrores(nuevos)
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(formulario, 'input[name="dia"]')
      return
    }
    try {
      await autorizacionesApi.registrar({
        tipoAutorizacion: 'RECURRENTE', nombreVisitante: datos.nombre.trim(),
        documentoVisitante: `${datos.tipoDocumento} ${datos.documento.replace(/\D/g, '')}`,
        motivoAcceso: datos.motivo.trim(), usaParqueaderoVisitantes: datos.parqueadero,
        fechaInicio: datos.inicio, fechaFin: datos.fin,
        diasPermitidos: ORDEN_DIAS.filter((d) => datos.dias.includes(d)).join(','), horarios: `${datos.desde}-${datos.hasta}`,
      }, { sinPermiso })
      confirmar('Autorización registrada. Portería la ve en los días y horas que elegiste.')
      alRegistrar()
      cerrar()
    } catch (error) {
      if (error.estado === 403) setRechazada(true)
      else throw error
    }
  }

  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} titulo="Registrar autorización recurrente" alEnviar={registrar}
      guia={`Para quien viene a ${inmueble} los mismos días de cada semana.`}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit">Registrar autorización</button>
      </>}>
      {rechazada && <AvisoSinPermiso que="accesos" inmueble={inmueble} />}
      <div className="formulario dos" ref={formulario}>
        <Campo rotulo="Nombre de la persona autorizada" className="completo" error={errores.nombre}>
          <input value={datos.nombre} onChange={cambiar('nombre')} autoComplete="off" placeholder="Martha Lucía Cárdenas" />
        </Campo>
        <Campo rotulo="Tipo de documento">
          <select value={datos.tipoDocumento} onChange={cambiar('tipoDocumento')}>
            <option value="CC">Cédula de ciudadanía</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="PA">Pasaporte</option>
            <option value="PPT">Permiso por protección temporal</option>
          </select>
        </Campo>
        <Campo rotulo="Número de documento" ayuda="Sin puntos ni espacios." error={errores.documento}>
          <input className="identificador" inputMode="numeric" value={datos.documento} onChange={cambiar('documento')}
            autoComplete="off" placeholder="39654221" />
        </Campo>
        <Campo rotulo="Motivo" className="completo" error={errores.motivo}>
          <input list={idMotivos} value={datos.motivo} onChange={cambiar('motivo')} autoComplete="off" placeholder="Empleada doméstica" />
        </Campo>
        <datalist id={idMotivos}>
          <option value="Empleada doméstica" />
          <option value="Profesor particular" />
          <option value="Enfermera" />
          <option value="Paseador de perros" />
          <option value="Niñera" />
        </datalist>
        <fieldset className="campo completo">
          <legend className="rotulo">Días permitidos</legend>
          <div className="chips">
            {ORDEN_DIAS.map((d) => (
              <label key={d} className="chip">
                <input type="checkbox" name="dia" value={d} checked={datos.dias.includes(d)} onChange={() => alternarDia(d)} />
                <span>{DIAS_CORTOS[d]}</span>
              </label>
            ))}
          </div>
          {errores.dias && <span className="error">{errores.dias}</span>}
        </fieldset>
        <Campo rotulo="Puede entrar desde" error={errores.desde}>
          <input type="time" value={datos.desde} onChange={cambiar('desde')} />
        </Campo>
        <Campo rotulo="Hasta" error={errores.hasta}>
          <input type="time" value={datos.hasta} onChange={cambiar('hasta')} />
        </Campo>
        <Campo rotulo="Vigente desde" error={errores.inicio}>
          <input type="date" min={HOY} value={datos.inicio} onChange={cambiar('inicio')} />
        </Campo>
        <Campo rotulo="Vigente hasta" error={errores.fin}>
          <input type="date" min={HOY} value={datos.fin} onChange={cambiar('fin')} />
        </Campo>
        <label className="opcion completo">
          <input type="checkbox" checked={datos.parqueadero} onChange={(e) => poner('parqueadero', e.target.checked)} />
          <span>Puede usar parqueadero de visitantes<small>Una autorización recurrente no incluye parqueadero si no lo marcas.</small></span>
        </label>
      </div>
    </Dialogo>
  )
}

// ---------- Cancelar visita (cancelarAutorizacionOcasional) o revocar autorización (revocarAutorizacionRecurrente) ----------

function Terminar({ autorizacion: a, alCerrar, alConfirmar }) {
  const ocasional = a?.tipoAutorizacion === 'OCASIONAL'
  let titulo = ''
  let texto = ''
  if (a && ocasional) {
    titulo = `Cancelar la visita de ${a.nombreVisitante}`
    texto = `${fechaLarga(a.fechaInicio, { conDia: true, hoy: true })}, ${franjaHoraria(a.horarios)}. Si llega, portería no la dejará entrar sin llamarte. No se puede deshacer: tendrías que registrarla de nuevo.`
  } else if (a) {
    titulo = `Revocar la autorización de ${a.nombreVisitante}`
    texto = `${a.motivoAcceso}, ${diasPermitidos(a.diasPermitidos).toLowerCase()}, vigente hasta el ${fechaLarga(a.fechaFin)}. Desde ahora portería no la dejará entrar sin llamarte. No se puede deshacer.`
  }
  return (
    <Dialogo abierto={!!a} alCerrar={alCerrar} titulo={titulo} guia={texto}
      pie={<>
        <button className="btn segundo" type="button" onClick={alCerrar}>{ocasional ? 'Conservar visita' : 'Conservar autorización'}</button>
        <button className="btn riesgo" type="button" onClick={alConfirmar}>{ocasional ? 'Cancelar visita' : 'Revocar autorización'}</button>
      </>} />
  )
}
