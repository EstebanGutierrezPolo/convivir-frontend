// Datos de ejemplo de las pantallas de administración que todavía no tienen API:
// reservas (CU-21), reportes (CU-16), usuarios (CU-18), auditoría, notificaciones (CU-17)
// y datos de la copropiedad (RF-106).
//
// Cada función devuelve una promesa con la forma que tendrá la respuesta de la API,
// para que conectarla después sea cambiar la función por la del cliente en src/api/.

const responder = (datos) => Promise.resolve(structuredClone(datos))

/** Día que los datos de ejemplo toman como hoy. */
export const HOY_DE_EJEMPLO = '2026-11-14'

// ---------- Reservas (CU-21) ----------

/** TipoInmueble de cada zona común: valorTarifa, unidadTarifa y valorMulta. */
const ZONAS = [
  { clave: 'salon', nombre: 'Salón social', unidadTarifa: 'POR_EVENTO', valorTarifa: 180000, valorMulta: 90000 },
  { clave: 'bbq', nombre: 'Zona BBQ', unidadTarifa: 'POR_HORA', valorTarifa: 25000, valorMulta: 50000 },
  { clave: 'cancha', nombre: 'Cancha múltiple', unidadTarifa: 'POR_HORA', valorTarifa: 0, valorMulta: 0 },
  { clave: 'huespedes', nombre: 'Habitación de huéspedes', unidadTarifa: 'POR_DIA', valorTarifa: 70000, valorMulta: 35000 },
]

/** Propietario de cada inmueble que paga (RN-40). */
const PROPIETARIOS = {
  'B-0302': 'Ernesto Vargas, propietario no residente',
  'C-0705': 'Beatriz Londoño, propietaria no residente',
  'A-0401': 'Gloria Ariza, propietaria residente',
  'A-0902': 'Marta Oviedo, propietaria residente',
  'C-1201': 'Diana Salcedo, propietaria residente',
}

const reserva = (id, zona, inicio, fin, solicitante, vinculo, inmuebleQuePaga, finalidad, estado, extra = {}) => ({
  id, zona, inicio, fin, solicitante, vinculo, inmuebleQuePaga, propietario: PROPIETARIOS[inmuebleQuePaga], finalidad, estado,
  motivoCancelacion: null, motivoMulta: null, ...extra,
})

const RESERVAS = [
  reserva(231, 'salon', '2026-11-21T16:00', '2026-11-21T23:00', 'Lucía Mendoza', 'arrendataria', 'B-0302', 'Cumpleaños de su esposo, unas 40 personas', 'SOLICITADA'),
  reserva(233, 'bbq', '2026-11-15T12:00', '2026-11-15T16:00', 'Andrés Caicedo', 'arrendatario', 'C-0705', 'Asado con compañeros de trabajo', 'SOLICITADA'),
  reserva(234, 'huespedes', '2026-11-27', '2026-11-28', 'Gloria Ariza', 'propietaria residente', 'A-0401', 'Hospedaje de su hermana, que viene de Bucaramanga', 'SOLICITADA'),
  reserva(235, 'cancha', '2026-11-28T08:00', '2026-11-28T10:00', 'Sofía Restrepo', 'residente autorizada', 'A-0401', 'Partido de microfútbol con vecinos del conjunto', 'SOLICITADA'),
  reserva(226, 'bbq', '2026-11-15T13:00', '2026-11-15T17:00', 'Marta Oviedo', 'propietaria residente', 'A-0902', 'Almuerzo familiar de domingo', 'CONFIRMADA'),
  reserva(224, 'salon', '2026-11-13T19:00', '2026-11-13T23:00', 'Diana Salcedo', 'propietaria residente', 'C-1201', 'Reunión de exalumnos del colegio', 'CONFIRMADA'),
  reserva(228, 'cancha', '2026-11-14T09:00', '2026-11-14T11:00', 'Andrés Caicedo', 'arrendatario', 'C-0705', 'Entrenamiento de baloncesto', 'CONFIRMADA'),
  reserva(230, 'bbq', '2026-12-05T15:00', '2026-12-05T18:00', 'Lucía Mendoza', 'arrendataria', 'B-0302', 'Despedida de fin de año con vecinos de la torre B', 'CONFIRMADA'),
  reserva(219, 'salon', '2026-11-07T18:00', '2026-11-07T23:00', 'Marta Oviedo', 'propietaria residente', 'A-0902', 'Primera comunión de su nieta', 'FINALIZADA'),
  reserva(221, 'bbq', '2026-11-08T12:00', '2026-11-08T15:00', 'Lucía Mendoza', 'arrendataria', 'B-0302', 'Almuerzo con amigos', 'CANCELADA',
    { motivoCancelacion: 'Pronóstico de lluvia. La residente lo pidió por citófono.' }),
  reserva(214, 'salon', '2026-10-31T19:00', '2026-10-31T23:00', 'Andrés Caicedo', 'arrendatario', 'C-0705', 'Fiesta de disfraces', 'INCUMPLIDA',
    { motivoMulta: 'Entregó el salón a la 1:30 a. m., fuera del horario, con dos sillas rotas.' }),
  reserva(211, 'huespedes', '2026-10-24', '2026-10-25', 'Gloria Ariza', 'propietaria residente', 'A-0401', 'Visita de sus padres', 'FINALIZADA'),
]

