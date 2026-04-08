import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LayoutDashboard, Users, Columns3, LogOut, Settings as SettingsIcon, CalendarDays, Moon, Sun, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { supabase } from '@/lib/supabase/client'
import { SettingsDialog } from '../SettingsDialog'
import { NotificationPrompt } from '../NotificationPrompt'
import { MobileActionSheet } from '../MobileActionSheet'
// Chat flotante removido por decisión de producto

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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deals',
        },
        async (payload) => {
          // Monitor for Proposal View events
          if (payload.new.proposal_status === 'VIEWED' && payload.old.proposal_status !== 'VIEWED') {
            // Get deal title and company name for the alert
            const { data } = await supabase
              .from('deals')
              .select('title, companies(razon_social)')
              .eq('id', payload.new.id)
              .single()
            
            const dealWithCompany = data as any;
            
            if (dealWithCompany && Notification.permission === "granted") {
              const companyName = Array.isArray(dealWithCompany.companies) 
                ? dealWithCompany.companies[0]?.razon_social 
                : dealWithCompany.companies?.razon_social;

              new Notification("Propuesta en Revisión", {
                body: `El prospecto ${companyName || 'Desconocido'} está revisando la propuesta: ${dealWithCompany.title}`,
                icon: "/pwa-192x192.png"
              })
            }
          }
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
    ...(isAdmin ? [
      { name: 'Usuarios', path: '/users', icon: Users },
      { name: 'Configuración', path: '#settings', icon: SettingsIcon, onClick: () => {
        setShowSettings(true);
        // Dispatching a custom event if the dialog needs to switch tabs, 
        // but for now just opening it is enough.
      } }
    ] : []),
  ]

  return (
    <div className={`flex h-screen bg-[#F5F5F7] dark:bg-[#06060B] text-foreground font-sans antialiased ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar Desktop */}
      <aside className="w-[220px] bg-white/70 dark:bg-[#141420]/95 backdrop-blur-2xl border-r border-border/30 dark:border-white/[0.06] hidden md:flex flex-col relative z-20 shadow-[10px_0_40px_-20px_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_rgba(255,255,255,0.05)]">
        
        <div className="p-10 pb-8">
          <div className="flex flex-col gap-5 group cursor-pointer transition-all" onClick={() => navigate('/')}>
            <div className="w-16 h-16 rounded-[22px] bg-white dark:bg-[#20203A] shadow-xl shadow-black/5 flex items-center justify-center overflow-hidden shrink-0 border border-black/[0.03] dark:border-white/[0.08] transition-all group-hover:scale-105 duration-500">
              {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-black text-2xl tracking-tighter uppercase">{branding.name.charAt(0)}</span>
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
              onClick={(e) => {
                if (item.onClick) {
                  e.preventDefault();
                  item.onClick();
                }
              }}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
                  isActive && item.path !== '#settings'
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
          
          {/* Avatar + Info — CLIC PARA MI PERFIL — APPLE STYLE SNIPPET */}
          <div 
            className="flex items-center gap-3 px-3 py-4 bg-white/50 dark:bg-[#2C2C2E]/50 rounded-[22px] border border-black/[0.03] dark:border-white/[0.05] cursor-pointer transition-all active:scale-95 group mb-4 shadow-sm"
            onClick={() => navigate('/users?me=true')}
          >
            <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-[#3A3A3C] flex items-center justify-center text-foreground font-black text-sm overflow-hidden shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-500">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[14px] font-black text-foreground truncate leading-none mb-1">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
              </span>
              <span className="text-[9px] text-[#007AFF] dark:text-[#0A84FF] font-black uppercase tracking-[0.08em]">
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
      <div className="flex-1 flex flex-col min-w-0 bg-[#F5F5F7] dark:bg-[#06060B] relative overflow-hidden">
        
        {/* ── Dark Mode Ambient Glow Orbs ── */}
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vh] bg-blue-600/20 mix-blend-screen blur-[120px] rounded-full pointer-events-none hidden dark:block z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[60vh] bg-purple-600/15 mix-blend-screen blur-[140px] rounded-full pointer-events-none hidden dark:block z-0" />

        {/* Mobile Header — Floating Island (same style as bottom nav) */}
        <div className="md:hidden shrink-0 px-4 pt-4 pb-2 sticky top-0 z-30 relative">
          <div className="glass-island rounded-[28px] flex items-center justify-between px-4 h-[62px]">
            <div className="flex items-center gap-3" onClick={() => navigate('/')}>
              <div className="w-10 h-10 rounded-[14px] bg-white dark:bg-[#20203A] flex items-center justify-center shadow-md overflow-hidden shrink-0 border border-black/[0.06] dark:border-white/[0.08]">
                 {branding.logo ? (
                  <img src={branding.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-black text-base tracking-tighter uppercase">{branding.name.charAt(0)}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em] leading-none opacity-60">Plataforma B2B</span>
                <div className="font-black text-foreground text-[16px] tracking-tighter leading-none mt-0.5">{branding.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-9 h-9 rounded-[14px] bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center active:scale-90 transition-transform text-foreground"
              >
                {isDarkMode ? <Sun className="h-[16px] w-[16px]" /> : <Moon className="h-[16px] w-[16px]" />}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="w-9 h-9 rounded-[14px] bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center active:scale-90 transition-transform text-foreground"
              >
                <SettingsIcon className="h-[16px] w-[16px]" />
              </button>
              <div 
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 border border-black/[0.04] dark:border-white/[0.06] overflow-hidden shadow-sm active:scale-90 transition-transform"
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
          </div>
        </div>

        {/* Dynamic Outlet Content */}
        <main className="flex-1 min-h-0 bg-[#F5F5F7] dark:bg-[#0D0D17] overflow-y-auto pb-36 md:pb-0 safe-top">
          <Outlet context={{ isDarkMode }} />
        </main>
      </div>

      {/* ── FLOATING ISLAND NAV — rendered via Portal directly on body ── */}
      {ReactDOM.createPortal(
        <nav className="fixed bottom-5 left-4 right-4 md:hidden z-[9999]">
          <div className="glass-island rounded-[30px] flex items-center justify-around px-4 h-[62px] relative">

            <NavLink to="/" end className={({ isActive }) => `flex flex-col items-center justify-center gap-[3px] px-3 transition-all duration-200 ${isActive ? 'text-[#007AFF]' : 'text-black/30 dark:text-white/30'}`}>
              {({ isActive }) => (
                <>
                  <LayoutDashboard className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && <span className="text-[9px] font-semibold tracking-tight leading-none">Dashboard</span>}
                </>
              )}
            </NavLink>

            <NavLink to="/pipeline" className={({ isActive }) => `flex flex-col items-center justify-center gap-[3px] px-3 transition-all duration-200 ${isActive ? 'text-[#007AFF]' : 'text-black/30 dark:text-white/30'}`}>
              {({ isActive }) => (
                <>
                  <Columns3 className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && <span className="text-[9px] font-semibold tracking-tight leading-none">Pipeline</span>}
                </>
              )}
            </NavLink>

            {/* FAB — rises above pill */}
            <button
              onClick={() => setShowMobileActionSheet(true)}
              className="-mt-8 h-[52px] w-[52px] rounded-full bg-black dark:bg-white flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.30)] active:scale-90 transition-transform duration-150 border-[3px] border-white dark:border-[#0D0D17] relative z-10"
            >
              <Plus className="h-5 w-5 text-white dark:text-black" strokeWidth={2.5} />
            </button>

            <NavLink to="/clients" className={({ isActive }) => `flex flex-col items-center justify-center gap-[3px] px-3 transition-all duration-200 ${isActive ? 'text-[#007AFF]' : 'text-black/30 dark:text-white/30'}`}>
              {({ isActive }) => (
                <>
                  <Users className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && <span className="text-[9px] font-semibold tracking-tight leading-none">Clientes</span>}
                </>
              )}
            </NavLink>

            <NavLink to="/calendar" className={({ isActive }) => `flex flex-col items-center justify-center gap-[3px] px-3 transition-all duration-200 ${isActive ? 'text-[#007AFF]' : 'text-black/30 dark:text-white/30'}`}>
              {({ isActive }) => (
                <>
                  <CalendarDays className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && <span className="text-[9px] font-semibold tracking-tight leading-none">Agenda</span>}
                </>
              )}
            </NavLink>

          </div>
        </nav>,
        document.body
      )}

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
