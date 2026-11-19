// CU-01 Iniciar sesión. La sesión vive en una cookie del servidor (JSESSIONID) que el JavaScript no lee.
import { pedir } from './cliente.js'

export const sesionApi = {
  consultar: () => pedir('/sesion'),
  iniciar: (login, contrasena) => pedir('/sesion', { metodo: 'POST', cuerpo: { login, contrasena } }),
  cerrar: () => pedir('/sesion', { metodo: 'DELETE' }),
  solicitarRestablecimiento: (login) => pedir('/sesion/restablecimiento', { metodo: 'POST', cuerpo: { login } }),
}
