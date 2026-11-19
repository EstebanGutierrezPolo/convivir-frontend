// Datos de ejemplo de CU-03 (personas), CU-08 (vehículos) y CU-09 (parqueaderos y cesiones).
// Cada función devuelve una promesa con la forma que tendría la respuesta de la API:
// para conectarla basta con cambiar la función por la llamada al cliente.

/** Día de referencia de los datos de ejemplo: las fechas de las cesiones se cuentan desde aquí. */
export const HOY = '2026-11-14'

const copia = (datos) => Promise.resolve(structuredClone(datos))

// ---------- Inmuebles que aparecen en las tres pantallas ----------

// ocupante: quién lo ocupa o es su titular; vinculados: personas con vinculación vigente.
const INMUEBLES = [
  { identificacion: 'A-0401', ocupante: 'Gloria Ariza', vinculados: ['Gloria Ariza', 'Sofía Restrepo Ariza'] },
  { identificacion: 'A-0703', ocupante: 'Inversiones Lomas del Norte S.A.S.', vinculados: [] },
  { identificacion: 'A-0902', ocupante: 'Marta Oviedo', vinculados: ['Marta Oviedo'] },
  { identificacion: 'A-1104', ocupante: 'Sin ocupante', vinculados: ['Jorge Peñaranda'] },
  { identificacion: 'B-0302', ocupante: 'Lucía Mendoza', vinculados: ['Lucía Mendoza', 'Ernesto Vargas'] },
  { identificacion: 'C-0310', ocupante: 'Hernán Ruiz', vinculados: ['Hernán Ruiz'] },
  { identificacion: 'C-0402', ocupante: 'Ricardo Lozano', vinculados: ['Ricardo Lozano'] },
  { identificacion: 'C-0705', ocupante: 'Andrés Caicedo', vinculados: ['Andrés Caicedo'] },
  { identificacion: 'C-1201', ocupante: 'Diana Salcedo', vinculados: ['Diana Salcedo'] },
]

// ---------- CU-08 Vehículos ----------

// Vehiculo: placa, tipoVehiculo, marca, color, estado, motivoBaja; el inmueble lo posee y un integrante responde por él.
const VEHICULOS = [
  { placa: 'BQA 47F', tipoVehiculo: 'Carro', marca: 'Mazda 2', color: 'Gris', inmueble: 'B-0302', responsable: 'Lucía Mendoza', estado: 'ACTIVO' },
  { placa: 'HZM 908', tipoVehiculo: 'Camioneta', marca: 'Toyota Fortuner', color: 'Negro', inmueble: 'A-0902', responsable: 'Marta Oviedo', estado: 'ACTIVO' },
  { placa: 'RTY 22E', tipoVehiculo: 'Moto', marca: 'Yamaha NMAX', color: 'Azul', inmueble: 'A-0401', responsable: 'Sofía Restrepo Ariza', estado: 'ACTIVO' },
  { placa: 'DFG 761', tipoVehiculo: 'Carro', marca: 'Kia Picanto', color: 'Blanco', inmueble: 'A-0401', responsable: 'Gloria Ariza', estado: 'ACTIVO' },
  { placa: 'KLP 334', tipoVehiculo: 'Carro', marca: 'Chevrolet Onix', color: 'Rojo', inmueble: 'C-1201', responsable: 'Diana Salcedo', estado: 'ACTIVO' },
  { placa: 'LMN 604', tipoVehiculo: 'Carro', marca: 'Renault Logan', color: 'Plata', inmueble: 'C-0705', responsable: 'Andrés Caicedo', estado: 'ACTIVO' },
  { placa: 'GTR 219', tipoVehiculo: 'Camioneta', marca: 'Mazda CX-5', color: 'Gris', inmueble: 'A-0703', responsable: '', estado: 'ACTIVO' },
  { placa: 'SXB 77D', tipoVehiculo: 'Moto', marca: 'Honda CB 190', color: 'Negro', inmueble: 'C-0310', responsable: 'Hernán Ruiz', estado: 'ACTIVO' },
  { placa: 'UVW 913', tipoVehiculo: 'Carro', marca: 'Chevrolet Spark', color: 'Rojo', inmueble: 'B-0302', responsable: 'Carlos Ibáñez', estado: 'INACTIVO', motivoBaja: 'Se fue con el arrendatario anterior en febrero de 2026.' },
  { placa: 'MNB 120', tipoVehiculo: 'Carro', marca: 'Hyundai i10', color: 'Blanco', inmueble: 'A-1104', responsable: 'Jorge Peñaranda', estado: 'INACTIVO', motivoBaja: 'Lo vendió en agosto de 2026.' },
]