export const reservasDeEjemplo = {
  /** GET /api/reservas: zonas que se reservan, reservas y vencimiento de las multas del periodo. */
  consultar: () => responder({ zonas: ZONAS, reservas: RESERVAS, vencimientoMultas: '2026-11-30' }),
}

// ---------- Reportes (CU-16) ----------

const CATEGORIAS_REPORTE = [
  { id: 1, nombre: 'Seguridad', descripcion: 'Puertas, accesos, rondas y personas sospechosas.', reportes: 23, estado: 'ACTIVO' },
  { id: 2, nombre: 'Ruido y convivencia', descripcion: 'Ruido, fiestas y trato entre vecinos.', reportes: 31, estado: 'ACTIVO' },
  { id: 3, nombre: 'Mantenimiento', descripcion: 'Luminarias, tuberías, techos, puertas y equipos dañados.', reportes: 42, estado: 'ACTIVO' },
  { id: 4, nombre: 'Aseo', descripcion: 'Basuras, shut y limpieza de las zonas comunes.', reportes: 12, estado: 'ACTIVO' },
  { id: 5, nombre: 'Parqueaderos', descripcion: 'Parqueaderos ocupados sin permiso y vehículos mal estacionados.', reportes: 18, estado: 'ACTIVO' },
  { id: 6, nombre: 'Zonas comunes', descripcion: 'Salón social, piscina, zona BBQ, cancha y jardines.', reportes: 15, estado: 'ACTIVO' },
  { id: 7, nombre: 'Mascotas', descripcion: 'Desde octubre se reporta en Ruido y convivencia.', reportes: 4, estado: 'INACTIVO' },
]

/** Personas que pueden atender un reporte. */
const RESPONSABLES = [
  { nombre: 'Paula Ortega', cargo: 'Administradora' },
  { nombre: 'Jhon Rojas', cargo: 'Vigilante, turno noche' },
  { nombre: 'Édgar Molina', cargo: 'Vigilante, turno día' },
  { nombre: 'Hernán Ruiz', cargo: 'Consejo, tesorero' },
]

const seguimiento = (fecha, observacion) => ({ fecha, observacion })

