import { createContext, useContext, useEffect, useState } from 'react'
import { type Session, type User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'

type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: 'ADMIN' | 'VENTAS' | 'PENDIENTE'
  email: string | null
}

type AuthContextType = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  authReady: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  user: null, 
  profile: null, 
  loading: true,
  authReady: false,
  signOut: async () => {},
  refreshProfile: async () => {}
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authReady, setAuthReady] = useState(false)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) throw error
      
      if (data) {
        setProfile(data)
      } else {
        // Fallback para usuarios sin perfil (ej. admin recién creado o error de sincronización)
        setProfile({ id: userId, role: 'VENTAS' } as any)
      }
    } catch (err) {
      console.warn('Perfil no cargado, usando perfil básico:', err)
      setProfile({ id: userId, role: 'VENTAS' } as any)
    }
  }

  useEffect(() => {
    // Al terminar de cargar la sesión y el perfil, marcamos como listo
    const initialize = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('Sesión corrupta detectada:', error.message)
          // LIMPIEZA TOTAL AGRESIVA (sin destruir localStorage ajeno)
          setSession(null)
          setUser(null)
          setProfile(null)
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          return
        }
        
        setSession(data.session)
        setUser(data.session?.user ?? null)
        if (data.session?.user) {
          await fetchProfile(data.session.user.id);
        }
      } catch (err) {
        console.error('Error fatal de Auth:', err)
        setSession(null)
        setUser(null)
      } finally {
        setLoading(false)
        setAuthReady(true)
      }
    }

    initialize();



    const handleAuthError = () => {
      console.warn('API Authentication error intercepted. Forcing logout...')
      supabase.auth.signOut().catch(() => {}).finally(() => {
        setSession(null)
        setUser(null)
        setProfile(null)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true'
        }
      })
    }
    // @ts-ignore
    window.addEventListener('supabase:auth-error', handleAuthError)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setProfile(null)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return
      }

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    // Aggressive Tab Wake-up Check (Debounced)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session) {
          console.warn('Tab woken up with invalid session, forcing logout')
          handleAuthError()
        } else if (data.session.user && data.session.user.id !== user?.id) {
          // If the user somehow changed or session was refreshed
          setSession(data.session)
          setUser(data.session.user)
          fetchProfile(data.session.user.id)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      // @ts-ignore
      window.removeEventListener('supabase:auth-error', handleAuthError)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Error en signOut:', err)
    } finally {
      setSession(null)
      setUser(null)
      setProfile(null)
      // Forzamos limpieza de localStorage por si acaso
      localStorage.clear()
      window.location.href = '/login'
    }
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col space-y-4 items-center justify-center bg-[#F5F5F7] dark:bg-[#0D0D17] text-foreground font-sans">
        <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-primary/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest opacity-40">Verificando Credenciales...</p>
      </div>
    )
  }

  // Eliminada la redirección agresiva por window.location para evitar pantallas blancas
  // El enrutamiento se manejará de forma nativa en App.tsx

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, authReady, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
