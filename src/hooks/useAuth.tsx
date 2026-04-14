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
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  user: null, 
  profile: null, 
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {}
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string, retries = 0) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        console.warn(`Intento ${retries + 1} fallido:`, error.message)
        throw error
      }
      
      if (!data && retries < 2) {
        await new Promise(r => setTimeout(r, 1000));
        return fetchProfile(userId, retries + 1);
      }

      setProfile(data)
    } catch (err) {
      console.error('Error final cargando perfil:', err)
      // No reseteamos a null aquí para mantener el estado previo si existe
    }
  }

  useEffect(() => {
    // Definimos una función de limpieza para el loading que siempre se ejecute
    const stopLoading = () => setLoading(false);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      stopLoading();
    }).catch(err => {
      console.error("Auth Session Error:", err);
      stopLoading();
    });

    // FAILSAFE RADICAL: Ningún spinner dura más de 4s
    const failsafe = setTimeout(stopLoading, 4000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
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

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
