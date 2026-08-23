import { useEffect, useRef, useState } from 'react'
import type { ServicioCatalogo } from '../api'

interface SearchableSelectProps {
  opciones: ServicioCatalogo[]
  valor: string
  onChange: (valor: string) => void
  placeholder?: string
}

export function SearchableSelect({ opciones, valor, onChange, placeholder }: SearchableSelectProps) {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function alClickAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', alClickAfuera)
    return () => document.removeEventListener('mousedown', alClickAfuera)
  }, [])

  const q = valor.trim().toLowerCase()
  const filtradas = q ? opciones.filter((o) => o.nombre.toLowerCase().includes(q)) : opciones

  const categorias = [...new Set(filtradas.map((o) => o.categoria))]

  function elegir(nombre: string) {
    onChange(nombre)
    setAbierto(false)
  }

  return (
    <div className="searchable-select" ref={contenedorRef}>
      <input
        className="admin-input"
        value={valor}
        placeholder={placeholder}
        onFocus={() => setAbierto(true)}
        onChange={(e) => {
          onChange(e.target.value)
          setAbierto(true)
        }}
      />
      {abierto && filtradas.length > 0 && (
        <div className="searchable-select-menu">
          {categorias.map((categoria) => (
            <div key={categoria}>
              <div className="searchable-select-categoria">{categoria}</div>
              {filtradas
                .filter((o) => o.categoria === categoria)
                .map((o) => (
                  <button
                    type="button"
                    key={o.nombre}
                    className="searchable-select-item"
                    onClick={() => elegir(o.nombre)}
                  >
                    {o.nombre}
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
