import { supabase } from '../lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Shield, Sparkles, User, Mail, Lock, Building2 } from 'lucide-react'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        })
        if (error) throw error
        alert("¡Registro exitoso! Verifica tu correo.")
        setIsSignUp(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error: any) {
      alert("Error: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950 p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-[440px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[30px] bg-white dark:bg-slate-900 border border-border/40 shadow-2xl mb-6 relative overflow-hidden group">
             <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
             <Building2 className="h-10 w-10 text-primary relative z-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground leading-none mb-3">
            CRM <span className="text-primary italic">Industrial</span>
          </h1>
          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">
            Control Central de Operaciones
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border/40 rounded-[48px] p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] dark:shadow-none">
          <div className="mb-8">
             <h2 className="text-xl font-black tracking-tight text-foreground">{isSignUp ? 'Crear Registro' : 'Bienvenido de Nuevo'}</h2>
             <p className="text-xs font-medium text-muted-foreground mt-1">{isSignUp ? 'Únete al equipo para gestionar el pipeline.' : 'Ingresa tus credenciales para acceder.'}</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nombre Completo</label>
                <div className="relative">
                   <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                   <input 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej: Simon B2B"
                    className="w-full h-14 pl-12 pr-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm tracking-tight transition-all"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Correo Electrónico</label>
              <div className="relative">
                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                 <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="acceso@empresa.cl"
                  className="w-full h-14 pl-12 pr-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm tracking-tight transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Contraseña</label>
              <div className="relative">
                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                 <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 pl-12 pr-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm tracking-tight transition-all"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-16 rounded-[22px] font-black text-xs uppercase tracking-[0.1em] shadow-xl shadow-primary/25 mt-4 group" disabled={loading}>
              {loading ? 'Sincronizando...' : (isSignUp ? 'Registrar Perfil' : 'Entrar al Control')}
              <Sparkles className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/40 text-center">
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[11px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors hover:scale-105 duration-300"
            >
              {isSignUp ? '¿Ya eres del equipo? Inicia Sesión' : '¿Nuevo aquí? Crea tu cuenta'}
            </button>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 opacity-30">
           <Shield className="h-3 w-3" />
           <span className="text-[9px] font-black uppercase tracking-widest">Powered by Antigravity CRM 2.0</span>
        </div>
      </div>
    </div>
  )
}