const REPORTES = [
  { id: 'R-0148', categoriaId: 1, descripcion: 'La puerta del sótano 2 no está cerrando sola y queda abierta hacia la calle.', inmueble: 'Sótano 2',
    creadoPor: 'Jhon Rojas', rolCreador: 'Vigilante', creado: '2026-11-14T18:10', responsable: null, estado: 'ABIERTO',
    evidencia: 'puerta-sotano-2.jpg', solucion: null, seguimientos: [] },
  { id: 'R-0147', categoriaId: 2, descripcion: 'Música a alto volumen después de las 11 de la noche en el piso 9 de la torre A, el viernes y el sábado pasados.',
    inmueble: 'A-0902', creadoPor: 'Marta Oviedo', rolCreador: 'Propietaria residente', creado: '2026-11-13T23:40', responsable: null,
    estado: 'ABIERTO', evidencia: null, solucion: null, seguimientos: [] },
  { id: 'R-0146', categoriaId: 3, descripcion: 'Gotera en el techo del parqueadero de visitantes V-07 cuando llueve. Ya hay un charco que moja los carros.',
    inmueble: 'V-07', creadoPor: 'Jhon Rojas', rolCreador: 'Vigilante', creado: '2026-11-12T21:15', responsable: null, estado: 'ABIERTO',
    evidencia: 'gotera-v07.mp4', solucion: null, seguimientos: [] },
  { id: 'R-0145', categoriaId: 3, descripcion: 'Dos luminarias apagadas en el pasillo del piso 3 de la torre B. En la noche el pasillo queda oscuro.',
    inmueble: 'Torre B', creadoPor: 'Lucía Mendoza', rolCreador: 'Arrendataria · B-0302', creado: '2026-11-11T19:05', responsable: 'Paula Ortega',
    estado: 'EN_PROCESO', evidencia: 'pasillo-b-piso-3.jpg', solucion: null, seguimientos: [
      seguimiento('2026-11-12T09:20', 'Se pidió cotización a Eléctricos del Caribe para cambiar las dos luminarias por unas LED.'),
      seguimiento('2026-11-13T16:45', 'Los repuestos llegan el martes 17. El cambio queda para ese día en la mañana.'),
    ] },
  { id: 'R-0143', categoriaId: 5, descripcion: 'Un carro de placa HZM 908 ocupa el parqueadero P-022, que está cedido a B-0302.', inmueble: 'P-022',
    creadoPor: 'Lucía Mendoza', rolCreador: 'Arrendataria · B-0302', creado: '2026-11-09T07:30', responsable: 'Jhon Rojas', estado: 'EN_PROCESO',
    evidencia: 'p-022-hzm-908.jpg', solucion: null, seguimientos: [
      seguimiento('2026-11-09T22:10', 'El vehículo es de una visita de C-1201. Se habló con la residente y lo movieron a V-03.'),
      seguimiento('2026-11-11T21:30', 'El vehículo volvió a parquear en P-022. Se dejó aviso escrito en el parabrisas.'),
    ] },
  { id: 'R-0140', categoriaId: 4, descripcion: 'Malos olores en el shut de basuras de la torre C desde hace una semana.', inmueble: 'Torre C',
    creadoPor: 'Andrés Caicedo', rolCreador: 'Arrendatario · C-0705', creado: '2026-11-04T08:15', responsable: 'Paula Ortega', estado: 'CERRADO',
    evidencia: null, solucion: 'Se lavó y desinfectó el shut, y la recolección pasó a las 7:00 a. m. todos los días.', seguimientos: [
      seguimiento('2026-11-05T10:00', 'Se programó el lavado con la empresa de aseo para el viernes 6.'),
      seguimiento('2026-11-06T15:20', 'Lavado hecho. Se cambió el horario de recolección con la empresa.'),
    ] },
  { id: 'R-0138', categoriaId: 6, descripcion: 'La reja de la piscina tiene el candado dañado y se queda abierta en la noche.', inmueble: 'Piscina',
    creadoPor: 'Gloria Ariza', rolCreador: 'Propietaria residente · A-0401', creado: '2026-11-01T17:00', responsable: 'Paula Ortega', estado: 'CERRADO',
    evidencia: 'candado-piscina.jpg', solucion: 'Se cambió el candado y se entregó una copia de la llave a portería.', seguimientos: [
      seguimiento('2026-11-02T08:40', 'Se compró el candado nuevo. Mientras tanto, portería cierra la reja con cadena.'),
    ] },
]

export const reportesDeEjemplo = {
  /** GET /api/reportes, /api/categorias-reporte y las personas que pueden ser responsables. */
  consultar: () => responder({ reportes: REPORTES, categorias: CATEGORIAS_REPORTE, responsables: RESPONSABLES }),
}

// ---------- Usuarios y roles (CU-18) ----------

