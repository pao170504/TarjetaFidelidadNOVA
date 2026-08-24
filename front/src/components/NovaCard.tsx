import type { ClienteProgreso } from '../api'

interface NovaCardProps {
  progreso: ClienteProgreso
}

export function NovaCard({ progreso }: NovaCardProps) {
  const { sellos_actuales, sellos_requeridos, nombre, premio } = progreso
  const completa = sellos_requeridos !== null && sellos_actuales >= sellos_requeridos
  const faltan = sellos_requeridos !== null ? Math.max(0, sellos_requeridos - sellos_actuales) : null
  const totalCirculos = sellos_requeridos ?? sellos_actuales

  const circulos = Array.from({ length: Math.max(totalCirculos, sellos_actuales) }, (_, i) => i < sellos_actuales)

  return (
    <div className={`nova-card${completa ? ' nova-card--complete' : ''}`}>
      <div className="nova-card-glow" />
      <div className="nova-card-inner">
        <div className="nova-card-top">
          <div>
            <div className="nova-card-label">{completa ? 'TARJETA COMPLETA' : 'TARJETA DE'}</div>
            <div className="nova-card-name">{nombre}</div>
          </div>
          <div className="nova-card-brand">NOVA</div>
        </div>

        <div className="nova-stamps">
          {circulos.map((llena, i) => (
            <span
              key={i}
              className={`nova-stamp${llena ? '' : ' nova-stamp--empty'}`}
              style={{ animationDelay: `${0.45 + i * 0.06}s` }}
            />
          ))}
        </div>

        <div>
          {sellos_requeridos === null ? (
            <>
              <div className="nova-progress-title">{sellos_actuales} sellos acumulados</div>
              <div className="nova-progress-sub">Aún no tienes una modalidad de premio asignada</div>
            </>
          ) : completa ? (
            <>
              <div className="nova-progress-title">Tu premio te espera</div>
              <div className="nova-progress-sub">{premio}. Canjéalo en tu próxima visita al studio.</div>
            </>
          ) : (
            <>
              <div className="nova-progress-title">
                {faltan === 1 ? 'Te falta 1 servicio' : `Te faltan ${faltan} servicios`}
              </div>
              <div className="nova-progress-sub">
                para tu <span className="nova-progress-accent">{premio}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
