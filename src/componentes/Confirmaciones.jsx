import { createContext, useCallback, useContext, useState } from 'react'

/**
 * Aviso breve después de una acción. Conserva el verbo del botón:
 * "Registrar inmueble" confirma "Inmueble registrado".
 */
const ConfirmacionesContexto = createContext(() => {})
// Contador propio: crypto.randomUUID no existe si la app se abre por IP de la red (sin https).
let siguienteId = 0

export function ProveedorConfirmaciones({ children }) {
  const [avisos, setAvisos] = useState([])

  const confirmar = useCallback((texto, tono) => {
    const id = ++siguienteId
    setAvisos((lista) => [...lista, { id, texto, tono }])
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), 4200)
  }, [])

  return (
    <ConfirmacionesContexto.Provider value={confirmar}>
      {children}
      <div className="confirmaciones" role="status" aria-live="polite">
        {avisos.map((a) => <div key={a.id} className={`confirmacion${a.tono ? ` ${a.tono}` : ''}`}>{a.texto}</div>)}
      </div>
    </ConfirmacionesContexto.Provider>
  )
}

export function useConfirmar() {
  return useContext(ConfirmacionesContexto)
}
