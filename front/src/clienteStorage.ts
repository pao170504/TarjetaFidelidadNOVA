export const ULTIMO_CODIGO_KEY = 'nova_ultimo_codigo_cliente'

export function recordarCodigoCliente(codigoQr: string) {
  try {
    localStorage.setItem(ULTIMO_CODIGO_KEY, codigoQr)
  } catch {
    // localStorage no disponible (modo privado, etc.) - no pasa nada grave
  }
}
