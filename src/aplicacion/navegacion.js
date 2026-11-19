// Qué ve cada rol en la barra. Las rutas son las mismas de las vistas del sistema de diseño.

export const ROLES = {
  administrador: {
    inicio: '/administrador/inicio',
    navegacion: [
      { nombre: 'Inicio', ruta: '/administrador/inicio' },
      { nombre: 'Inmuebles', ruta: '/administrador/inmuebles', sub: [
        { nombre: 'Inmuebles', ruta: '/administrador/inmuebles' },
        { nombre: 'Tipos de inmueble', ruta: '/administrador/tipos-inmueble' },
        { nombre: 'Parqueaderos y cesiones', ruta: '/administrador/parqueaderos' },
        { nombre: 'Vehículos', ruta: '/administrador/vehiculos' },
      ] },
      { nombre: 'Personas', ruta: '/administrador/personas' },
      { nombre: 'Cartera', ruta: '/administrador/obligaciones', sub: [
        { nombre: 'Obligaciones', ruta: '/administrador/obligaciones' },
        { nombre: 'Registrar pago', ruta: '/administrador/pago-presencial' },
        { nombre: 'Estado de cartera', ruta: '/administrador/cartera' },
      ] },
      { nombre: 'Reservas', ruta: '/administrador/reservas' },
      { nombre: 'Reportes', ruta: '/administrador/reportes' },
      { nombre: 'Administración', ruta: '/administrador/usuarios', sub: [
        { nombre: 'Usuarios y roles', ruta: '/administrador/usuarios' },
        { nombre: 'Auditoría', ruta: '/administrador/auditoria' },
        { nombre: 'Notificaciones', ruta: '/administrador/notificaciones' },
        { nombre: 'Copropiedad', ruta: '/administrador/copropiedad' },
      ] },
    ],
  },
  vigilante: {
    inicio: '/vigilante/porteria',
    navegacion: [
      { nombre: 'Personas', ruta: '/vigilante/porteria' },
      { nombre: 'Vehículos', ruta: '/vigilante/vehiculos' },
      { nombre: 'Dentro del conjunto', ruta: '/vigilante/presentes' },
      { nombre: 'Reportar novedad', ruta: '/vigilante/reportar' },
    ],
  },
  residente: {
    inicio: '/residente/inicio',
    navegacion: [
      { nombre: 'Inicio', ruta: '/residente/inicio' },
      { nombre: 'Visitas', ruta: '/residente/visitas' },
      { nombre: 'Pagos', ruta: '/residente/pagos' },
      { nombre: 'Reservas', ruta: '/residente/reservas' },
      { nombre: 'Reportes', ruta: '/residente/reportes' },
      { nombre: 'Vehículos', ruta: '/residente/vehiculos' },
    ],
  },
  consejo: {
    inicio: '/consejo/cartera',
    navegacion: [
      { nombre: 'Cartera', ruta: '/consejo/cartera' },
      { nombre: 'Auditoría', ruta: '/consejo/auditoria' },
    ],
  },
}

/** La sección activa es la que tiene la ruta actual, o una de sus subrutas, como prefijo. */
export function seccionActiva(rol, ruta) {
  const coincide = (r) => ruta === r || ruta.startsWith(`${r}/`)
  return ROLES[rol]?.navegacion.find((s) => coincide(s.ruta) || s.sub?.some((sub) => coincide(sub.ruta)))
}
