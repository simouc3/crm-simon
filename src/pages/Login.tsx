import { supabase } from '../lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Shield, User, Mail, Lock, Building2, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showManualLogin, setShowManualLogin] = useState(false)

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

  const handleGoogleLogin = async () => {
    // Preparación para restricción de dominio:
    // Podríamos añadir una validación aquí si quisiéramos restringir antes del redirect,
    // pero usualmente se hace en el callback o en el trigger SQL.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/calendar'
      }
    })
    if (error) alert("Error: " + error.message)
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950 font-sans selection:bg-primary/20">
      
      {/* Columna Izquierda: Visual e Impacto (Solo Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 border-r border-white/10">
        <div className="absolute inset-0 z-0">
           <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 via-slate-900 to-slate-950" />
           <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-between p-20 w-full">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                 <Building2 className="text-white h-7 w-7" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">Plataforma <span className="text-primary italic">B2B</span></span>
           </div>

           <div className="max-w-md space-y-6">
              <h2 className="text-6xl font-black text-white leading-[1.05] tracking-tighter">
                Control Total de tu <span className="text-primary">Operación B2B</span>.
              </h2>
              <p className="text-lg text-white/60 font-medium leading-relaxed">
                Diseñado para la industria de limpieza. Gestiona prospectos, visitas y contratos con la fluidez de una app nativa premium.
              </p>
              <div className="flex items-center gap-6 pt-4">
                 <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                       <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white shadow-xl">
                          {String.fromCharCode(64 + i)}
                       </div>
                    ))}
                 </div>
                 <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Utilizado por el equipo comercial elite</span>
              </div>
           </div>

           <div className="flex items-center gap-2 text-white/20">
              <Shield className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Cifrado de Grado Industrial B2B</span>
           </div>
        </div>
      </div>

      {/* Columna Derecha: Formulario y Acceso */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-20 relative">
        <div className="lg:hidden absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
           <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-[420px] space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center lg:hidden mb-12">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-[24px] bg-slate-50 dark:bg-slate-900 border border-border/40 shadow-xl mb-6">
                <Building2 className="h-8 w-8 text-primary" />
             </div>
             <h1 className="text-3xl font-black tracking-tighter text-foreground leading-none mb-2">Centro de Operaciones <span className="text-primary italic">B2B</span></h1>
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">Gestion de Limpieza Industrial</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-black tracking-tight text-foreground">Bienvenido</h2>
              <p className="text-sm font-medium text-muted-foreground">Utiliza tu cuenta corporativa para acceder al panel de control.</p>
            </div>

            <div className="grid gap-4 pt-2">
               {/* BOTÓN GOOGLE DESTACADO */}
               <button 
                onClick={handleGoogleLogin}
                className="w-full h-16 rounded-2xl border-2 border-primary bg-primary/5 dark:bg-primary/10 flex items-center justify-center gap-4 hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-primary/10 relative group overflow-hidden"
               >
                 <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                 <svg className="w-6 h-6 relative z-10" viewBox="0 0 24 24">
                   <path fill="#EA4335" d="M12 5.04c1.94 0 3.51.68 4.75 1.83l3.58-3.58C18.16 1.28 15.3 0 12 0 7.31 0 3.25 2.7 1.21 6.63l4.08 3.16C6.25 7.15 8.91 5.04 12 5.04z" />
                   <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.89 3 c2.28-2.1 3.53-5.2 3.53-8.82z" />
                   <path fill="#FBBC05" d="M5.29 14.21c-.26-.79-.41-1.63-.41-2.51s.15-1.72.41-2.51L1.21 6.03C.44 7.6.01 9.35.01 12c0 2.65.43 4.4 1.2 5.97l4.08-3.76z" />
                   <path fill="#34A853" d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.89-3c-1.11.75-2.53 1.19-4.07 1.19-3.09 0-5.75-2.11-6.71-4.96l-4.08 3.16C3.25 21.3 7.31 24 12 24z" />
                 </svg>
                 <span className="text-sm font-black uppercase tracking-[0.1em] text-foreground relative z-10">Continuar con Google Workspace</span>
               </button>

               <div className="relative py-6">
                 <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40"></div></div>
                 <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                    <button 
                      onClick={() => setShowManualLogin(!showManualLogin)}
                      className="bg-white dark:bg-slate-950 px-4 text-muted-foreground opacity-60 hover:opacity-100 flex items-center gap-2 transition-all"
                    >
                      {showManualLogin ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      Acceso Especial para Operadores
                    </button>
                 </div>
               </div>

               {showManualLogin && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleAuth} className="space-y-4">
                      {isSignUp && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">Nombre Completo</label>
                          <div className="relative">
                             <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-30" />
                             <input 
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Ej: Simon Admin"
                              className="w-full h-14 pl-12 pr-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-slate-800 outline-none font-bold text-sm tracking-tight transition-all"
                              required
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">Email</label>
                        <div className="relative">
                           <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-30" />
                           <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="acceso@empresa.cl"
                            className="w-full h-14 pl-12 pr-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-slate-800 outline-none font-bold text-sm tracking-tight transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">Password</label>
                        <div className="relative">
                           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-30" />
                           <input 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full h-14 pl-12 pr-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-slate-800 outline-none font-bold text-sm tracking-tight transition-all"
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 mt-2 flex items-center justify-center gap-2 group transition-all" disabled={loading}>
                        {loading ? 'Validando...' : (isSignUp ? 'Crear Registro' : 'Entrar Manual')}
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </form>

                    <div className="text-center">
                      <button 
                        type="button" 
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors underline-offset-4 hover:underline"
                      >
                        {isSignUp ? '¿Ya tienes acceso? Log In' : '¿Nuevo Operador? Solicita Acceso'}
                      </button>
                    </div>
                 </div>
               )}
            </div>
          </div>

          <div className="text-center">
             <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-30">Security Protocol B2B · v2.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
