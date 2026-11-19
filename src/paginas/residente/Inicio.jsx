import { Link } from 'react-router'

import { COPROPIEDAD, useSesion } from '../../aplicacion/sesion.jsx'
import { AvisoDatosDeEjemplo, Cargando, Encabezado, ErrorDeCarga, Vacio } from '../../componentes/Basicos.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import {
  HOY, diasEntre, diasPermitidos, fechaLarga, franjaHoraria, horaDe, inicioApi,
} from '../../datos/residente.js'
import { pesos } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'

// Inicio del residente: lo que le toca en su inmueble.
// CU-12 obligación vigente y saldo · CU-05 y CU-06 autorizaciones vigentes · CU-20 reservas solicitadas y
// confirmadas · CU-15 reportes abiertos y en proceso · CU-09 cesión de uso que vence pronto. Datos de ejemplo.

export default function Inicio() {
  const { sesion } = useSesion()
  const resumen = useConsulta(() => inicioApi.resumen())
  const inmueble = sesion.inmuebles?.[0]?.nombre
  const nombre = sesion.persona.split(' ')[0]

  return (
    <main className="pagina">
      <AvisoDatosDeEjemplo casoDeUso="CU-05, CU-06, CU-09, CU-12, CU-15 y CU-20" />
      <Encabezado titulo={`Hola, ${nombre}`}
        guia={`${fechaLarga(HOY, { conDia: true })} · ${inmueble} · ${COPROPIEDAD}`} />

      {!resumen.datos && resumen.cargando && <div className="superficie"><Cargando texto="Cargando tu resumen…" /></div>}
      {resumen.error && <div className="superficie"><ErrorDeCarga error={resumen.error} alReintentar={resumen.recargar} /></div>}
      {resumen.datos && <Resumen datos={resumen.datos} />}
    </main>
  )
}

