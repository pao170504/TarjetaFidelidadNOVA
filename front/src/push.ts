import { obtenerClavePublicaPush, suscribirsePush } from './api'

export function pushSoportado(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function activarNotificaciones(codigoQr: string): Promise<void> {
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') {
    throw new Error('Necesitamos tu permiso para poder avisarte')
  }

  const registration = await navigator.serviceWorker.ready
  const { clave } = await obtenerClavePublicaPush()

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(clave) as BufferSource,
    })
  }

  const json = subscription.toJSON()
  await suscribirsePush(codigoQr, {
    endpoint: json.endpoint!,
    p256dh: json.keys!.p256dh,
    auth: json.keys!.auth,
  })
}
