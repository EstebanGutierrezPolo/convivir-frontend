import { useState } from 'react'

import { tiposInmuebleApi } from '../../api/inmuebles.js'
import { Cargando, Encabezado, ErrorDeCarga, Segmentos, Vacio } from '../../componentes/Basicos.jsx'
import Campo from '../../componentes/Campo.jsx'
import { useConfirmar } from '../../componentes/Confirmaciones.jsx'
import Dialogo from '../../componentes/Dialogo.jsx'
import Pildora from '../../componentes/Pildora.jsx'
import { pesos } from '../../utilidades/formato.js'
import { useConsulta } from '../../utilidades/useConsulta.js'
import { numero } from './Inmuebles.jsx'

// CU-19 Gestionar tipos de inmueble. Conectada a /api/tipos-inmueble.

const UNIDADES = [
  { valor: 'POR_HORA', texto: 'Por hora', corto: 'por hora' },
  { valor: 'POR_DIA', texto: 'Por día', corto: 'por día' },
  { valor: 'POR_EVENTO', texto: 'Por evento', corto: 'por evento' },
]

export default function TiposInmueble() {
  const tipos = useConsulta(() => tiposInmuebleApi.consultar())
  const confirmar = useConfirmar()
  const [editando, setEditando] = useState(null)
  const [desactivando, setDesactivando] = useState(null)
  const [errorDesactivar, setErrorDesactivar] = useState(null)

  const lista = tipos.datos || []

  const desactivar = async () => {
    try {
      await tiposInmuebleApi.desactivar(desactivando.id)
      confirmar(`Tipo ${desactivando.nombre} desactivado.`)
      setDesactivando(null)
      tipos.recargar()
    } catch (e) {
      setErrorDesactivar(e.message)
    }
  }

  return (
    <main className="pagina">
      <Encabezado titulo="Tipos de inmueble"
        guia="Cada tipo define si paga cuota, si se puede ceder y si se reserva, y a qué tarifa."
        acciones={<button className="btn" type="button" onClick={() => setEditando({})}>Registrar tipo</button>} />

      <div className="superficie">
        {tipos.cargando && <Cargando texto="Cargando tipos…" />}
        {tipos.error && <ErrorDeCarga error={tipos.error} alReintentar={tipos.recargar} />}
        {tipos.datos && lista.length === 0 && (
          <Vacio titulo="Todavía no hay tipos de inmueble"
            accion={<button className="btn" type="button" onClick={() => setEditando({})}>Registrar tipo</button>}>
            Empieza por Apartamento, Parqueadero y las zonas comunes que se reservan.
          </Vacio>
        )}
        {lista.length > 0 && (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr><th>Tipo</th><th>Condiciones</th><th className="num">Tarifa</th><th className="num">Multa</th><th>Estado</th><th><span className="solo-lectores">Acciones</span></th></tr>
              </thead>
              <tbody>
                {lista.map((t) => (
                  <tr key={t.id}>
                    <td className="fuerte">{t.nombre}{t.descripcion && <span className="sub">{t.descripcion}</span>}</td>
                    <td>
                      <div className="fila" style={{ gap: 'var(--e1)' }}>
                        {t.esBienComun && <span className="etiqueta">Bien común</span>}
                        {t.generaCuota && <span className="etiqueta">Paga cuota</span>}
                        {t.permiteCesion && <span className="etiqueta">Se cede</span>}
                        {t.permiteReserva && <span className="etiqueta">Se reserva</span>}
                      </div>
                    </td>
                    <td className="num">
                      {t.permiteReserva ? <>{t.valorTarifa > 0 ? pesos(t.valorTarifa) : 'Sin costo'}<span className="sub" style={{ fontFamily: 'var(--texto)' }}>{UNIDADES.find((u) => u.valor === t.unidadTarifa)?.corto}</span></> : '—'}
                    </td>
                    <td className="num">{t.permiteReserva && t.valorMulta > 0 ? pesos(t.valorMulta) : '—'}</td>
                    <td>{t.estado === 'ACTIVO' ? <Pildora tono="ok">Activo</Pildora> : <Pildora>Inactivo</Pildora>}</td>
                    <td className="acciones-fila">
                      {t.estado === 'ACTIVO' && (
                        <>
                          <button className="btn texto chico" type="button" onClick={() => setEditando(t)}>Modificar</button>
                          <button className="btn texto chico" type="button" onClick={() => { setErrorDesactivar(null); setDesactivando(t) }}>Desactivar</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditarTipo tipo={editando} alCerrar={() => setEditando(null)} alGuardar={tipos.recargar} />

      <Dialogo abierto={!!desactivando} alCerrar={() => setDesactivando(null)} titulo={`Desactivar ${desactivando?.nombre || ''}`}
        alEnviar={desactivar}
        pie={<>
          <button className="btn segundo" type="button" onClick={() => setDesactivando(null)}>Cancelar</button>
          <button className="btn riesgo" type="submit">Desactivar tipo</button>
        </>}>
        {errorDesactivar
          ? <div className="aviso no" role="alert">{errorDesactivar} Desactiva o cambia esos inmuebles primero.</div>
          : <p>No se podrán registrar inmuebles nuevos de este tipo. Los que ya existen lo conservan.</p>}
      </Dialogo>
    </main>
  )
}

function EditarTipo({ tipo, alCerrar, alGuardar }) {
  const confirmar = useConfirmar()
  const esNuevo = !tipo?.id
  const inicial = {
    nombre: '', descripcion: '', esBienComun: false, permiteCesion: false, permiteReserva: false, generaCuota: true,
    valorTarifa: '', unidadTarifa: 'POR_HORA', valorMulta: '',
  }
  const [datos, setDatos] = useState(null)
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const valores = datos || (tipo ? {
    ...inicial, ...tipo,
    descripcion: tipo.descripcion || '',
    valorTarifa: tipo.valorTarifa ? String(tipo.valorTarifa) : '',
    valorMulta: tipo.valorMulta ? String(tipo.valorMulta) : '',
    unidadTarifa: tipo.unidadTarifa || 'POR_HORA',
  } : inicial)
  const poner = (campo, valor) => {
    setDatos({ ...valores, [campo]: valor })
    if (errores[campo]) setErrores({ ...errores, [campo]: null })
  }

  const cerrar = () => {
    setDatos(null)
    setErrores({})
    setErrorServidor(null)
    alCerrar()
  }

  const guardar = async () => {
    const tarifa = valores.valorTarifa === '' ? 0 : numero(valores.valorTarifa)
    const multa = valores.valorMulta === '' ? 0 : numero(valores.valorMulta)
    const nuevos = {}
    if (esNuevo && !valores.nombre.trim()) nuevos.nombre = 'Escribe el nombre del tipo, por ejemplo Apartamento o Zona BBQ.'
    if (valores.permiteReserva && (Number.isNaN(tarifa) || tarifa < 0)) nuevos.valorTarifa = 'Escribe la tarifa en pesos, sin puntos. Si no se cobra, escribe 0.'
    if (valores.permiteReserva && (Number.isNaN(multa) || multa < 0)) nuevos.valorMulta = 'Escribe la multa en pesos, sin puntos. Si no hay multa, escribe 0.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length) return

    const cuerpo = {
      nombre: valores.nombre.trim(), descripcion: valores.descripcion.trim() || null, esBienComun: valores.esBienComun,
      permiteCesion: valores.permiteCesion, permiteReserva: valores.permiteReserva, generaCuota: valores.generaCuota,
      valorTarifa: valores.permiteReserva ? tarifa : 0, unidadTarifa: valores.permiteReserva ? valores.unidadTarifa : null,
      valorMulta: valores.permiteReserva ? multa : 0,
    }
    setEnviando(true)
    setErrorServidor(null)
    try {
      if (esNuevo) await tiposInmuebleApi.registrar(cuerpo)
      else await tiposInmuebleApi.modificar(tipo.id, cuerpo)
      confirmar(esNuevo ? `Tipo ${cuerpo.nombre} registrado.` : `Tipo ${tipo.nombre} modificado.`)
      alGuardar()
      cerrar()
    } catch (e) {
      if (e.estado === 409) setErrores({ nombre: e.message })
      else setErrorServidor(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialogo abierto={!!tipo} alCerrar={cerrar} titulo={esNuevo ? 'Registrar tipo de inmueble' : `Modificar ${tipo?.nombre}`}
      alEnviar={guardar}
      pie={<>
        <button className="btn segundo" type="button" onClick={cerrar}>Cancelar</button>
        <button className="btn" type="submit" disabled={enviando}>{esNuevo ? 'Registrar tipo' : 'Guardar cambios'}</button>
      </>}>
      {errorServidor && <div className="aviso no" role="alert" style={{ marginBottom: 'var(--e4)' }}>{errorServidor}</div>}
      <div className="formulario">
        {esNuevo && (
          <Campo rotulo="Nombre" error={errores.nombre}>
            <input value={valores.nombre} onChange={(e) => poner('nombre', e.target.value)} placeholder="Zona BBQ" />
          </Campo>
        )}
        <Campo rotulo="Descripción" opcional>
          <input value={valores.descripcion} onChange={(e) => poner('descripcion', e.target.value)}
            placeholder="Zona común que se reserva por hora" />
        </Campo>
        <div className="pila chica">
          {esNuevo && (
            <label className="interruptor">
              <input type="checkbox" checked={valores.esBienComun} onChange={(e) => poner('esBienComun', e.target.checked)} />
              Es un bien común de la copropiedad
            </label>
          )}
          <label className="interruptor">
            <input type="checkbox" checked={valores.generaCuota} onChange={(e) => poner('generaCuota', e.target.checked)} />
            Paga cuota de administración
          </label>
          <label className="interruptor">
            <input type="checkbox" checked={valores.permiteCesion} onChange={(e) => poner('permiteCesion', e.target.checked)} />
            Se puede ceder a otro inmueble
          </label>
          <label className="interruptor">
            <input type="checkbox" checked={valores.permiteReserva} onChange={(e) => poner('permiteReserva', e.target.checked)} />
            Los residentes lo pueden reservar
          </label>
        </div>
        {valores.permiteReserva && (
          <fieldset className="superficie relleno">
            <legend className="rotulo" style={{ padding: '0 var(--e2)' }}>Tarifa de la reserva</legend>
            <div className="formulario dos">
              <div className="campo completo">
                <span className="rotulo">Se cobra</span>
                <Segmentos etiqueta="Unidad de la tarifa" opciones={UNIDADES} valor={valores.unidadTarifa}
                  alCambiar={(v) => poner('unidadTarifa', v)} />
              </div>
              <Campo rotulo="Tarifa" ayuda="En pesos, sin puntos. 0 si no se cobra." error={errores.valorTarifa}>
                <input className="num" inputMode="numeric" value={valores.valorTarifa}
                  onChange={(e) => poner('valorTarifa', e.target.value)} placeholder="25000" />
              </Campo>
              <Campo rotulo="Multa por incumplimiento" ayuda="En pesos. 0 si no hay multa." error={errores.valorMulta}>
                <input className="num" inputMode="numeric" value={valores.valorMulta}
                  onChange={(e) => poner('valorMulta', e.target.value)} placeholder="50000" />
              </Campo>
            </div>
          </fieldset>
        )}
      </div>
    </Dialogo>
  )
}
