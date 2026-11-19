import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { copropiedadDeEjemplo } from '../../datos/administracion.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// RF-106 Configurar los datos de la copropiedad:
// PropiedadHorizontal.configurarDatosGeneralesDeLaCopropiedad(nit, nombre, direccion, correoContacto, telefonoContacto).
// Resumen en solo lectura: PropiedadHorizontal "1" o-- "*" Inmueble : administra.
// Sin API todavía: datos de ejemplo de src/datos/administracion.js.

const CAMPOS = ['nombre', 'nit', 'telefonoContacto', 'direccion', 'correoContacto']
const OBLIGATORIOS = {
  nombre: 'Escribe el nombre como aparece en el certificado de existencia y representación legal.',
  nit: 'Escribe el NIT con su dígito de verificación, por ejemplo 900482317-1.',
  telefonoContacto: 'Escribe un teléfono de la administración, fijo o celular.',
  direccion: 'Escribe la dirección de la copropiedad con la ciudad.',
  correoContacto: 'Escribe el correo de la administración. Desde ahí se responden los avisos.',
}

/** Dígito de verificación del NIT (DIAN, módulo 11). */
function digitoVerificacion(numero) {
  const factores = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
  const suma = numero.split('').reverse().reduce((total, d, i) => total + Number(d) * factores[i], 0)
  const resto = suma % 11
  return resto > 1 ? 11 - resto : resto
}

const soloDatos = (copropiedad) => Object.fromEntries(CAMPOS.map((c) => [c, copropiedad[c]]))

