// Datos de ejemplo de CU-11 (obligaciones), CU-13 (pago presencial), CU-14 (cartera) y del inicio del administrador.
// Cada función devuelve una promesa con la forma que tendría la respuesta de la API: para conectarla basta con
// cambiar la función por la llamada al cliente. Las acciones cambian estos datos en memoria, así que un pago
// registrado aquí se ve también en Cartera, en Obligaciones y en el Inicio mientras no se recargue la página.

import { ErrorApi } from '../api/cliente.js'
import { pesos } from '../utilidades/formato.js'

/** Día de referencia de los datos de ejemplo: la mora se cuenta hasta aquí. */
export const HOY = '2026-11-14'
/** Último día que cubre un periodo configurado: hasta aquí llega la fecha de corte del paz y salvo. */
export const ULTIMO_CORTE = '2026-12-31'
export const INMUEBLES_ACTIVOS = 184

export const CONCEPTOS = {
  CUOTA_ORDINARIA: 'Cuota ordinaria',
  CUOTA_EXTRAORDINARIA: 'Cuota extraordinaria',
  MULTA: 'Multa',
  INTERES_MORA: 'Interés de mora',
  ALQUILER_ZONA: 'Alquiler de zona',
}

export const MEDIOS = {
  EFECTIVO: { texto: 'Efectivo', detalle: 'Se entrega en la oficina' },
  TRANSFERENCIA: { texto: 'Transferencia', detalle: 'A la cuenta de la copropiedad' },
  CHEQUE: { texto: 'Cheque', detalle: 'A nombre de la copropiedad' },
  PASARELA: { texto: 'En línea', detalle: 'Pasarela de pagos' },
}

const copia = (datos) => Promise.resolve(structuredClone(datos))

// ---------- Utilidades del dominio que hoy calcula el navegador ----------

