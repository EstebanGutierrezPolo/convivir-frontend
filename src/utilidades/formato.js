// Formatos de Convivir: pesos colombianos y fechas en español.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
  'octubre', 'noviembre', 'diciembre']

/** 1340000 -> "$ 1 340 000", con espacio duro entre miles como pide el sistema de diseño. */
export function pesos(valor) {
  const numero = Math.round(Math.abs(Number(valor) || 0))
  const miles = String(numero).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${valor < 0 ? '−' : ''}$ ${miles}`
}

/** 1340000 -> "1 340 000", sin signo, para columnas de tabla. */
export function cifra(valor) {
  return String(Math.round(Number(valor) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** 0.0052 -> "0,0052" y 2400 -> "2 400": coma decimal y espacio duro entre miles. */
export function decimal(valor, digitos = 4) {
  if (valor === null || valor === undefined) return '—'
  const texto = Number(valor).toLocaleString('es-CO', { maximumFractionDigits: digitos, useGrouping: false })
  const [entero, fraccion] = texto.split(',')
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return fraccion ? `${conMiles},${fraccion}` : conMiles
}

/** "2026-11-30" -> "30 de noviembre" (y el año si no es el actual). */
export function fecha(texto) {
  if (!texto) return ''
  const [anio, mes, dia] = texto.slice(0, 10).split('-').map(Number)
  const conAnio = anio !== new Date().getFullYear()
  return `${dia} de ${MESES[mes - 1]}${conAnio ? ` de ${anio}` : ''}`
}

/** "2026-11-18T19:52:00" -> "7:52 p. m." */
export function hora(texto) {
  const d = texto instanceof Date ? texto : new Date(texto)
  const h = d.getHours()
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`
}

/** "ARRENDATARIO_RESIDENTE" -> "Arrendatario residente". */
export function legible(constante) {
  if (!constante) return ''
  const texto = constante.toLowerCase().replaceAll('_', ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
