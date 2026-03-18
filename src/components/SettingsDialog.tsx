import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { supabase } from "../lib/supabase/client"
import { Upload, Building2, User, Save, Bell } from "lucide-react"
import { checkNotificationPermission, subscribeToPush, unsubscribeFromPush } from "../lib/push-notifications"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSettingsUpdated?: () => void
}

export function SettingsDialog({ open, onOpenChange, onSettingsUpdated }: SettingsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [userName, setUserName] = useState("")
  const [uploading, setUploading] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushToggling, setPushToggling] = useState(false)

  useEffect(() => {
    if (open) {
      fetchSettings()
      checkPushStatus()
    }
  }, [open])

  const checkPushStatus = async () => {
    const status = await checkNotificationPermission()
    setPushEnabled(status === 'granted')
  }

  const handleTogglePush = async (checked: boolean) => {
    setPushToggling(true)
    if (checked) {
      const success = await subscribeToPush()
      setPushEnabled(success ?? false)
    } else {
      const success = await unsubscribeFromPush()
      if (success) setPushEnabled(false)
    }
    setPushToggling(false)
  }

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()

    if (data) {
      setCompanyName(data.company_name)
      setLogoUrl(data.company_logo_url || "")
    }

    // Fetch User metadata
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.user_metadata?.full_name) {
      setUserName(user.user_metadata.full_name)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    setUploading(true)
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `company_logo.${fileExt}`
    const filePath = `branding/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('deal-documents') // Reciclando el bucket existente por ahora
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      alert("Error subiendo logo: " + uploadError.message)
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('deal-documents')
        .getPublicUrl(filePath)
      
      setLogoUrl(publicUrl)
    }
    setUploading(false)
  }

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        company_name: companyName,
        company_logo_url: logoUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    // Update User metadata
    await supabase.auth.updateUser({
      data: { full_name: userName }
    })

    if (error) {
      alert("Error guardando configuración: " + error.message)
    } else {
      if (onSettingsUpdated) onSettingsUpdated()
      // No cerramos el diálogo inmediatamente para dar tiempo a la suscripción si es necesario, 
      // o simplemente dejamos que el usuario lo cierre. Pero para UX rápida, lo mantendremos así.
      onOpenChange(false)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Configuración del Sistema</DialogTitle>
          <DialogDescription>
            Personaliza la apariencia de tu CRM con el logo y nombre de tu empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/30">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Building2 className="w-10 h-10 text-muted-foreground/40" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Label htmlFor="logo" className="cursor-pointer">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline">
                  <Upload className="w-3.5 h-3.5" />
                  {logoUrl ? "Cambiar Logo" : "Subir Logo"}
                </div>
                <Input 
                  id="logo" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
              </Label>
              <p className="text-[10px] text-muted-foreground italic">Recomendado: SVG o PNG transperente (200x200px)</p>
            </div>
          </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="companyName">Nombre de la Empresa</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ej: Limpiezas Industriales S.A."
                />
              </div>
                <div className="grid gap-2">
                  <Label htmlFor="userName">Tu Nombre / Usuario</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      id="userName"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Ajuste de Notificaciones */}
                <div className="mt-4 pt-6 border-t border-border/40">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bell className="w-4 h-4 text-primary" />
                         </div>
                         <div className="flex flex-col">
                           <span className="text-xs font-bold text-foreground">Notificaciones Push</span>
                           <span className="text-[10px] text-muted-foreground">Alertas en tiempo real</span>
                         </div>
                      </div>
                      <Switch 
                        checked={pushEnabled}
                        onCheckedChange={handleTogglePush}
                        disabled={pushToggling}
                      />
                    </div>
                  </div>
                </div>

                {/* Directorio de Usuarios Link for Admins */}
                <div className="mt-4 pt-6 border-t border-border/40">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">Gestión de Equipo</span>
                        <span className="text-[10px] text-muted-foreground">Administra los roles y perfiles de los vendedores.</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          onOpenChange(false);
                          window.history.pushState({}, '', '/users');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                        className="border-primary/20 text-primary hover:bg-primary/5 rounded-xl font-bold text-[10px] uppercase tracking-wider h-8"
                      >
                        Ver Directorio
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || uploading}>
            {loading ? "Guardando..." : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
