export default function handler(req, res) {
  const codigo = req.query.c
  if (!codigo || typeof codigo !== 'string') {
    res.status(400).json({ error: 'falta el código de cliente' })
    return
  }

  const origin = `https://${req.headers.host}`
  const manifest = {
    name: 'Nova Studio · Fidelidad',
    short_name: 'Nova Studio',
    start_url: `/c/${codigo}`,
    scope: '/',
    id: `/c/${codigo}`,
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

  res.setHeader('Content-Type', 'application/manifest+json')
  res.status(200).json(manifest)
}