export const vehiculosEjemplo = {
  /** GET /vehiculos: la primera página, los activos que no caben en ella y los inmuebles para registrar. */
  consultar: () => copia({
    vehiculos: VEHICULOS,
    otrosActivos: 206,
    inmuebles: INMUEBLES.map((i) => ({ identificacion: i.identificacion, vinculados: i.vinculados })),
  }),
}

// ---------- CU-09 Parqueaderos y cesiones ----------

// Parqueaderos: el inmueble del titular es el que lo usa cuando no hay cesión.
const PARQUEADEROS = [
  { identificacion: 'P-022', ubicacion: 'Sótano 1', naturaleza: 'BIEN_PRIVADO', titular: 'Ernesto Vargas', unidad: 'B-0302', vehiculo: '' },
  { identificacion: 'P-045', ubicacion: 'Sótano 1', naturaleza: 'BIEN_PRIVADO', titular: 'Marta Oviedo', unidad: 'A-0902', vehiculo: 'HZM 908' },
  { identificacion: 'P-061', ubicacion: 'Sótano 1', naturaleza: 'BIEN_PRIVADO', titular: 'Gloria Ariza', unidad: 'A-0401', vehiculo: '' },
  { identificacion: 'P-088', ubicacion: 'Sótano 1', naturaleza: 'BIEN_PRIVADO', titular: 'Jorge Peñaranda', unidad: 'A-1104', vehiculo: '' },
  { identificacion: 'P-102', ubicacion: 'Sótano 2', naturaleza: 'BIEN_PRIVADO', titular: 'Diana Salcedo', unidad: 'C-1201', vehiculo: 'KLP 334' },
  { identificacion: 'P-130', ubicacion: 'Sótano 2', naturaleza: 'BIEN_PRIVADO', titular: 'Inversiones Lomas del Norte S.A.S.', unidad: 'A-0703', vehiculo: 'GTR 219' },
  { identificacion: 'P-140', ubicacion: 'Sótano 2', naturaleza: 'BIEN_PRIVADO', titular: 'Ricardo Lozano', unidad: 'C-0402', vehiculo: '' },
  { identificacion: 'P-151', ubicacion: 'Sótano 2', naturaleza: 'BIEN_PRIVADO', titular: 'Gloria Ariza', unidad: 'A-0401', vehiculo: 'DFG 761' },
  { identificacion: 'UE-03', ubicacion: 'Sótano 1', naturaleza: 'USO_EXCLUSIVO', titular: 'Asignado a C-0310', unidad: 'C-0310', vehiculo: 'SXB 77D' },
  { identificacion: 'UE-05', ubicacion: 'Sótano 2', naturaleza: 'USO_EXCLUSIVO', titular: 'Asignado a C-0705', unidad: 'C-0705', vehiculo: '' },
  { identificacion: 'V-01', ubicacion: 'Portería principal', naturaleza: 'USO_GENERAL', titular: 'Bien común', visita: { placa: 'EFR 330', unidad: 'A-0401', desde: '6:15 p. m.' } },
  { identificacion: 'V-02', ubicacion: 'Portería principal', naturaleza: 'USO_GENERAL', titular: 'Bien común', visita: { placa: 'JKT 512', unidad: 'C-0705', desde: '7:52 p. m.' } },
  { identificacion: 'V-04', ubicacion: 'Portería principal', naturaleza: 'USO_GENERAL', titular: 'Bien común' },
  { identificacion: 'V-07', ubicacion: 'Portería principal', naturaleza: 'USO_GENERAL', titular: 'Bien común' },
]

