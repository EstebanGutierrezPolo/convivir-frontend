import { useCallback, useEffect, useState } from 'react'

// Tema claro, oscuro o el del sistema. Es preferencia del usuario (sistema de diseño, sección 1).
const CLAVE = 'convivir-tema'
const raiz = document.documentElement
const preferenciaOscura = window.matchMedia('(prefers-color-scheme: dark)')

function leer() {
  try { return localStorage.getItem(CLAVE) || 'auto' } catch { return 'auto' }
}

function aplicar(tema) {
  if (tema === 'light' || tema === 'dark') raiz.setAttribute('data-theme', tema)
  else raiz.removeAttribute('data-theme')
}

export function useTema() {
  const [tema, setTema] = useState(leer)

  useEffect(() => { aplicar(tema) }, [tema])

  const elegirTema = useCallback((nuevo) => {
    try { localStorage.setItem(CLAVE, nuevo) } catch { /* sin almacenamiento */ }
    setTema(nuevo)
  }, [])

  const alternar = useCallback(() => {
    const oscuro = tema === 'dark' || (tema === 'auto' && preferenciaOscura.matches)
    elegirTema(oscuro ? 'light' : 'dark')
  }, [tema, elegirTema])

  return { tema, elegirTema, alternar }
}
