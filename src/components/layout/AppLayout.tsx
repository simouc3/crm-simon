import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LayoutDashboard, Users, Columns3, LogOut, Settings as SettingsIcon, CalendarDays, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { SettingsDialog } from '../SettingsDialog'
import { NotificationPrompt } from '../NotificationPrompt'

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
      {/* Sidebar Desktop - Estilo Glass Premium Apple */}
      <aside className="w-[300px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-r border-border/40 dark:border-white/5 hidden md:flex flex-col relative z-20 shadow-[10px_0_40px_-20px_rgba(0,0,0,0.05)]">
        
        <div className="p-10 pb-8">
          <div className="flex flex-col gap-5 group cursor-pointer transition-all">
            <div className="w-14 h-14 rounded-[20px] bg-primary shadow-2xl shadow-primary/30 flex items-center justify-center overflow-hidden shrink-0 border border-white/20 transition-all group-hover:scale-105 duration-500">
              {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <span className="text-white font-black text-2xl tracking-tighter">{branding.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.25em] opacity-60 leading-none mb-2">Plataforma B2B</span>
              <h2 className="font-black text-[18px] leading-tight tracking-tighter text-foreground group-hover:text-primary transition-colors">
                {branding.name}
              </h2>
            </div>
          </div>
        </div>

        <nav className="px-5 space-y-1 flex-1 overflow-y-auto pt-6">
          <div className="px-4 mb-4">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-30">Navegación</span>
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-primary text-white shadow-xl shadow-primary/25 translate-x-1' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/5 hover:text-foreground hover:translate-x-1'
                }`
              }
            >
              <item.icon className="h-[20px] w-[20px] stroke-[2]" />
              <span className="text-sm font-bold tracking-tight">{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-6 mt-auto border-t border-border/40 dark:border-white/5 bg-slate-50/30 dark:bg-black/20">
          <div 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-4 px-4 py-4 mb-6 cursor-pointer hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all group border border-transparent hover:border-slate-200 dark:hover:border-white/10 shadow-sm md:shadow-none"
          >
            <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-700 border border-border/40 flex items-center justify-center text-primary font-black text-sm shadow-sm group-hover:scale-105 transition-transform overflow-hidden relative">
               <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
               <span className="relative z-10">{user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-black text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                {user?.user_metadata?.full_name || 'Usuario'}
              </span>
              <span className="text-[10px] text-primary font-black uppercase tracking-[0.15em]">
                {userRole === 'SALES_OPS' || userRole === 'VENDEDOR' ? 'Comercial' : 'Administrador'}
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                className="flex-1 rounded-xl border-border/40 hover:border-primary/40 hover:bg-white dark:hover:bg-slate-800 h-11 transition-all" 
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="flex-1 rounded-xl border-border/40 hover:border-primary/40 hover:bg-white dark:hover:bg-slate-800 h-11 transition-all" 
                onClick={() => setShowSettings(true)}
              >
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </div>

            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 h-11 px-4 transition-all" 
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-[11px] font-black uppercase tracking-widest">Desconectar</span>
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-slate-950">
        {/* Mobile Header Premium Glass */}
        <header className="h-[80px] border-b border-border/40 dark:border-white/5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl flex items-center px-8 justify-between md:hidden sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-[14px] bg-primary flex items-center justify-center shadow-xl shadow-primary/20 overflow-hidden shrink-0 border border-white/20">
               {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <span className="text-white font-black text-xl tracking-tighter">{branding.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">CRM</span>
              <div className="font-black text-foreground text-[18px] tracking-tighter leading-none">{branding.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="rounded-2xl w-11 h-11 bg-slate-50 dark:bg-white/5 border border-border/20"
            >
              {isDarkMode ? <Sun className="h-[20px] w-[20px]" /> : <Moon className="h-[20px] w-[20px]" />}
            </Button>
          </div>
        </header>

        {/* Dynamic Outlet Content */}
        <main className="flex-1 min-h-0 bg-[#F8FAFC] dark:bg-black/10 overflow-y-auto pb-32 md:pb-0 safe-top">
          <Outlet context={{ isDarkMode }} />
        </main>

        {/* Mobile Bottom Navigation - Estilo iOS Premium Apple */}
        <nav className="fixed bottom-6 left-6 right-6 h-[72px] rounded-[28px] md:hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-white/40 dark:border-white/10 flex items-center justify-around px-2 z-40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-none">
          {navItems.map((item) => (
             <NavLink
               key={item.path}
               to={item.path}
               className={({ isActive }) =>
                 `flex flex-col items-center gap-1.5 px-4 h-full justify-center rounded-2xl transition-all duration-300 relative ${
                   isActive 
                     ? 'text-primary scale-105' 
                     : 'text-slate-400 dark:text-slate-500'
                 }`
               }
             >
               {({ isActive }) => (
                 <>
                   <div className={`transition-all duration-500 ${isActive ? 'translate-y-[-2px]' : ''}`}>
                    <item.icon className={`h-[24px] w-[24px] ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                   </div>
                   <span className={`text-[10px] font-black uppercase tracking-tight transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                    {item.name}
                   </span>
                   {isActive && (
                      <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
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
      <NotificationPrompt />
    </div>
  )
}
