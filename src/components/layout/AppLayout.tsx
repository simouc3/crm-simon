import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LayoutDashboard, Users, Columns3, LogOut, Settings as SettingsIcon, CalendarDays, Moon, Sun, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { SettingsDialog } from '../SettingsDialog'
import { NotificationPrompt } from '../NotificationPrompt'
import { MobileActionSheet } from '../MobileActionSheet'

export default function AppLayout() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [showSettings, setShowSettings] = useState(false)
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false)
  const [branding, setBranding] = useState({ name: 'CRM SIMON', logo: '' })
  const [userRole, setUserRole] = useState<string>('VENDEDOR')
  const [avatarUrl, setAvatarUrl] = useState<string>('')

  const fetchBranding = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('company_name')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single()
      if (data) {
        setBranding({ name: data.company_name || 'CRM SIMON', logo: '' })
      }
    } catch (e) {
      console.warn('fetchBranding error:', e)
    }
  }

  const fetchUserRole = async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role, avatar_url')
        .eq('id', user.id)
        .single()
      if (data) {
        setUserRole(data.role || 'VENDEDOR')
        if (data.avatar_url) setAvatarUrl(data.avatar_url)
      }
    } catch (e) {
      console.warn('fetchUserRole error:', e)
    }
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
    <div className={`flex h-screen bg-[#F5F5F7] dark:bg-black text-foreground font-sans antialiased overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar Desktop */}
      <aside className="w-[220px] bg-white/70 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl border-r border-border/30 dark:border-transparent hidden md:flex flex-col relative z-20 shadow-[10px_0_40px_-20px_rgba(0,0,0,0.05)] dark:shadow-none">
        
        <div className="p-10 pb-8">
          <div className="flex flex-col gap-5 group cursor-pointer transition-all">
            <div className="w-14 h-14 rounded-[20px] bg-primary shadow-2xl shadow-primary/30 dark:shadow-none flex items-center justify-center overflow-hidden shrink-0 border border-white/20 dark:border-transparent transition-all group-hover:scale-105 duration-500">
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
                    ? 'bg-foreground text-background shadow-xl translate-x-1' 
                    : 'text-muted-foreground hover:bg-slate-100/50 dark:hover:bg-white/5 hover:text-foreground hover:translate-x-1'
                }`
              }
            >
              <item.icon className="h-[20px] w-[20px] stroke-[2]" />
              <span className="text-sm font-bold tracking-tight">{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        {/* User Panel — Bottom */}
        <div className="p-4 mt-auto border-t border-border/30 dark:border-white/[0.06]">
          
          {/* Avatar + Info — CLIC PARA MI PERFIL */}
          <div 
            className="flex items-center gap-3 px-2 py-3 mb-3 hover:bg-slate-100/50 dark:hover:bg-white/5 rounded-2xl cursor-pointer transition-all active:scale-95 group"
            onClick={() => navigate('/users?me=true')}
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] border border-border/30 dark:border-transparent flex items-center justify-center text-foreground font-black text-sm overflow-hidden shrink-0 shadow-sm transition-transform group-hover:scale-105">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[13px] font-black text-foreground truncate leading-tight">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
              </span>
              <span className="text-[10px] text-primary font-black uppercase tracking-[0.12em] opacity-80">
                {userRole === 'ADMIN' ? 'Admin Central' : 'Equipo Comercial'}
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="flex-1 rounded-xl h-9 bg-slate-100/80 dark:bg-[#2C2C2E] hover:bg-slate-200 dark:hover:bg-[#3A3A3C] border-0"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDarkMode ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="flex-1 rounded-xl h-9 bg-slate-100/80 dark:bg-[#2C2C2E] hover:bg-slate-200 dark:hover:bg-[#3A3A3C] border-0"
              onClick={() => setShowSettings(true)}
              title="Configuración"
            >
              <SettingsIcon className="h-[15px] w-[15px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="flex-1 rounded-xl h-9 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 border-0"
              onClick={signOut}
              title="Salir"
            >
              <LogOut className="h-[15px] w-[15px]" />
            </Button>
          </div>

        </div>
      </aside>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F5F5F7] dark:bg-black">
        {/* Mobile Header */}
        <header className="h-[80px] border-b border-border/30 dark:border-transparent bg-white/60 dark:bg-[#1C1C1E]/80 backdrop-blur-3xl flex items-center px-8 justify-between md:hidden sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-[14px] bg-foreground flex items-center justify-center shadow-xl shadow-foreground/20 dark:shadow-none overflow-hidden shrink-0 border border-border/20 dark:border-transparent">
               {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <span className="text-background font-black text-xl tracking-tighter">{branding.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">CRM</span>
              <div className="font-black text-foreground text-[18px] tracking-tighter leading-none">{branding.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="rounded-2xl w-11 h-11 bg-slate-50 dark:bg-[#2C2C2E] border border-border/20 dark:border-transparent"
            >
              {isDarkMode ? <Sun className="h-[20px] w-[20px]" /> : <Moon className="h-[20px] w-[20px]" />}
            </Button>
            <div 
              className="w-11 h-11 rounded-[14px] bg-slate-100 dark:bg-[#2C2C2E] border border-border/20 dark:border-transparent overflow-hidden shadow-lg active:scale-90 transition-transform"
              onClick={() => navigate('/users?me=true')}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-foreground font-black text-xs uppercase">
                   {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Outlet Content */}
        <main className="flex-1 min-h-0 bg-[#F5F5F7] dark:bg-black overflow-y-auto pb-32 md:pb-0 safe-top">
          <Outlet context={{ isDarkMode }} />
        </main>

        {/* Mobile Bottom Navigation - Estilo iOS Premium Apple */}
        <nav className="fixed bottom-6 left-6 right-6 h-[72px] rounded-[2.5rem] md:hidden bg-white/80 dark:bg-[#1C1C1E]/85 backdrop-blur-3xl border border-white/40 dark:border-white/[0.06] flex items-center justify-between px-6 z-40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
           <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-foreground scale-105' : 'text-muted-foreground opacity-60'}`}>
             <LayoutDashboard className="h-[22px] w-[22px]" />
           </NavLink>
           
           <NavLink to="/pipeline" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-foreground scale-105' : 'text-muted-foreground opacity-60'}`}>
             <Columns3 className="h-[22px] w-[22px]" />
           </NavLink>
           
           {/* Action Center FAB */}
           <div className="relative -top-6">
             <Button size="icon" className="h-[60px] w-[60px] rounded-full bg-foreground text-background shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border-4 border-[#F5F5F7] dark:border-black flex items-center justify-center" onClick={() => setShowMobileActionSheet(true)}>
               <Plus className="h-7 w-7" />
             </Button>
           </div>

           <NavLink to="/clients" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-foreground scale-105' : 'text-muted-foreground opacity-60'}`}>
             <Users className="h-[22px] w-[22px]" />
           </NavLink>
           
           <NavLink to="/calendar" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-foreground scale-105' : 'text-muted-foreground opacity-60'}`}>
             <CalendarDays className="h-[22px] w-[22px]" />
           </NavLink>
        </nav>
      </div>

      <SettingsDialog 
        open={showSettings} 
        onOpenChange={setShowSettings} 
        onSettingsUpdated={fetchBranding} 
      />
      <MobileActionSheet 
        isOpen={showMobileActionSheet} 
        onClose={() => setShowMobileActionSheet(false)} 
      />
      <NotificationPrompt />
    </div>
  )
}
