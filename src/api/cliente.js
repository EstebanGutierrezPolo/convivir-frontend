// Cliente de la API de Convivir. Todo va por /api, que Vite reenvía al backend.
// El backend responde los errores como {"error": "mensaje"} con 400, 404, 409 o 422.

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje)
    this.estado = estado
  }
}

export async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  let respuesta
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
  } catch {
    throw new ErrorApi('No hay conexión con el servidor. Revisa tu internet o vuelve a intentarlo en un momento.', 0)
  }
  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null)
  if (respuesta.status === 401 && !ruta.startsWith('/sesion')) {
    // La sesión venció o se cerró en otra pestaña: la aplicación vuelve a iniciar sesión.
    window.dispatchEvent(new Event('convivir:sesion-vencida'))
  }
  if (!respuesta.ok) {
    throw new ErrorApi(datos?.error || `El servidor respondió con un error (${respuesta.status}). Vuelve a intentarlo.`,
      respuesta.status)
  }
  return datos
}
