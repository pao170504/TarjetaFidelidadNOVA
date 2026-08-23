import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ServicioCatalogo } from '../api'

interface SearchableSelectProps {
  opciones: ServicioCatalogo[]
  valor: string
  onChange: (valor: string) => void
  placeholder?: string
}

export function SearchableSelect({ opciones, valor, onChange, placeholder }: SearchableSelectProps) {
  const [abierto, setAbierto] = useState(false)
  const [posicion, setPosicion] = useState<{
    left: number
    width: number
    maxHeight: number
    top?: number
    bottom?: number
  }>({ left: 0, width: 0, maxHeight: 220 })
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  function actualizarPosicion() {
    const rect = inputRef.current?.getBoundingClientRect()
    if (!rect) return
    const margen = 10
    const espacioAbajo = window.innerHeight - rect.bottom - margen
    const espacioArriba = rect.top - margen
    const abreAbajo = espacioAbajo >= 160 || espacioAbajo >= espacioArriba

    setPosicion({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, Math.min(220, abreAbajo ? espacioAbajo : espacioArriba)),
      ...(abreAbajo ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 }),
    })
  }

  useEffect(() => {
    if (!abierto) return
    actualizarPosicion()
    window.addEventListener('scroll', actualizarPosicion, true)
    window.addEventListener('resize', actualizarPosicion)
    return () => {
      window.removeEventListener('scroll', actualizarPosicion, true)
      window.removeEventListener('resize', actualizarPosicion)
    }
  }, [abierto])

  useEffect(() => {
    function alClickAfuera(e: MouseEvent) {
      const objetivo = e.target as Node
      if (inputRef.current?.contains(objetivo)) return
      if (menuRef.current?.contains(objetivo)) return
      setAbierto(false)
    }
    document.addEventListener('mousedown', alClickAfuera)
    return () => document.removeEventListener('mousedown', alClickAfuera)
  }, [])

  const q = valor.trim().toLowerCase()
  const filtradas = q
    ? opciones.filter((o) => o.nombre.toLowerCase().includes(q) || o.categoria.toLowerCase().includes(q))
    : opciones

  const categorias = [...new Set(filtradas.map((o) => o.categoria))]

  function elegir(nombre: string) {
    onChange(nombre)
    setAbierto(false)
  }

  return (
    <div className="searchable-select">
      <input
        ref={inputRef}
        className="admin-input"
        value={valor}
        placeholder={placeholder}
        onFocus={() => setAbierto(true)}
        onChange={(e) => {
          onChange(e.target.value)
          setAbierto(true)
        }}
      />
      {abierto &&
        filtradas.length > 0 &&
        createPortal(
          <div
            className="searchable-select-menu"
            ref={menuRef}
            style={{
              top: posicion.top,
              bottom: posicion.bottom,
              left: posicion.left,
              width: posicion.width,
              maxHeight: posicion.maxHeight,
            }}
          >
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
          </div>,
          document.body,
        )}
    </div>
  )
}
