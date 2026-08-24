import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  asignarModalidad,
  canjearPremio,
  crearCliente,
  eliminarCliente,
  listarClientes,
  listarServicios,
  obtenerProgreso,
  sumarSello,
  type ClienteProgreso,
  type ClienteResumen,
  type ModalidadPremio,
  type ServicioCatalogo,
} from '../api'
import { NovaCard } from '../components/NovaCard'
import { SearchableSelect } from '../components/SearchableSelect'

const CLIENT_BASE_URL = import.meta.env.VITE_CLIENT_BASE_URL ?? window.location.origin

export function AdminPage() {
  const [clientes, setClientes] = useState<ClienteResumen[]>([])
  const [query, setQuery] = useState('')
  const [activoCodigo, setActivoCodigo] = useState<string | null>(null)
  const [activoProgreso, setActivoProgreso] = useState<ClienteProgreso | null>(null)

  const [servicio, setServicio] = useState('')
  const [catalogoServicios, setCatalogoServicios] = useState<ServicioCatalogo[]>([])
  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTel, setNuevoTel] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [canjeando, setCanjeando] = useState(false)
  const [asignandoModalidad, setAsignandoModalidad] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  async function cargarClientes(seleccionar?: string) {
    try {
      const lista = await listarClientes()
      setClientes(lista)
      const objetivo = seleccionar ?? activoCodigo ?? lista[0]?.codigo_qr ?? null
      setActivoCodigo(objetivo && lista.some((c) => c.codigo_qr === objetivo) ? objetivo : lista[0]?.codigo_qr ?? null)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  useEffect(() => {
    listarClientes()
      .then((lista) => {
        setClientes(lista)
        setActivoCodigo(lista[0]?.codigo_qr ?? null)
      })
      .catch((err: Error) => setError(err.message))
    listarServicios()
      .then(setCatalogoServicios)
      .catch((err: Error) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!activoCodigo) return
    obtenerProgreso(activoCodigo)
      .then(setActivoProgreso)
      .catch((err: Error) => setError(err.message))
  }, [activoCodigo])

  const resultados = clientes.filter((c) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return c.nombre.toLowerCase().includes(q) || c.telefono.includes(q)
  })

  async function handleCrearCliente() {
    if (!nuevoNombre.trim()) {
      setErrorNuevo('El nombre es obligatorio')
      return
    }
    setCreando(true)
    setErrorNuevo(null)
    try {
      const cliente = await crearCliente(nuevoNombre.trim(), nuevoTel.trim())
      setNuevoNombre('')
      setNuevoTel('')
      setNuevoAbierto(false)
      await cargarClientes(cliente.codigo_qr)
    } catch (err) {
      setErrorNuevo((err as Error).message)
    } finally {
      setCreando(false)
    }
  }

  async function handleAgregarSello() {
    if (!activoCodigo) return
    setAgregando(true)
    setError(null)
    try {
      await sumarSello(activoCodigo, servicio.trim())
      setServicio('')
      const progreso = await obtenerProgreso(activoCodigo)
      setActivoProgreso(progreso)
      await cargarClientes(activoCodigo)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setAgregando(false)
    }
  }

  async function handleCanjear() {
    if (!activoCodigo) return
    setCanjeando(true)
    setError(null)
    try {
      await canjearPremio(activoCodigo)
      const progreso = await obtenerProgreso(activoCodigo)
      setActivoProgreso(progreso)
      await cargarClientes(activoCodigo)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCanjeando(false)
    }
  }

  async function handleCambiarModalidad(modalidad: ModalidadPremio) {
    if (!activoCodigo) return
    setAsignandoModalidad(true)
    setError(null)
    try {
      await asignarModalidad(activoCodigo, modalidad)
      const progreso = await obtenerProgreso(activoCodigo)
      setActivoProgreso(progreso)
      await cargarClientes(activoCodigo)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setAsignandoModalidad(false)
    }
  }

  async function handleEliminarCliente() {
    if (!activoProgreso || !activoCodigo) return
    const confirmado = window.confirm(
      `¿Eliminar a ${activoProgreso.nombre}? Esto borra su tarjeta, historial y premios de forma permanente.`,
    )
    if (!confirmado) return

    setEliminando(true)
    setError(null)
    try {
      await eliminarCliente(activoCodigo)
      setActivoCodigo(null)
      setActivoProgreso(null)
      await cargarClientes()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEliminando(false)
    }
  }

  const puedeCanjear =
    activoProgreso !== null &&
    activoProgreso.sellos_requeridos !== null &&
    activoProgreso.sellos_actuales >= activoProgreso.sellos_requeridos

  const servicioValido = catalogoServicios.some((s) => s.nombre === servicio)

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-topbar">
          <div className="admin-topbar-brand">
            <span className="admin-topbar-word">NOVA</span>
            <span className="admin-topbar-sub">Panel de fidelidad</span>
          </div>
          <div className="admin-topbar-actions">
            <button className="btn-dark" onClick={() => setNuevoAbierto((v) => !v)}>
              Registrar cliente nuevo
            </button>
            <div className="admin-avatar" />
          </div>
        </div>

        {error && (
          <div className="admin-error" style={{ padding: '10px 28px' }}>
            {error}
          </div>
        )}

        <div className="admin-body">
          <div className="admin-sidebar">
            <input
              className="admin-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o teléfono"
            />

            {nuevoAbierto && (
              <div className="admin-new-client">
                <div className="admin-new-client-label">CLIENTE NUEVO</div>
                <input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre completo"
                />
                <input
                  value={nuevoTel}
                  onChange={(e) => setNuevoTel(e.target.value)}
                  placeholder="Teléfono"
                />
                {errorNuevo && <div className="admin-error">{errorNuevo}</div>}
                <button className="btn-gold" onClick={handleCrearCliente} disabled={creando}>
                  {creando ? 'Creando…' : 'Crear y generar QR'}
                </button>
              </div>
            )}

            <div className="admin-section-label">CLIENTES</div>
            <div className="admin-client-list">
              {resultados.map((c) => (
                <button
                  key={c.codigo_qr}
                  className={`admin-client-item${c.codigo_qr === activoCodigo ? ' admin-client-item--active' : ''}`}
                  onClick={() => setActivoCodigo(c.codigo_qr)}
                >
                  <div>
                    <div className="admin-client-name">{c.nombre}</div>
                    <div className="admin-client-phone">{c.telefono}</div>
                  </div>
                  <span className="admin-client-progress">
                    {c.sellos_actuales}/{c.sellos_requeridos ?? '—'}
                  </span>
                </button>
              ))}
              {resultados.length === 0 && <div className="admin-empty">Sin clientes todavía</div>}
            </div>
          </div>

          <div className="admin-main">
            {!activoProgreso ? (
              <div className="admin-empty">Selecciona o registra una clienta para ver su tarjeta</div>
            ) : (
              <>
                <div className="admin-main-header">
                  <div>
                    <div className="admin-main-name">{activoProgreso.nombre}</div>
                    <div className="admin-main-sub">
                      {activoProgreso.telefono} · {activoProgreso.codigo_qr}
                    </div>
                  </div>
                  <div className="admin-main-header-right">
                    <div className="admin-qr">
                      <QRCodeSVG
                        value={`${CLIENT_BASE_URL}/c/${activoProgreso.codigo_qr}`}
                        size={108}
                        bgColor="#ffffff"
                        fgColor="#111111"
                      />
                    </div>
                    <button className="btn-eliminar-cliente" onClick={handleEliminarCliente} disabled={eliminando}>
                      {eliminando ? 'Eliminando…' : 'Eliminar clienta'}
                    </button>
                  </div>
                </div>

                <div className="admin-card-wrap">
                  <NovaCard progreso={activoProgreso} />
                </div>

                <div className="admin-modalidad">
                  <label htmlFor="modalidad-premio">Modalidad de premio</label>
                  <select
                    id="modalidad-premio"
                    value={activoProgreso.modalidad_premio ?? ''}
                    disabled={asignandoModalidad}
                    onChange={(e) => handleCambiarModalidad(e.target.value as ModalidadPremio)}
                  >
                    <option value="" disabled>
                      Sin asignar
                    </option>
                    <option value="2x50">2 sellos · 50% dto. en una depilación</option>
                    <option value="4xgratis">4 sellos · una depilación gratis</option>
                  </select>
                </div>

                <div className="admin-controls">
                  <SearchableSelect
                    opciones={catalogoServicios}
                    valor={servicio}
                    onChange={setServicio}
                    placeholder="Tipo de servicio"
                  />
                  <button
                    className="btn-add-sello"
                    onClick={handleAgregarSello}
                    disabled={agregando || !servicioValido}
                  >
                    {agregando ? 'Agregando…' : 'Agregar sello'}
                  </button>
                </div>

                {puedeCanjear && (
                  <button className="btn-canjear" onClick={handleCanjear} disabled={canjeando}>
                    {canjeando ? 'Canjeando…' : `Canjear premio · ${activoProgreso.premio}`}
                  </button>
                )}

                <div className="admin-history">
                  <div className="admin-section-label" style={{ marginBottom: 8 }}>
                    HISTORIAL
                  </div>
                  {activoProgreso.historial.length === 0 && (
                    <div className="nova-history-empty">Todavía no hay servicios registrados</div>
                  )}
                  {activoProgreso.historial.map((h, i) => (
                    <div className="admin-history-row" key={i}>
                      <span>{h.servicio}</span>
                      <span>{h.fecha}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
