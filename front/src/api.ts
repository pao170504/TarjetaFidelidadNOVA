const API_BASE_URL = import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:8000`

export interface Cliente {
  id: string
  nombre: string
  telefono: string
  codigo_qr: string
  fecha_registro: string
}

export type ModalidadPremio = '2x50' | '4xgratis'

export interface ClienteResumen {
  nombre: string
  telefono: string
  codigo_qr: string
  sellos_actuales: number
  sellos_requeridos: number | null
  modalidad_premio: ModalidadPremio | null
}

export interface HistorialItem {
  servicio: string
  fecha: string
}

export interface ClienteProgreso {
  nombre: string
  telefono: string
  codigo_qr: string
  sellos_actuales: number
  sellos_requeridos: number | null
  premio: string
  modalidad_premio: ModalidadPremio | null
  historial: HistorialItem[]
}

class ApiError extends Error {}

// El backend gratuito (Render) se "duerme" tras un rato sin uso, y la
// primera petición después de eso puede fallar por completo en vez de
// simplemente tardar. Reintentamos un par de veces con espera antes de
// darnos por vencidos, para no depender de que la persona recargue a mano.
async function fetchConReintento(url: string, options?: RequestInit, intentos = 3): Promise<Response> {
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      return await fetch(url, options)
    } catch (err) {
      if (intento === intentos) throw err
      await new Promise((resolver) => setTimeout(resolver, 3000))
    }
  }
  throw new Error('No se pudo conectar')
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      // el cuerpo no era JSON, se usa el statusText
    }
    throw new ApiError(detail)
  }
  return res.json() as Promise<T>
}

export interface ServicioCatalogo {
  categoria: string
  nombre: string
}

export function listarClientes(): Promise<ClienteResumen[]> {
  return fetchConReintento(`${API_BASE_URL}/clientes`).then((res) => handle(res))
}

export function listarServicios(): Promise<ServicioCatalogo[]> {
  return fetchConReintento(`${API_BASE_URL}/servicios`).then((res) => handle(res))
}

export function crearCliente(nombre: string, telefono: string): Promise<Cliente> {
  const params = new URLSearchParams({ nombre, telefono })
  return fetchConReintento(`${API_BASE_URL}/clientes?${params}`, { method: 'POST' }).then((res) => handle(res))
}

export function eliminarCliente(codigoQr: string): Promise<{ mensaje: string }> {
  return fetchConReintento(`${API_BASE_URL}/clientes/${encodeURIComponent(codigoQr)}`, {
    method: 'DELETE',
  }).then((res) => handle(res))
}

export function obtenerProgreso(codigoQr: string): Promise<ClienteProgreso> {
  return fetchConReintento(`${API_BASE_URL}/clientes/${encodeURIComponent(codigoQr)}/progreso`).then((res) => handle(res))
}

export function sumarSello(codigoQr: string, servicio: string): Promise<{ mensaje: string; cliente: string }> {
  const params = new URLSearchParams()
  if (servicio) params.set('servicio', servicio)
  return fetchConReintento(`${API_BASE_URL}/sellos/${encodeURIComponent(codigoQr)}?${params}`, {
    method: 'POST',
  }).then((res) => handle(res))
}

export function canjearPremio(codigoQr: string): Promise<{ mensaje: string; cliente: string }> {
  return fetchConReintento(`${API_BASE_URL}/canjes/${encodeURIComponent(codigoQr)}`, {
    method: 'POST',
  }).then((res) => handle(res))
}

export function asignarModalidad(
  codigoQr: string,
  modalidadPremio: ModalidadPremio,
): Promise<{ mensaje: string; modalidad_premio: ModalidadPremio }> {
  const params = new URLSearchParams({ modalidad_premio: modalidadPremio })
  return fetchConReintento(`${API_BASE_URL}/clientes/${encodeURIComponent(codigoQr)}/modalidad?${params}`, {
    method: 'PATCH',
  }).then((res) => handle(res))
}

export function obtenerClavePublicaPush(): Promise<{ clave: string }> {
  return fetchConReintento(`${API_BASE_URL}/push/clave-publica`).then((res) => handle(res))
}

export function suscribirsePush(
  codigoQr: string,
  suscripcion: { endpoint: string; p256dh: string; auth: string },
): Promise<{ mensaje: string }> {
  return fetchConReintento(`${API_BASE_URL}/push/suscribirse/${encodeURIComponent(codigoQr)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(suscripcion),
  }).then((res) => handle(res))
}