// Inmuebles que se pueden elegir como "Inmueble que cede", con su TipoInmueble y si permite cesión (RN-17).
const CEDIBLES = [
  { grupo: 'Parqueaderos privados', identificacion: 'P-022', titular: 'Ernesto Vargas' },
  { grupo: 'Parqueaderos privados', identificacion: 'P-045', titular: 'Marta Oviedo' },
  { grupo: 'Parqueaderos privados', identificacion: 'P-061', titular: 'Gloria Ariza' },
  { grupo: 'Parqueaderos privados', identificacion: 'P-088', titular: 'Jorge Peñaranda' },
  { grupo: 'Parqueaderos privados', identificacion: 'P-102', titular: 'Diana Salcedo' },
  { grupo: 'Parqueaderos privados', identificacion: 'P-130', titular: 'Inversiones Lomas del Norte S.A.S.' },
  { grupo: 'Parqueaderos privados', identificacion: 'P-140', titular: 'Ricardo Lozano' },
  { grupo: 'Parqueaderos privados', identificacion: 'P-151', titular: 'Gloria Ariza' },
  { grupo: 'Depósitos', identificacion: 'D-014', titular: 'uso exclusivo de A-0902' },
  { grupo: 'Depósitos', identificacion: 'D-021', titular: 'Diana Salcedo' },
  { grupo: 'Parqueaderos de visitantes', identificacion: 'V-04', titular: 'bien común' },
].map((c) => ({
  ...c,
  tipoInmueble: { P: 'Parqueadero', D: 'Depósito', V: 'Parqueadero de visitantes' }[c.identificacion.charAt(0)],
  permiteCesion: c.identificacion.startsWith('P-'),
}))

// CesionUso: fechaInicio, fechaFin, estado; inmueble que cede, inmueble que usa y vehículo amparado (0..1).
// fechaPactada: el fin acordado cuando se finalizó antes.
const CESIONES = [
  { id: 1, cede: 'P-022', usa: 'B-0302', fechaInicio: '2026-09-01', fechaFin: '2026-11-30', vehiculo: 'BQA 47F', estado: 'VIGENTE' },
  { id: 2, cede: 'P-061', usa: 'C-0705', fechaInicio: '2026-10-01', fechaFin: '2027-03-31', vehiculo: 'LMN 604', estado: 'VIGENTE' },
  { id: 3, cede: 'P-088', usa: 'C-1201', fechaInicio: '2026-07-01', fechaFin: '2026-12-31', vehiculo: '', estado: 'VIGENTE' },
  { id: 4, cede: 'P-140', usa: 'A-0401', fechaInicio: '2026-08-15', fechaFin: '2027-02-14', vehiculo: 'RTY 22E', estado: 'VIGENTE' },
  { id: 5, cede: 'P-022', usa: 'B-0302', fechaInicio: '2026-03-01', fechaFin: '2026-08-31', vehiculo: 'BQA 47F', estado: 'FINALIZADA' },
  { id: 6, cede: 'P-088', usa: 'A-0902', fechaInicio: '2025-11-01', fechaFin: '2026-06-30', vehiculo: '', estado: 'FINALIZADA' },
  { id: 7, cede: 'P-061', usa: 'C-1201', fechaInicio: '2025-01-10', fechaFin: '2025-09-30', fechaPactada: '2025-12-31', vehiculo: 'KLP 334', estado: 'FINALIZADA' },
]

