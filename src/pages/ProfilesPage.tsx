import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { User, Shield, Mail, Search, Check, Trash2, Camera } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
    const fileExt = file.name.split('.').pop()
    const fileName = `${profileId}_${Math.random()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('deal-documents')
      .upload(filePath, file)

    if (uploadError) {
      alert("Error subiendo foto: " + uploadError.message)
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('deal-documents')
        .getPublicUrl(filePath)
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profileId)

      if (!updateError) {
        setProfiles(profiles.map(p => p.id === profileId ? { ...p, avatar_url: publicUrl } : p))
        if (selectedProfile?.id === profileId) {
          setSelectedProfile({ ...selectedProfile, avatar_url: publicUrl })
        }
      }
    }
    setIsUpdating(false)
  }

  const deleteProfile = async (profileId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario? Esta acción es irreversible.")) return
    
    setIsUpdating(true)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId)
    
    if (!error) {
      setProfiles(profiles.filter(p => p.id !== profileId))
      setIsDetailOpen(false)
      setSelectedProfile(null)
    } else {
      alert("Error al eliminar usuario: Solo un Administrador Master puede realizar esta acción o el usuario tiene registros vinculados.")
    }
    setIsUpdating(false)
  }

  const updateProfileRole = async (profileId: string, newRole: string) => {
    setIsUpdating(true)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)
    
    if (!error) {
      setProfiles(profiles.map(p => p.id === profileId ? { ...p, role: newRole } : p))
      if (selectedProfile?.id === profileId) {
        setSelectedProfile({ ...selectedProfile, role: newRole })
      }
    }
    setIsUpdating(false)
  }

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-in fade-in duration-700 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground mb-2">Equipo Comercial</h1>
          <p className="text-muted-foreground text-sm font-medium">Gestiona los permisos y perfiles de acceso de tus vendedores.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
          <Input 
            placeholder="Buscar por nombre..." 
            className="pl-12 h-12 bg-white dark:bg-slate-900 border-border/40 rounded-2xl font-medium shadow-sm transition-all focus:ring-2 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-[2rem] bg-muted/20 animate-pulse border border-border/10"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProfiles.map((profile) => (
            <div key={profile.id} className="group relative bg-white dark:bg-slate-900 rounded-[2rem] border border-border/40 dark:border-white/5 p-8 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden">
              
              <div className="flex items-start justify-between mb-8">
                <div className="relative">
                  <div className="h-20 w-20 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-500 overflow-hidden shadow-inner">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} />
                    )}
                  </div>
                  <div className={`absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg ${
                    profile.role === 'ADMIN' ? 'bg-primary text-white' : 'bg-blue-500 text-white'
                  }`}>
                    <Shield size={14} />
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`text-[9px] font-black tracking-widest uppercase h-6 px-3 ${
                    profile.role === 'ADMIN' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100 dark:border-blue-800/30'
                  }`}>
                    {profile.role === 'ADMIN' ? 'ADMIN' : 'VENTAS'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1 mb-8">
                <h3 className="font-black text-xl text-foreground leading-tight">{profile.full_name || 'Sin Nombre'}</h3>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 truncate">{profile.email || 'Sin Correo'}</p>
              </div>

              <Button 
                onClick={() => { setSelectedProfile(profile); setIsDetailOpen(true); }}
                className="w-full h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
              >
                Gestionar Perfil
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Profile Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px] border-none bg-white dark:bg-slate-900 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
          {selectedProfile && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5 relative">
                <div className="absolute -bottom-12 left-8 p-1 bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl">
                  <div className="h-24 w-24 rounded-[1.8rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary overflow-hidden relative group shadow-inner">
                    {selectedProfile.avatar_url ? (
                      <img src={selectedProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} />
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer">
                      <Camera size={20} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleAvatarUpload(e, selectedProfile.id)}
                        disabled={isUpdating}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-16 p-8">
                <div className="mb-10">
                  <h2 className="text-3xl font-black tracking-tighter mb-1">{selectedProfile.full_name}</h2>
                  <p className="text-sm font-medium text-muted-foreground">{selectedProfile.role === 'ADMIN' ? 'Administrador Master' : 'Equipo de Ventas'}</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Información de Contacto</label>
                    <div className="grid gap-4">
                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-primary shadow-sm">
                          <Mail size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">CORREO ELECTRÓNICO</span>
                          <span className="text-sm font-bold text-foreground truncate">{selectedProfile.email || 'No disponible'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-white/5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Permisos de Acceso</label>
                    
                    {/* Explicación de Permisos */}
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-border/40 mb-4">
                      {selectedProfile.role === 'ADMIN' ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-primary">
                            <Shield size={14} className="font-black" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Nivel: Administrador Master</span>
                          </div>
                          <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic">
                            Acceso total al sistema, configuración de empresa, gestión de todo el equipo y visibilidad de todos los negocios en el pipeline.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-blue-500">
                            <User size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Nivel: Ventas</span>
                          </div>
                          <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic">
                            Gestión de sus propios prospectos y clientes. Visualización limitada a su pipeline personal y calendario de actividades asignadas.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => updateProfileRole(selectedProfile.id, 'ADMIN')}
                        disabled={isUpdating}
                        className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl border-2 transition-all ${
                          selectedProfile.role === 'ADMIN' 
                            ? 'border-primary bg-primary/5 text-primary' 
                            : 'border-slate-100 dark:border-white/5 text-muted-foreground hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <Shield size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Admin</span>
                        {selectedProfile.role === 'ADMIN' && <Check size={16} className="ml-1" />}
                      </button>
                      
                      <button 
                        onClick={() => updateProfileRole(selectedProfile.id, 'VENDEDOR')}
                        disabled={isUpdating}
                        className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl border-2 transition-all ${
                          selectedProfile.role === 'VENDEDOR' || selectedProfile.role === 'SALES_OPS'
                            ? 'border-blue-500 bg-blue-50 text-blue-500' 
                            : 'border-slate-100 dark:border-white/5 text-muted-foreground hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <User size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Ventas</span>
                        {(selectedProfile.role === 'VENDEDOR' || selectedProfile.role === 'SALES_OPS') && <Check size={16} className="ml-1" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => deleteProfile(selectedProfile.id)}
                      disabled={isUpdating}
                      className="flex-1 h-14 rounded-2xl border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200"
                    >
                      <Trash2 size={18} className="mr-2" />
                      <span className="text-xs font-black uppercase tracking-widest">Eliminar Usuario</span>
                    </Button>
                    <Button 
                      onClick={() => setIsDetailOpen(false)}
                      className="flex-1 h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!loading && filteredProfiles.length === 0 && (
        <div className="text-center py-20 bg-slate-50/50 dark:bg-white/[0.02] rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10">
          <User className="mx-auto h-16 w-16 text-slate-300 dark:text-slate-700 mb-6" />
          <p className="text-slate-500 font-extrabold text-xl">No se encontraron usuarios</p>
          <p className="text-muted-foreground text-sm mt-2">Intenta con otro nombre de vendedor.</p>
        </div>
      )}
    </div>
  )
}
