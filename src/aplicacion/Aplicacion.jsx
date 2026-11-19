import { Navigate, Route, Routes } from 'react-router'

import Marco from './Marco.jsx'
import { ROLES } from './navegacion.js'
import { useSesion } from './sesion.jsx'

import IniciarSesion from '../paginas/IniciarSesion.jsx'
import NoEncontrada from '../paginas/NoEncontrada.jsx'

import AdminInicio from '../paginas/administrador/Inicio.jsx'
import Inmuebles from '../paginas/administrador/Inmuebles.jsx'
import Inmueble from '../paginas/administrador/Inmueble.jsx'
import TiposInmueble from '../paginas/administrador/TiposInmueble.jsx'
import Parqueaderos from '../paginas/administrador/Parqueaderos.jsx'
import AdminVehiculos from '../paginas/administrador/Vehiculos.jsx'
import Personas from '../paginas/administrador/Personas.jsx'
import Obligaciones from '../paginas/administrador/Obligaciones.jsx'
import PagoPresencial from '../paginas/administrador/PagoPresencial.jsx'
import Cartera from '../paginas/administrador/Cartera.jsx'
import AdminReservas from '../paginas/administrador/Reservas.jsx'
import AdminReportes from '../paginas/administrador/Reportes.jsx'
import Usuarios from '../paginas/administrador/Usuarios.jsx'
import Auditoria from '../paginas/administrador/Auditoria.jsx'
import Notificaciones from '../paginas/administrador/Notificaciones.jsx'
import Copropiedad from '../paginas/administrador/Copropiedad.jsx'

import Porteria from '../paginas/vigilante/Porteria.jsx'
import PorteriaVehiculos from '../paginas/vigilante/Vehiculos.jsx'
import Presentes from '../paginas/vigilante/Presentes.jsx'
import Reportar from '../paginas/vigilante/Reportar.jsx'

import ResidenteInicio from '../paginas/residente/Inicio.jsx'
import Visitas from '../paginas/residente/Visitas.jsx'
import Pagos from '../paginas/residente/Pagos.jsx'
import ResidenteReservas from '../paginas/residente/Reservas.jsx'
import ResidenteReportes from '../paginas/residente/Reportes.jsx'
import ResidenteVehiculos from '../paginas/residente/Vehiculos.jsx'

/** Rutas de la aplicación. Cada rol tiene su marco; el consejo reutiliza pantallas del administrador en modo consulta. */
export default function Aplicacion() {
  const { sesion, comprobando } = useSesion()

  // Mientras el backend confirma si hay sesión, no se decide a dónde llevar al usuario.
  if (comprobando) return null

  return (
    <Routes>
      <Route path="/" element={<Navigate to={sesion ? ROLES[sesion.rol].inicio : '/iniciar-sesion'} replace />} />
      <Route path="/iniciar-sesion" element={<IniciarSesion />} />

      <Route path="/administrador" element={<Marco rol="administrador" />}>
        <Route path="inicio" element={<AdminInicio />} />
        <Route path="inmuebles" element={<Inmuebles />} />
        <Route path="inmuebles/:id" element={<Inmueble />} />
        <Route path="tipos-inmueble" element={<TiposInmueble />} />
        <Route path="parqueaderos" element={<Parqueaderos />} />
        <Route path="vehiculos" element={<AdminVehiculos />} />
        <Route path="personas" element={<Personas />} />
        <Route path="obligaciones" element={<Obligaciones />} />
        <Route path="pago-presencial" element={<PagoPresencial />} />
        <Route path="cartera" element={<Cartera />} />
        <Route path="reservas" element={<AdminReservas />} />
        <Route path="reportes" element={<AdminReportes />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="auditoria" element={<Auditoria />} />
        <Route path="notificaciones" element={<Notificaciones />} />
        <Route path="copropiedad" element={<Copropiedad />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>

      <Route path="/vigilante" element={<Marco rol="vigilante" clasePagina="porteria" />}>
        <Route path="porteria" element={<Porteria />} />
        <Route path="vehiculos" element={<PorteriaVehiculos />} />
        <Route path="presentes" element={<Presentes />} />
        <Route path="reportar" element={<Reportar />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>

      <Route path="/residente" element={<Marco rol="residente" />}>
        <Route path="inicio" element={<ResidenteInicio />} />
        <Route path="visitas" element={<Visitas />} />
        <Route path="pagos" element={<Pagos />} />
        <Route path="reservas" element={<ResidenteReservas />} />
        <Route path="reportes" element={<ResidenteReportes />} />
        <Route path="vehiculos" element={<ResidenteVehiculos />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>

      <Route path="/consejo" element={<Marco rol="consejo" />}>
        <Route path="cartera" element={<Cartera soloConsulta />} />
        <Route path="auditoria" element={<Auditoria soloConsulta />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>

      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  )
}