function aFecha(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

/** Días entre dos fechas "AAAA-MM-DD". */
export function diasEntre(desde, hasta) {
  return Math.round((aFecha(hasta) - aFecha(desde)) / 86400000)
}

/** "A1104", "a-1104" o "A 1104" -> "A-1104". */
export function normalizarIdentificacion(texto) {
  const t = String(texto).trim().toUpperCase().replace(/\s+/g, '')
  const m = t.match(/^([ABC])-?(\d{4})$/)
  return m ? `${m[1]}-${m[2]}` : t
}

/** "A-1104" -> "Torre A · Apto 1104". */
export function unidad(identificacion) {
  const m = identificacion.match(/^([ABC])-(\d{2})(\d{2})$/)
  return m ? `Torre ${m[1]} · Apto ${Number(m[2] + m[3])}` : identificacion
}

/** Apartamentos que existen en Villa Campestre: torres A a C, pisos 1 a 12, apartamentos 1 a 14. */
const FORMA_APARTAMENTO = /^[ABC]-(0[1-9]|1[0-2])(0[1-9]|1[0-4])$/

/** "Cuota ordinaria de noviembre" o "Multa: remodelación sin aviso a la administración". */
export function nombreObligacion(o) {
  if (o.concepto === 'CUOTA_ORDINARIA' || o.concepto === 'INTERES_MORA') {
    return `${CONCEPTOS[o.concepto]} de ${o.descripcion.split(',')[0].replace(' de 2026', '').toLowerCase()}`
  }
  return `${CONCEPTOS[o.concepto]}: ${o.descripcion.charAt(0).toLowerCase()}${o.descripcion.slice(1)}`
}

// Obligacion.calcularDiasDeMora() y el estado que resulta
function estadoDe(o) {
  if (o.motivoAnulacion) return 'ANULADA'
  if (o.saldoPendiente === 0) return 'PAGADA'
  if (o.saldoPendiente < o.valor) return 'PAGADA_PARCIALMENTE'
  return o.fechaVencimiento < HOY ? 'VENCIDA' : 'PENDIENTE'
}
function diasDeMora(o, corte = HOY) {
  if (o.motivoAnulacion || o.saldoPendiente === 0 || o.fechaVencimiento >= corte) return 0
  return diasEntre(o.fechaVencimiento, corte)
}
const conCalculos = (o) => ({ ...o, estado: estadoDe(o), diasDeMora: diasDeMora(o) })

// ---------- Inmuebles con su propietario ----------

const INMUEBLES = {
  'A-0210': { propietario: 'Yolanda Barrios', vinculo: 'propietaria residente' },
  'A-0305': { propietario: 'Fabián Orozco', vinculo: 'propietario residente' },
  'A-0401': { propietario: 'Gloria Ariza', vinculo: 'propietaria residente', nota: 'Pagó la cuota de noviembre hoy a las 8:05 a. m., en línea.' },
  'A-0607': { propietario: 'Mauricio Daza', vinculo: 'propietario no residente' },
  'A-0902': { propietario: 'Marta Oviedo', vinculo: 'propietaria residente' },
  'A-1104': { propietario: 'Jorge Peñaranda', vinculo: 'propietario no residente' },
  'B-0302': { propietario: 'Ernesto Vargas', vinculo: 'propietario no residente', ocupa: 'Lucía Mendoza', nota: 'Pagó la cuota de noviembre el 5 de noviembre, en línea.' },
  'B-0410': { propietario: 'Hernando Castro', vinculo: 'propietario residente' },
  'B-0606': { propietario: 'Sandra Paternina', vinculo: 'propietaria residente' },
  'B-0705': { propietario: 'Natalia Bermúdez', vinculo: 'propietaria residente' },
  'B-0814': { propietario: 'Camilo Ríos', vinculo: 'propietario residente' },
  'B-1002': { propietario: 'Ricardo Gómez', vinculo: 'propietario residente' },
  'B-1204': { propietario: 'Liliana Fontalvo', vinculo: 'propietaria residente' },
  'C-0108': { propietario: 'Elkin Romero', vinculo: 'propietario residente' },
  'C-0303': { propietario: 'Óscar Pertuz', vinculo: 'propietario residente' },
  'C-0512': { propietario: 'Patricia Lozano', vinculo: 'propietaria residente' },
  'C-0705': { propietario: 'Inés Carrillo', vinculo: 'propietaria no residente', ocupa: 'Andrés Caicedo' },
  'C-0901': { propietario: 'Rafael Insignares', vinculo: 'propietario no residente' },
  'C-1201': { propietario: 'Diana Salcedo', vinculo: 'propietaria residente' },
}
const INACTIVOS = { 'B-0101': 'está desactivado desde marzo porque se unió a B-0102' }

/** Identificaciones que se sugieren al escribir un inmueble. */
export const IDENTIFICACIONES = Object.keys(INMUEBLES)

/** Busca un inmueble activo; si tiene forma de apartamento pero no está en los datos, está al día y sin propietario conocido. */
function inmuebleActivo(texto) {
  const id = normalizarIdentificacion(texto)
  if (INACTIVOS[id]) throw new ErrorApi(`${id} ${INACTIVOS[id]}. Solo se le cobra a inmuebles activos.`, 422)
  if (!INMUEBLES[id] && FORMA_APARTAMENTO.test(id)) INMUEBLES[id] = { propietario: '', vinculo: '' }
  if (!INMUEBLES[id]) throw new ErrorApi(`No hay un inmueble activo con la identificación ${String(texto).trim()}.`, 404)
  return id
}

// ---------- Obligaciones ----------

let siguienteObligacion = 1
function o(inmueble, concepto, descripcion, fechaVencimiento, valor, saldoPendiente = valor, motivoAnulacion = null) {
  return { id: siguienteObligacion++, inmueble, concepto, descripcion, fechaVencimiento, valor, saldoPendiente, motivoAnulacion }
}

const SOBRE_CUBIERTAS = 'Impermeabilización de cubiertas, aprobada en la asamblea de marzo'
const OBLIGACIONES = [
  o('A-0210', 'CUOTA_ORDINARIA', 'Julio de 2026', '2026-07-31', 470000),
  o('A-0401', 'CUOTA_EXTRAORDINARIA', SOBRE_CUBIERTAS, '2026-07-31', 116000, 0),
  o('B-0302', 'CUOTA_EXTRAORDINARIA', SOBRE_CUBIERTAS, '2026-07-31', 104000, 0),
  o('C-1201', 'ALQUILER_ZONA', 'Zona BBQ, 14 de agosto, 5 horas', '2026-08-14', 125000),
  o('A-0210', 'CUOTA_ORDINARIA', 'Agosto de 2026', '2026-08-31', 470000),
  o('B-0410', 'CUOTA_ORDINARIA', 'Agosto de 2026', '2026-08-31', 500000, 180000),
  o('C-0901', 'CUOTA_ORDINARIA', 'Agosto de 2026', '2026-08-31', 630000),
  o('C-1201', 'CUOTA_ORDINARIA', 'Agosto de 2026', '2026-08-31', 660000),
  o('A-0210', 'CUOTA_ORDINARIA', 'Septiembre de 2026', '2026-09-30', 470000),
  o('A-0607', 'CUOTA_ORDINARIA', 'Septiembre de 2026', '2026-09-30', 580000),
  o('A-1104', 'CUOTA_ORDINARIA', 'Septiembre de 2026', '2026-09-30', 610000),
  o('B-0410', 'CUOTA_ORDINARIA', 'Septiembre de 2026', '2026-09-30', 500000),
  o('C-0512', 'CUOTA_ORDINARIA', 'Septiembre de 2026', '2026-09-30', 540000, 240000),
  o('C-0901', 'CUOTA_ORDINARIA', 'Septiembre de 2026', '2026-09-30', 630000),
  o('C-1201', 'CUOTA_ORDINARIA', 'Septiembre de 2026', '2026-09-30', 660000),
  o('A-1104', 'MULTA', 'Remodelación sin aviso a la administración', '2026-10-15', 120000),
  o('A-0210', 'CUOTA_ORDINARIA', 'Octubre de 2026', '2026-10-31', 470000),
  o('A-0607', 'CUOTA_ORDINARIA', 'Octubre de 2026', '2026-10-31', 580000),
  o('A-1104', 'CUOTA_ORDINARIA', 'Octubre de 2026', '2026-10-31', 610000),
  o('B-0410', 'CUOTA_ORDINARIA', 'Octubre de 2026', '2026-10-31', 500000),
  o('B-0705', 'CUOTA_ORDINARIA', 'Octubre de 2026', '2026-10-31', 520000),
  o('B-1002', 'CUOTA_ORDINARIA', 'Octubre de 2026', '2026-10-31', 550000, 250000),
  o('C-0303', 'CUOTA_ORDINARIA', 'Octubre de 2026', '2026-10-31', 490000),
  o('C-0512', 'CUOTA_ORDINARIA', 'Octubre de 2026', '2026-10-31', 540000),
  o('C-0705', 'MULTA', 'Ruido después de las 10:00 p. m., 17 de octubre', '2026-10-31', 150000, 0,
    'El consejo la revocó el 6 de noviembre: el ruido venía de otro apartamento.'),
  o('C-0901', 'CUOTA_ORDINARIA', 'Octubre de 2026', '2026-10-31', 630000),
  o('C-1201', 'CUOTA_ORDINARIA', 'Octubre de 2026', '2026-10-31', 660000),
  o('A-0902', 'ALQUILER_ZONA', 'Salón social, evento del 31 de octubre', '2026-11-02', 180000),
  o('A-0902', 'MULTA', 'Uso del salón social después de la medianoche, evento del 31 de octubre', '2026-11-02', 90000),
  o('B-1204', 'MULTA', 'Ruido después de las 10:00 p. m., reincidencia del 29 de octubre', '2026-11-05', 150000),
  o('A-0902', 'MULTA', 'Reposición de la puerta de vidrio del salón social', '2026-11-09', 350000),
  o('A-0210', 'INTERES_MORA', 'Octubre de 2026, sobre $ 1 410 000 vencidos al 31 de octubre', '2026-11-30', 28200),
  o('A-0607', 'INTERES_MORA', 'Octubre de 2026, sobre $ 580 000 vencidos al 31 de octubre', '2026-11-30', 11600),
  o('A-1104', 'INTERES_MORA', 'Octubre de 2026, sobre $ 730 000 vencidos al 31 de octubre', '2026-11-30', 14600),
  o('B-0410', 'INTERES_MORA', 'Octubre de 2026, sobre $ 680 000 vencidos al 31 de octubre', '2026-11-30', 13600),
  o('C-0512', 'INTERES_MORA', 'Octubre de 2026, sobre $ 540 000 vencidos al 31 de octubre', '2026-11-30', 10800),
  o('C-0901', 'INTERES_MORA', 'Octubre de 2026, sobre $ 1 260 000 vencidos al 31 de octubre', '2026-11-30', 25200),
  o('C-1201', 'INTERES_MORA', 'Octubre de 2026, sobre $ 1 445 000 vencidos al 31 de octubre', '2026-11-30', 28900),
  o('A-0210', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 470000),
  o('A-0305', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 510000, 0),
  o('A-0401', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 580000, 0),
  o('A-0607', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 580000),
  o('A-0902', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 610000),
  o('A-1104', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 610000),
  o('B-0302', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 520000, 0),
  o('B-0410', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 500000),
  o('B-0606', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 540000, 0),
  o('B-0705', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 520000),
  o('B-0814', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 560000, 0),
  o('B-1002', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 550000),
  o('B-1204', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 590000),
  o('C-0108', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 500000, 0),
  o('C-0303', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 490000),
  o('C-0512', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 540000),
  o('C-0705', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 490000),
  o('C-0901', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 630000),
  o('C-1201', 'CUOTA_ORDINARIA', 'Noviembre de 2026', '2026-11-30', 660000),
]
const ordenarPorVencimiento = () => OBLIGACIONES.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento) || a.id - b.id)
ordenarPorVencimiento()

