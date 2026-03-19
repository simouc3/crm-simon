import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { User, Shield, Mail, Search, Trash2, Camera, ChevronRight, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from "@/components/ui/dialog"

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchProfiles()
  }, [])

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

  const updateProfileRole = async (profileId: string, newRole: string) => {
    setIsUpdating(true)
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', profileId)
    if (!error) {
      setProfiles(profiles.map(p => p.id === profileId ? { ...p, role: newRole } : p))
      if (selectedProfile?.id === profileId) {
        setSelectedProfile({ ...selectedProfile, role: newRole })
      }
    }
    setIsUpdating(false)
  }

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg tracking-wider">EQUIPO</span>
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Fuerza Comercial</span>
          </div>
          <h1 className="text-[32px] font-black tracking-tighter text-foreground leading-[1.1] md:text-4xl">
            Gestión de <span className="text-primary italic">Perfiles</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-3xl border border-border/40 shadow-sm md:w-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Activos</span>
            <span className="text-[20px] font-black text-foreground tabular-nums tracking-tighter">{profiles.length}</span>
          </div>
        </div>
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

      {/* Profile Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px] border-none bg-white dark:bg-slate-900 p-0 overflow-hidden rounded-[3rem] shadow-2xl safe-p-bottom">
          {selectedProfile && (
            <div className="animate-in slide-in-from-bottom-8 duration-500">
              <div className="h-40 bg-foreground relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-background/20 rounded-full blur-3xl" />
                <div className="absolute top-6 right-8 text-[10px] font-black text-background/50 uppercase tracking-[0.2em]">Configuración de Usuario</div>
              </div>
              
              <div className="p-10 -mt-16 bg-white dark:bg-slate-900 rounded-t-[4rem] relative z-10">
                <div className="flex items-center justify-center -mt-24 mb-6">
                   <div className="relative group">
                      <div className="h-32 w-32 rounded-[45px] bg-white dark:bg-slate-800 p-1 shadow-2xl overflow-hidden">
                          <div className="w-full h-full rounded-[40px] bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-foreground overflow-hidden shadow-inner">
                            {selectedProfile.avatar_url ? (
                              <img src={selectedProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User size={48} strokeWidth={1} />
                            )}
                         </div>
                      </div>
                      <label className="absolute bottom-0 right-0 h-10 w-10 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 transition-transform border-4 border-white dark:border-slate-900">
                         <Camera size={18} />
                         <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e, selectedProfile.id)} disabled={isUpdating} />
                      </label>
                   </div>
                </div>

                <div className="text-center mb-10">
                  <h2 className="text-3xl font-black tracking-tighter text-foreground mb-1">{selectedProfile.full_name}</h2>
                  <div className="flex items-center justify-center gap-2">
                     <Badge className="bg-foreground text-background border-none text-[9px] font-black uppercase tracking-widest px-3 py-1 shadow-lg shadow-black/10">{selectedProfile.role || 'VENTAS'}</Badge>
                     <span className="text-[10px] font-bold text-muted-foreground opacity-40 uppercase tabular-nums">ID: {selectedProfile.id.slice(0, 8)}</span>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3 px-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Contacto</label>
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-[2.5rem] border border-border/40">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-foreground shadow-sm">
                        <Mail size={20} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">EMail de Trabajo</span>
                        <span className="text-[15px] font-bold text-foreground truncate">{selectedProfile.email || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 px-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Nivel de Seguridad</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => updateProfileRole(selectedProfile.id, 'ADMIN')}
                        disabled={isUpdating}
                        className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[32px] border-2 transition-all duration-500 ${
                          selectedProfile.role === 'ADMIN' 
                            ? 'border-foreground bg-foreground/5 text-foreground shadow-xl shadow-black/5' 
                            : 'border-slate-100 dark:border-white/5 text-muted-foreground grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                        }`}
                      >
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedProfile.role === 'ADMIN' ? 'bg-foreground text-background' : 'bg-slate-100 dark:bg-slate-800'}`}>
                           <Star size={22} fill={selectedProfile.role === 'ADMIN' ? 'currentColor' : 'none'} />
                         </div>
                         <span className="text-[11px] font-black uppercase tracking-widest text-center">Administrador</span>
                         {selectedProfile.role === 'ADMIN' && <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />}
                      </button>
                      
                      <button 
                        onClick={() => updateProfileRole(selectedProfile.id, 'VENDEDOR')}
                        disabled={isUpdating}
                        className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[32px] border-2 transition-all duration-500 ${
                          selectedProfile.role !== 'ADMIN'
                            ? 'border-foreground bg-foreground/5 text-foreground shadow-xl shadow-black/5' 
                            : 'border-slate-100 dark:border-white/5 text-muted-foreground grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                        }`}
                      >
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedProfile.role !== 'ADMIN' ? 'bg-foreground text-background' : 'bg-slate-100 dark:bg-slate-800'}`}>
                           <User size={22} />
                         </div>
                         <span className="text-[11px] font-black uppercase tracking-widest text-center">Ventas Terreno</span>
                         {selectedProfile.role !== 'ADMIN' && <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button variant="ghost" onClick={() => deleteProfile(selectedProfile.id)} disabled={isUpdating} className="h-16 w-16 rounded-[2rem] bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-500">
                      <Trash2 size={24} />
                    </Button>
                    <Button onClick={() => setIsDetailOpen(false)} className="flex-1 h-16 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-black/20 bg-foreground text-background active:scale-95 transition-all">
                      Sincronizar Cambios
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
