import { Children, cloneElement, isValidElement, useId } from 'react'

/**
 * Rótulo, control, ayuda y error. El control va como hijo; el componente le
 * pone id, aria-invalid y aria-describedby para que el error se lea.
 */
export default function Campo({ rotulo, opcional, ayuda, error, className = '', children }) {
  const id = useId()
  const idAyuda = `${id}-ayuda`
  const idError = `${id}-error`
  const describe = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined
  const control = Children.map(children, (hijo) =>
    isValidElement(hijo)
      ? cloneElement(hijo, { id: hijo.props.id || id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describe })
      : hijo,
  )

  return (
    <div className={`campo ${className}`}>
      <label className="rotulo" htmlFor={id}>
        {rotulo}
        {opcional && <span className="opcional"> (opcional)</span>}
      </label>
      {control}
      {ayuda && <span className="ayuda" id={idAyuda}>{ayuda}</span>}
      {error && <span className="error" id={idError}>{error}</span>}
    </div>
  )
}
