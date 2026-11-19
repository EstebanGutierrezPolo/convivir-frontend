import { useEffect, useId, useRef } from 'react'

/**
 * Diálogo modal con el <dialog> del navegador: atrapa el foco, cierra con Escape
 * y deja el fondo inerte. Si recibe alEnviar, el cuerpo es un formulario.
 */
export default function Dialogo({ abierto, alCerrar, titulo, guia, ancho, alEnviar, pie, children }) {
  const ref = useRef(null)
  const idTitulo = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  const contenido = (
    <>
      <div className="cabeza">
        <div>
          <h2 id={idTitulo}>{titulo}</h2>
          {guia && <p className="guia">{guia}</p>}
        </div>
        <button className="cerrar" type="button" onClick={alCerrar} aria-label="Cerrar">×</button>
      </div>
      <div className="cuerpo">{children}</div>
      {pie && <div className="pie">{pie}</div>}
    </>
  )

  return (
    <dialog ref={ref} className={`dialogo${ancho ? ' ancho' : ''}`} aria-labelledby={idTitulo}
      onClose={() => abierto && alCerrar()}>
      {abierto && (alEnviar
        ? <form noValidate onSubmit={(e) => { e.preventDefault(); alEnviar() }}>{contenido}</form>
        : <div className="contenido">{contenido}</div>)}
    </dialog>
  )
}
