import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { type Company } from "../types/database"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "../lib/supabase/client"
import { MapPin, ExternalLink } from "lucide-react"

// Todas las comunas de la Región de Los Lagos (XIV Región)
const COMUNAS_LOS_LAGOS = [
  // Provincia de Llanquihue
  { value: "PUERTO_MONTT", label: "Puerto Montt" },
  { value: "PUERTO_VARAS", label: "Puerto Varas" },
  { value: "LLANQUIHUE", label: "Llanquihue" },
  { value: "FRUTILLAR", label: "Frutillar" },
  { value: "FRESIA", label: "Fresia" },
  { value: "LOS_MUERMOS", label: "Los Muermos" },
  { value: "MAULLIN", label: "Maullín" },
  { value: "CALBUCO", label: "Calbuco" },
  { value: "COCHAMO", label: "Cochamó" },
  // Provincia de Chiloé
  { value: "CASTRO", label: "Castro" },
  { value: "ANCUD", label: "Ancud" },
  { value: "QUILLON", label: "Quillón" },
  { value: "DALCAHUE", label: "Dalcahue" },
  { value: "CURACO_DE_VELEZ", label: "Curaco de Vélez" },
  { value: "PUQUELDON", label: "Puqueldón" },
  { value: "QUEILEN", label: "Queilén" },
  { value: "QUELLON", label: "Quellón" },
  { value: "CHONCHI", label: "Chonchi" },
  { value: "QUINCHAO", label: "Quinchao" },
  // Provincia de Osorno
  { value: "OSORNO", label: "Osorno" },
  { value: "PUERTO_OCTAY", label: "Puerto Octay" },
  { value: "PURRANQUE", label: "Purranque" },
  { value: "PUYEHUE", label: "Puyehue" },
  { value: "RIO_NEGRO", label: "Río Negro" },
  { value: "SAN_JUAN_DE_LA_COSTA", label: "San Juan de la Costa" },
  { value: "SAN_PABLO", label: "San Pablo" },
  // Provincia de Palena
  { value: "CHAITEN", label: "Chaitén" },
  { value: "FUTALEUFU", label: "Futaleufú" },
  { value: "HUALAIHUE", label: "Hualaihué" },
  { value: "PALENA", label: "Palena" },
  // Otras provincias / genérico
  { value: "OTRO", label: "Otro" },
]

interface ClientFormProps {
  onClientCreated?: () => void
  clientToEdit?: Company
  trigger?: React.ReactNode
}