/** Obligaciones de 2026 registradas en toda la copropiedad; la lista de ejemplo solo trae una parte. */
let obligacionesRegistradas = 2096

const SUMA_COEFICIENTES = 0.995 // 184 inmuebles activos; B-0101 (0,0050) está desactivado
const EJEMPLOS_COEFICIENTE = [['A-1104', 0.0061], ['B-0302', 0.0052], ['C-1201', 0.0066], ['C-0705', 0.0049]]

const PERIODOS = [
  { periodo: '2026-11', nombre: 'noviembre de 2026', corto: 'Noviembre 2026', valorBaseCuota: 100000000, fechaVencimiento: '2026-11-30',
    generado: { cuando: 'el 3 de noviembre a las 8:15 a. m.', quien: 'Paula Ortega' } },
  { periodo: '2026-12', nombre: 'diciembre de 2026', corto: 'Diciembre 2026', valorBaseCuota: null, fechaVencimiento: '2026-12-31', generado: null },
]

// ---------- Pagos ----------

const PAGOS = [
  { id: 418, comprobante: 'RC-2026-0418', inmueble: 'B-1002', pagador: 'Ricardo Gómez', medioPago: 'TRANSFERENCIA', referencia: '0048213377',
    canalRecaudo: 'PRESENCIAL', valor: 300000, fecha: '2026-11-14', hora: '10:42', obligacionId: null, estado: 'CONFIRMADO' },
  { id: 900, comprobante: null, inmueble: 'A-0401', pagador: 'Gloria Ariza', medioPago: 'PASARELA', canalRecaudo: 'EN_LINEA',
    valor: 580000, fecha: '2026-11-14', hora: '08:05', obligacionId: null, estado: 'CONFIRMADO' },
  { id: 417, comprobante: 'RC-2026-0417', inmueble: 'C-0512', pagador: 'Patricia Lozano', medioPago: 'EFECTIVO',
    canalRecaudo: 'PRESENCIAL', valor: 300000, fecha: '2026-11-13', hora: '16:30', obligacionId: null, estado: 'CONFIRMADO' },
  { id: 899, comprobante: null, inmueble: 'B-0814', pagador: 'Camilo Ríos', medioPago: 'PASARELA', canalRecaudo: 'EN_LINEA',
    valor: 560000, fecha: '2026-11-13', hora: '11:20', obligacionId: null, estado: 'CONFIRMADO' },
  { id: 416, comprobante: 'RC-2026-0416', inmueble: 'A-0305', pagador: 'Fabián Orozco', medioPago: 'CHEQUE', referencia: '7781023',
    canalRecaudo: 'PRESENCIAL', valor: 510000, fecha: '2026-11-12', hora: '09:10', obligacionId: null, estado: 'CONFIRMADO' },
  { id: 415, comprobante: 'RC-2026-0415', inmueble: 'C-0108', pagador: 'Elkin Romero', medioPago: 'EFECTIVO',
    canalRecaudo: 'PRESENCIAL', valor: 500000, fecha: '2026-11-11', hora: '15:22', obligacionId: null, estado: 'CONFIRMADO' },
  { id: 414, comprobante: 'RC-2026-0414', inmueble: 'B-0606', pagador: 'Sandra Paternina', medioPago: 'TRANSFERENCIA', referencia: '0047990215',
    canalRecaudo: 'PRESENCIAL', valor: 540000, fecha: '2026-11-10', hora: '11:05', obligacionId: null, estado: 'CONFIRMADO' },
  { id: 898, comprobante: null, inmueble: 'B-0302', pagador: 'Lucía Mendoza', medioPago: 'PASARELA', canalRecaudo: 'EN_LINEA',
    valor: 520000, fecha: '2026-11-05', hora: '19:12', obligacionId: null, estado: 'CONFIRMADO' },
]
// Cada pago abona a una sola obligación
const ABONOS = {
  418: ['B-1002', 'Octubre de 2026'], 900: ['A-0401', 'Noviembre de 2026'], 417: ['C-0512', 'Septiembre de 2026'],
  899: ['B-0814', 'Noviembre de 2026'], 416: ['A-0305', 'Noviembre de 2026'], 415: ['C-0108', 'Noviembre de 2026'],
  414: ['B-0606', 'Noviembre de 2026'], 898: ['B-0302', 'Noviembre de 2026'],
}
PAGOS.forEach((p) => {
  const [inmueble, mes] = ABONOS[p.id]
  p.obligacionId = OBLIGACIONES.find((x) => x.inmueble === inmueble && x.concepto === 'CUOTA_ORDINARIA' && x.descripcion === mes).id
})
let siguienteRecibo = 419

