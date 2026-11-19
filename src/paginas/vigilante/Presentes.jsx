import { useState } from 'react'
import { Link } from 'react-router'

import { AvisoDatosDeEjemplo, Buscador, Cargando, Encabezado, ErrorDeCarga } from '../../componentes/Basicos.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { aLas, comoEntro, porteriaDeEjemplo, TIPOS_INGRESO } from '../../datos/porteria.js'
import { cifra, hora } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// CU-07 Registrar ingreso y salida · Quiénes están dentro (RF-036).
// MovimientoAcceso.consultarPersonasPresentesEnElConjunto(): ingresos sin su salida.
// AutorizacionAcceso.validarVigenciaDeLaAutorizacion(), validarDiaYHorarioPermitido(): vigencia de cada presente.
// MovimientoAcceso.registrarSalidaDelConjunto() (RF-034) y, si sale el vehículo, salida vehicular (RF-053).
// Sin API todavía: datos de ejemplo.

// Tabla de presentes, igual al <style> de la vista: escala de portería, fila en ámbar para quien sigue dentro
// con la autorización vencida, y a 40rem cada fila pasa a ficha para que el vigilante no se desplace de lado.
const ESTILOS = `
.porteria .tabla-presentes { font-size: var(--t-base); }
.porteria .tabla-presentes .sub { font-size: var(--t-sm); }
.porteria .tabla-presentes td:first-child { position: relative; }
.porteria .tabla-presentes tbody tr.atencion,
.porteria .tabla-presentes tbody tr.atencion:hover { background: var(--al-f); }
.porteria .tabla-presentes tbody tr.atencion td:first-child::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--al);
}
.porteria .tabla-presentes .rotulo-movil { display: none; }

@media (max-width: 40rem) {
  .porteria .tabla-presentes, .porteria .tabla-presentes tbody { display: block; }
  .porteria .tabla-presentes thead { display: none; }
  .porteria .tabla-presentes tbody tr {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--e3) var(--e4);
    padding: var(--e4);
    border-bottom: 1px solid var(--borde-f);
  }
  .porteria .tabla-presentes tbody tr:last-child { border-bottom: 0; }
  .porteria .tabla-presentes tbody tr.atencion { border-left: 4px solid var(--al); }
  .porteria .tabla-presentes tbody tr.atencion td:first-child::before { display: none; }
  .porteria .tabla.tabla-presentes td,
  .porteria .tabla.tabla-presentes td:first-child,
  .porteria .tabla.tabla-presentes td:last-child { display: block; padding: 0; border: 0; min-width: 0; }
  .porteria .tabla-presentes .c-persona { grid-column: 1 / -1; }
  .porteria .tabla-presentes .c-autorizacion, .porteria .tabla-presentes .c-accion { grid-column: 1 / -1; }
  .porteria .tabla-presentes .c-accion { text-align: left; }
  .porteria .tabla-presentes .c-accion .btn { width: 100%; min-height: 3rem; }
  .porteria .tabla-presentes .rotulo-movil { display: block; font-size: var(--t-xs); color: var(--acero); font-weight: 500; }
}
`

const FILTROS = [
  { valor: '', texto: 'Todos' },
  { valor: 'VISITA', texto: 'Visitas' },
  { valor: 'RECURRENTE', texto: 'Recurrentes' },
  { valor: 'EXCEPCION', texto: 'Excepciones' },
  { valor: 'revisar', texto: 'Para revisar' },
]

const sinTildes = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '')
const minutosEntre = (desde, hasta) => Math.round((new Date(hasta) - new Date(desde)) / 60000)
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

/** 525 -> "8 h 45 min". */
function duracion(minutos) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (!h) return `${m} min`
  return `${h} h${m ? ` ${String(m).padStart(2, '0')} min` : ''}`
}

/** "Fabián Quintero Díaz y Wilson Ardila Mora". */
function enumerar(nombres) {
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0]
}

