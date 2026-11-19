import { Link } from 'react-router'

import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga } from '../../componentes/Basicos.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { useSesion } from '../../aplicacion/sesion.jsx'
import { HOY, MEDIOS, diasEntre, carteraDeEjemplo } from '../../datos/cartera.js'
import { fecha, pesos } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'
import { cuando } from './PagoPresencial.jsx'

// Panel de la administradora: resume CU-11, CU-13, CU-14, CU-16 y CU-21. Datos de ejemplo hasta que exista la API.
// Cifras: PeriodoFacturacion (facturado), Pago CONFIRMADO (recaudo), Obligacion.calcularDiasDeMora() (cartera vencida)

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Cuatro cifras en una fila en escritorio, dos en tableta y una en el teléfono.
// Las cifras en pesos no caben en las columnas de .r4 entre 52 y 75 rem.
const ESTILO_CIFRAS = `
  .cifras { display: grid; gap: var(--e4); grid-template-columns: repeat(4, minmax(0, 1fr)); }
  @media (max-width: 75rem) { .cifras { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 34rem) { .cifras { grid-template-columns: minmax(0, 1fr); } }
  .cifras .cifra .valor { font-size: var(--t-xl); }
`
// Renglón enlazado de la lista de pendientes
const ESTILO_RENGLON = `
  .lista a.renglon:hover b { color: var(--convivir); text-decoration: underline; text-underline-offset: 2px; }
  .lista a.renglon .flecha { color: var(--acero); flex: none; }
`

/** Fila de cifras del periodo; la comparten el inicio y el estado de cartera. */
export function EstiloCifras() {
  return <style href="convivir-cifras" precedence="default">{ESTILO_CIFRAS}</style>
}

const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0)

