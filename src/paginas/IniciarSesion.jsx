import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'

import Campo from '../componentes/Campo.jsx'
import Logo from '../componentes/Logo.jsx'
import { ROLES } from '../aplicacion/navegacion.js'
import { CUENTAS_DE_EJEMPLO, useSesion } from '../aplicacion/sesion.jsx'
import { sesionApi } from '../api/sesion.js'
import { useTema } from '../aplicacion/tema.js'

// CU-01 Iniciar sesión, con la extensión Restablecer contraseña (RF-002).
export default function IniciarSesion() {
  const { sesion, iniciarSesion } = useSesion()
  const { alternar } = useTema()
    const { state } = useLocation()
  const [panel, setPanel] = useState('sesion')
  const [login, setLogin] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null)
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  if (sesion) return <Navigate to={state?.desde || ROLES[sesion.rol].inicio} replace />

  const entrar = async (e) => {
    e.preventDefault()
    const faltan = {}
    if (!login.trim()) faltan.login = 'Escribe tu usuario. Suele ser tu nombre y apellido separados por un punto.'
    if (!contrasena) faltan.contrasena = 'Escribe tu contraseña.'
    setErrores(faltan)
    setAviso(null)
    if (Object.keys(faltan).length) return

    setEnviando(true)
    const rechazo = await iniciarSesion(login, contrasena)
    setEnviando(false)
    if (rechazo) {
      // El backend decide el mensaje: credenciales inválidas o cuenta bloqueada (RNF-01), sin decir si el usuario existe.
      setContrasena('')
      setAviso(rechazo)
    }
  }

  const restablecer = async (e) => {
    e.preventDefault()
    if (!login.trim()) {
      setErrores({ restablecer: 'Escribe tu usuario o el correo con el que te registraron.' })
      return
    }
    setErrores({})
    setEnviando(true)
    try {
      await sesionApi.solicitarRestablecimiento(login.trim())
      setEnviado(true)
    } catch (error) {
      setErrores({ restablecer: error.message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="acceso">
      <section className="lado-marca">
        <div>
          <span className="marca">
            <Logo tamano={34} grosor={2} />
            <span className="nombre" style={{ fontSize: 'var(--t-md)' }}>CONVIVIR</span>
          </span>
          <h1 style={{ fontSize: 'var(--t-2xl)', maxWidth: '14ch', marginTop: 'var(--e7)' }}>La vida en común, en orden.</h1>
          <p className="guia" style={{ fontSize: 'var(--t-md)', marginTop: 'var(--e4)', maxWidth: '34ch', lineHeight: 1.45 }}>
            Visitas, pagos, reservas y novedades de tu conjunto, anclados a cada inmueble para que la historia no se
            pierda cuando cambian sus ocupantes.
          </p>
        </div>
      </section>

      <section className="lado-formulario" style={{ position: 'relative' }}>
        <button className="luna" type="button" onClick={alternar} aria-label="Cambiar entre tema claro y oscuro"
          style={{ position: 'absolute', top: 'var(--e4)', right: 'var(--e4)' }}>◐</button>

        {panel === 'sesion' ? (
          <div className="caja">
            <h2>Inicia sesión</h2>
            <p className="guia" style={{ margin: 'var(--e2) 0 var(--e5)' }}>Usa la cuenta que te entregó la administración de tu conjunto.</p>
            {aviso && <div className="aviso no" role="alert" style={{ marginBottom: 'var(--e4)' }}><p>{aviso}</p></div>}

            <form className="formulario" noValidate onSubmit={entrar}>
              <Campo rotulo="Usuario" error={errores.login}>
                <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username"
                  autoCapitalize="none" spellCheck="false" placeholder="nombre.apellido" />
              </Campo>
              <Campo rotulo="Contraseña" error={errores.contrasena}>
                <input type={verContrasena ? 'text' : 'password'} value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)} autoComplete="current-password" />
              </Campo>
              <div className="fila entre">
                <label className="opcion">
                  <input type="checkbox" checked={verContrasena} onChange={(e) => setVerContrasena(e.target.checked)} />
                  Mostrar la contraseña
                </label>
                <button className="btn texto chico" type="button" onClick={() => { setPanel('restablecer'); setEnviado(false) }}>
                  Olvidé mi contraseña
                </button>
              </div>
              <button className="btn ancho" type="submit" disabled={enviando} style={{ minHeight: 46 }}>{enviando ? 'Entrando…' : 'Iniciar sesión'}</button>
            </form>

            <div className="aviso" style={{ marginTop: 'var(--e6)' }}>
              <p><b>Cuentas de ejemplo.</b> Las crea el backend la primera vez; su contraseña es la de <span className="dato">CONVIVIR_CONTRASENA_INICIAL</span> en tu archivo .env.</p>
              <p className="guia" style={{ marginTop: 'var(--e2)' }}>
                {CUENTAS_DE_EJEMPLO.map(([cuenta, quien], i) => (
                  <span key={cuenta}>
                    {i > 0 && ' · '}
                    <button className="btn texto chico identificador" type="button"
                      onClick={() => { setLogin(cuenta); setErrores({}) }}>{cuenta}</button> {quien}
                  </span>
                ))}
              </p>
            </div>
          </div>
        ) : (
          <div className="caja">
            <button className="btn texto chico" type="button" onClick={() => setPanel('sesion')}
              style={{ marginLeft: 'calc(-1 * var(--e2))' }}>← Volver a iniciar sesión</button>
            <h2 style={{ marginTop: 'var(--e4)' }}>Restablece tu contraseña</h2>
            <p className="guia" style={{ margin: 'var(--e2) 0 var(--e5)' }}>Te enviamos un enlace al correo registrado en tu cuenta. Vence en 30 minutos.</p>
            <form className="formulario" noValidate onSubmit={restablecer}>
              <Campo rotulo="Usuario o correo" error={errores.restablecer}>
                <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="none" />
              </Campo>
              <button className="btn ancho" type="submit" disabled={enviando} style={{ minHeight: 46 }}>Recibir el enlace por correo</button>
            </form>
            {enviado && (
              <div className="aviso ok" style={{ marginTop: 'var(--e5)' }}>
                <p><b>Enlace enviado.</b> Si el usuario existe, el enlace llega en unos minutos al correo registrado en su cuenta. Revisa también el correo no deseado.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
