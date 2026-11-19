import { useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { AvisoDatosDeEjemplo, Buscador, Cargando, Encabezado, ErrorDeCarga, Segmentos, Vacio } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { useSesion } from '../../aplicacion/sesion.jsx'
import { CONCEPTOS, HOY, IDENTIFICACIONES, INMUEBLES_ACTIVOS, carteraDeEjemplo } from '../../datos/cartera.js'
import { cifra, fecha, legible, pesos } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-11 Generar y administrar obligaciones. Datos de ejemplo hasta que exista la API.
// PeriodoFacturacion.configurarValorBaseDeLaCuotaDelPeriodo(), generarObligacionesDelPeriodoParaInmueblesActivos()
// Inmueble.calcularCuotaDelInmueble(valorBaseCuota) · FabricaObligacion.crearObligacionIndividual()
// Obligacion.anularObligacionPorMotivo(motivo), calcularDiasDeMora()

export const TONO_OBLIGACION = { PENDIENTE: 'al', PAGADA_PARCIALMENTE: 'al', PAGADA: 'ok', VENCIDA: 'no', ANULADA: 'ne' }
const ESTADOS = ['PENDIENTE', 'PAGADA_PARCIALMENTE', 'PAGADA', 'VENCIDA', 'ANULADA']
const CONCEPTOS_INDIVIDUALES = ['CUOTA_EXTRAORDINARIA', 'MULTA', 'INTERES_MORA', 'ALQUILER_ZONA']

/** 0.995 -> "0,9950": los coeficientes siempre con cuatro decimales. */
const coeficiente = (c) => c.toFixed(4).replace('.', ',')

// ---------- Piezas que comparten las pantallas de cartera ----------

/** "1.340.000", "$ 1 340 000" o "1340000" -> 1340000; sin dígitos da NaN. */
export function leerPesos(texto) {
  const limpio = String(texto).replace(/\D/g, '')
  return limpio ? Number(limpio) : NaN
}

/** "2026-11-30" -> "30 de noviembre de 2026", con el año siempre. */
export function fechaConAnio(iso) {
  const anio = Number(iso.slice(0, 4))
  return anio === new Date().getFullYear() ? `${fecha(iso)} de ${anio}` : fecha(iso)
}

/** Campo de dinero con el prefijo $: el control va dentro de .con-prefijo, así que no sirve <Campo>. */
export function CampoPesos({ rotulo, ayuda, error, className = '', ...entrada }) {
  const id = useId()
  const describe = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className={`campo ${className}`}>
      <label className="rotulo" htmlFor={id}>{rotulo}</label>
      <div className="con-prefijo">
        <span aria-hidden="true">$</span>
        <input id={id} className="num" inputMode="numeric" autoComplete="off" aria-invalid={error ? 'true' : undefined}
          aria-describedby={describe} {...entrada} />
      </div>
      {ayuda && <span className="ayuda" id={`${id}-ayuda`}>{ayuda}</span>}
      {error && <span className="error" id={`${id}-error`}>{error}</span>}
    </div>
  )
}

/** Sugerencias de inmuebles para los campos de identificación. */
export function ListaInmuebles({ id }) {
  return <datalist id={id}>{IDENTIFICACIONES.map((i) => <option key={i} value={i} />)}</datalist>
}

// ---------- Pantalla ----------

