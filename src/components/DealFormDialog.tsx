import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
import { supabase } from "../lib/supabase/client"
import { type Deal, type Company } from "../types/database"

interface DealFormProps {
  onDealCreated?: () => void
  dealToEdit?: Deal
  trigger?: React.ReactNode
}

export function DealFormDialog({ onDealCreated, dealToEdit, trigger }: DealFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    company_id: '',
    valor_neto: '',
    stage: '1'
  })

  useEffect(() => {
    async function getCompanies() {
      const { data } = await supabase.from('companies').select('id, razon_social')
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
        stage: dealToEdit.stage ? String(dealToEdit.stage) : '1'
      })
    } else if (open && !dealToEdit) {
      setFormData({
        title: '', company_id: '', valor_neto: '', stage: '1'
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
      stage: parseInt(formData.stage)
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
      setOpen(false)
      if (onDealCreated) onDealCreated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : <Button>+ Nuevo Negocio</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dealToEdit ? 'Editar Negocio' : 'Crear Nuevo Negocio'}</DialogTitle>
          <DialogDescription>
            Ingresa los detalles de la oportunidad de negocio.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right text-xs">Título</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="col-span-3" placeholder="Limpieza Post-Obra Edificio A" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="company" className="text-right text-xs">Empresa</Label>
            <Select value={formData.company_id} onValueChange={(val) => setFormData({...formData, company_id: val})}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecciona el cliente..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.razon_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="valor" className="text-right text-xs">Valor Neto</Label>
            <Input id="valor" type="number" value={formData.valor_neto} onChange={(e) => setFormData({...formData, valor_neto: e.target.value})} className="col-span-3" placeholder="1500000" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stage" className="text-right text-xs">Etapa Inicial</Label>
            <Select value={formData.stage} onValueChange={(val) => setFormData({...formData, stage: val})}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecciona la etapa..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1. Prospección</SelectItem>
                <SelectItem value="2">2. Contacto Iniciado</SelectItem>
                <SelectItem value="3">3. Visita Agendada</SelectItem>
                <SelectItem value="4">4. Propuesta Enviada</SelectItem>
                <SelectItem value="5">5. Negociación</SelectItem>
                <SelectItem value="6">6. Cierre Ganado</SelectItem>
                <SelectItem value="7">7. Cierre Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={loading} onClick={handleSubmit}>
            {loading ? 'Guardando...' : (dealToEdit ? 'Guardar Cambios' : 'Crear Negocio')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
