/**
 * Simplified Push Notifications Module
 * Uses the native Notification API with a fallback approach.
 * Full Web Push (with VAPID) requires a backend; here we use
 * Notification.requestPermission() which works on Chrome/Safari/Firefox
 * and enables local in-app alerts when the app is open.
 */

export async function checkNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones.')
      return false
    }

    const permission = await Notification.requestPermission()

    if (permission === 'granted') {
      // Show a confirmation notification immediately so the user knows it works
      new Notification('✅ Notificaciones Activadas', {
        body: 'Recibirás alertas de actividades y seguimiento de clientes.',
        icon: '/icons/icon-192x192.png',
      })
      return true
    }

    if (permission === 'denied') {
      alert(
        'Las notificaciones están bloqueadas en tu navegador. Para activarlas, ve a Configuración del sitio en la barra de direcciones y cambia el permiso a "Permitir".'
      )
      return false
    }

    // 'default' — user dismissed without choosing
    return false
  } catch (error) {
    console.error('Error activando notificaciones:', error)
    return false
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  // Nothing to unsubscribe from on the native Notification API
  // Just return true so the UI updates correctly
  return true
}

/**
 * Utility to send an in-app notification (only works when app is open)
 */
export function sendLocalNotification(title: string, body: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
    })
  }
}
