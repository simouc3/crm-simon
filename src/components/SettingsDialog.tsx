import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { supabase } from "../lib/supabase/client"
import { Upload, User, Save, Bell, Sparkles } from "lucide-react"
import { checkNotificationPermission, subscribeToPush, unsubscribeFromPush } from "../lib/push-notifications"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSettingsUpdated?: () => void
}

export function SettingsDialog({ open, onOpenChange, onSettingsUpdated }: SettingsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [userName, setUserName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushToggling, setPushToggling] = useState(false)
  const [geminiKey, setGeminiKey] = useState("")

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
      .select('company_name')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()

    if (data) setCompanyName(data.company_name)

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

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        company_name: companyName,
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
        <DialogHeader>
          <DialogTitle>Configuración del Sistema</DialogTitle>
          <DialogDescription>
            Ajusta el nombre de tu empresa y tu perfil personal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Empresa */}
          <div className="grid gap-2">
            <Label htmlFor="companyName">Nombre de la Empresa</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ej: LimpioSur SPA"
              className="rounded-full"
            />
          </div>

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
