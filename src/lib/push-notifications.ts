import { supabase } from './supabase/client'

const PUBLIC_VAPID_KEY = 'BD6zX...' // El usuario debería proporcionar esto o lo generamos como placeholder

export async function subscribeToPush() {
  try {
    const registration = await navigator.serviceWorker.ready
    
    // Verificar si ya existe una suscripción
    let subscription = await registration.pushManager.getSubscription()
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: PUBLIC_VAPID_KEY
      })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Guardar la suscripción en Supabase (Se asume tabla push_subscriptions)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        subscription: subscription.toJSON(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error suscribiendo a Push:', error)
    return false
  }
}

export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      await subscription.unsubscribe()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Opcional: eliminar el registro en backend
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
      }
    }
    return true
  } catch (error) {
    console.error('Error desuscribiendo de Push:', error)
    return false
  }
}

export async function checkNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') {
     // Verify if we actually have a subscription
     try {
       const registration = await navigator.serviceWorker.ready
       const subscription = await registration.pushManager.getSubscription()
       if (!subscription) return 'default'
       return 'granted'
     } catch(e) {
       return 'default'
     }
  }
  return Notification.permission
}
