import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obtenerProgreso, type ClienteProgreso } from '../api'
import { NovaCard } from '../components/NovaCard'
import { NovaHistory } from '../components/NovaHistory'
import { activarNotificaciones, pushSoportado } from '../push'
import { personalizarManifestParaCliente } from '../manifest'
import { recordarCodigoCliente } from '../clienteStorage'

export function ClientCardPage() {
  const { codigoQr } = useParams<{ codigoQr: string }>()
  const [progreso, setProgreso] = useState<ClienteProgreso | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [estadoAviso, setEstadoAviso] = useState<'inactivo' | 'activando' | 'activo' | 'error'>('inactivo')

  useEffect(() => {
    if (!codigoQr) return
    obtenerProgreso(codigoQr)
      .then((data) => {
        setProgreso(data)
        setCargando(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setCargando(false)
      })
  }, [codigoQr])

  useEffect(() => {
    if (pushSoportado() && Notification.permission === 'granted') {
      setEstadoAviso('activo')
    }
  }, [])

  useEffect(() => {
    if (!codigoQr) return
    personalizarManifestParaCliente(codigoQr)
    recordarCodigoCliente(codigoQr)
  }, [codigoQr])

  async function handleActivarAvisos() {
    if (!codigoQr) return
    setEstadoAviso('activando')
    try {
      await activarNotificaciones(codigoQr)
      setEstadoAviso('activo')
    } catch {
      setEstadoAviso('error')
    }
  }

  if (cargando) {
    return <div className="client-state">Cargando tu tarjeta…</div>
  }

  if (error || !progreso) {
    return <div className="client-state">{error ?? 'Cliente no encontrado'}</div>
  }

  return (
    <div className="client-page">
      <div className="client-page-inner">
        <div className="nova-wordmark">
          <span className="nova-wordmark-text">NOVA</span>
          <div className="nova-wordmark-rule">
            <span className="nova-wordmark-line" />
            <span className="nova-wordmark-sub">STUDIO</span>
            <span className="nova-wordmark-line nova-wordmark-line--r" />
          </div>
        </div>

        <NovaCard progreso={progreso} />
        <NovaHistory historial={progreso.historial} />

        {pushSoportado() && estadoAviso !== 'activo' && (
          <button
            className="btn-dark client-notify-btn"
            onClick={handleActivarAvisos}
            disabled={estadoAviso === 'activando'}
          >
            {estadoAviso === 'activando' ? 'Activando…' : 'Avísame cuando pueda reclamar mi premio'}
          </button>
        )}
        {estadoAviso === 'activo' && (
          <div className="client-notify-ok">Te vamos a avisar acá cuando puedas reclamar tu premio</div>
        )}
        {estadoAviso === 'error' && (
          <div className="admin-error" style={{ textAlign: 'center' }}>
            No pudimos activar los avisos. Revisa los permisos de notificaciones del navegador.
          </div>
        )}

        <div className="client-footer">
          Presenta este código en tu próxima visita
          <br />
          <span className="client-footer-code">{progreso.codigo_qr}</span>
        </div>
      </div>
    </div>
  )
}
