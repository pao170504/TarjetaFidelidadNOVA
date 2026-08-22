import type { HistorialItem } from '../api'

interface NovaHistoryProps {
  historial: HistorialItem[]
}

export function NovaHistory({ historial }: NovaHistoryProps) {
  return (
    <div>
      <div className="nova-history-title">HISTORIAL</div>
      {historial.length === 0 && <div className="nova-history-empty">Todavía no hay servicios registrados</div>}
      {historial.map((item, i) => (
        <div className="nova-history-row" key={i}>
          <span>{item.servicio}</span>
          <span className="nova-history-date">{item.fecha}</span>
        </div>
      ))}
    </div>
  )
}