const conAbono = (p) => {
  const ob = OBLIGACIONES.find((x) => x.id === p.obligacionId)
  return { ...p, abono: nombreObligacion(ob), propietario: INMUEBLES[p.inmueble]?.propietario || '' }
}

// Recaudo de noviembre por canal: pagos CONFIRMADOS agrupados por canalRecaudo
const FACTURADO_NOVIEMBRE = 99500000
const RECAUDO = {
  EN_LINEA: { valor: 47180000, pagos: 86 },
  PRESENCIAL: { valor: 14240000, pagos: 31 },
}

// Gasto.consultarGastosDelPeriodo('2026-11'): solo se consultan (decisión abierta 5)
const GASTOS = [
  { id: 1, concepto: 'Vigilancia', detalle: 'Turnos de noviembre, 3 puestos las 24 horas', fecha: '2026-11-03', valor: 28400000 },
  { id: 2, concepto: 'Aseo y jardinería', detalle: 'Contrato mensual', fecha: '2026-11-05', valor: 9800000 },
  { id: 3, concepto: 'Honorarios de administración', detalle: 'Noviembre', fecha: '2026-11-05', valor: 6500000 },
  { id: 4, concepto: 'Energía de zonas comunes', detalle: 'Factura de octubre', fecha: '2026-11-06', valor: 4120000 },
  { id: 5, concepto: 'Mantenimiento de ascensores', detalle: '6 ascensores, contrato mensual', fecha: '2026-11-09', valor: 2350000 },
  { id: 6, concepto: 'Póliza de zonas comunes', detalle: 'Cuota 11 de 12', fecha: '2026-11-10', valor: 2100000 },
  { id: 7, concepto: 'Agua de zonas comunes', detalle: 'Factura de octubre', fecha: '2026-11-10', valor: 1860000 },
  { id: 8, concepto: 'Revisoría fiscal', detalle: 'Noviembre', fecha: '2026-11-12', valor: 1800000 },
  { id: 9, concepto: 'Mantenimiento de la piscina', detalle: 'Químicos y limpieza', fecha: '2026-11-13', valor: 1450000 },
]

