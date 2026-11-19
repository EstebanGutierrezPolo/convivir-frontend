import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { sesionApi } from '../api/sesion.js'
import { legible } from '../utilidades/formato.js'

/*
 * Sesión del usuario (CU-01). La valida el backend; aquí solo se guarda lo que
 * devuelve y se traduce su rol al rol de la aplicación.
 */

export const COPROPIEDAD = 'Villa Campestre'

/** Cuentas que crea el backend la primera vez (CuentasIniciales). La contraseña es la del .env. */
export const CUENTAS_DE_EJEMPLO = [
  ['paula.ortega', 'administradora'], ['jhon.rojas', 'vigilante'], ['lucia.mendoza', 'residente'],
  ['hernan.ruiz', 'consejo'], ['marta.oviedo', 'cuenta bloqueada'],
]

/** Rol del integrante en el backend (obtenerRolDelIntegrante) -> rol de la aplicación. */
const ROL_DE_LA_APLICACION = {
  ADMINISTRADOR: 'administrador',
  VIGILANTE: 'vigilante',
  MIEMBRO_CONSEJO: 'consejo',
  PROPIETARIO: 'residente',
  ARRENDATARIO: 'residente',
  RESIDENTE_AUTORIZADO: 'residente',
}

function traducir(respuesta) {
  const iniciales = respuesta.persona.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  return {
    login: respuesta.login,
    rol: ROL_DE_LA_APLICACION[respuesta.rol],
    persona: respuesta.persona,
    iniciales,
    cargo: respuesta.cargo,
    inmuebles: respuesta.inmuebles.length
      ? respuesta.inmuebles.map((i, n) => ({ id: i.id, nombre: i.identificacion, vinculo: legible(i.vinculo), actual: n === 0 }))
      : null,
  }
}

const SesionContexto = createContext(null)

export function ProveedorSesion({ children }) {
  const [sesion, setSesion] = useState(null)
  const [comprobando, setComprobando] = useState(true)

  // Al abrir o recargar la página, el backend dice si la cookie de sesión sigue vigente.
  useEffect(() => {
    sesionApi.consultar()
      .then((respuesta) => setSesion(traducir(respuesta)))
      .catch(() => setSesion(null))
      .finally(() => setComprobando(false))
    const vencida = () => setSesion(null)
    window.addEventListener('convivir:sesion-vencida', vencida)
    return () => window.removeEventListener('convivir:sesion-vencida', vencida)
  }, [])

  /** Devuelve null si entra, o el mensaje del backend si la rechaza. */
  const iniciarSesion = useCallback(async (login, contrasena) => {
    try {
      setSesion(traducir(await sesionApi.iniciar(login.trim(), contrasena)))
      return null
    } catch (error) {
      return error.message
    }
  }, [])

  const cerrarSesion = useCallback(async () => {
    await sesionApi.cerrar().catch(() => {})
    setSesion(null)
  }, [])

  const valor = useMemo(() => ({ sesion, comprobando, iniciarSesion, cerrarSesion }),
    [sesion, comprobando, iniciarSesion, cerrarSesion])
  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>
}

export function useSesion() {
  return useContext(SesionContexto)
}
