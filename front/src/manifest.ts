// El manifest global (vite.config.ts) apunta a "/" para que el panel del admin
// se pueda instalar como app. Pero cuando una clienta agrega SU tarjeta a la
// pantalla de inicio, necesitamos que el ícono abra su propia tarjeta, no el
// admin. Por eso acá generamos un manifest "al vuelo" con el start_url de esa
// clienta y reemplazamos el <link rel="manifest"> solo en esa página.
export function personalizarManifestParaCliente(codigoQr: string) {
  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!manifestLink) return

  const origin = window.location.origin
  const manifest = {
    name: 'Nova Studio · Fidelidad',
    short_name: 'Nova Studio',
    start_url: `/c/${codigoQr}`,
    scope: '/',
    id: `/c/${codigoQr}`,
    display: 'standalone',
    lang: 'es',
    background_color: '#ede6ff',
    theme_color: '#863bff',
    icons: [
      { src: `${origin}/pwa-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${origin}/pwa-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `${origin}/pwa-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
  manifestLink.href = URL.createObjectURL(blob)
}