let siguientePazYSalvo = 94

// ---------- Cartera: Inmueble.calcularSaldoPendienteDelInmueble() y la deuda en palabras ----------

function listaY(partes) {
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes[0]
}
const mesDe = (ob) => ob.descripcion.split(',')[0].replace(' de 2026', '').toLowerCase()

/** Deuda por periodo y concepto: "Cuotas de septiembre y octubre · Multa: remodelación…". */
function queDebe(vencidas) {
  const cuotas = vencidas.filter((ob) => ob.concepto === 'CUOTA_ORDINARIA')
  const partes = []
  if (cuotas.length === 1 && cuotas[0].saldoPendiente < cuotas[0].valor) partes.push(`Saldo de la cuota de ${mesDe(cuotas[0])}`)
  else if (cuotas.length) {
    partes.push(`${cuotas.length > 1 ? 'Cuotas de ' : 'Cuota de '}${listaY(cuotas.map((ob) => mesDe(ob) + (ob.saldoPendiente < ob.valor ? ' (saldo)' : '')))}`)
  }
  vencidas.forEach((ob) => {
    if (ob.concepto !== 'CUOTA_ORDINARIA') partes.push(`${CONCEPTOS[ob.concepto]}: ${ob.descripcion.charAt(0).toLowerCase()}${ob.descripcion.slice(1)}`)
  })
  return partes.join(' · ')
}

