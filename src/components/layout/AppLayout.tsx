import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LayoutDashboard, Users, Columns3, LogOut, Settings as SettingsIcon, CalendarDays, Moon, Sun } from 'lucide-react'
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })

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
    { name: 'Agenda', path: '/calendar', icon: CalendarDays },
    ...(isAdmin ? [{ name: 'Usuarios', path: '/users', icon: Users }] : []),
  ]

  return (
    <div className={`flex h-screen bg-[#F8FAFC] dark:bg-slate-950 text-foreground font-sans antialiased overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar Desktop - Estilo Glass Premium */}
      <aside className="w-[280px] bg-white dark:bg-slate-900 border-r border-border/40 dark:border-white/5 hidden md:flex flex-col relative z-20 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.02)]">
        
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

        <nav className="px-4 space-y-1.5 flex-1 overflow-y-auto pt-4">
          <div className="px-4 mb-4">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-40">MENÚ PRINCIPAL</span>
          </div>
          {navItems.map((item) => (
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
        
        <div className="p-4 mt-auto border-t border-border/40 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
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
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 rounded-xl border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary h-10 px-4 transition-all group" 
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="text-[11px] font-bold tracking-tight">{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
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
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-slate-950">
        {/* Mobile Header Premium */}
        <header className="h-[72px] border-b border-border/40 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex items-center px-6 justify-between md:hidden sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden shrink-0 border border-white/20">
               {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-white font-black text-lg tracking-tighter">{branding.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none mb-0.5">CRM</span>
              <div className="font-black text-foreground text-[16px] tracking-tight leading-none">{branding.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="rounded-2xl w-10 h-10 text-muted-foreground hover:text-primary hover:bg-primary/5 active:scale-95 transition-all"
            >
              {isDarkMode ? <Sun className="h-[20px] w-[20px]" /> : <Moon className="h-[20px] w-[20px]" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowSettings(true)} 
              className="rounded-2xl w-10 h-10 text-muted-foreground hover:text-primary hover:bg-primary/5 active:scale-95 transition-all"
            >
              <SettingsIcon className="h-[20px] w-[20px]" />
            </Button>
          </div>
        </header>

        {/* Dynamic Outlet Content */}
        <main className="flex-1 min-h-0 bg-[#F8FAFC] dark:bg-black/20 overflow-y-auto pb-24 md:pb-0 safe-top">
          <Outlet context={{ isDarkMode }} />
        </main>

        {/* Mobile Bottom Navigation - Estilo iOS Premium */}
        <nav className="fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-border/40 dark:border-white/5 flex items-center justify-around px-4 z-40 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
          {navItems.map((item) => (
             <NavLink
               key={item.path}
               to={item.path}
               className={({ isActive }) =>
                 `flex flex-col items-center gap-1.5 px-3 py-2 rounded-2xl transition-all duration-300 relative ${
                   isActive 
                     ? 'text-primary' 
                     : 'text-muted-foreground/50 dark:text-slate-500'
                 }`
               }
             >
               {({ isActive }) => (
                 <>
                   <div className={`transition-all duration-500 ${isActive ? 'scale-110 -translate-y-0.5' : 'scale-100'}`}>
                    <item.icon className={`h-[22px] w-[22px] ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                   </div>
                   <span className={`text-[10px] font-black uppercase tracking-tight transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {item.name}
                   </span>
                   {isActive && (
                     <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary animate-pulse" />
                   )}
                 </>
               )}
             </NavLink>
          ))}
        </nav>
      </div>

      <SettingsDialog 
        open={showSettings} 
        onOpenChange={setShowSettings} 
        onSettingsUpdated={fetchBranding} 
      />
    </div>
  )
}