export default function Obligaciones() {
  const [parametros] = useSearchParams()
  const periodos = useConsulta(() => carteraDeEjemplo.periodos())
  const obligaciones = useConsulta(() => carteraDeEjemplo.obligaciones())
  const [periodoActual, setPeriodoActual] = useState(() => (parametros.get('periodo') === '2026-12' ? '2026-12' : '2026-11'))
  const [creando, setCreando] = useState(false)
  const [anulando, setAnulando] = useState(null)

  const recargar = () => { periodos.recargar(); obligaciones.recargar() }

  return (
    <main className="pagina">
      <Encabezado titulo="Obligaciones"
        guia="Lo que se le cobra a cada inmueble: cuotas, multas, intereses y alquiler de zonas comunes"
        acciones={<button className="btn segundo" type="button" onClick={() => setCreando(true)}>Crear obligación individual</button>} />

      <AvisoDatosDeEjemplo casoDeUso="CU-11" />

      {periodos.cargando && !periodos.datos && <div className="superficie"><Cargando texto="Cargando el periodo…" /></div>}
      {periodos.error && <div className="superficie"><ErrorDeCarga error={periodos.error} alReintentar={periodos.recargar} /></div>}
      {periodos.datos && (() => {
        const p = periodos.datos.periodos.find((x) => x.periodo === periodoActual)
        return (
          <PeriodoFacturacion key={`${p.periodo}-${p.valorBaseCuota}-${!!p.generado}`} datos={periodos.datos} periodo={p}
            alCambiarPeriodo={setPeriodoActual} alGuardar={recargar} alCrear={() => setCreando(true)} />
        )
      })()}

      <ListaObligaciones consulta={obligaciones} alAnular={setAnulando} />

      <CrearObligacion abierto={creando} alCerrar={() => setCreando(false)} alCrear={obligaciones.recargar} />
      <AnularObligacion obligacion={anulando} alCerrar={() => setAnulando(null)} alAnular={obligaciones.recargar} />
    </main>
  )
}

// ---------- Periodo de facturación: valor base y generación de cuotas ----------