/** Personas registradas (Integrante). El rol lo da su tipo: Integrante.obtenerRolDelIntegrante(). */
const PERSONAS = [
  { id: 1, nombre: 'Paula Ortega', documento: '32765418', tipo: 'Empleado · administradora', rol: 'Administrador', correo: 'pa•••@villacampestre.co' },
  { id: 2, nombre: 'Jhon Rojas', documento: '1047392815', tipo: 'Empleado · vigilante', rol: 'Vigilante', correo: 'jh•••@gmail.com' },
  { id: 3, nombre: 'Édgar Molina', documento: '72318904', tipo: 'Empleado · vigilante', rol: 'Vigilante', correo: 'ed•••@hotmail.com' },
  { id: 4, nombre: 'Hernán Ruiz', documento: '8745210', tipo: 'Miembro del consejo · tesorero', rol: 'Miembro del consejo', correo: 'he•••@gmail.com' },
  { id: 5, nombre: 'Lucía Mendoza', documento: '1143228790', tipo: 'Arrendataria · B-0302', rol: 'Arrendatario', correo: 'lu•••@gmail.com' },
  { id: 6, nombre: 'Marta Oviedo', documento: '22465831', tipo: 'Propietaria residente · A-0902', rol: 'Propietario', correo: 'ma•••@hotmail.com' },
  { id: 7, nombre: 'Gloria Ariza', documento: '32618447', tipo: 'Propietaria residente · A-0401', rol: 'Propietario', correo: 'gl•••@gmail.com' },
  { id: 8, nombre: 'Sofía Restrepo', documento: '1001874552', tipo: 'Residente autorizada · A-0401', rol: 'Residente autorizado', correo: 'so•••@gmail.com' },
  { id: 9, nombre: 'Andrés Caicedo', documento: '1129504377', tipo: 'Arrendatario · C-0705', rol: 'Arrendatario', correo: 'an•••@outlook.com' },
  { id: 10, nombre: 'Diana Salcedo', documento: '45512093', tipo: 'Propietaria residente · C-1201', rol: 'Propietario', correo: 'di•••@gmail.com' },
  { id: 11, nombre: 'Camilo Durán', documento: '1140266018', tipo: 'Arrendatario · contrato terminado', rol: 'Arrendatario', correo: 'ca•••@gmail.com' },
  { id: 12, nombre: 'Ernesto Vargas', documento: '19384552', tipo: 'Propietario no residente · B-0302', rol: 'Propietario', correo: 'er•••@gmail.com' },
  { id: 13, nombre: 'Jorge Peñaranda', documento: '79455120', tipo: 'Propietario no residente · A-1104', rol: 'Propietario', correo: 'jo•••@yahoo.com' },
  { id: 14, nombre: 'Beatriz Londoño', documento: '32900145', tipo: 'Propietaria no residente · C-0705', rol: 'Propietario', correo: 'be•••@gmail.com' },
]

/** Cuenta: login, estado y motivoDesactivacion. La fecha del bloqueo sale de la auditoría. */
const CUENTAS = [
  { login: 'paula.ortega', personaId: 1, estado: 'ACTIVA', esPropia: true },
  { login: 'jhon.rojas', personaId: 2, estado: 'ACTIVA' },
  { login: 'edgar.molina', personaId: 3, estado: 'BLOQUEADA', bloqueadaDesde: 'el jueves 12 de noviembre a las 6:02 a. m.' },
  { login: 'hernan.ruiz', personaId: 4, estado: 'ACTIVA' },
  { login: 'lucia.mendoza', personaId: 5, estado: 'ACTIVA' },
  { login: 'marta.oviedo', personaId: 6, estado: 'BLOQUEADA', bloqueadaDesde: 'hoy a las 7:18 a. m.' },
  { login: 'gloria.ariza', personaId: 7, estado: 'ACTIVA' },
  { login: 'sofia.restrepo', personaId: 8, estado: 'ACTIVA' },
  { login: 'andres.caicedo', personaId: 9, estado: 'ACTIVA' },
  { login: 'diana.salcedo', personaId: 10, estado: 'ACTIVA' },
  { login: 'camilo.duran', personaId: 11, estado: 'INACTIVA', motivoDesactivacion: 'Terminó su contrato de arrendamiento de C-0705 en septiembre.' },
]

export const usuariosDeEjemplo = {
  /** GET /api/cuentas y las personas registradas que pueden tener cuenta. */
  consultar: () => responder({ personas: PERSONAS, cuentas: CUENTAS }),
}

// ---------- Auditoría (CU-18, RF-108, RF-109) ----------

/** Auditoria.accion: el tipoEvento del EventoSistema que la originó. */
const ACCIONES_AUDITORIA = {
  INICIO_SESION: 'Inicio de sesión',
  CUENTA_CREADA: 'Cuenta creada',
  CUENTA_MODIFICADA: 'Cuenta modificada',
  INMUEBLE_REGISTRADO: 'Inmueble registrado',
  INMUEBLE_DESACTIVADO: 'Inmueble desactivado',
  VINCULACION_CREADA: 'Vinculación creada',
  VINCULACION_FINALIZADA: 'Vinculación finalizada',
  OBLIGACION_GENERADA: 'Obligaciones generadas',
  OBLIGACION_ANULADA: 'Obligación anulada',
  PAGO_REGISTRADO: 'Pago registrado',
  PAGO_CONFIRMADO: 'Pago confirmado',
  PAGO_ANULADO: 'Pago anulado',
  REPORTE_CREADO: 'Reporte creado',
  REPORTE_ASIGNADO: 'Reporte asignado',
  REPORTE_CAMBIO_DE_ESTADO: 'Seguimiento de reporte',
  REPORTE_CERRADO: 'Reporte cerrado',
}

