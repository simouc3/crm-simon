import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogStickyFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogMacClose,
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
import { supabase } from "../lib/supabase/client"
import { type Deal, type Company } from "../types/database"
import { LeadEnricher } from "../lib/ai/LeadEnricher"
import { Layout, Building2, Ruler, BarChart3, Tag } from "lucide-react"

interface DealFormProps {
  onDealCreated?: () => void
  dealToEdit?: Deal
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DealFormDialog({ onDealCreated, dealToEdit, trigger, open: externalOpen, onOpenChange }: DealFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setInternalOpen(val)
  }
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    company_id: '',
    valor_neto: '',
    stage: '1',
    m2_limpieza: ''
  })

  useEffect(() => {
    async function getCompanies() {
      const { data } = await supabase.from('companies').select('id, razon_social').order('razon_social')
      if (data) setCompanies(data as any)
    }
    if (open) {
      getCompanies()
    }
  }, [open])

  useEffect(() => {
    if (open && dealToEdit) {
      setFormData({
        title: dealToEdit.title || '',
        company_id: dealToEdit.company_id || '',
        valor_neto: dealToEdit.valor_neto ? String(dealToEdit.valor_neto) : '',
        stage: dealToEdit.stage ? String(dealToEdit.stage) : '1',
        m2_limpieza: dealToEdit.m2_limpieza ? String(dealToEdit.m2_limpieza) : ''
      })
    } else if (open && !dealToEdit) {
      setFormData({
        title: '', company_id: '', valor_neto: '', stage: '1', m2_limpieza: ''
      })
    }
  }, [open, dealToEdit])

  const handleSubmit = async () => {
    if (!formData.title || !formData.company_id) {
      alert("Título del negocio y Empresa son obligatorios")
      return
    }

    setLoading(true)
    const neto = formData.valor_neto ? parseFloat(formData.valor_neto) : 0
    const iva = neto * 0.19
    const dataToSave = {
      title: formData.title,
      company_id: formData.company_id,
      valor_neto: neto,
      valor_total: neto + iva,
      stage: parseInt(formData.stage),
      m2_limpieza: formData.m2_limpieza ? parseFloat(formData.m2_limpieza) : null
    }

    let error;
    if (dealToEdit) {
      const { error: updateError } = await supabase.from('deals').update(dataToSave).eq('id', dealToEdit.id)
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('deals').insert([dataToSave])
      error = insertError;
    }

    setLoading(false)
    if (error) {
      alert("Error guardando negocio: " + error.message)
    } else {
      if (!dealToEdit) {
        const { data: newDeals } = await supabase.from('deals').select('id, company_id').eq('title', dataToSave.title).eq('company_id', dataToSave.company_id).order('created_at', { ascending: false }).limit(1)
        
        if (newDeals && newDeals[0]) {
          const dealId = newDeals[0].id
          const company = companies.find(c => c.id === formData.company_id)
          
          if (company) {
            LeadEnricher.suggestInitialTasks(company.razon_social, company.segmento || 'INDUSTRIAL').then(async (tasks) => {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) return

              const activitiesToInsert = tasks.map((t, index) => ({
                deal_id: dealId,
                user_id: user.id,
                title: t,
                activity_type: index === 0 ? 'LLAMADA' : 'REUNION',
                completed: false,
                scheduled_at: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Tarea sugerida por IA según segmento del cliente.'
              }))

              await supabase.from('activities').insert(activitiesToInsert)
              if (onDealCreated) onDealCreated()
            })
          }
        }
      }

      setOpen(false)
      if (onDealCreated) onDealCreated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[440px] rounded-[40px] p-0 overflow-hidden border-none bg-[#F5F5F7] dark:bg-black shadow-2xl">
        <div className="flex flex-col max-h-[92vh] relative">
          
          <DialogMacClose onClick={() => setOpen(false)} />

          <div className="p-8 pb-4">
            <DialogHeader className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                 <Tag size={28} />
              </div>
              <DialogTitle className="text-3xl font-black tracking-tighter">
                {dealToEdit ? 'Editar Negocio' : 'Nuevo Negocio'}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium opacity-60">
                Gestiona la oportunidad comercial y vincula a un cliente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Layout size={12} className="opacity-40" /> Título de la Oportunidad
                </Label>
                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="h-12 rounded-2xl bg-white dark:bg-[#1C1C1E] border-black/[0.05] dark:border-white/[0.05] font-bold" placeholder="Ej: Servicio de Limpieza Mensual" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Building2 size={12} className="opacity-40" /> Seleccionar Cliente
                </Label>
                <Select value={formData.company_id} onValueChange={(val) => setFormData({...formData, company_id: val})}>
                  <SelectTrigger className="h-12 rounded-2xl bg-white dark:bg-[#1C1C1E] border-black/[0.05] dark:border-white/[0.05] font-bold px-4">
                    <SelectValue placeholder="Busca un cliente..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id} className="font-bold py-3">{c.razon_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                    <BarChart3 size={12} className="opacity-40" /> Inversión (Neto)
                  </Label>
                  <Input type="number" value={formData.valor_neto} onChange={(e) => setFormData({...formData, valor_neto: e.target.value})} className="h-12 rounded-2xl bg-white dark:bg-[#1C1C1E] border-black/[0.05] dark:border-white/[0.05] font-bold" placeholder="Ej: 1500000" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Ruler size={12} className="opacity-40" /> Área Total (m²)
                  </Label>
                  <Input type="number" value={formData.m2_limpieza} onChange={(e) => setFormData({...formData, m2_limpieza: e.target.value})} className="h-12 rounded-2xl bg-white dark:bg-[#1C1C1E] border-black/[0.05] dark:border-white/[0.05] font-bold" placeholder="500" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Tag size={12} className="opacity-40" /> Etapa del Pipeline
                </Label>
                <Select value={formData.stage} onValueChange={(val) => setFormData({...formData, stage: val})}>
                  <SelectTrigger className="h-12 rounded-2xl bg-white dark:bg-[#1C1C1E] border-black/[0.05] dark:border-white/[0.05] font-bold px-4">
                    <SelectValue placeholder="Etapa actual" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="1" className="font-bold py-3">1. Prospección</SelectItem>
                    <SelectItem value="2" className="font-bold py-3">2. Contacto Iniciado</SelectItem>
                    <SelectItem value="3" className="font-bold py-3">3. Visita Agendada</SelectItem>
                    <SelectItem value="4" className="font-bold py-3">4. Propuesta Enviada</SelectItem>
                    <SelectItem value="5" className="font-bold py-3">5. Negociación</SelectItem>
                    <SelectItem value="6" className="font-bold py-3">6. Cierre Ganado</SelectItem>
                    <SelectItem value="7" className="font-bold py-3">7. Cierre Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogStickyFooter className="mt-4">
            <Button 
               disabled={loading} 
               onClick={handleSubmit}
               className="h-14 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[11px] tracking-widest w-full shadow-2xl active:scale-95 transition-all"
            >
              {loading ? 'Guardando...' : (dealToEdit ? 'Guardar Cambios' : 'Crear Negocio')}
            </Button>
          </DialogStickyFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
