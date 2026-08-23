import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage'
import { ClientCardPage } from './pages/ClientCardPage'
import { ULTIMO_CODIGO_KEY } from './clienteStorage'

// En iOS, el ícono agregado a la pantalla de inicio abre "/" sin importar
// qué manifest personalizado hayamos armado (Safari ignora ese truco).
// Por eso "/" revisa si este dispositivo ya visitó la tarjeta de una
// clienta y la manda directo ahí en vez de al panel de admin.
function RootRedirect() {
  let destino = '/admin'
  try {
    const ultimoCodigo = localStorage.getItem(ULTIMO_CODIGO_KEY)
    if (ultimoCodigo) destino = `/c/${ultimoCodigo}`
  } catch {
    // localStorage no disponible (modo privado, etc.) - se va al admin
  }
  return <Navigate to={destino} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/c/:codigoQr" element={<ClientCardPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default App
