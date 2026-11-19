import { ErrorApi } from '../api/cliente.js'
import { hora } from '../utilidades/formato.js'

/*
 * Datos de ejemplo de las pantallas del residente: Lucía Mendoza, arrendataria residente de B-0302.
 * El backend todavía no tiene las APIs de CU-05, CU-06, CU-08, CU-12, CU-15 y CU-20.
 *
 * Cada función devuelve una promesa con la forma que tendría la respuesta de la API (nombres del diagrama de
 * clases) y los errores salen como ErrorApi con el mismo código que daría el backend (403, 409). Conectar una
 * pantalla después es cambiar la función por un pedir(). Las acciones cambian estos datos en memoria, así que
 * las seis pantallas ven lo mismo hasta que se recarga la página.
 */

/** Las vistas cuentan los días desde el sábado 14 de noviembre de 2026. */
export const HOY = '2026-11-14'

/** Datos del inmueble que la sesión no trae. */
export const INMUEBLE = {
  identificacion: 'B-0302',
  propietario: 'Ernesto Vargas',
  contrato: 'ARR-2026-0187',
}

const copia = (valor) => Promise.resolve(structuredClone(valor))

// ============================================================
// Formatos que comparten las pantallas del residente
// ============================================================

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
  'noviembre', 'diciembre']
const SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DIAS = { LUNES: 'lunes', MARTES: 'martes', MIERCOLES: 'miércoles', JUEVES: 'jueves', VIERNES: 'viernes', SABADO: 'sábado', DOMINGO: 'domingo' }
export const ORDEN_DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1)

/** "2026-11-14" -> Date a medianoche local. */
export function aFecha(iso) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(a, m - 1, d)
}

/** "2026-11-14" + 1 día -> "2026-11-15". */
export function sumarDias(iso, dias) {
  const d = aFecha(iso)
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function diasEntre(desde, hasta) {
  return Math.round((aFecha(hasta) - aFecha(desde)) / 86400000)
}

/**
 * "2026-11-15" -> "15 de noviembre". conDia: "Domingo 15 de noviembre". hoy: "Hoy" si es HOY.
 * conAnio: siempre con el año; si no, solo cuando no es 2026.
 */
export function fechaLarga(iso, { conDia = false, hoy = false, conAnio = false } = {}) {
  if (hoy && iso.slice(0, 10) === HOY) return 'Hoy'
  const d = aFecha(iso)
  const texto = `${d.getDate()} de ${MESES[d.getMonth()]}${conAnio || d.getFullYear() !== 2026 ? ` de ${d.getFullYear()}` : ''}`
  return conDia ? `${mayuscula(SEMANA[d.getDay()])} ${texto}` : texto
}

/** "noviembre de 2026" para el mes 10 (base 0). */
export function nombreMes(anio, mes) {
  return `${mayuscula(MESES[mes])} de ${anio}`
}
export const MES = MESES

/** 7, "07:00" o "18:30" -> "7:00 a. m.", "6:30 p. m."; el mediodía es "12:00 m.". */
export function horaDe(valor) {
  const hh = typeof valor === 'number' ? valor : Number(valor.split(':')[0])
  const mm = typeof valor === 'number' ? '00' : valor.split(':')[1]
  if (hh === 12 && mm === '00') return '12:00 m.'
  return `${hh % 12 || 12}:${mm}${hh < 12 || hh === 24 ? ' a. m.' : ' p. m.'}`
}

/** "18:00-23:59" -> "6:00 p. m. a 11:59 p. m." */
export function franjaHoraria(horarios) {
  const [desde, hasta] = horarios.split('-')
  return `${horaDe(desde)} a ${horaDe(hasta)}`
}

/** "MARTES,VIERNES" -> "Martes y viernes". */
export function diasPermitidos(texto) {
  const lista = texto.split(',')
  if (lista.length === 7) return 'Todos los días'
  if (lista.join(',') === 'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES') return 'Lunes a viernes'
  const nombres = lista.map((d) => DIAS[d])
  const unidos = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0]
  return mayuscula(unidos)
}