/** Integrante que realiza la operación (Integrante "1" --> "*" Auditoria : realiza). */
const QUIEN = {
  32765418: 'Paula Ortega',
  1047392815: 'Jhon Rojas',
  8745210: 'Hernán Ruiz',
  1143228790: 'Lucía Mendoza',
  1129504377: 'Andrés Caicedo',
}

const operacion = (fechaHora, documento, accion, elementoAfectado) =>
  ({ fechaHora, documento, nombre: QUIEN[documento], accion, elementoAfectado })

const AUDITORIA = [
  operacion('2026-11-14T19:52', '1047392815', 'INICIO_SESION', 'Cuenta jhon.rojas'),
  operacion('2026-11-14T18:10', '1047392815', 'REPORTE_CREADO', 'Reporte R-0148 · Sótano 2'),
  operacion('2026-11-14T11:32', '32765418', 'PAGO_REGISTRADO', 'Pago RC-2026-1187 · A-0902 · $ 300 000 en efectivo'),
  operacion('2026-11-14T09:05', '32765418', 'CUENTA_MODIFICADA', 'Cuenta sofia.restrepo · contraseña restablecida'),
  operacion('2026-11-14T08:47', '32765418', 'INICIO_SESION', 'Cuenta paula.ortega'),
  operacion('2026-11-13T16:45', '32765418', 'REPORTE_CAMBIO_DE_ESTADO', 'Reporte R-0145 · observación registrada'),
  operacion('2026-11-13T10:12', '32765418', 'OBLIGACION_ANULADA', 'Obligación OB-2026-11-0391 · C-0705 · interés cobrado dos veces'),
  operacion('2026-11-12T21:15', '1047392815', 'REPORTE_CREADO', 'Reporte R-0146 · V-07'),
  operacion('2026-11-12T15:30', '8745210', 'INICIO_SESION', 'Cuenta hernan.ruiz'),
  operacion('2026-11-12T09:20', '32765418', 'REPORTE_CAMBIO_DE_ESTADO', 'Reporte R-0145 · pasó a en proceso'),
  operacion('2026-11-11T14:02', '32765418', 'PAGO_ANULADO', 'Pago RC-2026-1162 · C-1201 · cheque devuelto por el banco'),
  operacion('2026-11-10T10:15', '32765418', 'INMUEBLE_DESACTIVADO', 'Inmueble B-0101 · unido a B-0102 por remodelación'),
  operacion('2026-11-09T22:10', '1047392815', 'REPORTE_CAMBIO_DE_ESTADO', 'Reporte R-0143 · observación registrada'),
  operacion('2026-11-09T08:00', '32765418', 'REPORTE_ASIGNADO', 'Reporte R-0143 · a Jhon Rojas'),
  operacion('2026-11-04T08:15', '1129504377', 'REPORTE_CREADO', 'Reporte R-0140 · Torre C'),
  operacion('2026-11-03T07:00', '32765418', 'OBLIGACION_GENERADA', 'Periodo noviembre de 2026 · 184 cuotas ordinarias'),
  operacion('2026-11-02T16:20', '32765418', 'CUENTA_CREADA', 'Cuenta sofia.restrepo'),
  operacion('2026-11-02T11:40', '1143228790', 'PAGO_CONFIRMADO', 'Pago en línea PSE-88412097 · B-0302 · $ 410 000'),
  operacion('2026-11-01T09:30', '32765418', 'VINCULACION_CREADA', 'Vinculación de Sofía Restrepo con A-0401 · residente autorizada'),
  operacion('2026-10-30T17:05', '32765418', 'VINCULACION_FINALIZADA', 'Vinculación de Camilo Durán con C-0705 · terminó el contrato'),
  operacion('2026-10-28T10:40', '32765418', 'INMUEBLE_REGISTRADO', 'Inmueble V-12 · parqueadero de visitantes'),
]