const conSaldo = (id) => OBLIGACIONES.filter((ob) => ob.inmueble === id && ob.saldoPendiente > 0 && !ob.motivoAnulacion)

function filasDeCartera() {
  return Object.keys(INMUEBLES).map((id) => {
    const vencidas = conSaldo(id).filter((ob) => ob.fechaVencimiento < HOY)
    if (!vencidas.length) return null
    const i = INMUEBLES[id]
    return {
      inmueble: id, unidad: unidad(id), propietario: i.propietario, vinculo: i.vinculo, ocupa: i.ocupa || null,
      saldoVencido: vencidas.reduce((s, ob) => s + ob.saldoPendiente, 0),
      vencidoDesde: vencidas[0].fechaVencimiento,
      diasDeMora: diasEntre(vencidas[0].fechaVencimiento, HOY),
      queDebe: queDebe(vencidas),
    }
  }).filter(Boolean).sort((a, b) => b.diasDeMora - a.diasDeMora || b.saldoVencido - a.saldoVencido)
}

function recaudo() {
  return {
    facturado: FACTURADO_NOVIEMBRE,
    enLinea: { ...RECAUDO.EN_LINEA },
    presencial: { ...RECAUDO.PRESENCIAL },
    total: RECAUDO.EN_LINEA.valor + RECAUDO.PRESENCIAL.valor,
    pagos: RECAUDO.EN_LINEA.pagos + RECAUDO.PRESENCIAL.pagos,
  }
}

// ---------- API de ejemplo ----------

