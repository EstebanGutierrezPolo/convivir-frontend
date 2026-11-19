import { useCallback, useEffect, useState } from 'react'

/**
 * Carga datos al montar y cuando cambian las dependencias.
 * Devuelve { datos, error, cargando, recargar }. Si llega una respuesta vieja
 * después de una nueva, se descarta.
 */
export function useConsulta(cargar, dependencias = []) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true })
  const [vuelta, setVuelta] = useState(0)

  useEffect(() => {
    let vigente = true
    setEstado((previo) => ({ ...previo, cargando: true, error: null }))
    cargar()
      .then((datos) => vigente && setEstado({ datos, error: null, cargando: false }))
      .catch((error) => vigente && setEstado({ datos: null, error, cargando: false }))
    return () => { vigente = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, vuelta])

  const recargar = useCallback(() => setVuelta((v) => v + 1), [])
  return { ...estado, recargar }
}
