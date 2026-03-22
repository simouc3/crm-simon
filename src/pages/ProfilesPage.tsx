import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { User, Shield, Search, Camera, ChevronRight, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useAuth } from '../hooks/useAuth'
import { CreateUserDialog } from '../components/CreateUserDialog'

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const { user: authUser } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAddingUser, setIsAddingUser] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchProfiles()
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    if (!authUser) return
    const { data } = await supabase.from('profiles').select('role').eq('id', authUser.id).single()
    if (data?.role === 'ADMIN') setIsAdmin(true)
  }

  const fetchProfiles = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setProfiles(data)
    }
    setLoading(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, profileId: string) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    setIsUpdating(true)
    const file = e.target.files[0]
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("Por favor selecciona una imagen (JPG, PNG, HEIC, etc.)")
      setIsUpdating(false)
      return
    }

    const fileExt = file.type.includes('png') ? 'png' : 'jpg'
    const filePath = `${profileId}/avatar.${fileExt}`

    // Try uploading to 'avatars' bucket first, fallback to 'deal-documents'
    let publicUrl = ''
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      // Fallback: try deal-documents bucket
      const fallbackPath = `avatars/${profileId}_avatar.${fileExt}`
      const { error: fallbackError } = await supabase.storage
        .from('deal-documents')
        .upload(fallbackPath, file, { upsert: true, contentType: file.type })
      
      if (fallbackError) {
        alert(`Error subiendo foto: ${fallbackError.message}`)
        setIsUpdating(false)
        return
      }
      
      const { data: fallbackData } = supabase.storage
        .from('deal-documents')
        .getPublicUrl(fallbackPath)
      publicUrl = fallbackData.publicUrl
    } else {
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      publicUrl = urlData.publicUrl
    }

    // Add cache-busting timestamp
    publicUrl = `${publicUrl}?t=${Date.now()}`
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profileId)

    if (updateError) {
      alert(`Error actualizando perfil: ${updateError.message}`)
    } else {
      setProfiles(profiles.map(p => p.id === profileId ? { ...p, avatar_url: publicUrl } : p))
      if (selectedProfile?.id === profileId) {
        setSelectedProfile({ ...selectedProfile, avatar_url: publicUrl })
      }
    }
    
    setIsUpdating(false)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const deleteProfile = async (profileId: string) => {
    if (!confirm("¿Estás seguro?")) return
    setIsUpdating(true)
    const { error } = await supabase.from('profiles').delete().eq('id', profileId)
    if (!error) {
      setProfiles(profiles.filter(p => p.id !== profileId))
      setIsDetailOpen(false)
    }
    setIsUpdating(false)
  }

  const updateProfileData = async (profileId: string, updates: any) => {
    setIsUpdating(true)
    const { error } = await supabase.from('profiles').update(updates).eq('id', profileId)
    if (!error) {
      setProfiles(profiles.map(p => p.id === profileId ? { ...p, ...updates } : p))
      if (selectedProfile?.id === profileId) {
        setSelectedProfile({ ...selectedProfile, ...updates })
      }
    } else {
      alert("Error actualizando perfil: " + error.message)
    }
    setIsUpdating(false)
  }

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Ultra Minimalist Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-[#1C1C1E] rounded-[40px] p-8 md:px-10 md:py-8 mb-8 border border-black/[0.02] dark:border-white/[0.02] shadow-sm">
        <div className="space-y-1">
          <h1 className="text-[36px] md:text-[42px] font-black tracking-tight text-foreground leading-none">
            Usuarios
          </h1>
          <p className="text-[13px] text-muted-foreground font-semibold">
            {profiles.length} activos · Equipo comercial
          </p>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => setIsAddingUser(true)}
            className="mt-4 md:mt-0 rounded-full h-12 px-8 bg-foreground text-background font-black uppercase text-[11px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10"
          >
            + Nuevo Usuario
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input 
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-14 pl-12 pr-6 rounded-[24px] bg-white dark:bg-slate-900 border border-border/40 shadow-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-sm tracking-tight"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-[40px] bg-white dark:bg-slate-900 animate-pulse border border-border/10"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProfiles.map((profile) => (
            <div 
              key={profile.id} 
              onClick={() => { setSelectedProfile(profile); setIsDetailOpen(true); }}
              className="group relative bg-white dark:bg-slate-900 rounded-[40px] border border-border/40 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] hover:-translate-y-2 active:scale-95 transition-all duration-500 overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-foreground/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-foreground/10 transition-colors" />
              
              <div className="flex items-start justify-between mb-8">
                <div className="relative">
                  <div className="h-24 w-24 rounded-[30px] bg-slate-50 dark:bg-slate-800 border border-border/40 flex items-center justify-center text-foreground overflow-hidden shadow-inner">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} strokeWidth={1.5} />
                    )}
                  </div>
                  <div className={`absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl border-[4px] border-white dark:border-slate-900 flex items-center justify-center shadow-lg ${
                    profile.role === 'ADMIN' ? 'bg-foreground text-background' : 'bg-slate-200 dark:bg-slate-700 text-foreground'
                  }`}>
                    {profile.role === 'ADMIN' ? <Star size={18} fill="currentColor" /> : <Shield size={18} />}
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`text-[9px] font-black tracking-widest uppercase h-7 px-4 rounded-xl border-none ${
                    profile.role === 'ADMIN' ? 'bg-foreground text-background shadow-lg shadow-black/10' : 'bg-slate-100 dark:bg-white/5 text-muted-foreground'
                  }`}>
                    {profile.role === 'ADMIN' ? 'ADMIN' : 'VENTAS'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1 mb-8">
                <h3 className="font-black text-[22px] tracking-tighter text-foreground leading-none">{profile.full_name || 'Sin Nombre'}</h3>
                <p className="text-[12px] font-black text-muted-foreground uppercase tracking-widest opacity-40 truncate">{profile.email || 'Sin Perfil'}</p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-border/40">
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40 tracking-widest mb-0.5">Estado</span>
                    <div className="flex items-center gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-emerald-500" />
                       <span className="text-[10px] font-black text-foreground uppercase">Conectado</span>
                    </div>
                 </div>
                 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-white/5 text-foreground group-hover:scale-110 transition-transform">
                    <ChevronRight size={18} />
                 </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Detail Dialog - APPLE STYLE */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[480px] border-none bg-[#F2F2F7] dark:bg-black p-0 overflow-hidden rounded-[3rem] shadow-2xl safe-p-bottom">
          {selectedProfile && (
            <div className="animate-in slide-in-from-bottom-10 duration-700 flex flex-col h-full max-h-[90vh]">
              {/* Header: Centered Avatar & Info */}
              <div className="bg-[#F2F2F7] dark:bg-black pt-12 pb-8 px-6 flex flex-col items-center text-center">
                <div className="relative group mb-4">
                  <div className="h-28 w-28 rounded-full bg-white dark:bg-slate-800 p-1 shadow-xl overflow-hidden ring-4 ring-white dark:ring-slate-900">
                    <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-foreground overflow-hidden shadow-inner uppercase font-black text-3xl">
                      {selectedProfile.avatar_url ? (
                        <img src={selectedProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selectedProfile.full_name?.charAt(0) || 'U'
                      )}
                    </div>
                  </div>
                  {(isAdmin || authUser?.id === selectedProfile.id) && (
                    <label className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-white dark:bg-slate-800 text-foreground flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform border-4 border-[#F2F2F7] dark:border-black">
                      <Camera size={14} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e, selectedProfile.id)} disabled={isUpdating} />
                    </label>
                  )}
                </div>
                
                <h2 className="text-[26px] font-bold tracking-tight text-foreground leading-tight">
                  {selectedProfile.full_name || 'Sin Nombre'}
                </h2>
                <p className="text-[14px] font-medium text-muted-foreground mt-1">
                  {selectedProfile.email || 'Sin correo configurado'}
                </p>
              </div>

              {/* Body: Grouped List Items (Apple iOS Style) */}
              <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-8">
                {/* Group 1: Personal Info */}
                <div className="space-y-1">
                  <span className="ml-4 text-[13px] font-medium text-muted-foreground uppercase tracking-tight opacity-60">Información Personal</span>
                  <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] overflow-hidden divide-y divide-border/10">
                    <div className="p-4 flex items-center justify-between group">
                      <span className="text-[15px] font-medium text-foreground">Nombre</span>
                      <input 
                        className="text-right bg-transparent outline-none text-muted-foreground focus:text-foreground font-medium text-[15px] transition-colors"
                        value={selectedProfile.full_name || ''}
                        disabled={!isAdmin}
                        onChange={(e) => updateProfileData(selectedProfile.id, { full_name: e.target.value })}
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-[15px] font-medium text-foreground">Correo</span>
                      <input 
                        className="text-right bg-transparent outline-none text-muted-foreground focus:text-foreground font-medium text-[15px] transition-colors"
                        value={selectedProfile.email || ''}
                        disabled={!isAdmin}
                        onChange={(e) => updateProfileData(selectedProfile.id, { email: e.target.value })}
                        placeholder="ejemplo@correo.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Group 2: Access & Safety */}
                <div className="space-y-1">
                  <span className="ml-4 text-[13px] font-medium text-muted-foreground uppercase tracking-tight opacity-60">Seguridad y Acceso</span>
                  <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                            <Shield size={16} />
                         </div>
                         <span className="text-[15px] font-medium text-foreground">Rol del Sistema</span>
                      </div>
                      {isAdmin ? (
                        <select 
                          className="bg-transparent text-right outline-none text-indigo-500 font-bold text-[14px] cursor-pointer"
                          value={selectedProfile.role || 'VENTAS'}
                          onChange={(e) => updateProfileData(selectedProfile.id, { role: e.target.value })}
                        >
                          <option value="ADMIN">Administrador</option>
                          <option value="VENTAS">Vendedor</option>
                        </select>
                      ) : (
                        <span className="text-[14px] font-bold text-muted-foreground">{selectedProfile.role || 'VENTAS'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Group 3: Critical Actions */}
                {isAdmin && (
                  <div className="pt-4">
                    <button 
                      onClick={() => deleteProfile(selectedProfile.id)}
                      disabled={isUpdating}
                      className="w-full bg-white dark:bg-[#1C1C1E] text-rose-500 font-bold py-4 rounded-[24px] shadow-sm hover:bg-rose-50 dark:hover:bg-rose-950/20 active:scale-[0.98] transition-all"
                    >
                      Eliminar Cuenta permanentemente
                    </button>
                    <p className="text-[11px] text-center text-muted-foreground mt-3 px-8 font-medium italic">
                      Al eliminar esta cuenta, el usuario perderá acceso inmediato al CRM y su historial quedará archivado.
                    </p>
                  </div>
                )}
                
                <Button 
                   onClick={() => setIsDetailOpen(false)}
                   className="w-full h-14 rounded-[24px] bg-foreground text-background font-black uppercase text-[12px] tracking-widest mt-4 shadow-xl shadow-black/10"
                >
                  Listo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL CREAR USUARIO - PRÓXIMO PASO */}
      {isAdmin && (
        <CreateUserDialog 
          open={isAddingUser} 
          onOpenChange={setIsAddingUser} 
          onUserCreated={fetchProfiles} 
        />
      )}
    </div>
  )
}