export const carteraDeEjemplo = {
  // ---- CU-11 Obligaciones ----

  /** GET /api/periodos-facturacion: periodos con su valor base, el total a facturar y cuotas de ejemplo. */
  periodos: () => copia({
    periodos: PERIODOS, inmueblesActivos: INMUEBLES_ACTIVOS, sumaCoeficientes: SUMA_COEFICIENTES,
    ejemplosCoeficiente: EJEMPLOS_COEFICIENTE.map(([inmueble, coeficiente]) => ({ inmueble, coeficiente })),
  }),

  /** PATCH /api/periodos-facturacion/{periodo}: PeriodoFacturacion.configurarValorBaseDeLaCuotaDelPeriodo(valorBaseCuota). */
  configurarValorBase(periodo, valorBaseCuota) {
    const p = PERIODOS.find((x) => x.periodo === periodo)
    if (p.generado) return Promise.reject(new ErrorApi(`Las cuotas de ${p.nombre} ya se generaron con su valor base.`, 409))
    p.valorBaseCuota = valorBaseCuota
    return copia(p)
  },

  /** POST /api/periodos-facturacion/{periodo}/obligaciones: generarObligacionesDelPeriodoParaInmueblesActivos(). */
  generarObligaciones(periodo, quien) {
    const p = PERIODOS.find((x) => x.periodo === periodo)
    if (p.generado) return Promise.reject(new ErrorApi(`Las cuotas de ${p.nombre} ya se generaron.`, 409))
    if (!p.valorBaseCuota) return Promise.reject(new ErrorApi(`Falta el valor base de ${p.nombre}.`, 422))
    const ahora = new Date()
    const h = ahora.getHours()
    p.generado = { cuando: `hoy a las ${h % 12 || 12}:${String(ahora.getMinutes()).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`, quien }
    obligacionesRegistradas += INMUEBLES_ACTIVOS
    return copia(p)
  },

  /** GET /api/obligaciones?anio=2026: ordenadas por vencimiento, con su estado y días de mora. */
  obligaciones: () => copia({
    obligaciones: OBLIGACIONES.map((ob) => ({ ...conCalculos(ob), propietario: INMUEBLES[ob.inmueble]?.propietario || '' })),
    registradas: obligacionesRegistradas,
  }),

  /** POST /api/obligaciones: FabricaObligacion.crearObligacionIndividual(concepto, valor, fechaVencimiento). */
  crearObligacion({ inmueble, concepto, valor, fechaVencimiento, descripcion }) {
    let id
    try { id = inmuebleActivo(inmueble) } catch (e) { return Promise.reject(e) }
    const nueva = o(id, concepto, descripcion, fechaVencimiento, valor)
    OBLIGACIONES.push(nueva)
    ordenarPorVencimiento()
    obligacionesRegistradas += 1
    return copia(conCalculos(nueva))
  },

  /** PATCH /api/obligaciones/{id}/anular: Obligacion.anularObligacionPorMotivo(motivo). Queda sin saldo (RN-27). */
  anularObligacion(id, motivo) {
    const ob = OBLIGACIONES.find((x) => x.id === id)
    ob.motivoAnulacion = motivo
    ob.saldoPendiente = 0
    return copia(conCalculos(ob))
  },

  // ---- CU-13 Pago presencial ----

  /** GET /api/inmuebles/{id}/obligaciones: lo pendiente del inmueble (RF-068). */
  obligacionesDelInmueble(texto) {
    let id
    try { id = inmuebleActivo(texto) } catch (e) { return Promise.reject(e) }
    const i = INMUEBLES[id]
    return copia({
      inmueble: { identificacion: id, unidad: unidad(id), propietario: i.propietario, vinculo: i.vinculo, ocupa: i.ocupa || null,
        nota: i.nota || 'Pagó todo lo que se le ha cobrado hasta hoy.' },
      obligaciones: conSaldo(id).map(conCalculos),
    })
  },

  /** GET /api/pagos/presenciales: los más recientes primero. */
  pagosPresenciales: () => copia({
    pagos: PAGOS.filter((p) => p.canalRecaudo === 'PRESENCIAL').map(conAbono),
    enElMes: RECAUDO.PRESENCIAL.pagos,
  }),

  /**
   * POST /api/pagos/presenciales: new Pago(valor, medioPago, PRESENCIAL), Obligacion.registrarAbonoALaObligacion(valor)
   * y Pago.generarComprobanteDePago(). 422 si el valor supera el saldo pendiente (RN-24, RN-27).
   */
  registrarPagoPresencial({ obligacionId, valor, fecha, medioPago, referencia, pagador, documentoPagador, hora }) {
    const ob = OBLIGACIONES.find((x) => x.id === obligacionId)
    if (valor > ob.saldoPendiente) {
      return Promise.reject(new ErrorApi(`El valor no puede superar el saldo pendiente de esta obligación, que es ${pesos(ob.saldoPendiente)}. Registra hasta ese valor y, si sobra dinero, regístralo como otro pago a la siguiente obligación.`, 422))
    }
    if (fecha > HOY) return Promise.reject(new ErrorApi('La fecha del pago no puede ser posterior a hoy, 14 de noviembre.', 422))
    const saldoAnterior = ob.saldoPendiente
    ob.saldoPendiente -= valor
    const numero = siguienteRecibo++
    const pago = {
      id: numero, comprobante: `RC-2026-${String(numero).padStart(4, '0')}`, inmueble: ob.inmueble, pagador, documentoPagador: documentoPagador || null,
      medioPago, referencia: referencia || null, canalRecaudo: 'PRESENCIAL', valor, fecha, hora: fecha === HOY ? hora : null,
      obligacionId: ob.id, estado: 'CONFIRMADO',
    }
    PAGOS.unshift(pago)
    if (fecha.startsWith('2026-11')) { RECAUDO.PRESENCIAL.valor += valor; RECAUDO.PRESENCIAL.pagos += 1 }
    return copia({
      pago: conAbono(pago),
      obligacion: conCalculos(ob),
      saldoAnterior,
      pendienteDelInmueble: conSaldo(ob.inmueble).reduce((s, x) => s + x.saldoPendiente, 0),
    })
  },

  /**
   * PATCH /api/pagos/{id}/anular: Obligacion.revertirAbonoDeLaObligacion(valor), que llama Pago.anularPagoPorMotivo(motivo).
   * El valor vuelve al saldo de la obligación (decisión 6, cerrada).
   */
  anularPago(id, motivo) {
    const pago = PAGOS.find((p) => p.id === id)
    const ob = OBLIGACIONES.find((x) => x.id === pago.obligacionId)
    pago.estado = 'ANULADO'
    pago.motivoAnulacion = motivo
    if (!ob.motivoAnulacion) ob.saldoPendiente = Math.min(ob.valor, ob.saldoPendiente + pago.valor)
    if (pago.fecha.startsWith('2026-11')) { RECAUDO.PRESENCIAL.valor -= pago.valor; RECAUDO.PRESENCIAL.pagos -= 1 }
    return copia({ pago: conAbono(pago), obligacion: conCalculos(ob) })
  },

  // ---- CU-14 Cartera ----

  /** GET /api/cartera y GET /api/finanzas/periodo: inmuebles en mora, recaudo por canal y gastos de noviembre. */
  cartera: () => copia({ corte: HOY, inmueblesActivos: INMUEBLES_ACTIVOS, filas: filasDeCartera(), recaudo: recaudo(), gastos: GASTOS }),

  /**
   * GET /api/inmuebles/{id}/paz-y-salvo?fechaCorte: Inmueble.expedirPazYSalvoAFechaDeCorte(fechaCorte).
   * 409 con el detalle de lo pendiente si debe algo que vence en la fecha de corte o antes (RN-34).
   */
  pazYSalvo(texto, fechaCorte, expide) {
    let id
    try { id = inmuebleActivo(texto) } catch (e) { return Promise.reject(e) }
    if (fechaCorte > ULTIMO_CORTE) {
      return Promise.reject(new ErrorApi('La fecha de corte puede ir hasta el 31 de diciembre de 2026, el último periodo configurado.', 422))
    }
    const pendientes = conSaldo(id)
    const alCorte = pendientes.filter((ob) => ob.fechaVencimiento <= fechaCorte)
    if (alCorte.length) {
      const error = new ErrorApi(`${id} tiene obligaciones pendientes a la fecha de corte.`, 409)
      error.detalle = { inmueble: id, fechaCorte, pendientes: structuredClone(alCorte.map(conCalculos)) }
      return Promise.reject(error)
    }
    return copia({
      numero: `PYS-2026-${String(siguientePazYSalvo++).padStart(4, '0')}`,
      inmueble: id, unidad: unidad(id), propietario: INMUEBLES[id].propietario, fechaCorte, fechaExpedicion: HOY, expide,
      porVencerDespues: pendientes.reduce((s, ob) => s + ob.saldoPendiente, 0),
    })
  },

  // ---- Inicio del administrador ----

  /** GET /api/inicio/administrador: cifras del periodo, pendientes, actividad y últimos pagos. */
  inicio() {
    const filas = filasDeCartera()
    const masDe90 = filas.filter((f) => f.diasDeMora > 90)
    const ultimos = PAGOS.filter((p) => p.estado === 'CONFIRMADO')
      .sort((a, b) => `${b.fecha}${b.hora || ''}`.localeCompare(`${a.fecha}${a.hora || ''}`))
      .slice(0, 5).map(conAbono)
    return copia({
      periodo: PERIODOS[0],
      siguientePeriodo: PERIODOS[1],
      recaudo: recaudo(),
      cartera: { vencida: filas.reduce((s, f) => s + f.saldoVencido, 0), enMora: filas.length, masDe90 },
      reportesSinAsignar: { cuantos: 4, masAntiguo: 'hace 3 días' },
      reservasPorConfirmar: { cuantas: 3, proxima: 'sábado 21 de noviembre' },
      actividad: ACTIVIDAD,
      ultimosPagos: ultimos,
    })
  },
}

