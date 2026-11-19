import { useState } from 'react'

import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import { HOY_DE_EJEMPLO, auditoriaDeEjemplo } from '../../datos/administracion.js'
import { cifra, hora } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-18 inclusión Consultar y exportar auditoría (RF-108, RF-109, RN-32).
// GET /api/auditoria?usuario&desde&hasta&accion · Auditoria.exportarRegistroDeAuditoria(fechaDesde, fechaHasta), solo administrador.
// Con soloConsulta la ve el miembro del consejo: consulta, sin exportar.
// Sin API todavía: datos de ejemplo de src/datos/administracion.js.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
  'noviembre', 'diciembre']
const FILTROS_INICIALES = { desde: '2026-11-01', hasta: HOY_DE_EJEMPLO, accion: '', documento: '' }

function leer(texto) {
  const [anio, mes, dia, h = 0, m = 0] = texto.split(/[-T:]/).map(Number)
  return new Date(anio, mes - 1, dia, h, m)
}
const horaCorta = (d) => (d.getHours() === 12 && d.getMinutes() === 0 ? '12:00 m.' : hora(d))
function fechaLarga(texto) {
  const d = leer(texto)
  return `${d.getDate()} de ${MESES[d.getMonth()]}${d.getFullYear() !== 2026 ? ` de ${d.getFullYear()}` : ''}`
}
const dia = (texto) => texto.slice(0, 10)
const rangoInvertido = (desde, hasta) => desde && hasta && desde > hasta

/** Unidades, comprobantes, reportes y logins van en monoespaciada. */
function ConIdentificadores({ texto }) {
  return texto.split(/\b([A-Z]{1,3}-[0-9][0-9-]*|[a-z]+\.[a-z]+)\b/).map((parte, i) =>
    (i % 2 ? <span key={i} className="identificador">{parte}</span> : parte))
}

function enfocarPrimerError() {
  requestAnimationFrame(() => {
    const abiertos = document.querySelectorAll('dialog[open]')
    abiertos[abiertos.length - 1]?.querySelector('[aria-invalid="true"]')?.focus()
  })
}

