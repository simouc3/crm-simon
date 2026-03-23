import { useState } from 'react'
import { supabase } from '../lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserPlus, Mail, Copy, Check } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated: () => void
}

export function CreateUserDialog({ open, onOpenChange, onUserCreated }: CreateUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'VENTAS',
    segmento: 'INDUSTRIAL'
  })
  const [invited, setInvited] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Manual profile insertion
    const { error } = await supabase
      .from('profiles')
      .insert([
        { 
          full_name: formData.full_name, 
          email: formData.email, 
          role: formData.role,
          segmento: formData.segmento,
          id: crypto.randomUUID() // Create a temporary UUID until they sign up
        }
      ])

    if (error) {
      alert("Error creando perfil: " + error.message)
    } else {
      setInvited(true)
      onUserCreated()
    }
    setLoading(false)
  }

  const copyInviteLink = () => {
    const link = `${window.location.origin}/login`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
        {!invited ? (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <DialogHeader className="space-y-2 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                <UserPlus size={24} />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight">Nuevo Usuario</DialogTitle>
              <p className="text-xs text-muted-foreground font-medium">Crea un perfil para tu equipo. El usuario deberá registrarse con este mismo correo.</p>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre Completo</label>
                <div className="relative">
                  <Input 
                    required
                    placeholder="Ej. Juan Pérez" 
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-border/40 focus-visible:ring-primary/20 pl-4 font-bold"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    required
                    type="email"
                    placeholder="correo@empresa.com" 
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-border/40 focus-visible:ring-primary/20 pl-11 font-bold"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Rol de Acceso</label>
                <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-border/40 font-bold">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VENTAS">Vendedor (Terreno)</SelectItem>
                    <SelectItem value="ADMIN">Administrador (Control Total)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Segmento de Negocio</label>
                <Select value={formData.segmento} onValueChange={(val) => setFormData({ ...formData, segmento: val })}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-border/40 font-bold">
                    <SelectValue placeholder="Selecciona un segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACUICOLA_MARITIMO">Acuícola / Marítimo</SelectItem>
                    <SelectItem value="SALUD_CLINICO">Salud / Clínico</SelectItem>
                    <SelectItem value="CORPORATIVO">Corporativo / Oficinas</SelectItem>
                    <SelectItem value="LOGISTICA">Logística / Transporte</SelectItem>
                    <SelectItem value="INDUSTRIAL">Industrial / Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-foreground text-background font-black uppercase text-[12px] tracking-widest shadow-xl shadow-black/10 transition-transform active:scale-95"
            >
              {loading ? 'Creando...' : 'Crear Perfil'}
            </Button>
          </form>
        ) : (
          <div className="p-10 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
              <Check size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-[28px] font-black tracking-tight leading-tight">¡Perfil Creado!</h2>
              <p className="text-sm text-muted-foreground font-medium px-4">
                El perfil de **{formData.full_name}** ha sido registrado. Envía el enlace de invitación para que configure su acceso.
              </p>
            </div>

            <button 
              onClick={copyInviteLink}
              className="w-full flex items-center justify-between p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-border/40 hover:bg-slate-100 transition-colors group"
            >
               <div className="flex flex-col items-start">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Enlace de Registro</span>
                  <span className="text-xs font-bold text-primary truncate max-w-[200px]">{window.location.origin}/login</span>
               </div>
               <div className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-primary/10 text-primary group-hover:scale-110'}`}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
               </div>
            </button>

            <Button 
              onClick={() => onOpenChange(false)}
              className="w-full h-14 rounded-2xl bg-foreground text-background font-black uppercase text-[12px] tracking-widest shadow-xl shadow-black/10"
            >
              Cerrar y Regresar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
