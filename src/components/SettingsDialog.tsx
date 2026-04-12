import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { supabase } from "../lib/supabase/client"
import { Upload, User, Save, Bell, Sparkles, Building2, Mail } from "lucide-react"
import { checkNotificationPermission, subscribeToPush, unsubscribeFromPush } from "../lib/push-notifications"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSettingsUpdated?: () => void
}

export function SettingsDialog({ open, onOpenChange, onSettingsUpdated }: SettingsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'perfil'|'empresa'>('perfil')
  const [companyName, setCompanyName] = useState("")
  const [companyRut, setCompanyRut] = useState("")
  const [companyGiro, setCompanyGiro] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyWebsite, setCompanyWebsite] = useState("")
  const [userName, setUserName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushToggling, setPushToggling] = useState(false)
  const [geminiKey, setGeminiKey] = useState("")
  const [companyLogoUrl, setCompanyLogoUrl] = useState("")
  const [operationsEmail, setOperationsEmail] = useState("")

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
      .select('company_name, company_rut, company_giro, company_address, company_phone, company_website, company_logo_url, operations_email')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()

    if (data) {
      setCompanyName(data.company_name)
      if (data.company_rut) setCompanyRut(data.company_rut)
      if (data.company_giro) setCompanyGiro(data.company_giro)
      if (data.company_address) setCompanyAddress(data.company_address)
      if (data.company_phone) setCompanyPhone(data.company_phone)
      if (data.company_website) setCompanyWebsite(data.company_website)
      if (data.company_logo_url) setCompanyLogoUrl(data.company_logo_url)
      if (data.operations_email) setOperationsEmail(data.operations_email)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user?.user_metadata?.full_name) setUserName(user.user_metadata.full_name)
    if (user?.user_metadata?.avatar_url) setAvatarUrl(user.user_metadata.avatar_url)

    const savedKey = localStorage.getItem('gemini_api_key')
    if (savedKey) setGeminiKey(savedKey)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    setUploading(true)
    const file = e.target.files[0]
    const fileExt = file.type.includes('png') ? 'png' : 'jpg'
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const filePath = `${user.id}/avatar.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      alert("Error subiendo foto: " + uploadError.message)
    } else {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(`${urlData.publicUrl}?t=${Date.now()}`)
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    setUploading(true)
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `logo-${Date.now()}.${fileExt}`
    const filePath = `public/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      alert("Error subiendo logo: " + uploadError.message)
    } else {
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath)
      setCompanyLogoUrl(`${urlData.publicUrl}?t=${Date.now()}`)
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        company_name: companyName,
        company_rut: companyRut,
        company_giro: companyGiro,
        company_address: companyAddress,
        company_phone: companyPhone,
        company_website: companyWebsite,
        company_logo_url: companyLogoUrl,
        operations_email: operationsEmail,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    await supabase.auth.updateUser({
      data: { full_name: userName, avatar_url: avatarUrl }
    })

    if (geminiKey) {
      localStorage.setItem('gemini_api_key', geminiKey)
    } else {
      localStorage.removeItem('gemini_api_key')
    }

    if (error) {
      alert("Error guardando: " + error.message)
    } else {
      if (onSettingsUpdated) onSettingsUpdated()
      onOpenChange(false)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader className="relative">
          <DialogTitle>Configuración del Sistema</DialogTitle>
          <DialogDescription>
            Ajusta el nombre de tu empresa y tu perfil personal.
          </DialogDescription>
          {/* Botón Cerrar "X" - Touch Target 44px */}
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute -top-2 -right-2 h-11 w-11 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 transition-all active:scale-90"
            aria-label="Cerrar"
          >
            <span className="text-xl font-medium opacity-40">✕</span>
          </button>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-2 mt-4 mx-1">
          <button 
            onClick={() => setActiveTab('perfil')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'perfil' ? 'bg-white dark:bg-white/10 shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            Perfil
          </button>
          <button 
            onClick={() => setActiveTab('empresa')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'empresa' ? 'bg-white dark:bg-white/10 shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            Empresa
          </button>
        </div>

        <div className="grid gap-5 py-2 max-h-[60vh] overflow-y-auto px-1 hide-scrollbar pb-24">
          {activeTab === 'perfil' && (
            <>
              {/* Perfil */}
              <div className="grid gap-2">
                <Label>Tu Nombre y Foto de Perfil</Label>
                <div className="flex gap-4 items-center">
                  <div className="relative w-14 h-14 rounded-full border border-border/40 flex items-center justify-center overflow-hidden bg-muted/30 shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground/40" />
                    )}
                    <Label htmlFor="avatar" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                      <Upload className="w-3 h-3 text-white" />
                      <Input
                        id="avatar"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                      />
                    </Label>
                  </div>
                  <div className="relative flex-1">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      id="userName"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="pl-12 w-full h-12 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Notificaciones */}
              <div className="pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">Notificaciones Push</span>
                      <span className="text-[11px] text-muted-foreground">
                        {pushEnabled ? '✅ Activadas' : 'Alertas en tiempo real'}
                      </span>
                    </div>
                  </div>
                  <Switch
                    checked={pushEnabled}
                    onCheckedChange={handleTogglePush}
                    disabled={pushToggling}
                  />
                </div>
              </div>

              {/* Gestión de Equipo */}
              <div className="pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">Gestión de Equipo</span>
                    <span className="text-[11px] text-muted-foreground">Roles y perfiles de vendedores</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false)
                      window.history.pushState({}, '', '/users')
                      window.dispatchEvent(new PopStateEvent('popstate'))
                    }}
                    className="border-primary/20 text-primary hover:bg-primary/5 rounded-xl font-bold text-[10px] uppercase tracking-wider h-8"
                  >
                    Ver Directorio
                  </Button>
                </div>
              </div>

              {/* Configuración de IA */}
              <div className="pt-4 border-t border-border/40">
                 <div className="grid gap-2">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                          <Sparkles className="w-4 h-4" />
                       </div>
                       <Label htmlFor="geminiKey" className="text-sm font-bold text-foreground">Gemini API Key</Label>
                    </div>
                    <Input
                      id="geminiKey"
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="rounded-xl h-10 font-mono text-[11px] bg-slate-50 dark:bg-white/5"
                    />
                    <p className="text-[10px] text-muted-foreground opacity-60 italic pl-1">
                       Tu clave se guarda localmente en tu dispositivo.
                    </p>
                 </div>
              </div>
            </>
          )}

          {activeTab === 'empresa' && (
            <>
              {/* Empresa Legales */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyName">Razón Social</Label>
                  <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ej: LimpioSur SPA" className="rounded-xl h-10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                     <Label htmlFor="companyRut">RUT</Label>
                     <Input id="companyRut" value={companyRut} onChange={e => setCompanyRut(e.target.value)} placeholder="12.345.678-9" className="rounded-xl h-10" />
                  </div>
                  <div className="grid gap-2">
                     <Label htmlFor="companyGiro">Giro Comercial</Label>
                     <Input id="companyGiro" value={companyGiro} onChange={e => setCompanyGiro(e.target.value)} placeholder="Servicios Integrales" className="rounded-xl h-10" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyAddress">Dirección Legal</Label>
                  <Input id="companyAddress" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="Av. Principal 123, Of 4" className="rounded-xl h-10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                     <Label htmlFor="companyPhone">Teléfono</Label>
                     <Input id="companyPhone" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} placeholder="+56 9 1234 5678" className="rounded-xl h-10" />
                  </div>
                  <div className="grid gap-2">
                     <Label htmlFor="companyWebsite">Sitio Web</Label>
                     <Input id="companyWebsite" value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder="www.tuempresa.cl" className="rounded-xl h-10" />
                  </div>
                </div>

                {/* operations_email field */}
                <div className="grid gap-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-primary" />
                    <Label htmlFor="opsEmail" className="text-sm font-bold text-foreground">Correo de Operaciones</Label>
                  </div>
                  <Input 
                    id="opsEmail" 
                    value={operationsEmail} 
                    onChange={e => setOperationsEmail(e.target.value)} 
                    placeholder="operaciones@tuempresa.com" 
                    className="rounded-xl h-10 bg-white/50 dark:bg-black/20"
                  />
                  <p className="text-[10px] text-muted-foreground opacity-70 italic pl-1">
                    Aquí se enviará el dossier comercial y técnico de cada negocio ganado.
                  </p>
                </div>

                {/* Logo Upload Section */}
                <div className="pt-4 border-t border-border/40">
                  <Label className="text-sm font-bold mb-3 block text-foreground">Identidad de Marca (Logo)</Label>
                  <div className="flex gap-4 items-center p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-border/60">
                    <div className="w-20 h-20 rounded-xl bg-white dark:bg-[#1C1C2E] border border-border/40 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                      {companyLogoUrl ? (
                        <img src={companyLogoUrl} alt="Logo Empresa" className="w-full h-full object-contain p-2" />
                      ) : (
                        <Building2 className="w-8 h-8 text-muted-foreground/20" />
                      )}
                      <Label htmlFor="logo-upload" className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Upload className="w-4 h-4 text-white" />
                        <Input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={uploading}
                        />
                      </Label>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-foreground">Subir Logo Corporativo</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">PNG o JPG con fondo transparente preferiblemente.</span>
                      {uploading && <span className="text-[10px] font-bold text-primary animate-pulse mt-1">Subiendo...</span>}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || uploading} className="rounded-xl">
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