/** "Visita de Gloria Ariza", "Excepción confirmada por Marta Oviedo"… */
function descripcion(presente) {
  const texto = comoEntro(presente)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default function Presentes() {
  const consulta = useConsulta(() => Promise.all([
    porteriaDeEjemplo.consultarPresentes(),
    porteriaDeEjemplo.consultarParqueaderosVisitantes(),
  ]))

  if (!consulta.datos) {
    return (
      <main className="pagina">
        <AvisoDatosDeEjemplo casoDeUso="CU-07" />
        <Encabezado titulo="Quién está dentro" />
        <div className="superficie">
          {consulta.cargando && <Cargando />}
          {consulta.error && <ErrorDeCarga error={consulta.error} alReintentar={consulta.recargar} />}
        </div>
      </main>
    )
  }

  const [respuesta, parqueaderos] = consulta.datos
  return (
    <PresentesCargada presentes={respuesta.presentes} actualizadoA={respuesta.actualizadoA}
      totalParqueaderos={parqueaderos.length} />
  )
}

function PresentesCargada({ actualizadoA, totalParqueaderos, ...props }) {
  const confirmar = useConfirmar()
  const [presentes, setPresentes] = useState(props.presentes)
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState('')
  const [seleccionada, setSeleccionada] = useState(null)
  const [saleVehiculo, setSaleVehiculo] = useState(false)

  const lleva = (p) => minutosEntre(p.horaIngreso, actualizadoA)

  const cuentas = { '': presentes.length, VISITA: 0, RECURRENTE: 0, EXCEPCION: 0, revisar: 0 }
  const placas = new Set()
  for (const p of presentes) {
    cuentas[p.tipo] += 1
    if (p.revisar) cuentas.revisar += 1
    if (p.placa) placas.add(p.placa)
  }
  const libres = totalParqueaderos - placas.size
  const revisar = presentes.filter((p) => p.revisar)

  const busca = sinTildes(texto.trim())
  const visibles = presentes
    .filter((p) => {
      if (tipo === 'revisar' && !p.revisar) return false
      if (tipo && tipo !== 'revisar' && p.tipo !== tipo) return false
      if (!busca) return true
      return sinTildes([p.nombre, p.documento, p.unidad, p.anfitrion, p.placa || '', p.parqueadero || ''].join(' ')).includes(busca)
    })
    .sort((a, b) => {
      if (!!a.revisar !== !!b.revisar) return a.revisar ? -1 : 1
      return new Date(b.horaIngreso) - new Date(a.horaIngreso)
    })

  const limpiar = () => { setTexto(''); setTipo('') }

  const verParaRevisar = (e) => {
    e.preventDefault()
    setTexto('')
    setTipo('revisar')
    document.getElementById('tabla')?.scrollIntoView({ behavior: 'smooth' })
  }

  const acompanantes = seleccionada?.placa
    ? presentes.filter((o) => o.documento !== seleccionada.documento && o.placa === seleccionada.placa)
    : []

  const abrirSalida = (p) => {
    const otros = presentes.filter((o) => o.documento !== p.documento && p.placa && o.placa === p.placa)
    setSaleVehiculo(otros.length === 0)
    setSeleccionada(p)
  }

  // Registrar salida: la confirmación conserva el verbo y dice si sale el vehículo.
  const registrarSalida = () => {
    const p = seleccionada
    const sale = !!p.placa && saleVehiculo
    let aviso = `Salida registrada: ${p.nombre}, ${hora(new Date())}.`
    if (sale) aviso += ` Salió el vehículo ${p.placa} y ${p.parqueadero} queda libre.`
    setPresentes(presentes
      .filter((o) => o.documento !== p.documento)
      .map((o) => (sale && o.placa === p.placa ? { ...o, placa: null, parqueadero: null, vehiculoSalio: true } : o)))
    setSeleccionada(null)
    confirmar(aviso)
  }

  return (
    <main className="pagina">
      <style href="convivir-vigilante-presentes" precedence="pagina">{ESTILOS}</style>
      <AvisoDatosDeEjemplo casoDeUso="CU-07" />
      <Encabezado titulo="Quién está dentro"
        guia="Visitas, autorizados y excepciones que entraron por portería y no han salido. Los residentes no aparecen aquí."
        acciones={<Link className="btn segundo" to="/vigilante/porteria">Registrar un ingreso</Link>} />

      <div className="rejilla r3" style={{ marginBottom: 'var(--e5)' }}>
        <div className="superficie cifra">
          <div className="guia">Personas dentro</div>
          <div className="valor">{cuentas['']}</div>
          <div className="meta">
            {plural(cuentas.VISITA, 'visita', 'visitas')} · {plural(cuentas.RECURRENTE, 'recurrente', 'recurrentes')} ·{' '}
            {plural(cuentas.EXCEPCION, 'excepción', 'excepciones')}
          </div>
        </div>
        <a className="superficie cifra enlazada" href="#tabla" onClick={verParaRevisar}>
          <div className="guia">Para revisar</div>
          <div className="valor">{cuentas.revisar}</div>
          <div className="meta">
            {cuentas.revisar
              ? <Pildora tono="al">Autorización vencida</Pildora>
              : <Pildora tono="ok">Todos con autorización vigente</Pildora>}
          </div>
        </a>
        <Link className="superficie cifra enlazada" to="/vigilante/vehiculos">
          <div className="guia">Vehículos de visitantes</div>
          <div className="valor">{placas.size}</div>
          <div className="meta"><span>{libres} de {totalParqueaderos}</span> parqueaderos de visitantes libres</div>
        </Link>
      </div>

      {revisar.length > 0 && (
        <div className="aviso al" style={{ marginBottom: 'var(--e5)' }}>
          <p>
            <b>{enumerar(revisar.map((p) => p.nombre))} {revisar.length > 1 ? 'siguen' : 'sigue'} dentro con la autorización vencida.</b>
          </p>
          <p>Llama al apartamento para confirmar si siguen ahí. Cuando salgan, registra su salida.</p>
        </div>
      )}

      <div className="filtros">
        <Buscador valor={texto} alCambiar={setTexto} placeholder="Nombre, documento, unidad o placa" etiqueta="Buscar en quién está dentro" />
        <div className="segmentos" role="group" aria-label="Tipo de ingreso" style={{ flexWrap: 'wrap' }}>
          {FILTROS.map((f) => (
            <button key={f.valor} type="button" aria-pressed={tipo === f.valor} onClick={() => setTipo(f.valor)}>
              {f.texto} <span className="dato">{cuentas[f.valor]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="superficie" id="tabla">
        {visibles.length > 0 && (
          <div className="tabla-envoltura">
            <table className="tabla tabla-presentes">
              <caption className="solo-lectores">
                Personas dentro del conjunto, primero las que hay que revisar y luego de la más reciente a la más antigua
              </caption>
              <thead>
                <tr>
                  <th>Persona</th><th>Unidad</th><th>Tipo</th><th>Ingreso</th><th>Vehículo</th><th>Autorización</th>
                  <th><span className="solo-lectores">Acción</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.documento} className={p.revisar ? 'atencion' : undefined}>
                    <td className="c-persona">
                      <b>{p.nombre}</b>
                      <span className="sub identificador">CC {cifra(p.documento)}</span>
                    </td>
                    <td className="c-unidad">
                      <span className="rotulo-movil">Unidad</span>
                      <span className="identificador">{p.unidad}</span>
                      <span className="sub">{p.tipo === 'EXCEPCION' ? `Confirmó ${p.anfitrion}` : p.anfitrion}</span>
                    </td>
                    <td className="c-tipo">
                      <span className="rotulo-movil">Tipo</span>
                      <span className="etiqueta">{TIPOS_INGRESO[p.tipo]}</span>
                    </td>
                    <td className="c-ingreso">
                      <span className="rotulo-movil">Ingreso</span>
                      <span className="num">{hora(p.horaIngreso)}</span>
                      <span className="sub">lleva {duracion(lleva(p))}</span>
                    </td>
                    <td className="c-vehiculo">
                      <span className="rotulo-movil">Vehículo</span>
                      {p.placa ? (
                        <>
                          <span className="identificador">{p.placa}</span>
                          <span className="sub">en <span className="identificador">{p.parqueadero}</span></span>
                        </>
                      ) : <span className="guia">{p.vehiculoSalio ? 'Su vehículo ya salió' : 'A pie'}</span>}
                    </td>
                    <td className="c-autorizacion">
                      <span className="rotulo-movil">Autorización</span>
                      {p.autorizacion.tono
                        ? <Pildora tono={p.autorizacion.tono}>{p.autorizacion.texto}</Pildora>
                        : <span className="fuerte">{p.autorizacion.texto}</span>}
                      <span className="sub">{p.autorizacion.detalle}</span>
                    </td>
                    <td className="c-accion acciones-fila">
                      <button className="btn segundo" type="button" onClick={() => abrirSalida(p)}>Registrar salida</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {presentes.length > 0 && visibles.length === 0 && (
          <div className="vacio">
            <svg className="simbolo" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="18" cy="18" r="10" /><path d="m26 26 8 8" />
            </svg>
            <h3>Nadie dentro coincide con la búsqueda</h3>
            <p>
              Busca por nombre, documento, unidad o placa, por ejemplo <span className="identificador">C-0705</span> o{' '}
              <span className="identificador">JKT 512</span>.
            </p>
            <button className="btn segundo" type="button" onClick={limpiar}>Quitar filtros</button>
          </div>
        )}

        {presentes.length === 0 && (
          <div className="vacio">
            <svg className="simbolo" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="6" y="9" width="28" height="22" rx="3" /><circle cx="15" cy="19" r="4" />
              <path d="M10 27c1.5-3 3-4 5-4s3.5 1 5 4M24 17h6M24 22h6" />
            </svg>
            <h3>No hay visitas dentro del conjunto</h3>
            <p>Cuando registres un ingreso en Personas o en Vehículos, aparece aquí con su hora, su unidad y su parqueadero.</p>
            <Link className="btn segundo" to="/vigilante/porteria">Ir a Personas</Link>
          </div>
        )}

        <div className="pie">
          <span>{visibles.length} de {plural(presentes.length, 'persona', 'personas')}</span>
          <span>Actualizado {aLas(actualizadoA)} {hora(actualizadoA)}</span>
        </div>
      </div>

      {/* Registrar salida: new MovimientoAcceso(SALIDA).registrarSalidaDelConjunto() */}
      <Dialogo abierto={!!seleccionada} alCerrar={() => setSeleccionada(null)} alEnviar={registrarSalida}
        titulo={`Registrar la salida de ${seleccionada?.nombre || ''}`}
        guia={seleccionada ? `${descripcion(seleccionada)} · CC ${cifra(seleccionada.documento)}` : ''}
        pie={<>
          <button className="btn segundo" type="button" onClick={() => setSeleccionada(null)}>Cancelar</button>
          <button className="btn" type="submit">Registrar salida</button>
        </>}>
        {seleccionada && (
          <div className="pila">
            <dl className="datos">
              <div><dt>Unidad</dt><dd className="identificador">{seleccionada.unidad}</dd></div>
              <div><dt>Entró</dt><dd>Hoy {aLas(seleccionada.horaIngreso)} {hora(seleccionada.horaIngreso)}</dd></div>
              <div><dt>Lleva dentro</dt><dd>{duracion(lleva(seleccionada))}</dd></div>
            </dl>
            {seleccionada.revisar && (
              <p className="aviso al">Lleva {duracion(lleva(seleccionada))} dentro y {seleccionada.revisar}.</p>
            )}
            {seleccionada.placa && (
              <div>
                <label className="opcion">
                  <input type="checkbox" checked={saleVehiculo} onChange={(e) => setSaleVehiculo(e.target.checked)} />
                  <span>
                    También sale el vehículo <span className="identificador">{seleccionada.placa}</span>
                    <small>
                      {acompanantes.length
                        ? `${acompanantes.map((o) => o.nombre).join(' y ')} ${acompanantes.length > 1
                          ? 'llegaron en el mismo vehículo y siguen dentro.'
                          : 'llegó en el mismo vehículo y sigue dentro.'} Márcalo solo si el vehículo sale ahora.`
                        : `${seleccionada.parqueadero} queda libre.`}
                    </small>
                  </span>
                </label>
              </div>
            )}
          </div>
        )}
      </Dialogo>
    </main>
  )
}
