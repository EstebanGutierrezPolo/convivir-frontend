// Piezas pequeñas del sistema de diseño que usan todas las páginas.

/** Título de la pantalla, su guía y las acciones a la derecha. */
export function Encabezado({ titulo, guia, acciones, children }) {
  return (
    <div className="encabezado">
      <div>
        <h1>{titulo}</h1>
        {guia && <p className="guia">{guia}</p>}
        {children}
      </div>
      {acciones && <div className="acciones">{acciones}</div>}
    </div>
  )
}

/** El vacío invita: dice qué falta y cómo empezar. */
export function Vacio({ titulo, children, accion }) {
  return (
    <div className="vacio">
      <h3>{titulo}</h3>
      {children && <p>{children}</p>}
      {accion}
    </div>
  )
}

/** Mientras llegan los datos. */
export function Cargando({ texto = 'Cargando…' }) {
  return <div className="vacio" aria-busy="true"><p>{texto}</p></div>
}

/** Cuando la API falla: explica y ofrece reintentar. */
export function ErrorDeCarga({ error, alReintentar }) {
  return (
    <div className="aviso no" role="alert" style={{ margin: 'var(--e4)' }}>
      <p><b>No se pudieron cargar los datos.</b> {error?.message}</p>
      {alReintentar && (
        <button className="btn segundo chico" type="button" onClick={alReintentar} style={{ marginTop: 'var(--e2)' }}>
          Volver a intentar
        </button>
      )}
    </div>
  )
}

/** Buscador con lupa. */
export function Buscador({ valor, alCambiar, placeholder, etiqueta }) {
  return (
    <label className="buscador">
      <span className="solo-lectores">{etiqueta || placeholder}</span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" />
      </svg>
      <input type="search" value={valor} onChange={(e) => alCambiar(e.target.value)} placeholder={placeholder}
        autoComplete="off" />
    </label>
  )
}

/** Conmutador segmentado: un solo valor elegido. opciones = [{ valor, texto }]. */
export function Segmentos({ opciones, valor, alCambiar, etiqueta }) {
  return (
    <div className="segmentos" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={valor === o.valor} onClick={() => alCambiar(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  )
}

/** Pestañas dentro de una página. pestanas = [{ id, texto, cuenta }]. */
export function Pestanas({ pestanas, activa, alCambiar, etiqueta }) {
  return (
    <div className="pestanas" role="tablist" aria-label={etiqueta}>
      {pestanas.map((p) => (
        <button key={p.id} type="button" role="tab" aria-selected={activa === p.id} onClick={() => alCambiar(p.id)}>
          {p.texto}
          {p.cuenta !== undefined && <span className="cuenta-pestana">{p.cuenta}</span>}
        </button>
      ))}
    </div>
  )
}

/** Aviso de que la pantalla todavía usa datos de ejemplo porque su API no existe. */
export function AvisoDatosDeEjemplo({ casoDeUso }) {
  return (
    <div className="aviso al" style={{ marginBottom: 'var(--e5)' }}>
      <b>Datos de ejemplo.</b> El backend todavía no tiene la API de {casoDeUso}: lo que hagas aquí no se guarda.
    </div>
  )
}
