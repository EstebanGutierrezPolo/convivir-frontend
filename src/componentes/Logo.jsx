/** Símbolo de Convivir: la planta de un conjunto vista desde arriba. Toma el azul del tema activo. */
export default function Logo({ tamano = 24, grosor = 2.4 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" rx="5" fill="none" stroke="var(--convivir)" strokeWidth={grosor} />
      <rect x="8" y="8" width="7" height="7" fill="var(--convivir)" />
      <rect x="19" y="8" width="7" height="7" fill="var(--convivir)" opacity=".35" />
      <rect x="8" y="19" width="7" height="7" fill="var(--convivir)" opacity=".35" />
      <rect x="19" y="19" width="7" height="7" fill="var(--convivir)" />
    </svg>
  )
}
