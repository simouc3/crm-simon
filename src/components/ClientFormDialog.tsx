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
      alert("Error creando cliente: " + error.message)
    } else {
      setOpen(false)
      if (onClientCreated) {
        onClientCreated()
      }
      setFormData({ 
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
        requisitos_legales: [] 
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : <Button>+ Nueva Empresa</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{clientToEdit ? 'Editar Ficha de Cliente' : 'Crear Ficha de Cliente'}</DialogTitle>
          <DialogDescription>
            {clientToEdit ? 'Modifica los datos comerciales y de infraestructura del cliente.' : 'Ingresa los datos comerciales y de infraestructura del nuevo cliente.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
          <div className="space-y-4 border-b pb-4">
            <h4 className="text-sm font-semibold select-none">Información Comercial</h4>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="razon_social" className="text-right text-xs">Razón Social</Label>
              <Input id="razon_social" value={formData.razon_social} onChange={(e) => setFormData({...formData, razon_social: e.target.value})} className="col-span-3" placeholder="Ej. Empresa S.A." />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rut" className="text-right text-xs">RUT Empresa</Label>
              <Input id="rut" value={formData.rut} onChange={(e) => setFormData({...formData, rut: formatRUT(e.target.value)})} className="col-span-3" placeholder="77.777.777-K" maxLength={12} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="segmento" className="text-right text-xs">Segmento</Label>
              <Select value={formData.segmento} onValueChange={(val) => setFormData({...formData, segmento: val})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACUICOLA_MARITIMO">Acuícola/Marítima</SelectItem>
                  <SelectItem value="SALUD_CLINICO">Salud/Clínico</SelectItem>
                  <SelectItem value="CORPORATIVO">Oficinas/Corporativo</SelectItem>
                  <SelectItem value="LOGISTICA">Logística/Post-Obra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 border-b pb-4">
            <h4 className="text-sm font-semibold select-none">Contacto Principal</h4>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contacto" className="text-right text-xs">Nombre</Label>
              <Input id="contacto" value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})} className="col-span-3" placeholder="Nombre completo" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cargo" className="text-right text-xs">Cargo</Label>
              <Select value={formData.cargo} onValueChange={(val) => setFormData({...formData, cargo: val})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GERENCIA_OP">Gerencia de Operaciones</SelectItem>
                  <SelectItem value="ADQUISICIONES">Adquisiciones</SelectItem>
                  <SelectItem value="FACILITY">Facility Management</SelectItem>
                  <SelectItem value="RRHH">RRHH</SelectItem>
                  <SelectItem value="DUENO">Dueño</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right text-xs">Teléfono</Label>
              <Input id="phone" value={formData.contact_phone} onChange={(e) => setFormData({...formData, contact_phone: e.target.value})} className="col-span-3" placeholder="+569..." />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right text-xs">Email</Label>
              <Input id="email" type="email" value={formData.contact_email} onChange={(e) => setFormData({...formData, contact_email: e.target.value})} className="col-span-3" placeholder="correo@empresa.cl" />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold select-none">Operaciones y Pagos</h4>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="comuna" className="text-right text-xs">Comuna</Label>
              <Select value={formData.comuna} onValueChange={(val) => setFormData({...formData, comuna: val})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUERTO_MONTT">Puerto Montt</SelectItem>
                  <SelectItem value="PUERTO_VARAS">Puerto Varas</SelectItem>
                  <SelectItem value="LLANQUIHUE">Llanquihue</SelectItem>
                  <SelectItem value="CHILOE">Chiloé</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="direccion" className="text-right text-xs">Dirección</Label>
              <Input 
                id="direccion" 
                value={formData.direccion} 
                onChange={(e) => setFormData({...formData, direccion: e.target.value})} 
                className="col-span-3" 
                placeholder="Av. Los Carrera 1234, Puerto Montt" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="m2" className="text-right text-xs">Área Total (m2)</Label>
              <Input id="m2" type="number" value={formData.m2_estimados} onChange={(e) => setFormData({...formData, m2_estimados: e.target.value})} className="col-span-3" placeholder="1000" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pago" className="text-right text-xs">Cond. Pago</Label>
              <Select value={formData.condiciones_pago} onValueChange={(val) => setFormData({...formData, condiciones_pago: val})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTADO">Contado</SelectItem>
                  <SelectItem value="30_DIAS">30 Días contra Fac</SelectItem>
                  <SelectItem value="45_DIAS">45 Días contra Fac</SelectItem>
                  <SelectItem value="60_DIAS">60 Días contra Fac</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 items-start gap-2 pt-2">
              <Label className="text-xs">Requisitos Legales Exigidos</Label>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox id="f30" checked={formData.requisitos_legales.includes('F30')} onCheckedChange={() => addRequisito('F30')} />
                  <label htmlFor="f30" className="cursor-pointer">F30/F30-1</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="mutual" checked={formData.requisitos_legales.includes('MUTUAL')} onCheckedChange={() => addRequisito('MUTUAL')} />
                  <label htmlFor="mutual" className="cursor-pointer">Mutualidad</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="seremi" checked={formData.requisitos_legales.includes('SEREMI')} onCheckedChange={() => addRequisito('SEREMI')} />
                  <label htmlFor="seremi" className="cursor-pointer">Prot. Seremi</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="induccion" checked={formData.requisitos_legales.includes('INDUCCION')} onCheckedChange={() => addRequisito('INDUCCION')} />
                  <label htmlFor="induccion" className="cursor-pointer">Inducción DAS</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="epp" checked={formData.requisitos_legales.includes('EPP')} onCheckedChange={() => addRequisito('EPP')} />
                  <label htmlFor="epp" className="cursor-pointer">EPP Específico</label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={loading} onClick={handleSubmit}>
            {loading ? 'Guardando...' : (clientToEdit ? 'Guardar Cambios' : 'Guardar Cliente')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