export const auditoriaDeEjemplo = {
  /** GET /api/auditoria: las acciones posibles y el registro, de la más nueva a la más vieja. */
  consultar: () => responder({ acciones: ACCIONES_AUDITORIA, registros: AUDITORIA }),
}

// ---------- Notificaciones (CU-17) ----------

export const OBLIGADO_DEL_PAGO = 'Obligado del pago del inmueble'

/** Eventos que pueden avisar. Los de cobro van siempre al obligado del pago (RN-28). */
const EVENTOS = {
  PAGO_REGISTRADO: { nombre: 'Pago registrado', cuando: 'Se registra un pago en la oficina o en línea', cobro: true },
  OBLIGACION_GENERADA: { nombre: 'Obligaciones generadas', cuando: 'Se generan las cuotas del periodo o una obligación individual', cobro: true },
  PAGO_ANULADO: { nombre: 'Pago anulado', cuando: 'Se anula un pago con su motivo', cobro: true },
  OBLIGACION_ANULADA: { nombre: 'Obligación anulada', cuando: 'Se anula una obligación con su motivo', cobro: true },
  RESERVA_CONFIRMADA: { nombre: 'Reserva confirmada', cuando: 'La administración confirma una reserva de zona común' },
  REPORTE_ASIGNADO: { nombre: 'Reporte asignado', cuando: 'Un reporte queda a cargo de alguien' },
  REPORTE_CERRADO: { nombre: 'Reporte cerrado', cuando: 'Se cierra un reporte con la solución aplicada' },
  REPORTE_CREADO: { nombre: 'Reporte creado', cuando: 'Un residente o un vigilante crea un reporte' },
  INGRESO_SIN_AUTORIZACION: { nombre: 'Ingreso sin autorización previa', cuando: 'Portería registra un ingreso como excepción' },
  VINCULACION_CREADA: { nombre: 'Vinculación creada', cuando: 'Una persona queda vinculada a un inmueble' },
  VINCULACION_FINALIZADA: { nombre: 'Vinculación finalizada', cuando: 'Termina la vinculación de una persona con un inmueble' },
  CUENTA_CREADA: { nombre: 'Cuenta creada', cuando: 'Se crea la cuenta de una persona' },
  CUENTA_BLOQUEADA: { nombre: 'Cuenta bloqueada', cuando: 'Una cuenta se bloquea por intentos fallidos' },
}

const DESTINATARIOS = [
  OBLIGADO_DEL_PAGO,
  'Residentes del inmueble',
  'Quien pidió la reserva',
  'Quien creó el reporte',
  'Responsable del reporte',
  'Titular de la cuenta',
  'Administración',
  'Consejo de administración',
]

/** ConfiguracionNotificacion: evento, destinatario, estaHabilitada. */
const CONFIGURACIONES = [
  { evento: 'PAGO_REGISTRADO', destinatario: OBLIGADO_DEL_PAGO, estaHabilitada: true },
  { evento: 'OBLIGACION_GENERADA', destinatario: OBLIGADO_DEL_PAGO, estaHabilitada: true },
  { evento: 'PAGO_ANULADO', destinatario: OBLIGADO_DEL_PAGO, estaHabilitada: false },
  { evento: 'RESERVA_CONFIRMADA', destinatario: 'Quien pidió la reserva', estaHabilitada: true },
  { evento: 'REPORTE_ASIGNADO', destinatario: 'Responsable del reporte', estaHabilitada: true },
  { evento: 'REPORTE_CERRADO', destinatario: 'Quien creó el reporte', estaHabilitada: true },
  { evento: 'INGRESO_SIN_AUTORIZACION', destinatario: 'Residentes del inmueble', estaHabilitada: true },
  { evento: 'CUENTA_BLOQUEADA', destinatario: 'Administración', estaHabilitada: false },
]

