import { Link } from 'react-router'

import { Vacio } from '../componentes/Basicos.jsx'

export default function NoEncontrada() {
  return (
    <main className="pagina angosta">
      <div className="superficie">
        <Vacio titulo="Esta página no existe"
          accion={<Link className="btn" to="/">Ir al inicio</Link>}>
          Revisa la dirección o vuelve al inicio para seguir desde el menú.
        </Vacio>
      </div>
    </main>
  )
}