export default function Inicio() {
  const { sesion } = useSesion()
  const inicio = useConsulta(() => carteraDeEjemplo.inicio())
  const nombre = (sesion?.persona || 'Paula Ortega').split(' ')[0]

  if (inicio.cargando && !inicio.datos) return <main className="pagina"><Cargando texto="Cargando el resumen…" /></main>
  if (inicio.error) {
    return <main className="pagina"><div className="superficie"><ErrorDeCarga error={inicio.error} alReintentar={inicio.recargar} /></div></main>
  }

  const d = inicio.datos
  const [anio, mes, dia] = HOY.split('-').map(Number)
  const hoyTexto = `${DIAS[new Date(anio, mes - 1, dia).getDay()]} ${fecha(HOY)}`
  const faltan = diasEntre(HOY, d.periodo.fechaVencimiento)
  const recaudoPct = porcentaje(d.recaudo.total, d.recaudo.facturado)
  const masDe90 = [...d.cartera.masDe90].sort((a, b) => b.saldoVencido - a.saldoVencido)

  const pendientes = [
    {
      id: 'reservas', ruta: '/administrador/reservas', titulo: <>Confirmar {d.reservasPorConfirmar.cuantas} reservas</>,
      detalle: <>La más próxima: Salón social, sábado 21 de noviembre, para <span className="identificador">B-0814</span></>,
      estado: <Pildora tono="al">Por confirmar</Pildora>,
    },
    {
      id: 'reportes', ruta: '/administrador/reportes', titulo: <>Asignar {d.reportesSinAsignar.cuantos} reportes</>,
      detalle: <>El más antiguo: filtración en el sótano 2, junto a <span className="identificador">P-114</span>, desde el miércoles</>,
      estado: <Pildora tono="al">Sin asignar</Pildora>,
    },
    {
      id: 'paz-y-salvo', ruta: '/administrador/cartera?inmueble=A-0401#paz-y-salvo',
      titulo: <>Expedir el paz y salvo de <span className="identificador">A-0401</span></>,
      detalle: 'Gloria Ariza lo pidió ayer para un trámite de crédito. Pagó noviembre hoy a las 8:05 a. m.',
      estado: <Pildora tono="ok">Al día</Pildora>,
    },
    masDe90.length > 0 && {
      id: 'mora', ruta: '/administrador/cartera',
      titulo: <>Revisar {masDe90.length} {masDe90.length === 1 ? 'inmueble' : 'inmuebles'} con más de 90 días en mora</>,
      detalle: masDe90.map((f, i) => (
        <span key={f.inmueble}>
          {i > 0 && (i === masDe90.length - 1 ? ' y ' : ', ')}
          <span className="identificador">{f.inmueble}</span> debe <span className="num">{pesos(f.saldoVencido)}</span>
        </span>
      )),
      estado: <Pildora tono="no">Más de 90 días</Pildora>,
    },
    !d.siguientePeriodo.valorBaseCuota && {
      id: 'valor-base', ruta: `/administrador/obligaciones?periodo=${d.siguientePeriodo.periodo}`,
      titulo: 'Configurar el valor base de diciembre',
      detalle: `Sin él no se pueden generar las cuotas de diciembre, que vencen el ${Number(d.siguientePeriodo.fechaVencimiento.slice(8))}`,
      estado: <Pildora tono="al">Sin configurar</Pildora>,
    },
  ].filter(Boolean)

  return (
    <main className="pagina">
      <EstiloCifras />
      <style href="convivir-inicio-renglon" precedence="default">{ESTILO_RENGLON}</style>

      <Encabezado titulo={`Hola, ${nombre}`}
        guia={`${hoyTexto} · la cuota de noviembre vence el ${Number(d.periodo.fechaVencimiento.slice(8))}, en ${faltan} días`}
        acciones={<>
          <Link className="btn segundo" to="/administrador/obligaciones">Ver obligaciones</Link>
          <Link className="btn" to="/administrador/pago-presencial">Registrar pago</Link>
        </>} />

      <AvisoDatosDeEjemplo casoDeUso="CU-11, CU-13, CU-14, CU-16 y CU-21" />

      <div className="cifras">
        <Link className="superficie cifra enlazada" to="/administrador/cartera">
          <div className="etiqueta">Recaudo de noviembre</div>
          <div className="valor">{pesos(d.recaudo.total)}</div>
          <div className="proporcion" role="img" aria-label={`${recaudoPct} por ciento de lo facturado`}>
            <span style={{ width: `${Math.min(recaudoPct, 100)}%` }} />
          </div>
          <div className="meta"><span>{recaudoPct} % de <span className="num">{pesos(d.recaudo.facturado)}</span> facturados</span></div>
        </Link>
        <Link className="superficie cifra enlazada" to="/administrador/cartera">
          <div className="etiqueta">Cartera vencida</div>
          <div className="valor">{pesos(d.cartera.vencida)}</div>
          <div className="meta">
            <Pildora tono={d.cartera.enMora ? 'no' : 'ok'}>{d.cartera.enMora ? `${d.cartera.enMora} inmuebles en mora` : 'Nadie en mora'}</Pildora>
            <span>{d.cartera.masDe90.length} con más de 90 días</span>
          </div>
        </Link>
        <Link className="superficie cifra enlazada" to="/administrador/reportes">
          <div className="etiqueta">Reportes sin asignar</div>
          <div className="valor">{d.reportesSinAsignar.cuantos}</div>
          <div className="meta"><Pildora tono="al">El más antiguo, {d.reportesSinAsignar.masAntiguo}</Pildora></div>
        </Link>
        <Link className="superficie cifra enlazada" to="/administrador/reservas">
          <div className="etiqueta">Reservas por confirmar</div>
          <div className="valor">{d.reservasPorConfirmar.cuantas}</div>
          <div className="meta"><span>La próxima: {d.reservasPorConfirmar.proxima}</span></div>
        </Link>
      </div>

      <div className="lado" style={{ marginTop: 'var(--e5)' }}>
        <div className="pila" style={{ gap: 'var(--e5)' }}>
          <section className="superficie" aria-labelledby="titulo-pendientes">
            <div className="cabeza">
              <h2 id="titulo-pendientes">Pendientes de hoy</h2>
              <span className="guia">{pendientes.length} cosas por resolver</span>
            </div>
            <ul className="lista">
              {pendientes.map((p) => (
                <li key={p.id}>
                  <Link className="renglon" to={p.ruta}>
                    <div className="principal">
                      <b>{p.titulo}</b>
                      <span>{p.detalle}</span>
                    </div>
                    {p.estado}
                    <span className="flecha" aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="superficie" aria-labelledby="titulo-actividad">
            <div className="cabeza">
              <h2 id="titulo-actividad">Actividad reciente</h2>
              <Link className="btn texto chico" to="/administrador/auditoria">Ver auditoría</Link>
            </div>
            <div className="cuerpo">
              <ol className="linea-tiempo">
                {d.actividad.map((a) => (
                  <li key={a.id} className={a.tono}>
                    <div className="cuando">
                      {a.cuando} · {a.quien}{a.inmueble && <>, <span className="identificador">{a.inmueble}</span></>}
                    </div>
                    <div className="que">{a.que}</div>
                    <div className="detalle">
                      {a.partes.map((parte, i) => {
                        if (typeof parte === 'string') return <span key={i}>{parte}</span>
                        if (parte.id) return <span key={i} className="identificador">{parte.id}</span>
                        return <span key={i} className="num">{pesos(parte.pesos)}</span>
                      })}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        <aside className="superficie" aria-labelledby="titulo-pagos">
          <div className="cabeza">
            <h2 id="titulo-pagos">Últimos pagos</h2>
            <Link className="btn texto chico" to="/administrador/pago-presencial">Registrar pago</Link>
          </div>
          <ul className="lista">
            {d.ultimosPagos.map((p) => (
              <li key={p.id}>
                <div className="principal">
                  <b><span className="identificador">{p.inmueble}</span> · {p.pagador}</b>
                  <span>
                    {p.canalRecaudo === 'EN_LINEA' ? 'En línea' : `Presencial, ${MEDIOS[p.medioPago].texto.toLowerCase()}`}
                    {' · '}{cuando(p.fecha, p.hora, { coma: false, horaSiempre: false })}
                  </span>
                </div>
                <span className="num fuerte">{pesos(p.valor)}</span>
              </li>
            ))}
          </ul>
          <div className="pie">
            <span>En noviembre: {d.recaudo.enLinea.pagos} en línea y {d.recaudo.presencial.pagos} presenciales</span>
            <Link className="btn texto chico" to="/administrador/cartera">Ver recaudo</Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
