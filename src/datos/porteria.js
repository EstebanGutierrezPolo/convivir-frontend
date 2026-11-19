// Datos de ejemplo de portería mientras el backend no tiene su API:
// CU-07 (ingreso y salida de personas), CU-10 (movimiento vehicular) y CU-15 (reportar novedad).
// Los comparten Porteria, Vehiculos, Presentes y Reportar. Cada función devuelve una promesa
// con la forma que tendría la respuesta, así que conectarla es cambiar su cuerpo por pedir('/...').

/** Hora de hoy en formato de la API, sin zona: "2026-11-18T19:52:00". */
function hoyA(horas, minutos) {
  const d = new Date()
  const dos = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(horas)}:${dos(minutos)}:00`
}

const responder = (datos) => Promise.resolve(structuredClone(datos))

// ---------- Textos de dominio que usan las cuatro pantallas ----------

/** Tipo de ingreso: VISITA (autorización ocasional), RECURRENTE, EXCEPCION (sin autorización) y RESIDENTE (vehículos). */
export const TIPOS_INGRESO = {
  VISITA: 'Visita',
  RECURRENTE: 'Recurrente',
  EXCEPCION: 'Excepción',
  RESIDENTE: 'Residente',
}

/** "C-0705" -> "Torre C · Apto 0705". */
export function nombreDeUnidad(codigo) {
  const [torre, apto] = codigo.split('-')
  return `Torre ${torre} · Apto ${apto}`
}

/** Cómo entró: "visita de Andrés Caicedo", "autorización recurrente de Inés Calderón"… */
export function comoEntro(presente) {
  if (presente.tipo === 'EXCEPCION') return presente.anfitrion ? `excepción confirmada por ${presente.anfitrion}` : 'excepción'
  if (presente.tipo === 'RECURRENTE') return `autorización recurrente de ${presente.anfitrion}`
  return `visita de ${presente.anfitrion}`
}

/** "bqa-47f" -> "BQA 47F": mayúsculas, sin signos y con el espacio después de las letras. */
export function normalizarPlaca(texto) {
  const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return limpio.length > 3 ? `${limpio.slice(0, 3)} ${limpio.slice(3)}` : limpio
}

/** "a la" para la una, "a las" para las demás horas. */
export function aLas(texto) {
  const h = new Date(texto).getHours() % 12
  return h === 1 ? 'a la' : 'a las'
}

// ---------- Personas dentro: MovimientoAcceso.consultarPersonasPresentesEnElConjunto() ----------

const vigenteHoy = { tono: 'ok', texto: 'Vigente hasta 11:59 p. m.', detalle: 'Visita de hoy' }

const PRESENTES = [
  { documento: '1020733418', nombre: 'Fabián Quintero Díaz', unidad: 'A-0401', anfitrion: 'Gloria Ariza', tipo: 'VISITA', horaIngreso: hoyA(13, 15),
    autorizacion: { tono: 'al', texto: 'Vencida hace 4 h', detalle: 'Era hasta hoy a las 6:00 p. m.' }, revisar: 'su visita era hasta las 6:00 p. m.' },
  { documento: '80455102', nombre: 'Wilson Ardila Mora', unidad: 'A-0902', anfitrion: 'Marta Oviedo', tipo: 'RECURRENTE', horaIngreso: hoyA(7, 12),
    autorizacion: { tono: 'al', texto: 'Fuera de horario hace 5 h', detalle: 'Lunes a sábado, 7:00 a. m. a 5:00 p. m.' }, revisar: 'su horario terminó a las 5:00 p. m.' },
  { documento: '79881230', nombre: 'Mauricio León Gaitán', unidad: 'C-0705', anfitrion: 'Andrés Caicedo', tipo: 'VISITA', horaIngreso: hoyA(19, 52),
    placa: 'JKT 512', parqueadero: 'V-02', autorizacion: vigenteHoy },
  { documento: '1032455870', nombre: 'Sebastián Mora Uribe', unidad: 'B-1105', anfitrion: 'Carolina Uribe', tipo: 'VISITA', horaIngreso: hoyA(18, 30),
    placa: 'EYK 754', parqueadero: 'V-11', autorizacion: vigenteHoy },
  { documento: '1037600912', nombre: 'Paola Andrea Vélez', unidad: 'C-0412', anfitrion: 'Mónica Ríos', tipo: 'VISITA', horaIngreso: hoyA(18, 20),
    placa: 'UFR 903', parqueadero: 'V-05', autorizacion: vigenteHoy },
  { documento: '1001276554', nombre: 'Kevin Andrés Suárez', unidad: 'B-0614', anfitrion: 'Gabriel Suárez', tipo: 'VISITA', horaIngreso: hoyA(18, 15),
    autorizacion: vigenteHoy },
  { documento: '1001276590', nombre: 'Valentina Suárez Mesa', unidad: 'B-0614', anfitrion: 'Gabriel Suárez', tipo: 'VISITA', horaIngreso: hoyA(18, 15),
    autorizacion: vigenteHoy },
  { documento: '1019076234', nombre: 'Andrea Lozano Peña', unidad: 'A-0603', anfitrion: 'Ricardo Herrera', tipo: 'VISITA', horaIngreso: hoyA(18, 10),
    placa: 'TPQ 380', parqueadero: 'V-10', autorizacion: vigenteHoy },
  { documento: '1000394871', nombre: 'Felipe Herrera Lozano', unidad: 'A-0603', anfitrion: 'Ricardo Herrera', tipo: 'VISITA', horaIngreso: hoyA(18, 10),
    placa: 'TPQ 380', parqueadero: 'V-10', autorizacion: vigenteHoy },
  { documento: '79230418', nombre: 'Gustavo Pinzón Arias', unidad: 'B-1003', anfitrion: 'Mariana Téllez', tipo: 'RECURRENTE', horaIngreso: hoyA(18, 5),
    autorizacion: { tono: 'al', texto: 'Termina a las 10:30 p. m.', detalle: 'Sábados, 6:00 a 10:30 p. m.' } },
  { documento: '52880147', nombre: 'Claudia Patricia Mejía', unidad: 'B-0807', anfitrion: 'Inés Calderón', tipo: 'RECURRENTE', horaIngreso: hoyA(18, 2),
    placa: 'NWX 145', parqueadero: 'V-08', autorizacion: { tono: 'ok', texto: 'Vigente hasta 6:00 a. m.', detalle: 'Todos los días, 6:00 p. m. a 6:00 a. m.' } },
  { documento: '1018442390', nombre: 'Julián Salcedo Pardo', unidad: 'C-1201', anfitrion: 'Diana Salcedo', tipo: 'VISITA', horaIngreso: hoyA(17, 45),
    placa: 'KZT 418', parqueadero: 'V-01', autorizacion: vigenteHoy },
  { documento: '1020815563', nombre: 'Natalia Gómez Rincón', unidad: 'C-1201', anfitrion: 'Diana Salcedo', tipo: 'VISITA', horaIngreso: hoyA(17, 45),
    placa: 'KZT 418', parqueadero: 'V-01', autorizacion: vigenteHoy },
  { documento: '1026589334', nombre: 'Juan Pablo Rincón', unidad: 'B-0410', anfitrion: 'Liliana Rincón', tipo: 'VISITA', horaIngreso: hoyA(17, 35),
    autorizacion: vigenteHoy },
  { documento: '1015423988', nombre: 'María Fernanda Ortiz', unidad: 'A-0205', anfitrion: 'Jaime Ortiz', tipo: 'VISITA', horaIngreso: hoyA(17, 10),
    autorizacion: vigenteHoy },
  { documento: '1015467201', nombre: 'Laura Camila Pérez', unidad: 'A-0205', anfitrion: 'Jaime Ortiz', tipo: 'VISITA', horaIngreso: hoyA(17, 10),
    autorizacion: vigenteHoy },
  { documento: '1022380146', nombre: 'Alejandra Niño Gil', unidad: 'C-0908', anfitrion: 'Rodrigo Niño', tipo: 'VISITA', horaIngreso: hoyA(16, 50),
    autorizacion: vigenteHoy },
  { documento: '19334871', nombre: 'Hernando Ariza Camacho', unidad: 'A-0401', anfitrion: 'Gloria Ariza', tipo: 'VISITA', horaIngreso: hoyA(16, 30),
    placa: 'GBM 227', parqueadero: 'V-03', autorizacion: vigenteHoy },
  { documento: '41702559', nombre: 'Luz Marina Ospina', unidad: 'A-0401', anfitrion: 'Gloria Ariza', tipo: 'VISITA', horaIngreso: hoyA(16, 30),
    placa: 'GBM 227', parqueadero: 'V-03', autorizacion: vigenteHoy },
  { documento: '39778120', nombre: 'Rocío Amaya Pérez', unidad: 'C-1201', anfitrion: 'Diana Salcedo', tipo: 'EXCEPCION', horaIngreso: hoyA(16, 20),
    autorizacion: { texto: 'Sin autorización previa', detalle: 'Acompaña a la mamá de Diana Salcedo. Ella lo confirmó por citófono.' } },
  { documento: '1030566781', nombre: 'Camilo Ernesto Rueda', unidad: 'C-1006', anfitrion: 'Beatriz Rueda', tipo: 'VISITA', horaIngreso: hoyA(15, 40),
    autorizacion: vigenteHoy },
  { documento: '71655034', nombre: 'Héctor Oviedo Lara', unidad: 'A-0902', anfitrion: 'Marta Oviedo', tipo: 'EXCEPCION', horaIngreso: hoyA(15, 30),
    placa: 'MXR 518', parqueadero: 'V-06', autorizacion: { texto: 'Sin autorización previa', detalle: 'Hermano de Marta Oviedo. Ella lo confirmó por citófono.' } },
  { documento: '1036658210', nombre: 'Sara Lucía Montoya', unidad: 'A-0710', anfitrion: 'Felipe Montoya', tipo: 'VISITA', horaIngreso: hoyA(14, 25),
    autorizacion: vigenteHoy },
]

const PARQUEADEROS_VISITANTES = Array.from({ length: 12 }, (_, i) => `V-${String(i + 1).padStart(2, '0')}`)

// ---------- Autorizaciones de acceso: validarVigenciaDeLaAutorizacion(), validarDiaYHorarioPermitido() ----------

const AUTORIZACIONES = [
  { documento: '1045887332', nombre: 'Camila Restrepo Ariza', unidad: 'B-0302', unidadNombre: 'Torre B · Apto 302',
    estado: 'VIGENTE', tipo: 'VISITA', autorizadaPor: 'Lucía Mendoza', vigenteHasta: hoyA(23, 59), usaParqueaderoVisitantes: true },
  { documento: '52114877', nombre: 'Rosa Elvira Pineda', unidad: 'A-0401', unidadNombre: 'Torre A · Apto 0401',
    estado: 'FUERA_DE_HORARIO', tipo: 'RECURRENTE', autorizadaPor: 'Gloria Ariza',
    motivo: 'Autorización recurrente de lunes a viernes, de 7:00 a. m. a 5:00 p. m., otorgada por Gloria Ariza. Hoy es sábado.' },
]

// ---------- Movimientos recientes ----------

const MOVIMIENTOS_PERSONAS = [
  { id: 'mp1', nombre: 'Mauricio León Gaitán', unidad: 'C-0705', detalle: 'visita', sentido: 'INGRESO', hora: hoyA(19, 52) },
  { id: 'mp2', nombre: 'Domicilio Rappi', unidad: 'A-0902', detalle: 'excepción', sentido: 'SALIDA', hora: hoyA(19, 31) },
  { id: 'mp3', nombre: 'Domicilio Rappi', unidad: 'A-0902', detalle: 'excepción', sentido: 'INGRESO', hora: hoyA(19, 24) },
  { id: 'mp4', nombre: 'Sofía Restrepo', unidad: 'A-0401', detalle: 'residente autorizada', sentido: 'INGRESO', hora: hoyA(19, 2) },
  { id: 'mp5', nombre: 'Técnico Claro', unidad: 'B-0302', detalle: 'visita', sentido: 'SALIDA', hora: hoyA(18, 40) },
]

const MOVIMIENTOS_VEHICULOS = [
  { id: 'mv1', placa: 'HTM 390', unidad: 'C-1201', detalle: 'residente', parqueadero: 'P-157', sentido: 'INGRESO', hora: hoyA(21, 22) },
  { id: 'mv2', placa: 'WEQ 731', unidad: 'A-0401', detalle: 'residente', parqueadero: 'P-064', sentido: 'SALIDA', hora: hoyA(20, 47) },
  { id: 'mv3', placa: 'JKT 512', unidad: 'C-0705', detalle: 'visita', parqueadero: 'V-02', sentido: 'INGRESO', hora: hoyA(19, 52) },
  { id: 'mv4', placa: 'LPC 902', unidad: 'B-0302', detalle: 'visita', parqueadero: 'V-04', sentido: 'SALIDA', hora: hoyA(18, 40) },
  { id: 'mv5', placa: 'EYK 754', unidad: 'B-1105', detalle: 'visita', parqueadero: 'V-11', sentido: 'INGRESO', hora: hoyA(18, 30) },
  { id: 'mv6', placa: 'UFR 903', unidad: 'C-0412', detalle: 'visita', parqueadero: 'V-05', sentido: 'INGRESO', hora: hoyA(18, 20) },
]

// ---------- Vehículos de residentes: Vehiculo con el Inmueble que lo posee y el uso vigente del parqueadero (RN-19) ----------

const VEHICULOS_RESIDENTES = [
  { placa: 'BQA 47F', descripcion: 'Mazda 2 gris', responde: 'Lucía Mendoza', unidad: 'B-0302', unidadNombre: 'Torre B · Apto 302',
    parqueadero: 'P-022', ubicacion: 'Sótano 1', titular: 'Ernesto Vargas, propietario no residente',
    porque: 'Vehículo registrado en B-0302. Parquea en P-022: el uso lo tiene B-0302 por cesión de Ernesto Vargas hasta el 30 de noviembre.',
    uso: 'Torre B · Apto 302, por cesión hasta el 30 de noviembre', estadoUso: 'Cesión vigente, quedan 16 días',
    ultimoMovimiento: { sentido: 'SALIDA', hora: hoyA(17, 20) } },
  { placa: 'WEQ 731', descripcion: 'Renault Duster blanca', responde: 'Gloria Ariza', unidad: 'A-0401', unidadNombre: 'Torre A · Apto 0401',
    parqueadero: 'P-064', ubicacion: 'Sótano 1', titular: 'Gloria Ariza, propietaria residente',
    porque: 'Vehículo registrado en A-0401. Parquea en P-064, que es de A-0401 y no está cedido.',
    uso: 'Torre A · Apto 0401, su titular', estadoUso: 'Uso vigente',
    ultimoMovimiento: { sentido: 'SALIDA', hora: hoyA(20, 47) } },
  { placa: 'HTM 390', descripcion: 'Chevrolet Onix rojo', responde: 'Diana Salcedo', unidad: 'C-1201', unidadNombre: 'Torre C · Apto 1201',
    parqueadero: 'P-157', ubicacion: 'Sótano 2', titular: 'Diana Salcedo, propietaria residente',
    porque: 'Vehículo registrado en C-1201. Parquea en P-157, que es de C-1201.',
    uso: 'Torre C · Apto 1201, su titular', estadoUso: 'Uso vigente',
    ultimoMovimiento: { sentido: 'INGRESO', hora: hoyA(21, 22) } },
]

/** Ingresos vehiculares abiertos: los de residentes con su último movimiento de ingreso y los de las visitas presentes. */
function vehiculosDentro() {
  const dentro = VEHICULOS_RESIDENTES
    .filter((v) => v.ultimoMovimiento.sentido === 'INGRESO')
    .map((v) => ({
      placa: v.placa, quien: `${v.descripcion} · ${v.responde}`, unidad: v.unidad, unidadNombre: v.unidadNombre,
      tipo: 'RESIDENTE', como: 'vehículo de residente', horaIngreso: v.ultimoMovimiento.hora, parqueadero: v.parqueadero,
    }))
  for (const p of PRESENTES) {
    if (!p.placa) continue
    const ya = dentro.find((d) => d.placa === p.placa)
    if (ya) { ya.quien += ` y ${p.nombre}`; continue }
    dentro.push({
      placa: p.placa, quien: p.nombre, unidad: p.unidad, unidadNombre: nombreDeUnidad(p.unidad),
      tipo: p.tipo, como: comoEntro(p), horaIngreso: p.horaIngreso, parqueadero: p.parqueadero,
    })
  }
  return dentro
}

// ---------- Reportes de novedad (CU-15) ----------

const CATEGORIAS_REPORTE = [
  { id: 1, nombre: 'Seguridad', descripcion: 'Persona sospechosa, puerta forzada, alarma' },
  { id: 2, nombre: 'Convivencia y ruido', descripcion: 'Música alta, discusiones, fiestas' },
  { id: 3, nombre: 'Daño en zona común', descripcion: 'Luminaria, ascensor, puerta, piscina' },
  { id: 4, nombre: 'Parqueaderos', descripcion: 'Puesto ocupado, vehículo mal parqueado' },
  { id: 5, nombre: 'Mascotas', descripcion: 'Animal suelto, excrementos sin recoger' },
  { id: 6, nombre: 'Servicios públicos', descripcion: 'Agua, luz, gas, citófono' },
]

const ZONAS_COMUNES = ['Salón social', 'Zona BBQ', 'Cancha múltiple', 'Piscina', 'Portería', 'Torre A', 'Torre B', 'Torre C',
  'Sótano 1', 'Sótano 2']

const NOVEDADES_DEL_TURNO = [
  { id: 'n1', categoria: 'Convivencia y ruido', hora: hoyA(21, 41), inmueble: 'C-0908', conFoto: false, estado: 'ABIERTO',
    descripcion: 'Música a alto volumen en C-0908 desde las 9:30 p. m. Llamaron de C-0808 a quejarse y se le pidió bajar el volumen por citófono.' },
  { id: 'n2', categoria: 'Daño en zona común', hora: hoyA(20, 26), inmueble: 'Zona BBQ', conFoto: true, estado: 'EN_PROCESO',
    descripcion: 'La luminaria del sendero junto a la Zona BBQ está apagada y el paso hacia la Torre C queda oscuro.',
    seguimiento: 'Paula Ortega lo asignó a mantenimiento.' },
  { id: 'n3', categoria: 'Seguridad', hora: hoyA(19, 10), inmueble: 'Torre B', conFoto: true, estado: 'CERRADO',
    descripcion: 'La puerta peatonal de la Torre B no cierra sola y queda entreabierta.',
    seguimiento: 'Solución: mantenimiento ajustó el brazo de cierre a las 8:50 p. m.' },
  { id: 'n4', categoria: 'Mascotas', hora: hoyA(18, 35), inmueble: 'Cancha múltiple', conFoto: false, estado: 'CERRADO',
    descripcion: 'Perro suelto sin correa en la cancha múltiple.',
    seguimiento: 'Solución: lo recogió su dueña, residente de A-0710.' },
]

// ---------- Lo que respondería la API ----------

export const porteriaDeEjemplo = {
  /** GET /porteria/presentes */
  consultarPresentes: () => responder({ actualizadoA: hoyA(22, 0), presentes: PRESENTES }),
  /** GET /porteria/parqueaderos-visitantes: cada puesto con la placa que lo ocupa o null. */
  consultarParqueaderosVisitantes: () => responder(PARQUEADEROS_VISITANTES.map((codigo) => ({
    codigo, placa: PRESENTES.find((p) => p.parqueadero === codigo)?.placa || null,
  }))),
  /** GET /porteria/autorizaciones/{documento}: la autorización de hoy o null. */
  consultarAutorizacion: (documento) => responder(AUTORIZACIONES.find((a) => a.documento === documento) || null),
  /** GET /porteria/movimientos?clase=PERSONA */
  consultarMovimientosPersonas: () => responder(MOVIMIENTOS_PERSONAS),
  /** GET /porteria/movimientos?clase=VEHICULO */
  consultarMovimientosVehiculos: () => responder(MOVIMIENTOS_VEHICULOS),
  /** GET /porteria/vehiculos-residentes */
  consultarVehiculosResidentes: () => responder(VEHICULOS_RESIDENTES),
  /** GET /porteria/vehiculos-dentro */
  consultarVehiculosDentro: () => responder(vehiculosDentro()),
  /** GET /categorias-reporte?estado=ACTIVA */
  consultarCategoriasReporte: () => responder(CATEGORIAS_REPORTE),
  /** GET /inmuebles/zonas-comunes */
  consultarZonasComunes: () => responder(ZONAS_COMUNES),
  /** GET /reportes/turno: lo que reportó el vigilante desde que empezó su turno. */
  consultarNovedadesDelTurno: () => responder({ inicioTurno: hoyA(18, 0), novedades: NOVEDADES_DEL_TURNO }),
}
