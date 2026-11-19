import { useState } from 'react'
import { Link } from 'react-router'

import { AvisoDatosDeEjemplo, Buscador, Cargando, Encabezado, ErrorDeCarga, Segmentos } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { usuariosDeEjemplo } from '../../datos/administracion.js'
import { cifra } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-18 Gestionar usuarios, roles y auditoría: new Cuenta(login, contrasena) (RF-101),
// Cuenta.obtenerRolDelIntegrante() (RF-102, RF-105), Cuenta.desactivarCuentaPorMotivo(motivo) (RF-103),
// Cuenta.restablecerContrasena() (RF-104). Estados: ACTIVA, INACTIVA, BLOQUEADA.
// Sin API todavía: datos de ejemplo de src/datos/administracion.js.

const ROLES = ['Administrador', 'Vigilante', 'Miembro del consejo', 'Propietario', 'Arrendatario', 'Residente autorizado']
const FILTRO_ESTADO = [
  { valor: '', texto: 'Todas' },
  { valor: 'ACTIVA', texto: 'Activas' },
  { valor: 'BLOQUEADA', texto: 'Bloqueadas' },
  { valor: 'INACTIVA', texto: 'Inactivas' },
]
const SIN_FILTRO = { texto: '', rol: '', estado: '' }

const nombreCorto = (p) => p.nombre.split(' ')[0]
/** "Sofía Restrepo" -> "sofia.restrepo". */
const sugerirLogin = (p) => p.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n')
  .split(' ').slice(0, 2).join('.')

function enfocarPrimerError() {
  requestAnimationFrame(() => {
    const abiertos = document.querySelectorAll('dialog[open]')
    abiertos[abiertos.length - 1]?.querySelector('[aria-invalid="true"]')?.focus()
  })
}

