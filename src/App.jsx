import { useEffect, useState } from 'react'

// Pantalla de comprobacion del esqueleto: muestra si el frontend
// alcanza la API y si la API alcanza la base de datos.
export default function App() {
  const [estado, setEstado] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/estado')
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}`)
        return respuesta.json()
      })
      .then(setEstado)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <main className="pagina">
      <h1>Convivir</h1>
      <p className="subtitulo">Plataforma para la gestión y control de propiedades horizontales</p>

      <section className="tarjeta">
        <h2>Estado del sistema</h2>
        {error && <p className="mal">No se pudo consultar la API: {error}</p>}
        {!error && !estado && <p>Consultando…</p>}
        {estado && (
          <dl>
            <dt>Frontend</dt>
            <dd className="bien">ACTIVO</dd>
            <dt>API</dt>
            <dd className={estado.api === 'ACTIVA' ? 'bien' : 'mal'}>{estado.api}</dd>
            <dt>Base de datos</dt>
            <dd className={estado.baseDeDatos === 'SIN_CONEXION' ? 'mal' : 'bien'}>{estado.baseDeDatos}</dd>
          </dl>
        )}
      </section>
    </main>
  )
}
