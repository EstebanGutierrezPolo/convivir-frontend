import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { inmueblesApi, tiposInmuebleApi } from '../../api/inmuebles.js'
import { Buscador, Cargando, Encabezado, ErrorDeCarga, Segmentos, Vacio } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { cifra, decimal } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-02 Gestionar inmuebles: lista y registro. Conectada a /api/inmuebles.

export const NATURALEZAS = [
  { valor: 'BIEN_PRIVADO', texto: 'Bien privado', detalle: 'Unidad de un propietario' },
  { valor: 'USO_EXCLUSIVO', texto: 'Uso exclusivo', detalle: 'Común, asignado a una unidad' },
  { valor: 'USO_GENERAL', texto: 'Uso general', detalle: 'Común, para todos' },
]

const FILTROS = [
  { valor: 'activos', texto: 'Activos' },
  { valor: 'saldo', texto: 'Con saldo' },
  { valor: 'inactivos', texto: 'Desactivados' },
  { valor: 'todos', texto: 'Todos' },
]

export default function Inmuebles() {
  const inmuebles = useConsulta(() => inmueblesApi.consultar())
  const tipos = useConsulta(() => tiposInmuebleApi.consultar())
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState('')
  const [filtro, setFiltro] = useState('activos')
  const [registrando, setRegistrando] = useState(false)

  const lista = inmuebles.datos || []
  const visibles = useMemo(() => lista.filter((i) => {
    const busca = texto.trim().toLowerCase()
    if (busca && !`${i.identificacion} ${i.inmuebleContenedor || ''}`.toLowerCase().includes(busca)) return false
    if (tipo && i.tipoInmueble !== tipo) return false
    if (filtro === 'activos') return i.estado === 'ACTIVO'
    if (filtro === 'inactivos') return i.estado === 'INACTIVO'
    if (filtro === 'saldo') return i.saldoPendiente > 0
    return true
  }), [lista, texto, tipo, filtro])

  const activos = lista.filter((i) => i.estado === 'ACTIVO').length
  const conSaldo = lista.filter((i) => i.saldoPendiente > 0).length

  const limpiar = () => { setTexto(''); setTipo(''); setFiltro('todos') }

  return (
    <main className="pagina">
      <Encabezado titulo="Inmuebles"
        guia={inmuebles.datos ? `${activos} activos · ${conSaldo} con saldo pendiente` : ' '}
        acciones={<button className="btn" type="button" onClick={() => setRegistrando(true)}>Registrar inmueble</button>} />

      <div className="filtros">
        <Buscador valor={texto} alCambiar={setTexto} placeholder="Identificación o torre" etiqueta="Buscar inmueble" />
        <label className="campo">
          <span className="solo-lectores">Tipo de inmueble</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {(tipos.datos || []).map((t) => <option key={t.id}>{t.nombre}</option>)}
          </select>
        </label>
        <Segmentos etiqueta="Estado" opciones={FILTROS} valor={filtro} alCambiar={setFiltro} />
      </div>

      <div className="superficie">
        {inmuebles.cargando && <Cargando texto="Cargando inmuebles…" />}
        {inmuebles.error && <ErrorDeCarga error={inmuebles.error} alReintentar={inmuebles.recargar} />}
        {inmuebles.datos && lista.length === 0 && (
          <Vacio titulo="Todavía no hay inmuebles registrados"
            accion={<button className="btn" type="button" onClick={() => setRegistrando(true)}>Registrar inmueble</button>}>
            Empieza por las torres y luego registra los apartamentos dentro de cada una.
          </Vacio>
        )}
        {inmuebles.datos && lista.length > 0 && visibles.length === 0 && (
          <Vacio titulo="Ningún inmueble coincide con la búsqueda"
            accion={<button className="btn segundo" type="button" onClick={limpiar}>Quitar filtros</button>}>
            Revisa la identificación, por ejemplo <span className="identificador">A-1104</span>, o cambia el filtro.
          </Vacio>
        )}
        {visibles.length > 0 && (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Unidad</th><th>Tipo</th><th>Naturaleza</th>
                  <th className="num">Coeficiente</th><th className="num">Área m²</th>
                  <th className="num">Saldo pendiente</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link className="fila-enlace identificador" to={`/administrador/inmuebles/${i.id}`}>{i.identificacion}</Link>
                      {i.inmuebleContenedor && <span className="sub">{i.inmuebleContenedor}</span>}
                    </td>
                    <td>{i.tipoInmueble}</td>
                    <td>{NATURALEZAS.find((n) => n.valor === i.naturalezaInmueble)?.texto}</td>
                    <td className="num">{decimal(i.coeficiente)}</td>
                    <td className="num">{decimal(i.areaM2, 1)}</td>
                    <td className="num">{cifra(i.saldoPendiente)}</td>
                    <td>{i.estado === 'ACTIVO' ? <Pildora tono="ok">Activo</Pildora> : <Pildora>Desactivado</Pildora>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {inmuebles.datos && lista.length > 0 && (
          <div className="pie"><span>{visibles.length} de {lista.length} inmuebles</span></div>
        )}
      </div>

      <RegistrarInmueble abierto={registrando} alCerrar={() => setRegistrando(false)}
        tipos={(tipos.datos || []).filter((t) => t.estado === 'ACTIVO')}
        contenedores={lista.filter((i) => i.estado === 'ACTIVO')}
        alRegistrar={inmuebles.recargar} />
    </main>
  )
}

/** Convierte "0,0052" o "0.0052" en número; vacío o inválido da NaN. */
export function numero(texto) {
  return String(texto).trim() === '' ? NaN : Number(String(texto).replace(',', '.'))
}

function RegistrarInmueble({ abierto, alCerrar, tipos, contenedores, alRegistrar }) {
  const confirmar = useConfirmar()
  const vacio = { tipoInmuebleId: '', identificacion: '', naturalezaInmueble: 'BIEN_PRIVADO', coeficiente: '', areaM2: '', inmuebleContenedorId: '' }
  const [datos, setDatos] = useState(vacio)
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const cambiar = (campo) => (e) => {
    setDatos({ ...datos, [campo]: e.target.value })
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }

  const cerrar = () => {
    setDatos(vacio)
    setErrores({})
    setErrorServidor(null)
    alCerrar()
  }

  const registrar = async () => {
    const coeficiente = numero(datos.coeficiente)
    const area = numero(datos.areaM2)
    const nuevos = {}
    if (!datos.tipoInmuebleId) nuevos.tipoInmuebleId = 'Elige el tipo. Define si paga cuota, si se puede ceder y si se reserva.'
    if (!datos.identificacion.trim()) nuevos.identificacion = 'Escribe la identificación como aparece en la escritura, por ejemplo A-1203.'
    if (Number.isNaN(coeficiente)) nuevos.coeficiente = 'Escribe el coeficiente. Sale de la escritura y define cuánto paga de cuota.'
    else if (coeficiente < 0 || coeficiente > 1) {
      nuevos.coeficiente = `El coeficiente va entre 0 y 1. Para ${decimal(coeficiente)} por ciento escribe ${decimal(coeficiente / 100, 6)}.`
    }
    if (Number.isNaN(area) || area <= 0) nuevos.areaM2 = 'Escribe el área privada en metros cuadrados, por ejemplo 68,4.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length) return

    setEnviando(true)
    setErrorServidor(null)
    try {
      const creado = await inmueblesApi.registrar({
        identificacion: datos.identificacion.trim(),
        coeficiente,
        areaM2: area,
        naturalezaInmueble: datos.naturalezaInmueble,
        tipoInmuebleId: Number(datos.tipoInmuebleId),
        inmuebleContenedorId: datos.inmuebleContenedorId ? Number(datos.inmuebleContenedorId) : null,
      })
      confirmar(`Inmueble ${creado.identificacion} registrado. Ya puedes vincular a sus integrantes.`)
      alRegistrar()
      cerrar()
    } catch (error) {
      if (error.estado === 409) setErrores({ identificacion: error.message })
      else setErrorServidor(error.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} titulo="Registrar inmueble" alEnviar={registrar}
      guia="El historial queda anclado a este inmueble aunque cambien sus ocupantes."
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit" disabled={enviando}>{enviando ? 'Registrando…' : 'Registrar inmueble'}</button>
      </>}>
      {errorServidor && <div className="aviso no" role="alert" style={{ marginBottom: 'var(--e4)' }}>{errorServidor}</div>}
      <div className="formulario dos">
        <Campo rotulo="Tipo de inmueble" error={errores.tipoInmuebleId}>
          <select value={datos.tipoInmuebleId} onChange={cambiar('tipoInmuebleId')}>
            <option value="">Elige un tipo</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Identificación" ayuda="Como aparece en la escritura o en el plano." error={errores.identificacion}>
          <input className="identificador" value={datos.identificacion} onChange={cambiar('identificacion')}
            placeholder="A-1203" autoComplete="off" />
        </Campo>
        <fieldset className="completo">
          <legend className="rotulo">Naturaleza</legend>
          <div className="elecciones">
            {NATURALEZAS.map((n) => (
              <label key={n.valor} className="eleccion">
                <input type="radio" name="naturaleza" value={n.valor} checked={datos.naturalezaInmueble === n.valor}
                  onChange={cambiar('naturalezaInmueble')} />
                <span><b>{n.texto}</b><small>{n.detalle}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
        <Campo rotulo="Coeficiente de copropiedad" ayuda="Entre 0 y 1. Para 0,52 por ciento escribe 0,0052."
          error={errores.coeficiente}>
          <input className="num" inputMode="decimal" value={datos.coeficiente} onChange={cambiar('coeficiente')} placeholder="0,0052" />
        </Campo>
        <Campo rotulo="Área en m²" error={errores.areaM2}>
          <input className="num" inputMode="decimal" value={datos.areaM2} onChange={cambiar('areaM2')} placeholder="68,4" />
        </Campo>
        <Campo rotulo="Dentro de" opcional className="completo"
          ayuda="Un apartamento está dentro de su torre; un parqueadero, dentro de su sótano.">
          <select value={datos.inmuebleContenedorId} onChange={cambiar('inmuebleContenedorId')}>
            <option value="">No está dentro de otro inmueble</option>
            {contenedores.map((c) => <option key={c.id} value={c.id}>{c.identificacion}</option>)}
          </select>
        </Campo>
      </div>
    </Dialogo>
  )
}