export const parqueaderosEjemplo = {
  /** GET /parqueaderos: ocupación, parqueaderos con su uso vigente, cesiones y lo que pide el registro. */
  consultar: () => copia({
    ocupacion: {
      privados: 180,
      usoExclusivo: 8,
      visitantes: 12,
      visitantesOcupados: 8,
      visitantesLibres: ['V-04', 'V-07', 'V-09', 'V-12'],
      totalParqueaderos: 200,
    },
    parqueaderos: PARQUEADEROS,
    cesiones: CESIONES,
    cedibles: CEDIBLES,
    // Inmuebles que pueden usar un parqueadero: quién vive ahí y sus vehículos activos.
    unidades: INMUEBLES.map((i) => ({
      identificacion: i.identificacion,
      ocupante: i.ocupante,
      vehiculos: VEHICULOS.filter((v) => v.inmueble === i.identificacion && v.estado === 'ACTIVO')
        .map((v) => ({ placa: v.placa, descripcion: `${v.marca} ${v.color.toLowerCase()}` })),
    })),
  }),
}

// ---------- CU-03 Personas ----------

// Integrante (campos comunes) y lo propio de su subclase en "propios".
// Las vinculaciones no tienen tipo: el vínculo se lee del rol y de esResidente.
const PERSONAS = [
  { id: 1, tipoDocumento: 'CC', documento: '1020456789', nombres: 'Paula', apellidos: 'Ortega Lince', rol: 'EMPLEADO', genero: 'F', fechaNacimiento: '1986-05-21', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Calle 76 # 54-21, apto 302', telefono: '300 412 5578', correo: 'paula.ortega@villacampestre.co', cuenta: 'ACTIVA', estado: 'ACTIVO',
    propios: { cargo: 'ADMINISTRADOR', ingreso: '2024-01-15' }, vinculos: [] },
  { id: 2, tipoDocumento: 'CC', documento: '80245117', nombres: 'Jhon', apellidos: 'Rojas Mercado', rol: 'EMPLEADO', genero: 'M', fechaNacimiento: '1990-09-03', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Carrera 21 # 45-08, barrio Rebolo', telefono: '301 778 2290', correo: 'jhon.rojas@correo.co', cuenta: 'ACTIVA', estado: 'ACTIVO',
    propios: { cargo: 'VIGILANTE', ingreso: '2025-06-01', empresa: 'Vigilancia Costa Segura Ltda.', turno: 'Noche, de 6:00 p. m. a 6:00 a. m.' }, vinculos: [] },
  { id: 3, tipoDocumento: 'CC', documento: '19456230', nombres: 'Hernán', apellidos: 'Ruiz Cabrales', rol: 'CONSEJO', genero: 'M', fechaNacimiento: '1958-02-11', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Villa Campestre, Torre C, apto 310', telefono: '315 600 1144', correo: 'hernan.ruiz@correo.co', cuenta: 'ACTIVA', estado: 'ACTIVO',
    propios: { cargo: 'Tesorero', inicio: '2026-03-28', fin: '2027-03-27' }, vinculos: [{ inmueble: 'C-0310', residente: true, desde: '2014-06-01' }] },
  { id: 4, tipoDocumento: 'CC', documento: '1032418765', nombres: 'Lucía', apellidos: 'Mendoza Ríos', rol: 'ARRENDATARIO', genero: 'F', fechaNacimiento: '1992-11-30', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Villa Campestre, Torre B, apto 302', telefono: '304 215 9087', correo: 'lucia.mendoza@correo.co', cuenta: 'ACTIVA', estado: 'ACTIVO',
    propios: { contrato: 'ARR-2026-0187' }, vinculos: [{ inmueble: 'B-0302', residente: true, desde: '2026-03-01', autoriza: true }] },
  { id: 5, tipoDocumento: 'CC', documento: '79312554', nombres: 'Ernesto', apellidos: 'Vargas Pinedo', rol: 'PROPIETARIO', genero: 'M', fechaNacimiento: '1961-07-14', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Calle 84 # 45-30, apto 801', telefono: '310 455 2011', correo: 'ernesto.vargas@correo.co', cuenta: 'ACTIVA', estado: 'ACTIVO',
    propios: { correspondencia: 'Calle 84 # 45-30, apto 801, Barranquilla' }, vinculos: [{ inmueble: 'B-0302', residente: false, desde: '2019-03-12', porcentaje: 100 }, { inmueble: 'P-022', residente: false, desde: '2019-03-12', porcentaje: 100 }] },
  { id: 6, tipoDocumento: 'CC', documento: '17189003', nombres: 'Jorge', apellidos: 'Peñaranda Gil', rol: 'PROPIETARIO', genero: 'M', fechaNacimiento: '1955-01-20', pais: 'Colombia', ciudad: 'Bogotá', direccion: 'Carrera 11 # 93-40, apto 502', telefono: '312 980 4471', correo: 'jorge.penaranda@correo.co', cuenta: '', estado: 'ACTIVO',
    propios: { correspondencia: 'Carrera 11 # 93-40, apto 502, Bogotá' }, vinculos: [{ inmueble: 'A-1104', residente: false, desde: '2017-08-01', porcentaje: 100 }, { inmueble: 'P-088', residente: false, desde: '2017-08-01', porcentaje: 100 }] },
  { id: 7, tipoDocumento: 'CC', documento: '41765882', nombres: 'Marta', apellidos: 'Oviedo Lara', rol: 'PROPIETARIO', genero: 'F', fechaNacimiento: '1968-04-02', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Villa Campestre, Torre A, apto 902', telefono: '300 118 6623', correo: 'marta.oviedo@correo.co', cuenta: 'ACTIVA', estado: 'ACTIVO',
    propios: { correspondencia: 'Villa Campestre, Torre A, apto 902' }, vinculos: [{ inmueble: 'A-0902', residente: true, desde: '2012-05-10', porcentaje: 100 }, { inmueble: 'P-045', residente: false, desde: '2012-05-10', porcentaje: 100 }] },
  { id: 8, tipoDocumento: 'CC', documento: '51902334', nombres: 'Gloria', apellidos: 'Ariza Daza', rol: 'PROPIETARIO', genero: 'F', fechaNacimiento: '1972-10-08', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Villa Campestre, Torre A, apto 401', telefono: '317 334 0981', correo: 'gloria.ariza@correo.co', cuenta: 'ACTIVA', estado: 'ACTIVO',
    propios: { correspondencia: 'Villa Campestre, Torre A, apto 401' }, vinculos: [{ inmueble: 'A-0401', residente: true, desde: '2015-02-20', porcentaje: 100 }, { inmueble: 'P-061', residente: false, desde: '2015-02-20', porcentaje: 100 }, { inmueble: 'P-151', residente: false, desde: '2015-02-20', porcentaje: 100 }] },
  { id: 9, tipoDocumento: 'CC', documento: '1001238417', nombres: 'Sofía', apellidos: 'Restrepo Ariza', rol: 'RESIDENTE', genero: 'F', fechaNacimiento: '2003-06-19', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Villa Campestre, Torre A, apto 401', telefono: '318 562 7740', correo: 'sofia.restrepo@correo.co', cuenta: 'ACTIVA', estado: 'ACTIVO',
    propios: { parentesco: 'Hijo o hija' }, vinculos: [{ inmueble: 'A-0401', residente: true, desde: '2021-06-19' }] },
  { id: 10, tipoDocumento: 'CC', documento: '1018447920', nombres: 'Andrés', apellidos: 'Caicedo Polo', rol: 'ARRENDATARIO', genero: 'M', fechaNacimiento: '1989-12-05', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Villa Campestre, Torre C, apto 705', telefono: '305 871 3302', correo: 'andres.caicedo@correo.co', cuenta: 'ACTIVA', estado: 'ACTIVO',
    propios: { contrato: 'ARR-2025-0342' }, vinculos: [{ inmueble: 'C-0705', residente: true, desde: '2025-09-01', autoriza: true }] },
  { id: 11, tipoDocumento: 'CC', documento: '52640118', nombres: 'Diana', apellidos: 'Salcedo Vega', rol: 'PROPIETARIO', genero: 'F', fechaNacimiento: '1979-03-27', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Villa Campestre, Torre C, apto 1201', telefono: '316 204 5518', correo: 'diana.salcedo@correo.co', cuenta: 'BLOQUEADA', estado: 'ACTIVO',
    propios: { correspondencia: 'Villa Campestre, Torre C, apto 1201' }, vinculos: [{ inmueble: 'C-1201', residente: true, desde: '2016-11-01', porcentaje: 100 }, { inmueble: 'P-102', residente: false, desde: '2016-11-01', porcentaje: 100 }] },
  { id: 12, tipoDocumento: 'NIT', documento: '9004123375', razonSocial: 'Inversiones Lomas del Norte S.A.S.', rol: 'PROPIETARIO', genero: '', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Carrera 53 # 98-120, oficina 704', telefono: '605 385 7720', correo: 'contabilidad@lomasdelnorte.co', cuenta: '', estado: 'ACTIVO',
    propios: { correspondencia: 'Carrera 53 # 98-120, oficina 704, Barranquilla' }, vinculos: [{ inmueble: 'A-0703', residente: false, desde: '2020-01-15', porcentaje: 100 }, { inmueble: 'P-130', residente: false, desde: '2020-01-15', porcentaje: 100 }] },
  { id: 13, tipoDocumento: 'CC', documento: '79640215', nombres: 'Ricardo', apellidos: 'Lozano Pérez', rol: 'PROPIETARIO', genero: 'M', fechaNacimiento: '1975-08-22', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Villa Campestre, Torre C, apto 402', telefono: '311 640 2215', correo: 'ricardo.lozano@correo.co', cuenta: 'ACTIVA', estado: 'ACTIVO',
    propios: { correspondencia: 'Villa Campestre, Torre C, apto 402' }, vinculos: [{ inmueble: 'C-0402', residente: true, desde: '2022-04-01', porcentaje: 100 }, { inmueble: 'P-140', residente: false, desde: '2022-04-01', porcentaje: 100 }] },
  { id: 14, tipoDocumento: 'CC', documento: '1032556908', nombres: 'Natalia', apellidos: 'Mendoza Ríos', rol: 'RESIDENTE', genero: 'F', fechaNacimiento: '1996-02-14', pais: 'Colombia', ciudad: 'Barranquilla', direccion: 'Villa Campestre, Torre B, apto 302', telefono: '304 902 1176', correo: 'natalia.mendoza@correo.co', cuenta: '', estado: 'ACTIVO',
    propios: { parentesco: 'Hermano o hermana' }, vinculos: [] },
  { id: 15, tipoDocumento: 'CC', documento: '80112976', nombres: 'Carlos', apellidos: 'Ibáñez Rueda', rol: 'ARRENDATARIO', genero: 'M', fechaNacimiento: '1984-03-09', pais: 'Colombia', ciudad: 'Santa Marta', direccion: 'Calle 22 # 3-41, El Rodadero', telefono: '300 655 4410', correo: 'carlos.ibanez@correo.co', cuenta: 'INACTIVA', estado: 'INACTIVO',
    fechaDesactivacion: '2026-03-02', motivo: 'Terminó su contrato de arriendo de B-0302 el 28 de febrero de 2026 y se fue del conjunto.',
    propios: { contrato: 'ARR-2023-0044' }, vinculos: [{ inmueble: 'B-0302', residente: true, desde: '2023-02-01', hasta: '2026-02-28' }] },
]

export const personasEjemplo = {
  /** GET /integrantes: la primera página y cuántas personas quedan en las siguientes. */
  consultar: () => copia({ personas: PERSONAS, otrasActivas: 438, otrasDesactivadas: 33 }),
}