export default function Copropiedad() {
  const consulta = useConsulta(() => copropiedadDeEjemplo.consultar())
  const confirmar = useConfirmar()
  const formulario = useRef(null)
  const [guardados, setGuardados] = useState(null)
  const [valores, setValores] = useState(null)
  const [errores, setErrores] = useState({})

  const base = guardados || (consulta.datos && soloDatos(consulta.datos))
  const actuales = valores || base
  const hayCambios = !!base && CAMPOS.some((c) => actuales[c] !== base[c])

  // Avisa antes de salir de la página con cambios sin guardar.
  useEffect(() => {
    if (!hayCambios) return undefined
    const avisar = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [hayCambios])

  if (!consulta.datos) {
    return (
      <main className="pagina">
        <AvisoDatosDeEjemplo casoDeUso="RF-106" />
        <Encabezado titulo="Datos de la copropiedad" />
        <div className="superficie">
          {consulta.error ? <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /> : <Cargando texto="Cargando la copropiedad…" />}
        </div>
      </main>
    )
  }

  const copropiedad = consulta.datos

  const poner = (campo) => (e) => {
    setValores({ ...actuales, [campo]: e.target.value })
    if (errores[campo] && e.target.value.trim()) setErrores({ ...errores, [campo]: null })
  }

  const enfocarPrimerError = () => requestAnimationFrame(() => formulario.current?.querySelector('[aria-invalid="true"]')?.focus())

  const guardar = (e) => {
    e.preventDefault()
    const nuevos = {}
    CAMPOS.forEach((c) => { if (!String(actuales[c]).trim()) nuevos[c] = OBLIGATORIOS[c] })
    if (Object.keys(nuevos).length) { setErrores(nuevos); enfocarPrimerError(); return }

    // Formatos: NIT con dígito de verificación, correo completo y teléfono de 10 dígitos.
    const corregidos = { ...actuales }
    const partes = actuales.nit.replace(/[.\s]/g, '').match(/^(\d{9})-?(\d)$/)
    if (!partes) nuevos.nit = 'El NIT lleva 9 dígitos y el dígito de verificación, por ejemplo 900482317-1.'
    else if (digitoVerificacion(partes[1]) !== Number(partes[2])) {
      nuevos.nit = `El dígito de verificación no corresponde. Para ${partes[1]} es ${digitoVerificacion(partes[1])}. Revísalo en el RUT.`
    } else corregidos.nit = `${partes[1]}-${partes[2]}`
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actuales.correoContacto.trim())) {
      nuevos.correoContacto = 'Ese correo no está completo. Escríbelo como administracion@villacampestre.co.'
    }
    if (actuales.telefonoContacto.replace(/\D/g, '').length !== 10) {
      nuevos.telefonoContacto = 'El teléfono lleva 10 dígitos: fijo con indicativo, como 605 385 4410, o celular, como 300 555 0142.'
    }
    setErrores(nuevos)
    setValores(corregidos)
    if (Object.keys(nuevos).length) { enfocarPrimerError(); return }

    if (!CAMPOS.some((c) => corregidos[c] !== base[c])) {
      confirmar('No hay cambios por guardar. Los datos ya están así.', 'al')
      return
    }
    setGuardados(corregidos)
    setValores(null)
    confirmar('Datos de la copropiedad guardados. Desde ahora salen así en recibos, paz y salvo y correos.')
  }

  const descartar = () => {
    setValores(null)
    setErrores({})
    confirmar('Cambios descartados.', 'al')
  }

  return (
    <main className="pagina">
      <AvisoDatosDeEjemplo casoDeUso="RF-106" />
      <Encabezado titulo="Datos de la copropiedad"
        guia="Salen en los recibos de caja, el paz y salvo, los informes de cartera y los correos que envía Convivir." />

      <div className="lado">
        <form className="superficie" ref={formulario} noValidate onSubmit={guardar}>
          <div className="cabeza">
            <h2>Identificación y contacto</h2>
            {copropiedad.estado === 'ACTIVA' ? <Pildora tono="ok">Activa</Pildora> : <Pildora>Inactiva</Pildora>}
          </div>
          <div className="cuerpo">
            <div className="formulario dos">
              <Campo rotulo="Nombre" className="completo" error={errores.nombre}>
                <input value={actuales.nombre} onChange={poner('nombre')} autoComplete="organization" />
              </Campo>
              <Campo rotulo="NIT" ayuda="Sin puntos y con el dígito de verificación después del guion." error={errores.nit}>
                <input className="identificador" value={actuales.nit} onChange={poner('nit')} inputMode="numeric" autoComplete="off" />
              </Campo>
              <Campo rotulo="Teléfono de contacto" ayuda="Fijo con indicativo, por ejemplo 605 385 4410, o celular."
                error={errores.telefonoContacto}>
                <input value={actuales.telefonoContacto} onChange={poner('telefonoContacto')} inputMode="tel" autoComplete="tel" />
              </Campo>
              <Campo rotulo="Dirección" className="completo" error={errores.direccion}>
                <input value={actuales.direccion} onChange={poner('direccion')} autoComplete="street-address" />
              </Campo>
              <Campo rotulo="Correo de contacto" className="completo" error={errores.correoContacto}
                ayuda="Los residentes responden a este correo cuando reciben un aviso.">
                <input type="email" value={actuales.correoContacto} onChange={poner('correoContacto')} autoComplete="email" />
              </Campo>
            </div>
          </div>
          <div className="pie">
            <span>{hayCambios ? 'Tienes cambios sin guardar' : 'Sin cambios por guardar'}</span>
            <div className="fila" style={{ gap: 'var(--e2)' }}>
              <button className="btn segundo" type="button" disabled={!hayCambios} onClick={descartar}>Descartar cambios</button>
              <button className="btn" type="submit">Guardar datos de la copropiedad</button>
            </div>
          </div>
        </form>

        <aside className="superficie" aria-labelledby="titulo-administra">
          <div className="cabeza">
            <h2 id="titulo-administra">Lo que administra</h2>
            <Link className="btn texto chico" to="/administrador/inmuebles">Ver inmuebles</Link>
          </div>
          <ul className="lista">
            {copropiedad.administra.map((a) => (
              <li key={a.nombre}>
                <div className="principal">
                  <b>{a.nombre}</b>
                  <span>
                    {a.desde
                      ? <><span className="identificador">{a.desde}</span> a <span className="identificador">{a.hasta}</span></>
                      : a.detalle}
                  </span>
                </div>
                <span className="num fuerte">{a.cantidad}</span>
              </li>
            ))}
          </ul>
          <div className="pie"><span>Se calcula con los inmuebles registrados. Para cambiarlo, registra o desactiva inmuebles.</span></div>
        </aside>
      </div>
    </main>
  )
}