export function ClientFormDialog({ onClientCreated, clientToEdit, trigger }: ClientFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    razon_social: '',
    rut: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    cargo: '',
    segmento: '',
    comuna: '',
    direccion: '',
    m2_estimados: '',
    condiciones_pago: '',
    requisitos_legales: [] as string[]
  })

  useEffect(() => {
    if (open && clientToEdit) {
      setFormData({
        razon_social: clientToEdit.razon_social || '',
        rut: clientToEdit.rut || '',
        contact_name: clientToEdit.contact_name || '',
        contact_phone: clientToEdit.contact_phone || '',
        contact_email: clientToEdit.contact_email || '',
        cargo: clientToEdit.cargo || '',
        segmento: clientToEdit.segmento || '',
        comuna: clientToEdit.comuna || '',
        direccion: (clientToEdit as any).direccion || '',
        m2_estimados: clientToEdit.m2_estimados ? String(clientToEdit.m2_estimados) : '',
        condiciones_pago: clientToEdit.condiciones_pago || '',
        requisitos_legales: clientToEdit.requisitos_legales || []
      })
    } else if (open && !clientToEdit) {
      setFormData({
        razon_social: '', rut: '', contact_name: '', contact_phone: '',
        contact_email: '', cargo: '', segmento: '', comuna: '',
        direccion: '', m2_estimados: '', condiciones_pago: '', requisitos_legales: []
      })
    }
  }, [open, clientToEdit])

  const addRequisito = (req: string) => {
    setFormData(prev => ({ 
      ...prev, 
      requisitos_legales: prev.requisitos_legales.includes(req) 
        ? prev.requisitos_legales.filter(r => r !== req) 
        : [...prev.requisitos_legales, req] 
    }))
  }

  const formatRUT = (rut: string) => {
    let value = rut.replace(/[^0-9kK]/g, '').toUpperCase()
    if (value.length <= 1) return value
    const body = value.slice(0, -1)
    const dv = value.slice(-1)
    let formattedBody = ''
    for (let i = body.length - 1; i >= 0; i--) {
      formattedBody = body.charAt(i) + formattedBody
      if ((body.length - i) % 3 === 0 && i !== 0) {
        formattedBody = '.' + formattedBody
      }
    }
    return `${formattedBody}-${dv}`
  }

  const openGoogleMaps = () => {
    if (!formData.direccion && !formData.comuna) return
    const comunaLabel = COMUNAS_LOS_LAGOS.find(c => c.value === formData.comuna)?.label || formData.comuna
    const query = [formData.direccion, comunaLabel, 'Chile'].filter(Boolean).join(', ')
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank')
  }

  const handleSubmit = async () => {
    setLoading(true)
    const dataToSave = {
      razon_social: formData.razon_social,
      rut: formData.rut,
      contact_name: formData.contact_name,
      contact_phone: formData.contact_phone,
      contact_email: formData.contact_email,
      cargo: formData.cargo,
      segmento: formData.segmento,
      comuna: formData.comuna,
      direccion: formData.direccion,
      m2_estimados: formData.m2_estimados ? parseInt(formData.m2_estimados) : null,
      requisitos_legales: formData.requisitos_legales,
      condiciones_pago: formData.condiciones_pago
    }

    let error;
    if (clientToEdit) {
      const { error: updateError } = await supabase.from('companies').update(dataToSave).eq('id', clientToEdit.id)
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('companies').insert([dataToSave])
      error = insertError;
    }

    setLoading(false)
    if (error) {
      alert("Error guardando cliente: " + error.message)
    } else {
      setOpen(false)
      if (onClientCreated) onClientCreated()
      setFormData({ 
        razon_social: '', rut: '', contact_name: '', contact_phone: '',
        contact_email: '', cargo: '', segmento: '', comuna: '',
        direccion: '', m2_estimados: '', condiciones_pago: '', requisitos_legales: [] 
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : <Button className="w-full">+ Nueva Empresa</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] rounded-[32px] border-border/40 shadow-[0_40px_80px_rgba(0,0,0,0.1)]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-[20px] font-black tracking-tight">
            {clientToEdit ? 'Editar Ficha' : 'Nueva Empresa'}
          </DialogTitle>
          <DialogDescription className="text-[12px] font-medium text-muted-foreground">
            {clientToEdit ? 'Modifica los datos comerciales del cliente.' : 'Ingresa los datos del nuevo cliente B2B.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2 max-h-[65vh] overflow-y-auto px-1 pr-2">

          {/* Sección: Empresa */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60 pb-1 border-b border-border/40">Empresa</p>
            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <Label htmlFor="razon_social" className="text-right text-[11px] font-bold text-muted-foreground">Razón Social</Label>
              <Input id="razon_social" value={formData.razon_social} onChange={(e) => setFormData({...formData, razon_social: e.target.value})} className="h-10 rounded-xl text-sm" placeholder="Empresa S.A." />
            </div>
            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <Label htmlFor="rut" className="text-right text-[11px] font-bold text-muted-foreground">RUT</Label>
              <Input id="rut" value={formData.rut} onChange={(e) => setFormData({...formData, rut: formatRUT(e.target.value)})} className="h-10 rounded-xl text-sm" placeholder="77.777.777-K" maxLength={12} />
            </div>
            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <Label htmlFor="segmento" className="text-right text-[11px] font-bold text-muted-foreground">Segmento</Label>
              <Select value={formData.segmento} onValueChange={(val) => setFormData({...formData, segmento: val})}>
                <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACUICOLA_MARITIMO">Acuícola / Marítimo</SelectItem>
                  <SelectItem value="SALUD_CLINICO">Salud / Clínico</SelectItem>
                  <SelectItem value="CORPORATIVO">Oficinas / Corporativo</SelectItem>
                  <SelectItem value="LOGISTICA">Logística / Post-Obra</SelectItem>
                  <SelectItem value="INDUSTRIAL">Industrial / Manufacturero</SelectItem>
                  <SelectItem value="EDUCACION">Educación</SelectItem>
                  <SelectItem value="RETAIL">Retail / Comercio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sección: Contacto */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60 pb-1 border-b border-border/40">Contacto Principal</p>
            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <Label htmlFor="contacto" className="text-right text-[11px] font-bold text-muted-foreground">Nombre</Label>
              <Input id="contacto" value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})} className="h-10 rounded-xl text-sm" placeholder="Nombre completo" />
            </div>
            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <Label htmlFor="cargo" className="text-right text-[11px] font-bold text-muted-foreground">Cargo</Label>
              <Select value={formData.cargo} onValueChange={(val) => setFormData({...formData, cargo: val})}>
                <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GERENCIA_OP">Gerencia de Operaciones</SelectItem>
                  <SelectItem value="ADQUISICIONES">Adquisiciones</SelectItem>
                  <SelectItem value="FACILITY">Facility Management</SelectItem>
                  <SelectItem value="RRHH">RRHH</SelectItem>
                  <SelectItem value="DUENO">Dueño</SelectItem>
                  <SelectItem value="GERENCIA_GRAL">Gerencia General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <Label htmlFor="phone" className="text-right text-[11px] font-bold text-muted-foreground">Teléfono</Label>
              <Input id="phone" value={formData.contact_phone} onChange={(e) => setFormData({...formData, contact_phone: e.target.value})} className="h-10 rounded-xl text-sm" placeholder="+569..." />
            </div>
            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <Label htmlFor="email" className="text-right text-[11px] font-bold text-muted-foreground">Email</Label>
              <Input id="email" type="email" value={formData.contact_email} onChange={(e) => setFormData({...formData, contact_email: e.target.value})} className="h-10 rounded-xl text-sm" placeholder="correo@empresa.cl" />
            </div>
          </div>

          {/* Sección: Ubicación y Operaciones */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60 pb-1 border-b border-border/40">Ubicación · Región de Los Lagos</p>
            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <Label htmlFor="comuna" className="text-right text-[11px] font-bold text-muted-foreground">Comuna</Label>
              <Select value={formData.comuna} onValueChange={(val) => setFormData({...formData, comuna: val})}>
                <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  <div className="px-2 py-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Prov. Llanquihue</div>
                  {COMUNAS_LOS_LAGOS.slice(0, 9).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  <div className="px-2 py-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mt-1">Prov. Chiloé</div>
                  {COMUNAS_LOS_LAGOS.slice(9, 18).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  <div className="px-2 py-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mt-1">Prov. Osorno</div>
                  {COMUNAS_LOS_LAGOS.slice(18, 25).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  <div className="px-2 py-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mt-1">Prov. Palena</div>
                  {COMUNAS_LOS_LAGOS.slice(25, 29).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  <div className="px-2 py-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mt-1">General</div>
                  {COMUNAS_LOS_LAGOS.slice(29).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Dirección con botón Google Maps */}
            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <Label htmlFor="direccion" className="text-right text-[11px] font-bold text-muted-foreground">Dirección</Label>
              <div className="flex gap-2">
                <Input 
                  id="direccion" 
                  value={formData.direccion} 
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})} 
                  className="h-10 rounded-xl text-sm flex-1" 
                  placeholder="Av. Diego Portales 1234" 
                />
                <button
                  type="button"
                  onClick={openGoogleMaps}
                  disabled={!formData.direccion && !formData.comuna}
                  className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border/40 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                  title="Ver en Google Maps"
                >
                  <MapPin className="h-4 w-4 text-foreground/60" />
                </button>
              </div>
            </div>

            {/* Preview mini mapa link */}
            {(formData.direccion || formData.comuna) && (
              <div className="ml-[102px]">
                <button
                  type="button"
                  onClick={openGoogleMaps}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <ExternalLink className="h-3 w-3 group-hover:text-foreground/60" />
                  <span>Verificar dirección en Google Maps</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <Label htmlFor="m2" className="text-right text-[11px] font-bold text-muted-foreground">Área (m²)</Label>
              <Input id="m2" type="number" value={formData.m2_estimados} onChange={(e) => setFormData({...formData, m2_estimados: e.target.value})} className="h-10 rounded-xl text-sm" placeholder="1000" />
            </div>
          </div>

          {/* Sección: Condiciones Comerciales */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60 pb-1 border-b border-border/40">Condiciones Comerciales</p>
            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <Label htmlFor="pago" className="text-right text-[11px] font-bold text-muted-foreground">Cond. Pago</Label>
              <Select value={formData.condiciones_pago} onValueChange={(val) => setFormData({...formData, condiciones_pago: val})}>
                <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTADO">Contado</SelectItem>
                  <SelectItem value="30_DIAS">30 Días contra Fac.</SelectItem>
                  <SelectItem value="45_DIAS">45 Días contra Fac.</SelectItem>
                  <SelectItem value="60_DIAS">60 Días contra Fac.</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 items-start gap-3 pt-1">
              <Label className="text-[11px] font-bold text-muted-foreground">Requisitos Legales</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'F30', label: 'F30 / F30-1' },
                  { id: 'MUTUAL', label: 'Mutualidad' },
                  { id: 'SEREMI', label: 'Prot. Seremi' },
                  { id: 'INDUCCION', label: 'Inducción DAS' },
                  { id: 'EPP', label: 'EPP Específico' },
                ].map(req => (
                  <div key={req.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={req.id.toLowerCase()} 
                      checked={formData.requisitos_legales.includes(req.id)} 
                      onCheckedChange={() => addRequisito(req.id)} 
                      className="rounded-md"
                    />
                    <label htmlFor={req.id.toLowerCase()} className="text-[12px] font-medium text-muted-foreground cursor-pointer">{req.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button 
            disabled={loading} 
            onClick={handleSubmit}
            className="h-12 rounded-2xl font-black text-[12px] uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90 w-full shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
          >
            {loading ? 'Guardando...' : (clientToEdit ? 'Guardar Cambios' : 'Crear Cliente')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
