import { useState, useEffect } from 'react'
import { Bell, X, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { subscribeToPush, checkNotificationPermission } from '@/lib/push-notifications'

export function NotificationPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    async function check() {
      const dismissed = localStorage.getItem('pushPromptDismissed')
      if (dismissed === 'true') return

      const permission = await checkNotificationPermission()
      if (permission === 'default') {
        // Mostrar después de un breve delay para no ser intrusivo
        setTimeout(() => setShow(true), 3000)
      }
    }
    check()
  }, [])

  const handleSubscribe = async () => {
    setShow(false)
    localStorage.setItem('pushPromptDismissed', 'true')
    try {
      const success = await subscribeToPush()
      if (success) {
        alert("¡Notificaciones activadas con éxito!")
      }
    } catch (err) {
      console.warn("User dismissed or blocked notification prompt", err)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('pushPromptDismissed', 'true')
  }

  if (!show) return null

  return (
    <div className="fixed bottom-32 left-6 right-6 md:left-auto md:right-10 md:w-[380px] z-[100] animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-[28px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors" />
        
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground opacity-40 hover:opacity-100 transition-all"
        >
          <X size={16} />
        </button>

        <div className="flex gap-4 items-start">
          <div className="w-12 h-12 rounded-2xl bg-primary shadow-xl shadow-primary/20 flex items-center justify-center shrink-0 border border-white/20">
             <div className="animate-bounce">
                <Bell className="h-6 w-6 text-white" />
             </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-foreground tracking-tight leading-tight">Activar Alertas B2B</h3>
            <p className="text-[11px] text-muted-foreground font-bold tracking-tight leading-relaxed opacity-80">
              Recibe notificaciones sobre tratos estancados y cierres importantes directamente en tu iPhone.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
           <Button 
            variant="outline" 
            className="rounded-xl border-border/40 text-[10px] font-black uppercase tracking-widest h-10 opacity-60 hover:opacity-100"
            onClick={handleDismiss}
           >
             Quizás luego
           </Button>
           <Button 
            className="rounded-xl shadow-lg shadow-primary/20 text-[10px] font-black uppercase tracking-widest h-10 group"
            onClick={handleSubscribe}
           >
             Habilitar
             <ShieldCheck className="ml-2 h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" />
           </Button>
        </div>
      </div>
    </div>
  )
}
