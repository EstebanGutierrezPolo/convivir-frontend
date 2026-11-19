/**
 * Estado con punto y palabra. tono: ok (al día, vigente), al (atención pronto),
 * no (vencido, negado), ne (terminado o neutro), az (actual o selección, no es estado).
 */
export default function Pildora({ tono = 'ne', children }) {
  return <span className={`pildora p-${tono}`}>{children}</span>
}