/** "CC 1045887332" -> "CC 1 045 887 332". */
export function documentoLegible(texto) {
  const [tipo, numero] = texto.split(' ')
  return `${tipo} ${numero.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
}

/** "2026-11-12T20:14:00" -> "12 de noviembre, 8:14 p. m." */
export function momento(isoConHora, opciones) {
  return `${fechaLarga(isoConHora, opciones)}, ${hora(isoConHora)}`
}

/** Fecha y hora de este momento con el día de las vistas. */
function ahora() {
  const d = new Date()
  return `${HOY}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`
}

// ============================================================
// CU-05 y CU-06: autorizaciones de acceso
// ============================================================

let siguienteAutorizacion = 10
const autorizaciones = [
  { id: 1, tipoAutorizacion: 'OCASIONAL', nombreVisitante: 'Camila Restrepo Ariza', documentoVisitante: 'CC 1045887332', motivoAcceso: 'Visita familiar',
    usaParqueaderoVisitantes: true, fechaInicio: '2026-11-14', fechaFin: '2026-11-14', diasPermitidos: null, horarios: '18:00-23:59', estado: 'VIGENTE' },
  { id: 2, tipoAutorizacion: 'OCASIONAL', nombreVisitante: 'Julián Mendoza Torres', documentoVisitante: 'CC 1032456781', motivoAcceso: 'Almuerzo familiar',
    usaParqueaderoVisitantes: false, fechaInicio: '2026-11-15', fechaFin: '2026-11-15', diasPermitidos: null, horarios: '12:00-18:00', estado: 'VIGENTE' },
  { id: 3, tipoAutorizacion: 'OCASIONAL', nombreVisitante: 'Edwin Suárez Mora', documentoVisitante: 'CC 1143987650', motivoAcceso: 'Técnico de Claro, instalación de internet',
    usaParqueaderoVisitantes: false, fechaInicio: '2026-11-14', fechaFin: '2026-11-14', diasPermitidos: null, horarios: '14:00-18:00', estado: 'UTILIZADA' },
  { id: 4, tipoAutorizacion: 'OCASIONAL', nombreVisitante: 'Paola Herrera Díaz', documentoVisitante: 'CC 52987114', motivoAcceso: 'Entrega de un pedido',
    usaParqueaderoVisitantes: false, fechaInicio: '2026-11-07', fechaFin: '2026-11-07', diasPermitidos: null, horarios: '09:00-12:00', estado: 'CANCELADA' },
  { id: 5, tipoAutorizacion: 'OCASIONAL', nombreVisitante: 'Andrés Felipe Gil', documentoVisitante: 'CC 1018456230', motivoAcceso: 'Revisión del calentador',
    usaParqueaderoVisitantes: true, fechaInicio: '2026-11-03', fechaFin: '2026-11-03', diasPermitidos: null, horarios: '08:00-12:00', estado: 'VENCIDA' },

  { id: 6, tipoAutorizacion: 'RECURRENTE', nombreVisitante: 'Martha Lucía Cárdenas', documentoVisitante: 'CC 39654221', motivoAcceso: 'Empleada doméstica',
    usaParqueaderoVisitantes: false, fechaInicio: '2026-08-01', fechaFin: '2027-01-31', diasPermitidos: 'MARTES,VIERNES', horarios: '07:00-16:00', estado: 'VIGENTE' },
  { id: 7, tipoAutorizacion: 'RECURRENTE', nombreVisitante: 'Daniel Ospina Rueda', documentoVisitante: 'CC 1020745336', motivoAcceso: 'Profesor de inglés',
    usaParqueaderoVisitantes: false, fechaInicio: '2026-09-01', fechaFin: '2026-11-20', diasPermitidos: 'LUNES,MIERCOLES', horarios: '17:00-19:00', estado: 'VIGENTE' },
  { id: 8, tipoAutorizacion: 'RECURRENTE', nombreVisitante: 'Kevin Rojas Pardo', documentoVisitante: 'CC 1001234567', motivoAcceso: 'Paseador de perros',
    usaParqueaderoVisitantes: false, fechaInicio: '2026-07-01', fechaFin: '2026-12-31', diasPermitidos: 'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES', horarios: '06:00-08:00', estado: 'REVOCADA' },
  { id: 9, tipoAutorizacion: 'RECURRENTE', nombreVisitante: 'Natalia Prieto Gómez', documentoVisitante: 'CC 1022334455', motivoAcceso: 'Fisioterapeuta',
    usaParqueaderoVisitantes: true, fechaInicio: '2026-09-01', fechaFin: '2026-10-31', diasPermitidos: 'MARTES,JUEVES', horarios: '10:00-11:30', estado: 'VENCIDA' },
]

export const autorizacionesApi = {
  /** GET /api/autorizaciones?inmueble=B-0302 */
  consultar: () => copia(autorizaciones),

  /** GET /api/parqueaderos/visitantes/disponibles (RF-064) */
  parqueaderosLibres: () => copia({ libres: 4, total: 12 }),

  /**
   * POST /api/autorizaciones. Con sinPermiso responde el 403 de validarQueElAutorizanteTengaPermiso() (RN-08),
   * que la vista muestra con ?estado=sin-permiso.
   */
  registrar(datos, { sinPermiso = false } = {}) {
    if (sinPermiso) {
      return Promise.reject(new ErrorApi('No tienes una vinculación vigente con permiso para autorizar accesos.', 403))
    }
    const nueva = { id: siguienteAutorizacion++, estado: 'VIGENTE', ...datos }
    autorizaciones.push(nueva)
    return copia(nueva)
  },

  /** PATCH /api/autorizaciones/{id}/cancelar (RF-030) o /revocar (RF-042). */
  terminar(id) {
    const a = autorizaciones.find((x) => x.id === id)
    a.estado = a.tipoAutorizacion === 'OCASIONAL' ? 'CANCELADA' : 'REVOCADA'
    return copia(a)
  },
}

// ============================================================
// CU-12: obligaciones y pagos
// ============================================================

const obligaciones = [
  { id: 1, concepto: 'CUOTA_ORDINARIA', descripcion: 'Cuota de administración de noviembre', valor: 412000, saldoPendiente: 412000,
    fechaVencimiento: '2026-11-30', estado: 'PENDIENTE', fechaPago: null },
  { id: 2, concepto: 'MULTA', descripcion: 'Multa por ruido de octubre', valor: 150000, saldoPendiente: 150000,
    fechaImposicion: '2026-10-24', fechaVencimiento: '2026-11-30', estado: 'PENDIENTE', aCargoDe: 'Ernesto Vargas' },
]

const pagos = [
  { id: 5, fecha: '2026-10-28T19:15:00', concepto: 'Cuota de administración de octubre', valor: 412000, saldoDespues: 0, estado: 'CONFIRMADO',
    comprobante: 'CP-2026-003977', referenciaPasarela: 'PSE-2610-77341' },
  { id: 4, fecha: '2026-10-28T19:09:00', concepto: 'Cuota de administración de octubre', valor: 412000, saldoDespues: 412000, estado: 'RECHAZADO',
    comprobante: null, referenciaPasarela: 'PSE-2610-77322' },
  { id: 3, fecha: '2026-09-29T09:40:00', concepto: 'Cuota de administración de septiembre', valor: 212000, saldoDespues: 0, estado: 'CONFIRMADO',
    comprobante: 'CP-2026-003112', referenciaPasarela: 'PSE-2609-60218' },
  { id: 2, fecha: '2026-09-15T20:05:00', concepto: 'Cuota de administración de septiembre', valor: 200000, saldoDespues: 212000, estado: 'CONFIRMADO',
    comprobante: 'CP-2026-002874', referenciaPasarela: 'PSE-2609-55107' },
  { id: 1, fecha: '2026-08-27T12:31:00', concepto: 'Cuota de administración de agosto', valor: 412000, saldoDespues: 0, estado: 'CONFIRMADO',
    comprobante: 'CP-2026-002240', referenciaPasarela: 'PSE-2608-41876' },
]
const consecutivo = { pago: 6, comprobante: 4821, referencia: 84213 }
const pendientes = {}

export const pagosApi = {
  /** GET /api/inmuebles/B-0302/obligaciones: la cuota de noviembre y la multa del propietario. */
  obligaciones: () => copia(obligaciones),

  /** GET /api/inmuebles/B-0302/pagos */
  historial: () => copia(pagos),

  /** POST /api/pagos -> 202 PENDIENTE con la referencia de la pasarela (RF-074, RF-075). */
  iniciar(obligacionId, valor) {
    const o = obligaciones.find((x) => x.id === obligacionId)
    const pago = {
      id: consecutivo.pago++, obligacionId, concepto: o.descripcion, valor, estado: 'PENDIENTE',
      referenciaPasarela: `PSE-2611-${consecutivo.referencia++}`, comprobante: null,
    }
    pendientes[pago.referenciaPasarela] = pago
    return copia(pago)
  },

  /**
   * Respuesta de la pasarela simulada: CONFIRMADO registra el abono y genera el comprobante (RF-076, RF-077,
   * RN-42); RECHAZADO no cambia la obligación (RN-23).
   */
  resolver(referencia, resultado) {
    const pago = pendientes[referencia]
    delete pendientes[referencia]
    const o = obligaciones.find((x) => x.id === pago.obligacionId)
    pago.estado = resultado
    pago.fecha = ahora()
    if (resultado === 'CONFIRMADO') {
      o.saldoPendiente -= pago.valor
      o.estado = o.saldoPendiente === 0 ? 'PAGADA' : 'PAGADA_PARCIALMENTE'
      if (o.saldoPendiente === 0) o.fechaPago = HOY
      pago.comprobante = `CP-2026-00${consecutivo.comprobante++}`
    }
    pago.saldoDespues = o.saldoPendiente
    pagos.unshift(pago)
    return copia(pago)
  },
}

// ============================================================
// CU-20: reservas de zonas comunes
// ============================================================

const zonas = [
  { clave: 'salon', nombre: 'Salón social', frase: 'el salón social', ubicacion: 'Primer piso, Torre A', permiteReserva: true,
    unidadTarifa: 'POR_EVENTO', valorTarifa: 180000, valorMulta: 90000,
    franjas: [{ clave: 'dia', nombre: 'Evento de día', desde: '09:00', hasta: '15:00' },
      { clave: 'noche', nombre: 'Evento de tarde y noche', desde: '16:00', hasta: '23:00' }] },
  { clave: 'bbq', nombre: 'Zona BBQ', frase: 'la zona BBQ', ubicacion: 'Terraza', permiteReserva: true,
    unidadTarifa: 'POR_HORA', valorTarifa: 25000, valorMulta: 50000, abre: 10, cierra: 22 },
  { clave: 'cancha', nombre: 'Cancha múltiple', frase: 'la cancha múltiple', ubicacion: 'Junto a la Torre C', permiteReserva: true,
    unidadTarifa: 'POR_HORA', valorTarifa: 0, valorMulta: 0, abre: 6, cierra: 21 },
  { clave: 'piscina', nombre: 'Piscina', frase: 'la piscina', ubicacion: 'Uso libre de los residentes', permiteReserva: false },
]

/** Periodos ocupados por reservas confirmadas de otros residentes (RF-115). */
const ocupadas = {
  salon: { '2026-11-14': ['noche'], '2026-11-21': ['noche'], '2026-11-28': ['dia', 'noche'], '2026-12-12': ['noche'],
    '2026-12-19': ['dia', 'noche'], '2026-12-24': ['noche'], '2026-12-31': ['dia', 'noche'] },
  bbq: { '2026-11-14': [12, 13, 14, 15, 16, 17], '2026-11-15': [11, 12, 13, 14], '2026-11-21': [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    '2026-11-22': [13, 14, 15], '2026-11-28': [11, 12, 13], '2026-12-05': [12, 13, 14, 15],
    '2026-12-08': [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], '2026-12-25': [12, 13, 14, 15, 16] },
  cancha: { '2026-11-15': [8, 9, 10], '2026-11-17': [18, 19, 20], '2026-11-19': [18, 19], '2026-11-22': [8, 9, 10, 11], '2026-11-29': [8, 9, 10] },
}

/** Otra reserva que se confirma mientras Lucía elige: solo aparece al solicitar (RN-38). */
const CONFIRMADA_MIENTRAS = { zona: 'salon', fecha: '2026-12-05', franja: 'noche' }

let siguienteReserva = 5
const reservas = [
  { id: 1, zona: 'cancha', fecha: '2026-11-15', desde: '07:00', hasta: '08:00', claves: [7], finalidad: 'Partido de microfútbol con amigos',
    valorTarifa: 0, inmuebleQuePaga: 'B-0302', estado: 'CONFIRMADA', motivoCancelacion: null },
  { id: 2, zona: 'bbq', fecha: '2026-11-28', desde: '15:00', hasta: '18:00', claves: [15, 16, 17], finalidad: 'Asado de cumpleaños de mi hermano',
    valorTarifa: 75000, inmuebleQuePaga: 'B-0302', estado: 'SOLICITADA', motivoCancelacion: null },
  { id: 3, zona: 'bbq', fecha: '2026-11-01', desde: '12:00', hasta: '15:00', claves: [12, 13, 14], finalidad: 'Almuerzo con compañeros de trabajo',
    valorTarifa: 75000, inmuebleQuePaga: 'B-0302', estado: 'CANCELADA', motivoCancelacion: 'Se aplazó el almuerzo.' },
  { id: 4, zona: 'salon', fecha: '2026-10-10', desde: '16:00', hasta: '23:00', claves: ['noche'], finalidad: 'Fiesta de cumpleaños',
    valorTarifa: 180000, inmuebleQuePaga: 'B-0302', estado: 'FINALIZADA', motivoCancelacion: null },
]

export const reservasApi = {
  /** GET /api/zonas-comunes, su disponibilidad y GET /api/reservas?integrante=… (RF-115, RF-117). */
  consultar: () => copia({ zonas, ocupadas, reservas }),

  /**
   * POST /api/reservas. 403 si no es residente vigente (RN-43, ?estado=no-residente en la vista);
   * 409 si el periodo se ocupó mientras elegía (RN-38).
   */
  solicitar(datos, { noResidente = false } = {}) {
    if (noResidente) {
      return Promise.reject(new ErrorApi('Solo reserva quien vive en la copropiedad con una vinculación vigente.', 403))
    }
    const m = CONFIRMADA_MIENTRAS
    if (datos.zona === m.zona && datos.fecha === m.fecha && datos.claves.includes(m.franja)) {
      ocupadas[m.zona][m.fecha] = [...(ocupadas[m.zona][m.fecha] || []), m.franja].filter((v, i, l) => l.indexOf(v) === i)
      return Promise.reject(new ErrorApi('Ese horario se acaba de ocupar.', 409))
    }
    const nueva = { id: siguienteReserva++, estado: 'SOLICITADA', motivoCancelacion: null, ...datos }
    reservas.unshift(nueva)
    return copia(nueva)
  },

  /** PATCH /api/reservas/{id}/cancelar: Reserva.cancelarReservaPorMotivo(motivo) (RF-118). */
  cancelar(id, motivo) {
    const r = reservas.find((x) => x.id === id)
    r.estado = 'CANCELADA'
    r.motivoCancelacion = motivo
    return copia(r)
  },
}

// ============================================================
// CU-15: reportes de novedad
// ============================================================

const categorias = ['Daños e infraestructura', 'Seguridad', 'Ruido y convivencia', 'Aseo y basuras', 'Ascensores', 'Parqueaderos', 'Otro']

let siguienteReporte = 438
const reportes = [
  { id: 'R-0437', categoria: 'Daños e infraestructura', estado: 'ABIERTO', fechaCreacion: '2026-11-12', inmueble: '', evidencia: 'luminaria-sotano1.jpg',
    descripcion: 'La luminaria del sótano 1, frente al parqueadero P-022, está apagada desde el martes. En la noche queda muy oscuro para salir del carro.',
    resumen: 'La luminaria del sótano 1, frente al P-022, está apagada…', responsable: '',
    seguimiento: [{ fecha: '2026-11-12T20:14:00', que: 'Reporte creado', detalle: 'Llegó a la administración. Todavía no tiene responsable.' }] },
  { id: 'R-0412', categoria: 'Daños e infraestructura', estado: 'EN_PROCESO', fechaCreacion: '2026-11-02', inmueble: 'B-0302', evidencia: 'techo-bano.jpg',
    descripcion: 'Sale agua del techo del baño principal cuando usan la ducha del apartamento de arriba. Ya hay una mancha de unos 40 cm.',
    resumen: 'Sale agua del techo del baño principal…', ultimoSeguimiento: 'el plomero viene el martes 17 de noviembre a las 9:00 a. m.',
    responsable: 'Carlos Gómez, mantenimiento',
    seguimiento: [
      { fecha: '2026-11-02T09:30:00', que: 'Reporte creado', detalle: 'Con una foto adjunta.' },
      { fecha: '2026-11-03T08:10:00', que: 'Asignado a Carlos Gómez, mantenimiento', detalle: 'Paula Ortega, administradora, cambió el estado a en proceso.' },
      { fecha: '2026-11-05T16:45:00', que: 'Observación', detalle: 'Se revisó desde el apartamento de arriba: la filtración viene del sifón de la ducha.' },
      { fecha: '2026-11-10T11:20:00', que: 'Observación', detalle: 'El plomero viene el martes 17 de noviembre a las 9:00 a. m. Por favor deja acceso al baño.' },
    ] },
  { id: 'R-0365', categoria: 'Aseo y basuras', estado: 'CERRADO', fechaCreacion: '2026-10-14', inmueble: '', evidencia: '',
    descripcion: 'La puerta del shut de basuras del piso 3 de la Torre B no cierra y sale mal olor al pasillo.',
    responsable: 'Carlos Gómez, mantenimiento',
    seguimiento: [
      { fecha: '2026-10-14T19:02:00', que: 'Reporte creado', detalle: '' },
      { fecha: '2026-10-15T09:00:00', que: 'Asignado a Carlos Gómez, mantenimiento', detalle: '' },
      { fecha: '2026-10-20T15:30:00', que: 'Cerrado con solución', detalle: 'Se cambiaron las bisagras y el brazo hidráulico de la puerta.', cerrado: true },
    ] },
  { id: 'R-0298', categoria: 'Seguridad', estado: 'CERRADO', fechaCreacion: '2026-08-28', inmueble: '', evidencia: 'puerta-peatonal.jpg',
    descripcion: 'La puerta peatonal de la portería se queda abierta después de que alguien pasa.',
    responsable: 'Jhon Rojas, vigilancia',
    seguimiento: [
      { fecha: '2026-08-28T22:15:00', que: 'Reporte creado', detalle: 'Con una foto adjunta.' },
      { fecha: '2026-08-29T07:40:00', que: 'Asignado a Jhon Rojas, vigilancia', detalle: '' },
      { fecha: '2026-09-02T18:00:00', que: 'Cerrado con solución', detalle: 'Se ajustó el cierre automático. Portería revisa la puerta en cada ronda.', cerrado: true },
    ] },
]

export const reportesApi = {
  /** GET /api/categorias-reporte?estado=ACTIVA y GET /api/reportes?integrante=… (RF-092, RF-093). */
  consultar: () => copia({ categorias, reportes }),

  /**
   * POST /api/reportes: Reporte(descripcion).crearReporteDeNovedad() (RF-090, RF-091). 403 si el inmueble no
   * tiene una vinculación vigente de quien reporta (RN-33).
   */
  crear({ categoria, descripcion, inmueble, evidencia }) {
    if (inmueble && inmueble !== INMUEBLE.identificacion) {
      return Promise.reject(new ErrorApi(`No puedes relacionar el reporte con ${inmueble}.`, 403))
    }
    const nuevo = {
      id: `R-0${siguienteReporte++}`, categoria, descripcion, inmueble, evidencia, fechaCreacion: HOY, estado: 'ABIERTO', responsable: '',
      seguimiento: [{ fecha: ahora(), que: 'Reporte creado', detalle: evidencia ? 'Con una foto adjunta.' : 'Llegó a la administración. Todavía no tiene responsable.' }],
    }
    reportes.unshift(nuevo)
    return copia(nuevo)
  },
}

// ============================================================
// CU-08 y CU-09: vehículos y parqueadero cedido
// ============================================================

const cesion = {
  parqueadero: 'P-022', ubicacion: 'Sótano 1', cedente: 'Ernesto Vargas', cesionario: 'B-0302',
  fechaInicio: '2026-03-01', fechaFin: '2026-11-30', placa: 'BQA 47F', estado: 'VIGENTE',
}

const vehiculos = [
  { id: 1, placa: 'BQA 47F', tipoVehiculo: 'Automóvil', marca: 'Mazda 2', color: 'Gris', responsable: 'Lucía Mendoza', fechaRegistro: '2026-03-03',
    estado: 'ACTIVO', parqueadero: 'P-022', motivoBaja: null },
  { id: 2, placa: 'MKL 330', tipoVehiculo: 'Automóvil', marca: 'Renault Logan', color: 'Blanco', responsable: 'Lucía Mendoza', fechaRegistro: '2026-03-03',
    estado: 'INACTIVO', motivoBaja: 'Se vendió', fechaBaja: '2026-04-12' },
]
let siguienteVehiculo = 3

/** Placas de otros inmuebles: el 409 no dice de quién son. */
const OTRAS_PLACAS = ['JKT 512', 'HZM 908', 'RTY 22E']

/** Vehiculo.normalizarPlaca(): "bqa471" -> "BQA 471". */
export function normalizarPlaca(placa) {
  const limpia = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return limpia.length > 3 ? `${limpia.slice(0, 3)} ${limpia.slice(3)}` : limpia
}

export const vehiculosApi = {
  /** GET /api/inmuebles/B-0302/vehiculos, la cesión de uso vigente y las personas vinculadas (RF-047). */
  consultar: () => copia({ cesion, vehiculos, vinculados: ['Lucía Mendoza', 'Ernesto Vargas'] }),

  /** POST /api/vehiculos: registrarVehiculo() (RF-046). 409 si la placa ya existe (RN-14). */
  registrar(datos) {
    const placa = normalizarPlaca(datos.placa)
    const propia = vehiculos.find((v) => v.placa === placa)
    if (propia) {
      return Promise.reject(new ErrorApi(propia.estado === 'ACTIVO'
        ? `${placa} ya está registrada en tu apartamento. La ves en la lista de vehículos.`
        : `${placa} ya está registrada en tu apartamento, dada de baja. Pídele a la administración que la vuelva a activar.`, 409))
    }
    if (OTRAS_PLACAS.includes(placa)) {
      return Promise.reject(new ErrorApi(`${placa} ya está registrada en otro inmueble del conjunto. Si el vehículo es tuyo, pídele a la administración que lo pase a tu apartamento.`, 409))
    }
    const nuevo = { id: siguienteVehiculo++, ...datos, placa, fechaRegistro: HOY, estado: 'ACTIVO', motivoBaja: null }
    vehiculos.unshift(nuevo)
    return copia(nuevo)
  },
}

// ============================================================
// Inicio: lo que le toca al residente en su inmueble
// ============================================================

export const inicioApi = {
  /** GET /api/residente/resumen: cuota, multa, cesión, visitas vigentes, reservas activas y reportes en curso. */
  resumen: () => copia({
    cuota: obligaciones.find((o) => o.concepto === 'CUOTA_ORDINARIA'),
    multa: obligaciones.find((o) => o.concepto === 'MULTA'),
    cesion,
    visitas: autorizaciones.filter((a) => a.estado === 'VIGENTE'),
    reservas: reservas.filter((r) => r.estado === 'SOLICITADA' || r.estado === 'CONFIRMADA'),
    zonas,
    reportes: reportes.filter((r) => r.estado !== 'CERRADO'),
  }),
}