function PeriodoFacturacion({ datos, periodo: p, alCambiarPeriodo, alGuardar, alCrear }) {
  const confirmar = useConfirmar()
  const { sesion } = useSesion()
  const [texto, setTexto] = useState(p.valorBaseCuota ? cifra(p.valorBaseCuota) : '')
  const [error, setError] = useState(null)
  const [dialogo, setDialogo] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const total = (base) => Math.round(base * datos.sumaCoeficientes)
  const escrito = leerPesos(texto)
  const baseEjemplos = p.generado ? p.valorBaseCuota : (escrito > 0 ? escrito : null)

  const guardar = async () => {
    if (!texto.trim()) { setError('Escribe el valor base del periodo, por ejemplo 100 000 000. Con él se calcula la cuota de cada inmueble.'); return }
    if (!(escrito > 0)) { setError('Escribe el valor solo con números, por ejemplo 100 000 000.'); return }
    if (escrito < 1000000) {
      setError('Ese valor parece la cuota de un apartamento. El valor base es el total mensual que se reparte por coeficiente, por ejemplo 100 000 000.')
      return
    }
    try {
      await carteraDeEjemplo.configurarValorBase(p.periodo, escrito)
      confirmar(`Valor base guardado: ${pesos(escrito)} para ${p.nombre}.`)
      alGuardar()
    } catch (e) {
      setError(e.message)
    }
  }

  const pedirGenerar = () => {
    if (p.generado) { setDialogo('generado'); return }
    if (!p.valorBaseCuota) {
      setError(`Guarda primero el valor base de ${p.nombre}. Sin él no se puede calcular la cuota de cada inmueble.`)
      return
    }
    setDialogo('generar')
  }

  const generar = async () => {
    setEnviando(true)
    try {
      await carteraDeEjemplo.generarObligaciones(p.periodo, sesion?.persona || 'Paula Ortega')
      confirmar(`Obligaciones generadas: ${INMUEBLES_ACTIVOS} cuotas de ${p.nombre} por ${pesos(total(p.valorBaseCuota))}.`)
      setDialogo(null)
      alGuardar()
    } catch (e) {
      setError(e.message)
      setDialogo(null)
    } finally {
      setEnviando(false)
    }
  }

  const opciones = datos.periodos.map((x) => ({ valor: x.periodo, texto: x.corto }))

  return (
    <div className="lado">
      <section className="superficie" aria-labelledby="titulo-periodo">
        <div className="cabeza">
          <h2 id="titulo-periodo">Periodo de facturación</h2>
          <Segmentos etiqueta="Periodo" opciones={opciones} valor={p.periodo} alCambiar={alCambiarPeriodo} />
        </div>
        <div className="cuerpo pila" style={{ gap: 'var(--e5)' }}>
          <dl className="datos">
            <div><dt>Estado</dt><dd>
              {p.generado ? <Pildora tono="ok">Generado</Pildora>
                : p.valorBaseCuota ? <Pildora tono="al">Por generar</Pildora> : <Pildora tono="al">Sin valor base</Pildora>}
            </dd></div>
            <div><dt>Vencimiento de la cuota</dt><dd>{fechaConAnio(p.fechaVencimiento)}</dd></div>
            <div><dt>Inmuebles activos que pagan cuota</dt><dd className="num">{datos.inmueblesActivos}</dd></div>
            <div><dt>Total a facturar</dt><dd className="num fuerte">{p.valorBaseCuota ? pesos(total(p.valorBaseCuota)) : 'Falta el valor base'}</dd></div>
          </dl>
          <form className="formulario" noValidate onSubmit={(e) => { e.preventDefault(); guardar() }}>
            <CampoPesos rotulo="Valor base de la cuota" placeholder="100 000 000" value={texto} disabled={!!p.generado} error={error}
              onChange={(e) => { setTexto(e.target.value); setError(null) }}
              onBlur={() => { if (escrito > 0) setTexto(cifra(escrito)) }}
              ayuda={p.generado
                ? `Las cuotas de ${p.nombre} ya se generaron con este valor. Si una quedó mal, anúlala y crea una obligación individual.`
                : 'Es el total mensual que se reparte entre los inmuebles según su coeficiente. Noviembre usó $ 100 000 000.'} />
            {!p.generado && (
              <div className="fila">
                <button className="btn segundo" type="submit">Guardar valor base</button>
              </div>
            )}
          </form>
        </div>
        <div className="pie">
          <span>{p.generado
            ? `${datos.inmueblesActivos} cuotas generadas ${p.generado.cuando} por ${p.generado.quien}`
            : `Las cuotas de ${p.nombre} todavía no se han generado`}</span>
          <button className="btn" type="button" onClick={pedirGenerar}>Generar obligaciones del periodo</button>
        </div>
      </section>

      <aside className="superficie" aria-labelledby="titulo-cuota">
        <div className="cabeza">
          <div>
            <h2 id="titulo-cuota">Cuota de cada inmueble</h2>
            <p className="guia">Valor base por el coeficiente del inmueble</p>
          </div>
        </div>
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead><tr><th>Inmueble</th><th className="num">Coeficiente</th><th className="num">Cuota</th></tr></thead>
            <tbody>
              {datos.ejemplosCoeficiente.map((e) => (
                <tr key={e.inmueble}>
                  <td className="identificador">{e.inmueble}</td>
                  <td className="num">{coeficiente(e.coeficiente)}</td>
                  <td className="num">{baseEjemplos ? pesos(baseEjemplos * e.coeficiente) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pie"><span>Los {datos.inmueblesActivos} coeficientes activos suman {coeficiente(datos.sumaCoeficientes)}</span></div>
      </aside>

      <Dialogo abierto={dialogo === 'generar'} alCerrar={() => setDialogo(null)} titulo={`Generar las cuotas de ${p.nombre}`}
        guia="Se crea una cuota ordinaria pendiente para cada inmueble activo cuyo tipo paga cuota." alEnviar={generar}
        pie={<>
          <button className="btn segundo" type="button" onClick={() => setDialogo(null)}>Cancelar</button>
          <button className="btn" type="submit" disabled={enviando}>Generar {datos.inmueblesActivos} cuotas</button>
        </>}>
        <div className="pila">
          <dl className="datos">
            <div><dt>Inmuebles activos</dt><dd className="num fuerte">{datos.inmueblesActivos}</dd></div>
            <div><dt>Total a facturar</dt><dd className="num fuerte">{p.valorBaseCuota && pesos(total(p.valorBaseCuota))}</dd></div>
            <div><dt>Valor base</dt><dd className="num">{p.valorBaseCuota && pesos(p.valorBaseCuota)}</dd></div>
            <div><dt>Vencen el</dt><dd>{fechaConAnio(p.fechaVencimiento)}</dd></div>
          </dl>
          <div className="aviso">
            <p>No se incluyen <span className="identificador">B-0101</span>, que está desactivado, ni las zonas comunes y los parqueaderos de visitantes, porque su tipo no paga cuota.</p>
            <p>Cada periodo se genera una sola vez. Si después falta un cobro, se crea como obligación individual.</p>
          </div>
        </div>
      </Dialogo>

      <Dialogo abierto={dialogo === 'generado'} alCerrar={() => setDialogo(null)} titulo={`Las cuotas de ${p.nombre} ya se generaron`}
        pie={<>
          <button className="btn segundo" type="button" onClick={() => setDialogo(null)}>Cerrar</button>
          <button className="btn" type="button" onClick={() => { setDialogo(null); alCrear() }}>Crear obligación individual</button>
        </>}>
        <div className="pila">
          <div className="aviso al">
            {p.generado && p.valorBaseCuota && (
              <p>{p.generado.quien} generó {p.generado.cuando} las {datos.inmueblesActivos} cuotas por {pesos(total(p.valorBaseCuota))}, con vencimiento el {fecha(p.fechaVencimiento)}.</p>
            )}
            <p>Generarlas otra vez le cobraría dos veces a cada inmueble.</p>
          </div>
          <p className="guia">Si a un inmueble le falta un cobro, crea una obligación individual. Si una cuota quedó mal, anúlala con su motivo y crea la correcta.</p>
        </div>
      </Dialogo>
    </div>
  )
}

// ---------- Lista de obligaciones ----------

function ListaObligaciones({ consulta, alAnular }) {
  const [texto, setTexto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [estado, setEstado] = useState('')

  const lista = consulta.datos?.obligaciones
  const visibles = useMemo(() => (lista || []).filter((o) => {
    const busca = texto.trim().toLowerCase()
    const buscable = `${o.inmueble} ${o.propietario} ${o.descripcion} ${CONCEPTOS[o.concepto]}`.toLowerCase()
    return (!busca || buscable.includes(busca)) && (!concepto || o.concepto === concepto) && (!estado || o.estado === estado)
  }), [lista, texto, concepto, estado])

  const limpiar = () => { setTexto(''); setConcepto(''); setEstado('') }

  return (
    <section className="seccion" aria-labelledby="titulo-lista">
      <div className="encabezado">
        <div>
          <h2 id="titulo-lista">Todas las obligaciones</h2>
          <p className="guia">Ordenadas por vencimiento, de la más antigua a la más reciente</p>
        </div>
      </div>

      <div className="filtros">
        <Buscador valor={texto} alCambiar={setTexto} placeholder="Inmueble, propietario o descripción" etiqueta="Buscar obligación" />
        <label className="campo">
          <span className="solo-lectores">Concepto</span>
          <select value={concepto} onChange={(e) => setConcepto(e.target.value)}>
            <option value="">Todos los conceptos</option>
            {Object.entries(CONCEPTOS).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
          </select>
        </label>
        <label className="campo">
          <span className="solo-lectores">Estado</span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{legible(e)}</option>)}
          </select>
        </label>
      </div>

      <div className="superficie">
        {consulta.cargando && !lista && <Cargando texto="Cargando obligaciones…" />}
        {consulta.error && <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} />}
        {lista && visibles.length === 0 && (
          <Vacio titulo="Ninguna obligación coincide con los filtros"
            accion={<button className="btn segundo" type="button" onClick={limpiar}>Quitar filtros</button>}>
            Busca por la identificación del inmueble, por ejemplo <span className="identificador">A-1104</span>, o quita el filtro de concepto o de estado.
          </Vacio>
        )}
        {visibles.length > 0 && (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Inmueble</th><th>Concepto</th><th>Vence</th>
                  <th className="num">Valor</th><th className="num">Saldo</th><th>Estado</th>
                  <th className="num">Días de mora</th><th><span className="solo-lectores">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <span className="identificador fuerte">{o.inmueble}</span>
                      {o.propietario && <span className="sub">{o.propietario}</span>}
                    </td>
                    <td style={{ minWidth: '16rem' }}>
                      <span className="etiqueta">{CONCEPTOS[o.concepto]}</span>
                      <span className="sub">{o.descripcion}</span>
                      {o.motivoAnulacion && <span className="sub">Motivo: {o.motivoAnulacion}</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fecha(o.fechaVencimiento)}</td>
                    <td className="num">{cifra(o.valor)}</td>
                    <td className="num">{cifra(o.saldoPendiente)}</td>
                    <td><Pildora tono={TONO_OBLIGACION[o.estado]}>{legible(o.estado)}</Pildora></td>
                    <td className="num">{o.diasDeMora || '—'}</td>
                    <td className="acciones-fila">
                      {o.estado !== 'PAGADA' && o.estado !== 'ANULADA' && (
                        <button className="btn riesgo chico" type="button" onClick={() => alAnular(o)}>Anular</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lista && (
          <div className="pie">
            <span>{visibles.length} de {cifra(consulta.datos.registradas)} obligaciones de 2026</span>
            <div className="fila" style={{ gap: 'var(--e1)' }}>
              <button className="btn segundo chico" type="button" disabled>Anterior</button>
              <button className="btn segundo chico" type="button" disabled>Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ---------- Crear obligación individual ----------

function CrearObligacion({ abierto, alCerrar, alCrear }) {
  const confirmar = useConfirmar()
  const idLista = useId()
  const vacio = { concepto: '', inmueble: '', valor: '', vence: '2026-11-30', descripcion: '' }
  const [datos, setDatos] = useState(vacio)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)

  const cambiar = (campo) => (e) => {
    setDatos({ ...datos, [campo]: e.target.value })
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }
  const cerrar = () => { setDatos(vacio); setErrores({}); alCerrar() }

  const crear = async () => {
    const valor = leerPesos(datos.valor)
    const nuevos = {}
    if (!datos.concepto) nuevos.concepto = 'Elige el concepto. Define cómo aparece el cobro en el estado de cuenta.'
    if (!datos.inmueble.trim()) nuevos.inmueble = 'Escribe el inmueble al que se le cobra, por ejemplo A-0902.'
    if (!datos.valor.trim()) nuevos.valor = 'Escribe el valor a cobrar en pesos, por ejemplo 90 000.'
    else if (!(valor > 0)) nuevos.valor = 'Escribe el valor solo con números y mayor que cero, por ejemplo 90 000.'
    if (!datos.vence) nuevos.vence = 'Elige la fecha de vencimiento. Desde el día siguiente cuenta la mora.'
    else if (datos.vence < HOY) nuevos.vence = 'El vencimiento no puede ser anterior a hoy, 14 de noviembre. La mora cuenta desde el día siguiente.'
    if (!datos.descripcion.trim()) nuevos.descripcion = 'Describe el cobro. El propietario lo lee en su estado de cuenta y debe entender de qué es.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length) return

    setEnviando(true)
    try {
      const creada = await carteraDeEjemplo.crearObligacion({
        inmueble: datos.inmueble, concepto: datos.concepto, valor, fechaVencimiento: datos.vence, descripcion: datos.descripcion.trim(),
      })
      confirmar(`Obligación creada: ${CONCEPTOS[creada.concepto].toLowerCase()} para ${creada.inmueble} por ${pesos(valor)}, vence el ${fecha(creada.fechaVencimiento)}.`)
      alCrear()
      cerrar()
    } catch (e) {
      setErrores({
        inmueble: e.estado === 404
          ? `No hay un inmueble activo con la identificación ${datos.inmueble.trim()}. Escríbela como en la escritura, por ejemplo A-0902.`
          : e.message,
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialogo abierto={abierto} alCerrar={cerrar} titulo="Crear obligación individual" alEnviar={crear}
      guia="Un cobro para un solo inmueble. Queda en su estado de cuenta desde hoy."
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit" disabled={enviando}>Crear obligación</button>
      </>}>
      <div className="formulario dos">
        <Campo rotulo="Concepto" ayuda="La cuota ordinaria no se crea aquí: sale de generar el periodo." error={errores.concepto}>
          <select value={datos.concepto} onChange={cambiar('concepto')}>
            <option value="">Elige un concepto</option>
            {CONCEPTOS_INDIVIDUALES.map((c) => <option key={c} value={c}>{CONCEPTOS[c]}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Inmueble" error={errores.inmueble}>
          <input className="identificador" list={idLista} value={datos.inmueble} onChange={cambiar('inmueble')}
            placeholder="A-0902" autoComplete="off" />
        </Campo>
        <CampoPesos rotulo="Valor" placeholder="90 000" value={datos.valor} onChange={cambiar('valor')} error={errores.valor}
          onBlur={() => { const v = leerPesos(datos.valor); if (v > 0) setDatos({ ...datos, valor: cifra(v) }) }} />
        <Campo rotulo="Vence el" error={errores.vence}>
          <input type="date" value={datos.vence} min={HOY} onChange={cambiar('vence')} />
        </Campo>
        <Campo rotulo="Descripción" className="completo" error={errores.descripcion}
          ayuda="Di de qué es y, si es una multa, qué norma del manual de convivencia se incumplió.">
          <textarea value={datos.descripcion} onChange={cambiar('descripcion')}
            placeholder="Uso del salón social después de la medianoche, evento del 31 de octubre" />
        </Campo>
      </div>
      <ListaInmuebles id={idLista} />
    </Dialogo>
  )
}

// ---------- Anular obligación (RN-27) ----------

function AnularObligacion({ obligacion: o, alCerrar, alAnular }) {
  const confirmar = useConfirmar()
  const [motivo, setMotivo] = useState('')
  const [falta, setFalta] = useState(false)

  const cerrar = () => { setMotivo(''); setFalta(false); alCerrar() }
  const anular = async () => {
    if (!motivo.trim()) { setFalta(true); return }
    await carteraDeEjemplo.anularObligacion(o.id, motivo.trim())
    confirmar(`Obligación anulada: ${CONCEPTOS[o.concepto].toLowerCase()} de ${o.inmueble}. El motivo queda en la auditoría.`)
    alAnular()
    cerrar()
  }

  return (
    <Dialogo abierto={!!o} alCerrar={cerrar} titulo="Anular obligación" alEnviar={anular}
      guia={o ? `${o.inmueble} · vence el ${fecha(o.fechaVencimiento)} · ${o.descripcion}` : ''}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn riesgo" type="submit">Anular obligación</button>
      </>}>
      {o && (
        <div className="pila">
          <dl className="datos">
            <div><dt>Concepto</dt><dd>{CONCEPTOS[o.concepto]}</dd></div>
            <div><dt>Saldo que se deja de cobrar</dt><dd className="num fuerte">{pesos(o.saldoPendiente)}</dd></div>
          </dl>
          <div className="aviso al">La obligación no se borra: queda anulada, sin saldo, y el motivo queda en la auditoría. No se puede deshacer.</div>
          <Campo rotulo="Motivo" error={falta ? 'Escribe por qué se anula. Es obligatorio y queda en la auditoría.' : null}>
            <textarea value={motivo} onChange={(e) => { setMotivo(e.target.value); setFalta(false) }}
              placeholder="El consejo revocó la multa en la reunión del 6 de noviembre." />
          </Campo>
        </div>
      )}
    </Dialogo>
  )
}