export default function Usuarios() {
  const consulta = useConsulta(() => usuariosDeEjemplo.consultar())
  const confirmar = useConfirmar()
  const [editadas, setEditadas] = useState(null)
  const [filtro, setFiltro] = useState(SIN_FILTRO)
  const [creando, setCreando] = useState(false)
  const [dialogo, setDialogo] = useState(null)

  const datos = consulta.datos
  if (!datos) {
    return (
      <main className="pagina">
        <AvisoDatosDeEjemplo casoDeUso="CU-18" />
        <Encabezado titulo="Usuarios y roles" />
        <div className="superficie">
          {consulta.error ? <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /> : <Cargando texto="Cargando cuentas…" />}
        </div>
      </main>
    )
  }

  const { personas } = datos
  const cuentas = editadas || datos.cuentas
  const persona = (id) => personas.find((p) => p.id === id)
  const cuentaDe = (id) => cuentas.find((c) => c.personaId === id)
  const cambiar = (login, cambios) => setEditadas(cuentas.map((c) => (c.login === login ? { ...c, ...cambios } : c)))
  const poner = (campo, valor) => setFiltro({ ...filtro, [campo]: valor })

  const texto = filtro.texto.trim().toLowerCase()
  const documentoBuscado = texto.replace(/[.\s]/g, '')
  const visibles = cuentas.filter((c) => {
    const p = persona(c.personaId)
    return (!texto || `${p.nombre} ${c.login} ${p.documento}`.toLowerCase().includes(texto)
      || (documentoBuscado && p.documento.includes(documentoBuscado)))
      && (!filtro.rol || p.rol === filtro.rol) && (!filtro.estado || c.estado === filtro.estado)
  })

  const bloqueadas = cuentas.filter((c) => c.estado === 'BLOQUEADA').length
  const activas = cuentas.filter((c) => c.estado === 'ACTIVA').length
  const sinCuenta = personas.filter((p) => !cuentaDe(p.id)).length
  const resumen = `${activas} cuentas activas · ${bloqueadas ? `${bloqueadas}${bloqueadas === 1 ? ' bloqueada' : ' bloqueadas'}` : 'ninguna bloqueada'} · `
    + `${sinCuenta}${sinCuenta === 1 ? ' persona registrada sin cuenta' : ' personas registradas sin cuenta'}`

  const crear = (p, login) => {
    setEditadas([...cuentas, { login, personaId: p.id, estado: 'ACTIVA' }])
    confirmar(`Cuenta creada para ${p.nombre}. Enviamos el enlace para elegir la contraseña a ${p.correo}.`)
    setCreando(false)
  }
  const restablecer = () => {
    const { cuenta, modo } = dialogo
    const p = persona(cuenta.personaId)
    if (modo === 'desbloquear') cambiar(cuenta.login, { estado: 'ACTIVA', bloqueadaDesde: null })
    confirmar(`${modo === 'desbloquear' ? 'Cuenta desbloqueada. ' : 'Contraseña restablecida. '}Enviamos el enlace a ${p.correo}.`)
    setDialogo(null)
  }
  const desactivar = (motivo) => {
    const { cuenta } = dialogo
    cambiar(cuenta.login, { estado: 'INACTIVA', motivoDesactivacion: motivo, bloqueadaDesde: null })
    confirmar(`Cuenta desactivada: ${cuenta.login}. ${persona(cuenta.personaId).nombre} ya no puede entrar.`)
    setDialogo(null)
  }

  const enDialogo = dialogo && persona(dialogo.cuenta.personaId)
  const desbloquear = dialogo?.modo === 'desbloquear'

  return (
    <main className="pagina">
      <AvisoDatosDeEjemplo casoDeUso="CU-18" />
      <Encabezado titulo="Usuarios y roles" guia={resumen}
        acciones={<button className="btn" type="button" onClick={() => setCreando(true)}>Crear cuenta</button>} />

      <div className="aviso" style={{ marginBottom: 'var(--e5)' }}>
        <p>
          <b>El rol no se elige aquí.</b> Sale del tipo con que se registró a la persona en <Link to="/administrador/personas">Personas</Link>:
          propietario, arrendatario, residente autorizado, miembro del consejo o empleado (administrador o vigilante).
        </p>
        <p>
          Cada persona registrada tiene una sola cuenta y un solo rol. Si alguien es propietario y también miembro del consejo, se
          registra una vez por cada rol y tiene una cuenta para cada uno.
        </p>
      </div>

      <div className="filtros">
        <Buscador valor={filtro.texto} alCambiar={(v) => poner('texto', v)} placeholder="Nombre, login o documento" etiqueta="Buscar cuenta" />
        <label className="campo">
          <span className="solo-lectores">Rol</span>
          <select value={filtro.rol} onChange={(e) => poner('rol', e.target.value)}>
            <option value="">Todos los roles</option>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <Segmentos etiqueta="Estado de la cuenta" opciones={FILTRO_ESTADO} valor={filtro.estado} alCambiar={(v) => poner('estado', v)} />
      </div>

      <div className="superficie">
        {visibles.length > 0 ? (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr><th>Persona</th><th>Login</th><th>Rol</th><th>Estado</th><th><span className="solo-lectores">Acciones</span></th></tr>
              </thead>
              <tbody>
                {visibles.map((c) => {
                  const p = persona(c.personaId)
                  const abrir = (modo) => () => setDialogo({ modo, cuenta: c })
                  return (
                    <tr key={c.login}>
                      <td>
                        <span className="fuerte">{p.nombre}</span>
                        {c.esPropia && <>{' '}<Pildora tono="az">Tú</Pildora></>}
                        <span className="sub">CC <span className="identificador">{cifra(p.documento)}</span></span>
                      </td>
                      <td className="mono">{c.login}</td>
                      <td><span className="etiqueta">{p.rol}</span><span className="sub">{p.tipo}</span></td>
                      <td style={{ minWidth: '12rem' }}>
                        {c.estado === 'ACTIVA' && <Pildora tono="ok">Activa</Pildora>}
                        {c.estado === 'BLOQUEADA' && (
                          <><Pildora tono="no">Bloqueada</Pildora><span className="sub">Desde {c.bloqueadaDesde}, por intentos fallidos</span></>
                        )}
                        {c.estado === 'INACTIVA' && <><Pildora tono="ne">Inactiva</Pildora><span className="sub">{c.motivoDesactivacion}</span></>}
                      </td>
                      <td className="acciones-fila">
                        {c.estado === 'ACTIVA' && (
                          <>
                            <button className="btn segundo chico" type="button" onClick={abrir('restablecer')}>Restablecer contraseña</button>
                            {!c.esPropia && <>{' '}<button className="btn texto chico" type="button" onClick={abrir('desactivar')}>Desactivar</button></>}
                          </>
                        )}
                        {c.estado === 'BLOQUEADA' && (
                          <>
                            <button className="btn segundo chico" type="button" onClick={abrir('desbloquear')}>Desbloquear</button>{' '}
                            <button className="btn texto chico" type="button" onClick={abrir('desactivar')}>Desactivar</button>
                          </>
                        )}
                        {c.estado === 'INACTIVA' && <span className="guia">Sin acciones</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="vacio">
            <h3>Ninguna cuenta coincide con la búsqueda</h3>
            <p>Busca por el nombre, el login o el documento sin puntos. Si la persona no tiene cuenta, créala desde aquí.</p>
            <button className="btn segundo" type="button" onClick={() => setFiltro(SIN_FILTRO)}>Quitar filtros</button>
          </div>
        )}
        <div className="pie">
          <span>{visibles.length} de {cuentas.length} cuentas</span>
          <span>Una cuenta se bloquea sola después de 5 intentos fallidos de inicio de sesión.</span>
        </div>
      </div>

      <CrearCuenta abierto={creando} personas={personas} cuentas={cuentas} alCerrar={() => setCreando(false)} alCrear={crear} />

      {/* Restablecer contraseña o desbloquear: Cuenta.restablecerContrasena() → EventoSistema CUENTA_MODIFICADA */}
      <Dialogo abierto={dialogo?.modo === 'restablecer' || desbloquear} alCerrar={() => setDialogo(null)}
        titulo={desbloquear ? 'Desbloquear cuenta' : 'Restablecer contraseña'}
        guia={enDialogo && `${enDialogo.nombre} · ${dialogo.cuenta.login}`} alEnviar={restablecer}
        pie={<>
          <button className="btn segundo" type="button" onClick={() => setDialogo(null)}>Cancelar</button>
          <button className="btn" type="submit">{desbloquear ? 'Desbloquear y enviar enlace' : 'Enviar enlace'}</button>
        </>}>
        {enDialogo && (
          <div className="pila">
            {desbloquear && (
              <div className="aviso no">
                <p>Bloqueada desde {dialogo.cuenta.bloqueadaDesde || ''} por superar los intentos fallidos de inicio de sesión.</p>
              </div>
            )}
            <p>
              {desbloquear
                ? `Para desbloquearla se restablece la contraseña: enviamos un enlace a ${enDialogo.correo} para que ${nombreCorto(enDialogo)} elija una nueva, y los intentos fallidos vuelven a cero.`
                : `Enviamos un enlace a ${enDialogo.correo} para que ${nombreCorto(enDialogo)} elija una contraseña nueva. La actual deja de funcionar en cuanto confirmes.`}
            </p>
            <p className="guia">Nadie ve la contraseña nueva, tampoco la administración. El enlace vence en 24 horas.</p>
          </div>
        )}
      </Dialogo>

      <DesactivarCuenta cuenta={dialogo?.modo === 'desactivar' ? dialogo.cuenta : null} persona={enDialogo}
        alCerrar={() => setDialogo(null)} alDesactivar={desactivar} />
    </main>
  )
}

// Crear cuenta: CuentaServicio.crearCuenta(integranteId, login) → 409 si el login existe o la persona ya tiene cuenta
function CrearCuenta({ abierto, personas, cuentas, alCerrar, alCrear }) {
  const vacio = { personaId: '', login: '', sugerido: '' }
  const [datos, setDatos] = useState(vacio)
  const [errores, setErrores] = useState({})

  const cuentaDe = (id) => cuentas.find((c) => c.personaId === id)
  const elegida = personas.find((p) => p.id === Number(datos.personaId))
  const sinCuenta = personas.filter((p) => !cuentaDe(p.id))
  const conCuenta = personas.filter((p) => cuentaDe(p.id))
  const opcion = (p) => <option key={p.id} value={p.id}>{p.nombre} · CC {cifra(p.documento)}</option>

  const cerrar = () => { setDatos(vacio); setErrores({}); alCerrar() }

  const elegirPersona = (e) => {
    const p = personas.find((x) => x.id === Number(e.target.value))
    const nuevos = { ...datos, personaId: e.target.value }
    // Sugiere el login mientras la persona no haya escrito uno propio.
    if (p && (!datos.login.trim() || datos.login === datos.sugerido)) {
      nuevos.login = sugerirLogin(p)
      nuevos.sugerido = nuevos.login
    }
    setDatos(nuevos)
    setErrores({ ...errores, personaId: null, ...(nuevos.login !== datos.login && nuevos.login ? { login: null } : {}) })
  }

  const enviar = () => {
    const login = datos.login.trim()
    const nuevos = {}
    if (!elegida) nuevos.personaId = 'Elige la persona. Si no aparece, regístrala primero en Personas.'
    if (!login) nuevos.login = 'Escribe el login con el que va a entrar, por ejemplo ernesto.vargas.'
    if (!Object.keys(nuevos).length) {
      const existente = cuentaDe(elegida.id)
      const duena = cuentas.find((c) => c.login === login)
      // 409: la persona ya tiene cuenta.
      if (existente) {
        nuevos.personaId = `${elegida.nombre} ya tiene la cuenta ${existente.login}. Cada persona tiene una sola cuenta: si no puede entrar, restablece su contraseña.`
      } else if (!/^[a-z0-9]+([._-][a-z0-9]+)*$/.test(login)) {
        nuevos.login = `El login va en minúsculas, sin espacios ni tildes, por ejemplo ${sugerirLogin(elegida)}.`
      } else if (duena) {
        // 409: el login ya existe.
        nuevos.login = `El login ${login} ya es de ${personas.find((p) => p.id === duena.personaId).nombre}. Prueba con otro, por ejemplo ${login}2.`
      }
    }
    setErrores(nuevos)
    if (Object.keys(nuevos).length) { enfocarPrimerError(); return }
    alCrear(elegida, login)
    setDatos(vacio)
  }

  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} titulo="Crear cuenta" guia="Para una persona que ya está registrada en Personas."
      alEnviar={enviar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit">Crear cuenta</button>
      </>}>
      <div className="formulario">
        <Campo rotulo="Persona" error={errores.personaId}>
          <select value={datos.personaId} onChange={elegirPersona}>
            <option value="">Elige una persona registrada</option>
            <optgroup label="Sin cuenta">{sinCuenta.map(opcion)}</optgroup>
            <optgroup label="Ya tienen cuenta">{conCuenta.map(opcion)}</optgroup>
          </select>
        </Campo>
        {elegida && (
          <div className="ficha az">
            <div className="fuerte">Entrará como {elegida.rol.toLowerCase()}</div>
            <div className="meta">
              Así se registró a {elegida.nombre} en Personas: {elegida.tipo}. El enlace para elegir la contraseña llega a {elegida.correo}.
            </div>
          </div>
        )}
        <Campo rotulo="Login" ayuda="En minúsculas, sin espacios ni tildes. Puede llevar puntos." error={errores.login}>
          <input className="identificador" value={datos.login} placeholder="ernesto.vargas" autoComplete="off" autoCapitalize="off"
            spellCheck="false"
            onChange={(e) => { setDatos({ ...datos, login: e.target.value }); if (e.target.value.trim()) setErrores({ ...errores, login: null }) }} />
        </Campo>
        <p className="guia">No escribes ninguna contraseña. Le enviamos a la persona un enlace a su correo para que elija la suya.</p>
      </div>
    </Dialogo>
  )
}

// Desactivar: Cuenta.desactivarCuentaPorMotivo(motivo)
function DesactivarCuenta({ cuenta, persona, alCerrar, alDesactivar }) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState(null)

  const cerrar = () => { setMotivo(''); setError(null); alCerrar() }
  const enviar = () => {
    if (!motivo.trim()) { setError('Escribe el motivo. Queda en la cuenta y en la auditoría.'); enfocarPrimerError(); return }
    alDesactivar(motivo.trim())
    setMotivo('')
  }

  return (
    <Dialogo abierto={!!cuenta} alCerrar={cerrar} titulo="Desactivar cuenta"
      guia={cuenta && persona && `${persona.nombre} · ${cuenta.login} · ${persona.rol.toLowerCase()}`} alEnviar={enviar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn riesgo" type="submit">Desactivar cuenta</button>
      </>}>
      <div className="pila">
        <p>La persona ya no podrá entrar a Convivir. Su registro en Personas, sus vinculaciones y su historial se conservan.</p>
        <Campo rotulo="Motivo" ayuda="Queda en la cuenta y en la auditoría." error={error}>
          <textarea value={motivo} placeholder="Terminó su contrato de arrendamiento de C-0705."
            onChange={(e) => { setMotivo(e.target.value); if (e.target.value.trim()) setError(null) }} />
        </Campo>
      </div>
    </Dialogo>
  )
}
