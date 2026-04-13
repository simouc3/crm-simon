import { useAuth } from '../hooks/useAuth'
import { Button } from '@/components/ui/button'
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from 'lucide-react'

export default function PendingApproval() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0D0D17] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[480px] bg-white dark:bg-[#141420] rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.1)] overflow-hidden border border-black/[0.03] dark:border-white/[0.03] animate-in fade-in zoom-in duration-500">
        
        {/* Header Visual */}
        <div className="h-48 bg-gradient-to-br from-amber-400 via-orange-500 to-primary flex items-center justify-center relative">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />
          <div className="relative z-10 w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl">
            <Clock className="text-white h-12 w-12 animate-pulse" />
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-6 right-6 flex gap-2">
             <div className="w-3 h-3 rounded-full bg-white/20" />
             <div className="w-3 h-3 rounded-full bg-white/40" />
             <div className="w-3 h-3 rounded-full bg-white/60" />
          </div>
        </div>

        <div className="p-10 text-center space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-2">
               <ShieldAlert size={14} className="font-black" />
               <span className="text-[10px] font-black uppercase tracking-widest">Acceso Restringido</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-foreground leading-[1.1]">
              Tu cuenta está en <span className="text-primary italic">Revisión</span>
            </h1>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              Hola <span className="text-foreground font-bold">{profile?.full_name?.split(' ')[0]}</span>. Tu acceso al CRM ha sido bloqueado temporalmente por política de seguridad corporativa.
            </p>
          </div>

          {/* Checklist de Estado */}
          <div className="grid gap-3 text-left">
             <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                   <CheckCircle2 size={16} />
                </div>
                <div>
                   <p className="text-[11px] font-black uppercase tracking-widest text-foreground">Autenticación Google</p>
                   <p className="text-[10px] text-muted-foreground font-medium">Verificada correctamente ✅</p>
                </div>
             </div>
             <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] opacity-60">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0">
                   <Clock size={16} />
                </div>
                <div>
                   <p className="text-[11px] font-black uppercase tracking-widest text-foreground">Autorización Admin</p>
                   <p className="text-[10px] text-muted-foreground font-medium">En espera de asignación de rol...</p>
                </div>
             </div>
          </div>

          <div className="space-y-4 pt-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-loose">
              Por favor, contacta a <span className="text-primary">Simón (Admin)</span> para que active tu rol de Ventas u Operaciones.
            </p>
            <Button 
              variant="outline" 
              onClick={() => signOut()}
              className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 border-black/[0.08] dark:border-white/[0.08] transition-all"
            >
              <LogOut size={16} /> Finalizar Sesión
            </Button>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-white/[0.02] p-4 text-center border-t border-black/[0.04] dark:border-white/[0.04]">
           <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40">Security Protocol B2B · Industrial Elite</p>
        </div>
      </div>
    </div>
  )
}
