// CU-02 Gestionar inmuebles y CU-19 Gestionar tipos de inmueble.
import { pedir } from './cliente.js'

export const inmueblesApi = {
  consultar: () => pedir('/inmuebles'),
  historial: (id) => pedir(`/inmuebles/${id}/historial`),
  registrar: (datos) => pedir('/inmuebles', { metodo: 'POST', cuerpo: datos }),
  modificar: (id, datos) => pedir(`/inmuebles/${id}`, { metodo: 'PUT', cuerpo: datos }),
  desactivar: (id, motivo) => pedir(`/inmuebles/${id}/desactivar`, { metodo: 'PATCH', cuerpo: { motivo } }),
  reactivar: (id) => pedir(`/inmuebles/${id}/reactivar`, { metodo: 'PATCH' }),
}

export const tiposInmuebleApi = {
  consultar: () => pedir('/tipos-inmueble'),
  registrar: (datos) => pedir('/tipos-inmueble', { metodo: 'POST', cuerpo: datos }),
  modificar: (id, datos) => pedir(`/tipos-inmueble/${id}`, { metodo: 'PUT', cuerpo: datos }),
  desactivar: (id) => pedir(`/tipos-inmueble/${id}/desactivar`, { metodo: 'PATCH' }),
}