function Resumen({ datos }) {
  const { cuota, multa, cesion, zonas } = datos
  const faltanCuota = diasEntre(HOY, cuota.fechaVencimiento)
  const vence = `Vence el ${fechaLarga(cuota.fechaVencimiento)}, en ${faltanCuota} días.`

  const ocasionales = datos.visitas.filter((a) => a.tipoAutorizacion === 'OCASIONAL')
    .sort((a, b) => (a.fechaInicio + a.horarios).localeCompare(b.fechaInicio + b.horarios))
  const visitas = [...ocasionales, ...datos.visitas.filter((a) => a.tipoAutorizacion === 'RECURRENTE')]
  const reservas = [...datos.reservas].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const reportes = [...datos.reportes].sort((a, b) => a.fechaCreacion.localeCompare(b.fechaCreacion))

  return (
    <>
      <div className="lado">
        <div className="pila">
          {/* Estado de cuenta: lo que debe pagar y cuándo vence */}
          <section className="ficha ok" aria-labelledby="titulo-cuenta">
            <div className="fila entre" style={{ alignItems: 'flex-start' }}>
              <h2 id="titulo-cuenta" style={{ fontSize: 'var(--t-base)', fontWeight: 600, letterSpacing: 0 }}>Tu estado de cuenta</h2>
              {cuota.estado === 'PAGADA' && <Pildora tono="ok">Pagada</Pildora>}
              {cuota.estado === 'PAGADA_PARCIALMENTE' && <Pildora tono="al">Pagada en parte</Pildora>}
              {cuota.estado === 'PENDIENTE' && <Pildora tono="ok">Al día</Pildora>}
            </div>
            <div className="cifra" style={{ padding: 0, marginTop: 'var(--e3)' }}>
              <div className="etiqueta">{cuota.descripcion}</div>
              <div className="valor">{pesos(cuota.saldoPendiente)}</div>
              <div className="meta">
                {cuota.estado === 'PAGADA' && `Pagada el ${fechaLarga(cuota.fechaPago)}. No tienes nada vencido.`}
                {cuota.estado === 'PAGADA_PARCIALMENTE'
                  && `Ya abonaste ${pesos(cuota.valor - cuota.saldoPendiente)}. Lo que falta vence el ${fechaLarga(cuota.fechaVencimiento)}, en ${faltanCuota} días.`}
                {cuota.estado === 'PENDIENTE' && `${vence} No tienes nada vencido.`}
              </div>
            </div>
            <div className="fila" style={{ marginTop: 'var(--e4)', gap: 'var(--e2)' }}>
              {cuota.saldoPendiente > 0 && <Link className="btn" to="/residente/pagos">Pagar cuota</Link>}
              <Link className="btn texto" to="/residente/pagos#historial">Ver historial de pagos</Link>
            </div>
            {multa && multa.saldoPendiente > 0 && (
              <p className="guia" style={{ marginTop: 'var(--e4)', paddingTop: 'var(--e3)', borderTop: '1px solid var(--borde-f)' }}>
                La multa de <span className="num">{pesos(multa.valor)}</span> por ruido de octubre está a cargo del propietario, {multa.aCargoDe}. No tienes que pagarla tú.
              </p>
            )}
          </section>

          {cesion.estado === 'VIGENTE' && (
            <div className="aviso al">
              <p><b>La cesión del parqueadero <span className="identificador">{cesion.parqueadero}</span> vence el {fechaLarga(cesion.fechaFin)}.</b></p>
              <p>Si lo vas a seguir usando, pídele a {cesion.cedente} que la renueve con la administración. <Link to="/residente/vehiculos">Ver vehículos y parqueadero</Link></p>
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <aside className="superficie" aria-labelledby="titulo-accesos">
          <div className="cabeza"><h2 id="titulo-accesos">Qué quieres hacer</h2></div>
          <ul className="lista">
            <AccesoRapido a="/residente/visitas#registrar" titulo="Registrar visita">Para que portería deje entrar a tu invitado</AccesoRapido>
            <AccesoRapido a="/residente/reservas" titulo="Reservar zona común">Salón social, zona BBQ o cancha</AccesoRapido>
            <AccesoRapido a="/residente/reportes#crear" titulo="Reportar novedad">Un daño, ruido o algo de seguridad</AccesoRapido>
          </ul>
        </aside>
      </div>

      <div className="rejilla r3 seccion">
        {/* Próximas visitas autorizadas */}
        <section className="superficie" aria-labelledby="titulo-visitas">
          <div className="cabeza"><h2 id="titulo-visitas">Próximas visitas</h2></div>
          {visitas.length === 0 && <Vacio titulo="No tienes visitas próximas" />}
          <ul className="lista">
            {visitas.map((a) => <Visita key={a.id} autorizacion={a} />)}
          </ul>
          <div className="pie"><Link className="btn texto chico" to="/residente/visitas">Ver todas las visitas</Link></div>
        </section>

        {/* Sus reservas */}
        <section className="superficie" aria-labelledby="titulo-reservas">
          <div className="cabeza"><h2 id="titulo-reservas">Tus reservas</h2></div>
          {reservas.length === 0 && <Vacio titulo="No tienes reservas activas" />}
          <ul className="lista">
            {reservas.map((r) => (
              <li key={r.id}>
                <div className="principal">
                  <b>{zonas.find((z) => z.clave === r.zona).nombre}</b>
                  <span>
                    {fechaLarga(r.fecha, { conDia: true })}, {horaDe(r.desde)} a {horaDe(r.hasta)} · {r.valorTarifa
                      ? <span className="num">{pesos(r.valorTarifa)}</span> : 'sin costo'}
                  </span>
                </div>
                {r.estado === 'CONFIRMADA' ? <Pildora tono="ok">Confirmada</Pildora> : <Pildora tono="al">Por confirmar</Pildora>}
              </li>
            ))}
          </ul>
          <div className="pie"><Link className="btn texto chico" to="/residente/reservas">Reservar o ver tus reservas</Link></div>
        </section>

        {/* Sus reportes abiertos */}
        <section className="superficie" aria-labelledby="titulo-reportes">
          <div className="cabeza"><h2 id="titulo-reportes">Tus reportes abiertos</h2></div>
          {reportes.length === 0 && <Vacio titulo="No tienes reportes abiertos" />}
          <ul className="lista">
            {reportes.map((r) => (
              <li key={r.id}>
                <div className="principal">
                  <b>{r.categoria} <span className="identificador guia">{r.id}</span></b>
                  <span>{r.resumen || recortar(r.descripcion)}</span>
                  <span>
                    {r.ultimoSeguimiento
                      ? `Último seguimiento: ${r.ultimoSeguimiento}`
                      : `Creado el ${fechaLarga(r.fechaCreacion)} · ${r.responsable ? `lo atiende ${r.responsable}` : 'sin responsable todavía'}`}
                  </span>
                </div>
                <Pildora tono="al">{r.estado === 'EN_PROCESO' ? 'En proceso' : 'Abierto'}</Pildora>
              </li>
            ))}
          </ul>
          <div className="pie"><Link className="btn texto chico" to="/residente/reportes">Ver el seguimiento</Link></div>
        </section>
      </div>
    </>
  )
}

function AccesoRapido({ a, titulo, children }) {
  return (
    <li>
      <Link className="renglon" to={a}>
        <span className="principal"><b>{titulo}</b><span>{children}</span></span>
        <span aria-hidden="true" className="guia">›</span>
      </Link>
    </li>
  )
}

function Visita({ autorizacion: a }) {
  const faltan = diasEntre(HOY, a.fechaFin)
  const porVencer = a.tipoAutorizacion === 'RECURRENTE' && faltan <= 7
  let detalle
  if (a.tipoAutorizacion === 'OCASIONAL') {
    detalle = `${fechaLarga(a.fechaInicio, { conDia: true, hoy: true })}, ${franjaHoraria(a.horarios)}${a.usaParqueaderoVisitantes ? ' · con parqueadero' : ''}`
  } else {
    const dias = diasPermitidos(a.diasPermitidos).toLowerCase()
    detalle = porVencer
      ? `${a.motivoAcceso} · ${dias}, hasta el ${fechaLarga(a.fechaFin)}`
      : `${a.motivoAcceso} · ${dias}, ${franjaHoraria(a.horarios)}`
  }
  return (
    <li>
      <div className="principal"><b>{a.nombreVisitante}</b><span>{detalle}</span></div>
      {porVencer
        ? <Pildora tono="al">Vence en {faltan} {faltan === 1 ? 'día' : 'días'}</Pildora>
        : <Pildora tono="ok">Vigente</Pildora>}
    </li>
  )
}

/** Primeras palabras de la descripción, para el resumen. */
function recortar(texto) {
  if (texto.length <= 48) return texto
  return `${texto.slice(0, 48).replace(/[\s,.;:]+\S*$/, '')}…`
}