/** Notificacion: fechaHora, contenido, resultadoEnvio y el integrante que la recibe. */
const NOTIFICACIONES = [
  { id: 9, fechaHora: '2026-11-14T19:25', evento: 'INGRESO_SIN_AUTORIZACION', destinatario: 'Marta Oviedo', unidad: 'A-0902', contenido: 'Portería registró como excepción el ingreso de un domicilio de Rappi a A-0902 a las 7:24 p. m.', resultadoEnvio: 'ENVIADA' },
  { id: 8, fechaHora: '2026-11-14T11:33', evento: 'PAGO_REGISTRADO', destinatario: 'Marta Oviedo', unidad: 'A-0902', contenido: 'Recibimos tu pago de $ 300 000 para A-0902. Te queda un saldo de $ 320 000.', resultadoEnvio: 'ENVIADA' },
  { id: 7, fechaHora: '2026-11-09T08:01', evento: 'REPORTE_ASIGNADO', destinatario: 'Jhon Rojas', unidad: null, contenido: 'Tienes a cargo el reporte R-0143: un carro ocupa el parqueadero P-022.', resultadoEnvio: 'ENVIADA' },
  { id: 6, fechaHora: '2026-11-06T15:22', evento: 'REPORTE_CERRADO', destinatario: 'Andrés Caicedo', unidad: 'C-0705', contenido: 'Cerramos tu reporte R-0140. Se lavó el shut y la recolección pasó a las 7:00 a. m.', resultadoEnvio: 'SIN_CONFIRMACION' },
  { id: 5, fechaHora: '2026-11-03T07:02', evento: 'OBLIGACION_GENERADA', destinatario: 'Jorge Peñaranda', unidad: 'A-1104', contenido: 'Tu cuota de noviembre de 2026 por $ 265 000 vence el 30 de noviembre. Tienes un saldo vencido de $ 1 075 000.', resultadoEnvio: 'FALLIDA' },
  { id: 4, fechaHora: '2026-11-03T07:02', evento: 'OBLIGACION_GENERADA', destinatario: 'Diana Salcedo', unidad: 'C-1201', contenido: 'Tu cuota de noviembre de 2026 por $ 291 000 vence el 30 de noviembre. Tienes un saldo vencido de $ 1 814 000.', resultadoEnvio: 'FALLIDA' },
  { id: 3, fechaHora: '2026-11-03T07:01', evento: 'OBLIGACION_GENERADA', destinatario: 'Lucía Mendoza', unidad: 'B-0302', contenido: 'La cuota de noviembre de 2026 de B-0302 por $ 230 000 vence el 30 de noviembre.', resultadoEnvio: 'ENVIADA' },
  { id: 2, fechaHora: '2026-11-02T11:41', evento: 'PAGO_REGISTRADO', destinatario: 'Lucía Mendoza', unidad: 'B-0302', contenido: 'Recibimos tu pago en línea de $ 410 000 para B-0302. Estás al día.', resultadoEnvio: 'ENVIADA' },
  { id: 1, fechaHora: '2026-11-01T10:05', evento: 'RESERVA_CONFIRMADA', destinatario: 'Marta Oviedo', unidad: 'A-0902', contenido: 'Confirmamos tu reserva del Salón social para el sábado 7 de noviembre, de 6:00 p. m. a 11:00 p. m.', resultadoEnvio: 'SIN_CONFIRMACION' },
]

export const notificacionesDeEjemplo = {
  /** GET /api/notificaciones: eventos, destinatarios posibles, configuración e historial de envíos. */
  consultar: () => responder({
    eventos: EVENTOS, destinatarios: DESTINATARIOS, configuraciones: CONFIGURACIONES, notificaciones: NOTIFICACIONES,
  }),
}

// ---------- Datos de la copropiedad (RF-106) ----------

const COPROPIEDAD = {
  nombre: 'Conjunto Residencial Villa Campestre',
  nit: '900482317-1',
  telefonoContacto: '605 385 4410',
  direccion: 'Calle 98 # 52-115, Barranquilla, Atlántico',
  correoContacto: 'administracion@villacampestre.co',
  estado: 'ACTIVA',
  /** PropiedadHorizontal "1" o-- "*" Inmueble : administra, en resumen. */
  administra: [
    { nombre: 'Torres', detalle: 'A, B y C', cantidad: 3 },
    { nombre: 'Sótanos', detalle: 'Sótano 1 y sótano 2', cantidad: 2 },
    { nombre: 'Unidades privadas activas', detalle: '1 desactivada por remodelación', cantidad: 184 },
    { nombre: 'Parqueaderos privados', desde: 'P-001', hasta: 'P-180', cantidad: 180 },
    { nombre: 'Parqueaderos de visitantes', desde: 'V-01', hasta: 'V-12', cantidad: 12 },
    { nombre: 'Zonas comunes', detalle: '4 se reservan: salón social, zona BBQ, cancha y habitación de huéspedes', cantidad: 9 },
  ],
}

export const copropiedadDeEjemplo = {
  /** GET /api/copropiedad. */
  consultar: () => responder(COPROPIEDAD),
}
