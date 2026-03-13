import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LayoutDashboard, Users, Columns3, LogOut, Settings as SettingsIcon, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { SettingsDialog } from '../SettingsDialog'

export default function AppLayout() {
  const { signOut, user } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [branding, setBranding] = useState({ name: 'CRM SIMON', logo: '' })
  const [userRole, setUserRole] = useState<string>('VENDEDOR')

  const fetchBranding = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('company_name, company_logo_url')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()
    
    if (data) {
      setBranding({
        name: data.company_name || 'CRM SIMON',
        logo: data.company_logo_url || ''
      })
    }
  }

  const fetchUserRole = async () => {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (data) setUserRole(data.role)
  }

  useEffect(() => {
    fetchBranding()
    fetchUserRole()

    // Suscripción en Tiempo Real para ajustes de marca
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_settings',
          filter: 'id=eq.00000000-0000-0000-0000-000000000001'
        },
        (payload) => {
          setBranding({
            name: payload.new.company_name || 'CRM SIMON',
            logo: payload.new.company_logo_url || ''
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const isAdmin = userRole === 'ADMIN'
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Pipeline', path: '/pipeline', icon: Columns3 },
    { name: 'Clientes', path: '/clients', icon: Users },
    { name: 'Calendario', path: '/calendar', icon: CalendarDays },
    ...(isAdmin ? [{ name: 'Usuarios', path: '/users', icon: Users }] : []),
  ]

  return (
    <div className={`flex h-screen bg-[#F8FAFC] dark:bg-slate-950 text-foreground font-sans antialiased overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar Desktop - Estilo Glass Premium */}
      <aside className="w-[280px] bg-white dark:bg-slate-900 border-r border-border/40 dark:border-white/5 hidden md:flex flex-col relative z-20 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.02)]">
        
        {/* Company Branding Section */}
        <div className="p-8 pb-10">
          <div className="flex items-center gap-4 group cursor-pointer transition-all">
            <div className="w-12 h-12 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center overflow-hidden shrink-0 border border-white/20 transition-transform group-hover:scale-110 duration-500">
              {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-white font-black text-xl tracking-tighter">{branding.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-60 leading-none mb-1.5">SISTEMA CRM</span>
              <h2 className="font-black text-[15px] leading-tight tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                {branding.name}
              </h2>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="px-4 space-y-1.5 flex-1 overflow-y-auto pt-4">
          <div className="px-4 mb-4">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-40">MENÚ PRINCIPAL</span>
          </div>
          {navItems.slice(0, 4).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-primary text-white shadow-xl shadow-primary/25 translate-x-1' 
                    : 'text-muted-foreground/80 dark:text-slate-400 hover:bg-primary/5 hover:text-primary hover:translate-x-1'
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px] stroke-[2.5]" />
              <span className="text-sm font-bold tracking-tight">{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        {/* Footer Section - User & Settings */}
        <div className="p-4 mt-auto border-t border-border/40 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Perfil Clickable para Configuración */}
          <div 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 px-3 py-4 mb-4 cursor-pointer hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all group border border-transparent hover:border-slate-200 dark:hover:border-white/10"
          >
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shadow-inner group-hover:scale-105 transition-transform">
              {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-black text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                {user?.user_metadata?.full_name || 'Usuario'}
              </span>
              <span className="text-[9px] text-primary font-black uppercase tracking-[0.15em] opacity-80">
                {userRole === 'SALES_OPS' || userRole === 'VENDEDOR' ? 'VENTAS' : userRole}
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            {/* Acceso Rápido a Equipo Comercial (Solo Admins) */}
            {isAdmin && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 rounded-xl border-primary/10 bg-primary/5 text-primary hover:bg-primary hover:text-white h-10 px-4 transition-all group mb-1 shadow-sm" 
                onClick={() => {
                  window.history.pushState({}, '', '/users');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
              >
                <Users className="h-4 w-4" />
                <span className="text-[11px] font-black uppercase tracking-wider">Equipo Comercial</span>
              </Button>
            )}

            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 rounded-xl border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary h-10 px-4 transition-all group" 
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? (
                <>
                  <div className="h-4 w-4 rounded-full bg-yellow-400/20 flex items-center justify-center relative shadow-[0_0_8px_rgba(250,204,21,0.3)]">
                    <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                  </div>
                  <span className="text-[11px] font-bold tracking-tight">Modo Claro</span>
                </>
              ) : (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-slate-400/40 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute top-0 right-0 w-2 h-2 bg-slate-400/60 -mr-1 -mt-1 rounded-full" />
                  </div>
                  <span className="text-[11px] font-bold tracking-tight">Modo Oscuro</span>
                </>
              )}
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 rounded-xl border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary h-10 px-4 transition-all group shadow-sm bg-white dark:bg-slate-800" 
              onClick={() => setShowSettings(true)}
            >
              <SettingsIcon className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-[11px] font-bold tracking-tight">Configuración</span>
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500/80 hover:text-red-500 h-10 px-4 transition-all mt-2" 
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-[11px] font-bold tracking-tight">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Mobile Header */}
        <header className="h-16 border-b bg-white flex items-center px-6 justify-between md:hidden shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md overflow-hidden">
               {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-0.5" />
              ) : (
                <span className="text-white font-black text-sm">{branding.name.charAt(0)}</span>
              )}
            </div>
            <div className="font-black text-foreground text-[15px] tracking-tight">{branding.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="rounded-xl">
              <SettingsIcon className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} className="rounded-xl">
              <LogOut className="h-5 w-5 text-red-400" />
            </Button>
          </div>
        </header>

        {/* Mobile Navigation Bar - Horizontal Tabs */}
        <nav className="flex md:hidden border-b dark:border-white/5 bg-white dark:bg-slate-900 overflow-x-auto sticky top-16 z-20 px-4">
          {navItems.map((item) => (
             <NavLink
               key={item.path}
               to={item.path}
               className={({ isActive }) =>
                 `flex-1 flex flex-col items-center gap-1.5 py-3 transition-all border-b-2 text-[10px] font-black uppercase tracking-tighter min-w-[80px] ${
                   isActive 
                     ? 'border-primary text-primary bg-primary/5' 
                     : 'border-transparent text-muted-foreground/60 dark:text-slate-400 hover:text-foreground'
                 }`
               }
             >
               {({ isActive }) => (
                 <>
                   <item.icon className={`h-[18px] w-[18px] ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                   {item.name}
                 </>
               )}
             </NavLink>
          ))}
        </nav>

        {/* Dynamic Outlet Content */}
        <main className="flex-1 min-h-0 bg-[#F8FAFC] dark:bg-slate-950 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      <SettingsDialog 
        open={showSettings} 
        onOpenChange={setShowSettings} 
        onSettingsUpdated={fetchBranding} 
      />
    </div>
  )
}
