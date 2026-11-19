import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { inmueblesApi } from '../../api/inmuebles.js'
import { Cargando, ErrorDeCarga, Pestanas, Vacio } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { cifra, decimal, fecha, hora, legible, pesos } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'
import { NATURALEZAS, numero } from './Inmuebles.jsx'

// CU-02: datos, modificar, desactivar y reactivar; RF-013: historial del inmueble.
// Conectada a /api/inmuebles/{id}/historial.

const TONO_OBLIGACION = { PAGADA: 'ok', PENDIENTE: 'al', PAGADA_PARCIALMENTE: 'al', VENCIDA: 'no', ANULADA: 'ne' }
const TONO_PAGO = { CONFIRMADO: 'ok', PENDIENTE: 'al', RECHAZADO: 'no', ANULADO: 'ne' }
const TONO_REPORTE = { ABIERTO: 'al', EN_PROCESO: 'ne', CERRADO: 'ok' }

export default function Inmueble() {
  const { id } = useParams()
  const historial = useConsulta(() => inmueblesApi.historial(id), [id])
  const [pestana, setPestana] = useState('vinculaciones')
  const [dialogo, setDialogo] = useState(null)

  if (historial.cargando && !historial.datos) return <main className="pagina"><Cargando texto="Cargando el inmueble…" /></main>
  if (historial.error) {
    return (
      <main className="pagina">
        <Migas />
        <div className="superficie"><ErrorDeCarga error={historial.error} alReintentar={historial.recargar} /></div>
      </main>
    )
  }

  const h = historial.datos
  const i = h.inmueble
  const activo = i.estado === 'ACTIVO'
  const pestanas = [
    { id: 'vinculaciones', texto: 'Vinculaciones', cuenta: h.vinculaciones.length },
    { id: 'obligaciones', texto: 'Obligaciones', cuenta: h.obligaciones.length },
    { id: 'pagos', texto: 'Pagos', cuenta: h.pagos.length },
    { id: 'reportes', texto: 'Reportes', cuenta: h.reportes.length },
    { id: 'movimientos', texto: 'Movimientos de acceso', cuenta: h.movimientos.length },
  ]

  return (
    <main className="pagina">
      <Migas identificacion={i.identificacion} />
      <div className="encabezado">
        <div>
          <div className="fila" style={{ gap: 'var(--e3)' }}>
            <h1 className="identificador">{i.identificacion}</h1>
            {activo ? <Pildora tono="ok">Activo</Pildora> : <Pildora>Desactivado</Pildora>}
          </div>
          <p className="guia">{i.tipoInmueble}{i.inmuebleContenedor ? ` · dentro de ${i.inmuebleContenedor}` : ''}</p>
        </div>
        <div className="acciones">
          {activo ? (
            <>
              <button className="btn segundo" type="button" onClick={() => setDialogo('modificar')}>Modificar datos</button>
              <button className="btn riesgo" type="button" onClick={() => setDialogo('desactivar')}>Desactivar inmueble</button>
            </>
          ) : (
            <button className="btn" type="button" onClick={() => setDialogo('reactivar')}>Reactivar inmueble</button>
          )}
        </div>
      </div>

      {!activo && (
        <div className="aviso" style={{ marginBottom: 'var(--e5)' }}>
          <b>Desactivado.</b> Motivo: {i.motivoDesactivacion}. El historial se conserva (RN-04).
        </div>
      )}

      <section className="superficie relleno">
        <dl className="datos">
          <div><dt>Tipo</dt><dd>{i.tipoInmueble}</dd></div>
          <div><dt>Naturaleza</dt><dd>{NATURALEZAS.find((n) => n.valor === i.naturalezaInmueble)?.texto}</dd></div>
          <div><dt>Coeficiente</dt><dd className="num">{decimal(i.coeficiente)}</dd></div>
          <div><dt>Área</dt><dd className="num">{decimal(i.areaM2, 1)} m²</dd></div>
          <div><dt>Dentro de</dt><dd>{i.inmuebleContenedor || 'No está dentro de otro inmueble'}</dd></div>
          <div><dt>Saldo pendiente</dt><dd className="num fuerte">{pesos(i.saldoPendiente)}</dd></div>
        </dl>
      </section>

      <section className="seccion">
        <Pestanas etiqueta="Historial del inmueble" pestanas={pestanas} activa={pestana} alCambiar={setPestana} />
        <div className="superficie">
          {pestana === 'vinculaciones' && <Vinculaciones lista={h.vinculaciones} />}
          {pestana === 'obligaciones' && <Obligaciones lista={h.obligaciones} />}
          {pestana === 'pagos' && <Pagos lista={h.pagos} />}
          {pestana === 'reportes' && <Reportes lista={h.reportes} />}
          {pestana === 'movimientos' && <Movimientos lista={h.movimientos} />}
        </div>
      </section>

      <Modificar abierto={dialogo === 'modificar'} inmueble={i} alCerrar={() => setDialogo(null)} alGuardar={historial.recargar} />
      <Desactivar abierto={dialogo === 'desactivar'} inmueble={i} alCerrar={() => setDialogo(null)} alGuardar={historial.recargar} />
      <Reactivar abierto={dialogo === 'reactivar'} inmueble={i} alCerrar={() => setDialogo(null)} alGuardar={historial.recargar} />
    </main>
  )
}