export default function Auditoria({ soloConsulta = false }) {
  const consulta = useConsulta(() => auditoriaDeEjemplo.consultar())
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [exportando, setExportando] = useState(false)

  const datos = consulta.datos
  const encabezado = (
    <Encabezado titulo="Auditoría"
      guia="Toda operación sobre inmuebles, personas, cartera, cuentas y reportes queda aquí con quién la hizo y cuándo."
      acciones={!soloConsulta && (
        <button className="btn segundo" type="button" onClick={() => setExportando(true)}>Exportar registro</button>
      )} />
  )

  if (!datos) {
    return (
      <main className="pagina">
        <AvisoDatosDeEjemplo casoDeUso="CU-18" />
        {encabezado}
        <div className="superficie">
          {consulta.error ? <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} /> : <Cargando texto="Cargando el registro…" />}
        </div>
      </main>
    )
  }

  const { acciones, registros } = datos
  const { desde, hasta } = filtros
  const documento = filtros.documento.replace(/\D/g, '')
  const invertido = rangoInvertido(desde, hasta)
  const poner = (campo) => (e) => setFiltros({ ...filtros, [campo]: e.target.value })

  const visibles = invertido ? [] : registros.filter((r) =>
    (!desde || dia(r.fechaHora) >= desde) && (!hasta || dia(r.fechaHora) <= hasta)
    && (!filtros.accion || r.accion === filtros.accion)
    && (!documento || r.documento.startsWith(documento)))

  let conteo = 'Sin resultados'
  if (!invertido) {
    conteo = `${visibles.length}${visibles.length === 1 ? ' operación' : ' operaciones'}`
      + `${desde && hasta ? ` del ${fechaLarga(desde)} al ${fechaLarga(hasta)}` : ''}`
  }

  return (
    <main className="pagina">
      <AvisoDatosDeEjemplo casoDeUso="CU-18" />
      {encabezado}

      {soloConsulta && (
        <div className="aviso" style={{ marginBottom: 'var(--e5)' }}>
          <p>Como miembro del consejo consultas el registro completo. Si necesitas el archivo de un periodo, pídeselo a la administración.</p>
        </div>
      )}

      <form className="superficie relleno" role="search" noValidate style={{ marginBottom: 'var(--e4)' }}
        onSubmit={(e) => e.preventDefault()}>
        <div className="formulario" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 11rem), 1fr))' }}>
          <label className="campo">
            <span>Desde</span>
            <input type="date" value={desde} max={HOY_DE_EJEMPLO} onChange={poner('desde')} aria-invalid={invertido ? 'true' : undefined} />
          </label>
          <label className="campo">
            <span>Hasta</span>
            <input type="date" value={hasta} max={HOY_DE_EJEMPLO} onChange={poner('hasta')} />
          </label>
          <label className="campo">
            <span>Acción</span>
            <select value={filtros.accion} onChange={poner('accion')}>
              <option value="">Todas las acciones</option>
              {Object.entries(acciones).map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}
            </select>
          </label>
          <label className="campo">
            <span>Documento de quien actuó</span>
            <input className="identificador" inputMode="numeric" autoComplete="off" placeholder="32765418"
              value={filtros.documento} onChange={poner('documento')} />
          </label>
        </div>
        {invertido && (
          <div className="aviso no" role="alert" style={{ marginTop: 'var(--e4)' }}>
            <p>
              La fecha inicial ({fechaLarga(desde)}) es posterior a la final ({fechaLarga(hasta)}). Cambia una de las dos para ver el registro.
            </p>
          </div>
        )}
      </form>

      <div className="superficie">
        {visibles.length > 0 && (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr><th>Fecha y hora</th><th>Quién</th><th>Acción</th><th>Elemento afectado</th></tr>
              </thead>
              <tbody>
                {visibles.map((r) => (
                  <tr key={`${r.fechaHora}-${r.documento}-${r.accion}`}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fechaLarga(r.fechaHora)}<span className="sub num">{horaCorta(leer(r.fechaHora))}</span></td>
                    <td>{r.nombre}<span className="sub">CC <span className="identificador">{cifra(r.documento)}</span></span></td>
                    <td><span className="etiqueta">{acciones[r.accion]}</span></td>
                    <td style={{ minWidth: '16rem' }}><ConIdentificadores texto={r.elementoAfectado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!invertido && visibles.length === 0 && (
          <div className="vacio">
            <h3>No hay operaciones con esos filtros</h3>
            <p>Amplía el rango de fechas o revisa el documento: va sin puntos ni espacios, por ejemplo <span className="identificador">32765418</span>.</p>
            <button className="btn segundo" type="button" onClick={() => setFiltros(FILTROS_INICIALES)}>Quitar filtros</button>
          </div>
        )}
        <div className="pie">
          <span>{conteo}</span>
          <span>El registro no se puede editar ni borrar.</span>
        </div>
      </div>

      {!soloConsulta && (
        <ExportarRegistro abierto={exportando} alCerrar={() => setExportando(false)} registros={registros} acciones={acciones}
          desdeInicial={invertido ? '' : desde} hastaInicial={invertido ? '' : hasta} />
      )}
    </main>
  )
}

// Exportar: Auditoria.exportarRegistroDeAuditoria(fechaDesde, fechaHasta) : File. Genera el CSV en el navegador.
function ExportarRegistro({ abierto, alCerrar, registros, acciones, desdeInicial, hastaInicial }) {
  const confirmar = useConfirmar()
  const [periodo, setPeriodo] = useState(null)
  const [errores, setErrores] = useState({})
  const valores = periodo || { desde: desdeInicial, hasta: hastaInicial }

  const poner = (campo) => (e) => {
    setPeriodo({ ...valores, [campo]: e.target.value })
    if (e.target.value && errores[campo]) setErrores({ ...errores, [campo]: null })
  }
  const cerrar = () => { setPeriodo(null); setErrores({}); alCerrar() }

  const exportar = () => {
    const { desde, hasta } = valores
    const nuevos = {}
    if (!desde) nuevos.desde = 'Elige la fecha inicial del periodo.'
    if (!hasta) nuevos.hasta = 'Elige la fecha final del periodo.'
    if (!Object.keys(nuevos).length && rangoInvertido(desde, hasta)) {
      nuevos.hasta = `La fecha final es anterior a la inicial. Pon una igual o posterior al ${fechaLarga(desde)}.`
    }
    const delPeriodo = registros.filter((r) => dia(r.fechaHora) >= desde && dia(r.fechaHora) <= hasta)
    if (!Object.keys(nuevos).length && !delPeriodo.length) {
      nuevos.desde = `No hay operaciones del ${fechaLarga(desde)} al ${fechaLarga(hasta)}. Amplía el periodo.`
    }
    setErrores(nuevos)
    if (Object.keys(nuevos).length) { enfocarPrimerError(); return }

    const lineas = [['Fecha', 'Hora', 'Documento', 'Quién', 'Acción', 'Elemento afectado'],
      ...delPeriodo.map((r) => [dia(r.fechaHora), r.fechaHora.slice(11), r.documento, r.nombre, acciones[r.accion], r.elementoAfectado])]
      .map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    const archivo = new Blob([`﻿${lineas.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(archivo)
    enlace.download = `auditoria-villa-campestre-${desde}-a-${hasta}.csv`
    document.body.appendChild(enlace)
    enlace.click()
    setTimeout(() => { URL.revokeObjectURL(enlace.href); enlace.remove() }, 1000)

    confirmar(`Registro exportado: ${delPeriodo.length} operaciones del ${fechaLarga(desde)} al ${fechaLarga(hasta)}.`)
    cerrar()
  }

  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} titulo="Exportar registro de auditoría"
      guia="Descarga todas las operaciones del periodo en un archivo CSV que abre en Excel." alEnviar={exportar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit">Exportar registro</button>
      </>}>
      <div className="formulario dos">
        <Campo rotulo="Desde" error={errores.desde}>
          <input type="date" value={valores.desde} max={HOY_DE_EJEMPLO} onChange={poner('desde')} />
        </Campo>
        <Campo rotulo="Hasta" error={errores.hasta}>
          <input type="date" value={valores.hasta} max={HOY_DE_EJEMPLO} onChange={poner('hasta')} />
        </Campo>
      </div>
      <p className="guia" style={{ marginTop: 'var(--e4)' }}>El archivo trae todas las acciones del periodo, sin los filtros de la tabla.</p>
    </Dialogo>
  )
}
