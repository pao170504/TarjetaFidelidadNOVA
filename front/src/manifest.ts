// El manifest global (vite.config.ts) apunta a "/" para que el panel del admin
// se pueda instalar como app. Pero cuando una clienta agrega SU tarjeta a la
// pantalla de inicio, necesitamos que el ícono abra su propia tarjeta, no el
// admin. Por eso acá reemplazamos el <link rel="manifest"> por uno generado
// dinámicamente en /api/manifest (back/front serverless) con el start_url de
// esa clienta. Usamos una URL real en vez de un blob: porque iOS parece leer
// el manifest desde un proceso que no puede resolver blob: URLs (probado: el
// swap con blob no funcionaba en iOS aunque sí en Android).
export function personalizarManifestParaCliente(codigoQr: string) {
  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!manifestLink) return

  manifestLink.href = `/api/manifest?c=${encodeURIComponent(codigoQr)}`
}