function Migas({ identificacion }) {
  return (
    <nav className="migas" aria-label="Ruta">
      <Link to="/administrador/inmuebles">Inmuebles</Link>
      {identificacion && <><span aria-hidden="true">/</span><span className="identificador">{identificacion}</span></>}
    </nav>
  )
}

// ---------- Pestañas del historial ----------

function Vinculaciones({ lista }) {
  if (!lista.length) {
    return <Vacio titulo="Nadie está vinculado a este inmueble">Cuando registres al propietario o al arrendatario, aparecerá aquí con sus fechas.</Vacio>
  }
  return (
    <div className="tabla-envoltura">
      <table className="tabla">
        <thead><tr><th>Persona</th><th>Vínculo</th><th>Desde</th><th>Hasta</th><th>Autoriza accesos</th><th>Estado</th></tr></thead>
        <tbody>
          {lista.map((v) => (
            <tr key={v.id}>
              <td className="fuerte">{v.integrante}</td>
              <td>{legible(v.rol)} {v.esResidente ? 'residente' : 'no residente'}</td>
              <td>{fecha(v.fechaInicio)}</td>
              <td>{v.fechaFin ? fecha(v.fechaFin) : '—'}</td>
              <td>{v.autorizaAcceso ? 'Sí' : 'No'}</td>
              <td>{v.estado === 'VIGENTE' ? <Pildora tono="ok">Vigente</Pildora> : <Pildora>Finalizada</Pildora>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Obligaciones({ lista }) {
  if (!lista.length) return <Vacio titulo="Este inmueble no tiene obligaciones">Las cuotas aparecen cuando se generan las del periodo en Cartera.</Vacio>
  return (
    <div className="tabla-envoltura">
      <table className="tabla">
        <thead><tr><th>Concepto</th><th>Vence</th><th className="num">Valor</th><th className="num">Saldo</th><th>Estado</th></tr></thead>
        <tbody>
          {lista.map((o) => (
            <tr key={o.id}>
              <td>{o.descripcion || legible(o.concepto)}<span className="sub">{legible(o.concepto)}</span></td>
              <td>{fecha(o.fechaVencimiento)}</td>
              <td className="num">{cifra(o.valor)}</td>
              <td className="num">{cifra(o.saldoPendiente)}</td>
              <td><Pildora tono={o.diasDeMora > 0 ? 'no' : TONO_OBLIGACION[o.estado]}>
                {o.diasDeMora > 0 ? `${o.diasDeMora} días en mora` : legible(o.estado)}
              </Pildora></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pagos({ lista }) {
  if (!lista.length) return <Vacio titulo="Todavía no hay pagos">Los pagos en línea y los registrados en la oficina aparecen aquí con su comprobante.</Vacio>
  return (
    <div className="tabla-envoltura">
      <table className="tabla">
        <thead><tr><th>Fecha</th><th>Comprobante</th><th>Medio</th><th className="num">Valor</th><th>Estado</th></tr></thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id}>
              <td>{fecha(p.fecha)}</td>
              <td className="mono">{p.comprobante || '—'}</td>
              <td>{legible(p.medioPago)}<span className="sub">{legible(p.canalRecaudo)}</span></td>
              <td className="num">{cifra(p.valor)}</td>
              <td><Pildora tono={TONO_PAGO[p.estado]}>{legible(p.estado)}</Pildora></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Reportes({ lista }) {
  if (!lista.length) return <Vacio titulo="No hay reportes sobre este inmueble" />
  return (
    <ul className="lista">
      {lista.map((r) => (
        <li key={r.id}>
          <div className="principal"><b>{r.categoria}</b><span>Reporte {r.id} · {fecha(r.fechaCreacion)}</span></div>
          <Pildora tono={TONO_REPORTE[r.estado]}>{legible(r.estado)}</Pildora>
        </li>
      ))}
    </ul>
  )
}

function Movimientos({ lista }) {
  if (!lista.length) return <Vacio titulo="Sin movimientos de acceso">Los ingresos y salidas que registre portería hacia este inmueble aparecen aquí.</Vacio>
  return (
    <ul className="lista">
      {lista.map((m) => (
        <li key={m.id}>
          <div className="principal"><b>{legible(m.sentido)}</b><span>{fecha(m.fechaHora)} · {hora(m.fechaHora)}</span></div>
          {m.placa && <span className="identificador">{m.placa}</span>}
        </li>
      ))}
    </ul>
  )
}

// ---------- Acciones ----------

function useAccion(alCerrar, alGuardar) {
  const confirmar = useConfirmar()
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  /** Devuelve true si la acción salió bien; si falla, deja el error a la vista y el formulario como estaba. */
  const ejecutar = async (accion, mensaje) => {
    setEnviando(true)
    setError(null)
    try {
      await accion()
      confirmar(mensaje)
      alGuardar()
      alCerrar()
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setEnviando(false)
    }
  }
  const cerrar = () => { setError(null); alCerrar() }
  return { enviando, error, setError, ejecutar, cerrar }
}

function Modificar({ abierto, inmueble, alCerrar, alGuardar }) {
  const accion = useAccion(alCerrar, alGuardar)
  const [datos, setDatos] = useState(null)
  const valores = datos || {
    coeficiente: decimal(inmueble.coeficiente, 6), areaM2: decimal(inmueble.areaM2, 2), naturalezaInmueble: inmueble.naturalezaInmueble,
  }
  const cerrar = () => { setDatos(null); accion.cerrar() }

  const guardar = () => {
    const coeficiente = numero(valores.coeficiente)
    const area = numero(valores.areaM2)
    if (Number.isNaN(coeficiente) || coeficiente < 0 || coeficiente > 1) {
      accion.setError('El coeficiente va entre 0 y 1. Para 0,52 por ciento escribe 0,0052.')
      return
    }
    if (Number.isNaN(area) || area <= 0) {
      accion.setError('Escribe el área en metros cuadrados, mayor que cero.')
      return
    }
    accion.ejecutar(() => inmueblesApi.modificar(inmueble.id, { coeficiente, areaM2: area, naturalezaInmueble: valores.naturalezaInmueble }),
      `Datos de ${inmueble.identificacion} modificados.`).then((ok) => ok && setDatos(null))
  }

  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} titulo={`Modificar ${inmueble.identificacion}`} alEnviar={guardar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit" disabled={accion.enviando}>Guardar cambios</button>
      </>}>
      {accion.error && <div className="aviso no" role="alert" style={{ marginBottom: 'var(--e4)' }}>{accion.error}</div>}
      <div className="formulario dos">
        <Campo rotulo="Coeficiente de copropiedad">
          <input className="num" inputMode="decimal" value={valores.coeficiente}
            onChange={(e) => setDatos({ ...valores, coeficiente: e.target.value })} />
        </Campo>
        <Campo rotulo="Área en m²">
          <input className="num" inputMode="decimal" value={valores.areaM2}
            onChange={(e) => setDatos({ ...valores, areaM2: e.target.value })} />
        </Campo>
        <Campo rotulo="Naturaleza" className="completo">
          <select value={valores.naturalezaInmueble} onChange={(e) => setDatos({ ...valores, naturalezaInmueble: e.target.value })}>
            {NATURALEZAS.map((n) => <option key={n.valor} value={n.valor}>{n.texto}</option>)}
          </select>
        </Campo>
      </div>
    </Dialogo>
  )
}

function Desactivar({ abierto, inmueble, alCerrar, alGuardar }) {
  const accion = useAccion(alCerrar, alGuardar)
  const [motivo, setMotivo] = useState('')
  const [falta, setFalta] = useState(false)
  const cerrar = () => { setMotivo(''); setFalta(false); accion.cerrar() }
  const desactivar = () => {
    if (!motivo.trim()) { setFalta(true); return }
    accion.ejecutar(() => inmueblesApi.desactivar(inmueble.id, motivo.trim()),
      `Inmueble ${inmueble.identificacion} desactivado. Su historial se conserva.`).then((ok) => ok && setMotivo(''))
  }
  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} titulo={`Desactivar ${inmueble.identificacion}`} alEnviar={desactivar}
      guia="No se borra: deja de aparecer en la operación diaria y conserva todo su historial."
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn riesgo" type="submit" disabled={accion.enviando}>Desactivar inmueble</button>
      </>}>
      {accion.error && <div className="aviso no" role="alert" style={{ marginBottom: 'var(--e4)' }}>{accion.error}</div>}
      <Campo rotulo="Motivo" ayuda="Queda en el historial del inmueble y en auditoría."
        error={falta ? 'Escribe el motivo de la desactivación.' : null}>
        <textarea value={motivo} onChange={(e) => { setMotivo(e.target.value); setFalta(false) }}
          placeholder="Unido a B-0301 por remodelación" />
      </Campo>
    </Dialogo>
  )
}

function Reactivar({ abierto, inmueble, alCerrar, alGuardar }) {
  const accion = useAccion(alCerrar, alGuardar)
  return (
    <Dialogo abierto={abierto} alCerrar={accion.cerrar} titulo={`Reactivar ${inmueble.identificacion}`}
      alEnviar={() => accion.ejecutar(() => inmueblesApi.reactivar(inmueble.id), `Inmueble ${inmueble.identificacion} reactivado.`)}
      pie={<>
        <button className="btn segundo" type="button" onClick={accion.cerrar}>Cancelar</button>
        <button className="btn" type="submit" disabled={accion.enviando}>Reactivar inmueble</button>
      </>}>
      {accion.error && <div className="aviso no" role="alert" style={{ marginBottom: 'var(--e4)' }}>{accion.error}</div>}
      <p>Vuelve a la operación diaria: podrá tener vinculaciones, cuotas y reservas.</p>
    </Dialogo>
  )
}
