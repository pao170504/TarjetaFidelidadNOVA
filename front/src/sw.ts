/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = { titulo: 'Nova Studio', cuerpo: 'Tienes novedades en tu tarjeta', url: '/' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // si el payload no es JSON, se usan los valores por defecto
  }

  event.waitUntil(
    self.registration.showNotification(data.titulo, {
      body: data.cuerpo,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data: { url: data.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data?.url as string) ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(url)) return client.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
