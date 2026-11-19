import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router'

import Logo from '../componentes/Logo.jsx'
import { Segmentos } from '../componentes/Basicos.jsx'
import { ROLES, seccionActiva } from './navegacion.js'
import { COPROPIEDAD, useSesion } from './sesion.jsx'
import { useTema } from './tema.js'

/**
 * Barra, navegación del rol y subnavegación de la sección. Si no hay sesión
 * lleva a iniciar sesión; si la ruta es de otro rol, al inicio del propio.
 * clasePagina sirve para la escala de portería ("porteria").
 */
export default function Marco({ rol, clasePagina = '' }) {
  const { sesion, comprobando } = useSesion()
  const { pathname } = useLocation()

  useEffect(() => {
    document.body.className = clasePagina
    return () => { document.body.className = '' }
  }, [clasePagina])

  if (comprobando) return null
  if (!sesion) return <Navigate to="/iniciar-sesion" replace state={{ desde: pathname }} />
  if (sesion.rol !== rol) return <Navigate to={ROLES[sesion.rol].inicio} replace />

  const seccion = seccionActiva(rol, pathname)
  const coincide = (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)

  return (
    <>
      <header className="barra">
        <Link className="marca" to={ROLES[rol].inicio}>
          <Logo />
          <span className="nombre">CONVIVIR</span>
        </Link>
        <nav className="navegacion" aria-label="Secciones">
          {ROLES[rol].navegacion.map((s) => (
            <Link key={s.ruta} to={s.ruta} aria-current={s === seccion ? 'page' : undefined}>{s.nombre}</Link>
          ))}
        </nav>
        <Usuario sesion={sesion} />
      </header>
      {seccion?.sub && (
        <nav className="subnavegacion" aria-label={seccion.nombre}>
          <div className="dentro">
            {seccion.sub.map((s) => (
              <Link key={s.ruta} to={s.ruta} aria-current={coincide(s.ruta) ? 'page' : undefined}>{s.nombre}</Link>
            ))}
          </div>
        </nav>
      )}
      <Outlet />
    </>
  )
}

function Usuario({ sesion }) {
  const { tema, elegirTema, alternar } = useTema()
  const { cerrarSesion } = useSesion()
  const navegar = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef(null)
  const boton = useRef(null)

  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e) => { if (!contenedor.current.contains(e.target)) setAbierto(false) }
    const escape = (e) => { if (e.key === 'Escape') { setAbierto(false); boton.current.focus() } }
    document.addEventListener('click', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('click', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierto])

  const salir = async () => {
    await cerrarSesion()
    navegar('/iniciar-sesion')
  }

  return (
    <div className="usuario">
      <button className="luna" type="button" onClick={alternar} aria-label="Cambiar entre tema claro y oscuro"
        title="Cambiar tema">◐</button>
      <div className="menu-cuenta" ref={contenedor}>
        <button ref={boton} className="cuenta" type="button" aria-haspopup="true" aria-expanded={abierto}
          onClick={() => setAbierto(!abierto)}>
          <span className="avatar">{sesion.iniciales}</span>
          <span className="quien">
            <b>{sesion.persona}</b>
            <span>{sesion.inmuebles ? sesion.inmuebles[0].nombre : COPROPIEDAD}</span>
          </span>
        </button>
        {abierto && (
          <div className="menu" role="menu">
            <div style={{ padding: 'var(--e2) var(--e3) var(--e3)' }}>
              <div className="fuerte">{sesion.persona}</div>
              <div className="guia">{sesion.cargo} · {COPROPIEDAD}</div>
            </div>
            {sesion.inmuebles && (
              <>
                <hr />
                <div className="titulo-menu">Tus inmuebles</div>
                {sesion.inmuebles.map((i) => (
                  <button key={i.nombre} type="button" role="menuitem">
                    <span><span className="identificador">{i.nombre}</span><br /><small className="guia">{i.vinculo}</small></span>
                    {i.actual && <span className="pildora p-az">Actual</span>}
                  </button>
                ))}
              </>
            )}
            <hr />
            <div className="titulo-menu">Tema</div>
            <div style={{ margin: '0 var(--e3) var(--e2)', display: 'flex' }}>
              <Segmentos etiqueta="Tema" valor={tema} alCambiar={elegirTema}
                opciones={[{ valor: 'light', texto: 'Claro' }, { valor: 'dark', texto: 'Oscuro' }, { valor: 'auto', texto: 'Sistema' }]} />
            </div>
            <hr />
            <button type="button" role="menuitem" onClick={salir}>Cerrar sesión</button>
          </div>
        )}
      </div>
    </div>
  )
}