// Actividad reciente del inicio (Auditoría)
const ACTIVIDAD = [
  { id: 1, tono: 'az', cuando: 'Hoy, 10:42 a. m.', quien: 'Paula Ortega', que: 'Pago presencial registrado',
    partes: ['Recibo ', { id: 'RC-2026-0418' }, ' de ', { id: 'B-1002' }, ' por ', { pesos: 300000 }, ', por transferencia. Abono a la cuota de octubre.'] },
  { id: 2, cuando: 'Hoy, 9:30 a. m.', quien: 'Lucía Mendoza', inmueble: 'B-0302', que: 'Reporte creado',
    partes: ['Luz dañada en el pasillo del piso 3 de la Torre B.'] },
  { id: 3, cuando: 'Hoy, 8:05 a. m.', quien: 'Gloria Ariza', inmueble: 'A-0401', que: 'Pago en línea confirmado',
    partes: ['Cuota de noviembre por ', { pesos: 580000 }, '.'] },
  { id: 4, cuando: 'Hoy, 7:48 a. m.', quien: 'Andrés Caicedo', inmueble: 'C-0705', que: 'Reserva solicitada',
    partes: ['Zona BBQ, domingo 22 de noviembre, de 2:00 a 5:00 p. m.'] },
  { id: 5, cuando: 'Ayer, 4:30 p. m.', quien: 'Paula Ortega', que: 'Pago presencial registrado',
    partes: ['Recibo ', { id: 'RC-2026-0417' }, ' de ', { id: 'C-0512' }, ' por ', { pesos: 300000 }, ', en efectivo. Abono a la cuota de septiembre.'] },
]
