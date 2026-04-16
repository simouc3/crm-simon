import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { Shield, Mail, Building2, ArrowRight, User, KeyRound } from 'lucide-react'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  // Asegurar limpieza total al cargar login para evitar errores de token antiguos
  useEffect(() => {
    if (window.location.search.includes('expired=true')) {
      setSessionExpired(true)
      window.history.replaceState({}, '', '/login')
    }
  }, [])

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
        setIsRegistered(true)
        setTimeout(() => {
          setIsSignUp(false)
          setIsRegistered(false)
        }, 3000)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error: any) {
      alert("Error de acceso: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D17] font-sans selection:bg-primary/30 relative overflow-hidden">
      
      {/* Background Cinematic Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
      </div>

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-[440px] px-6 py-12">
        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/[0.08] rounded-[48px] p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-1000">
          
          {/* Brand Header */}
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-20 h-20 rounded-[28px] bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center mb-6 shadow-2xl shadow-primary/20 ring-1 ring-white/20">
              <Building2 className="text-white h-10 w-10" />
            </div>
            <h1 className="text-[32px] font-black tracking-[-0.04em] text-white leading-tight mb-2">
              Centro <span className="text-primary italic">B2B</span>
            </h1>
            <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em]">
              Sistemas de Limpieza Industrial
            </p>
          </div>

          {sessionExpired && (
            <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-center animate-in fade-in slide-in-from-top-4">
              <p className="text-sm font-bold">Tu sesión ha expirado</p>
              <p className="text-[11px] opacity-80 mt-1">Por seguridad, vuelve a ingresar tus credenciales.</p>
            </div>
          )}

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-bold tracking-tight text-white mb-1">
                  {isSignUp ? 'Crear Cuenta Operativa' : 'Acceso al Portal'}
                </h2>
                <p className="text-xs text-white/40 font-medium">
                  {isSignUp ? 'Regístrate para obtener acceso inmediato al CRM.' : 'Ingresa tus credenciales para continuar.'}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-5">
                {isSignUp && (
                  <div className="space-y-2 group">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nombre Completo"
                        style={{ paddingLeft: '3.5rem' }}
                        className="w-full h-16 pr-6 rounded-2xl bg-white/[0.05] border border-white/[0.05] focus:border-primary/50 focus:bg-white/[0.08] outline-none font-bold text-sm text-white tracking-tight transition-all placeholder:text-white/10"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 group">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Correo electrónico"
                      style={{ paddingLeft: '3.5rem' }}
                      className="w-full h-16 pr-6 rounded-2xl bg-white/[0.05] border border-white/[0.05] focus:border-primary/50 focus:bg-white/[0.08] outline-none font-bold text-sm text-white tracking-tight transition-all placeholder:text-white/10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contraseña"
                      style={{ paddingLeft: '3.5rem' }}
                      className="w-full h-16 pr-6 rounded-2xl bg-white/[0.05] border border-white/[0.05] focus:border-primary/50 focus:bg-white/[0.08] outline-none font-bold text-sm text-white tracking-tight transition-all placeholder:text-white/10"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-16 rounded-[22px] bg-white text-black font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                      Verificando...
                    </div>
                  ) : (
                    <>
                      {isSignUp ? 'Crear Cuenta y Entrar' : 'Iniciar Sesión'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-6 text-center">
                <button 
                  type="button" 
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] hover:text-primary transition-colors"
                >
                  {isSignUp ? '¿Ya eres operador? Entrar' : '¿Nuevo equipo? Registrarse'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Immediate Success Overlay */}
      {isRegistered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white dark:bg-[#1C1C1E] p-10 rounded-[40px] shadow-2xl border border-black/[0.05] dark:border-white/[0.05] max-w-sm w-full text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
              <Building2 className="text-white h-10 w-10 border-none" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-foreground">¡Cuenta Lista!</h2>
              <p className="text-sm text-muted-foreground font-medium">Bienvenido al equipo, **{fullName}**. Tu acceso ha sido configurado. Redirigiendo...</p>
            </div>
            <div className="pt-4">
              <ArrowRight className="h-5 w-5 text-primary mx-auto animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Footer Security Badge */}
        <div className="mt-12 flex flex-col items-center gap-4 opacity-20">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-white/20">
            <Shield className="text-white h-3 w-3" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Enviado con cifrado B2B</span>
          </div>
          <p className="text-[9px] font-black text-white uppercase tracking-[0.3em]">Plataforma v2.5 · Elite Edition</p>
        </div>
      </div>
    </div>
  )
}
