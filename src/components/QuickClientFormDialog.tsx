import { useState } from "react"
import { supabase } from "../lib/supabase/client"
import { Building2, User, Phone, Loader2, Tag } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function QuickClientFormDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ 
    razon_social: '', 
    contact_name: '', 
    contact_phone: '',
    segmento: 'LOGISTICA' // Valor por defecto válido en el enum actual
  })

  if (!open) return null;

  const handleSubmit = async () => {
    if (!formData.razon_social || !formData.contact_name || !formData.contact_phone) {
      alert("Por favor completa los 3 campos obligatorios.");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const tempId = Math.random().toString(36).substring(7).toUpperCase();
    const dataToSave = {
      razon_social: formData.razon_social,
      contact_name: formData.contact_name,
      contact_phone: formData.contact_phone,
      contact_email: `pendiente_${tempId}@terreno.com`,
      rut: `TEMP-${tempId}`,
      cargo: "DUENO",
      segmento: formData.segmento,
      comuna: "OTRO",
      condiciones_pago: "CONTADO",
      m2_estimados: 0,
      requisitos_legales: [],
      created_by: user?.id
    };

    const { data: inserted, error } = await supabase.from('companies').insert([dataToSave]).select().single();
    
    if (error) {
      setLoading(false);
      alert("Error guardando cliente: " + error.message);
    } else {
      // Disparar score en segundo plano (no bloquea el cierre del modal)
      if (inserted) {
        import("../lib/ai/AIPredictor").then(({ AIPredictor }) => {
          AIPredictor.scoreCompany(inserted as any);
        });
      }
      
      setFormData({ 
        razon_social: '', 
        contact_name: '', 
        contact_phone: '',
        segmento: 'LOGISTICA'
      });
      setLoading(false);
      onOpenChange(false);
      // No recargar toda la página si podemos evitarlo, pero por ahora mantendremos el flujo
      window.location.reload();
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md transition-opacity" onClick={() => onOpenChange(false)} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm z-[80] bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-300">
        <h2 className="text-2xl font-black tracking-tight mb-2">Nuevo Cliente</h2>
        <p className="text-sm text-muted-foreground font-medium mb-6">Añade un prospecto rápido en terreno.</p>
        
        <div className="space-y-4">
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input placeholder="Nombre Empresa *" value={formData.razon_social} onChange={e => setFormData({...formData, razon_social: e.target.value})} className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-bold placeholder:font-medium text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input placeholder="Nombre Contacto *" value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-bold placeholder:font-medium text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input type="tel" placeholder="Teléfono Celular *" value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-bold placeholder:font-medium text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>

          <div className="relative">
             <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
             <Select value={formData.segmento} onValueChange={(val) => setFormData({ ...formData, segmento: val })}>
                <SelectTrigger className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-bold text-sm focus:ring-2 focus:ring-primary outline-none">
                  <SelectValue placeholder="Selecciona Segmento" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  <SelectItem value="ACUICOLA_MARITIMO">Acuícola / Marítimo</SelectItem>
                  <SelectItem value="SALUD_CLINICO">Salud / Clínico</SelectItem>
                  <SelectItem value="CORPORATIVO">Corporativo / Oficinas</SelectItem>
                  <SelectItem value="LOGISTICA">Logística / Transporte</SelectItem>
                  <SelectItem value="INDUSTRIAL">Industrial / Otros</SelectItem>
                </SelectContent>
             </Select>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={() => onOpenChange(false)} className="flex-1 h-14 rounded-2xl font-bold bg-slate-100 dark:bg-white/10 text-foreground hover:bg-slate-200 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 h-14 rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar"}
          </button>
        </div>
      </div>
    </>
  )
}
