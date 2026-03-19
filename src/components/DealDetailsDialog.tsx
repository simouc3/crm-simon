import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Phone, Mail, MapPin, CheckCircle2, AlertCircle, Trophy, History } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const fmtCLP = (val: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)

const STAGES = [
  { id: 1, name: 'Prospección' },
  { id: 2, name: 'Contacto Iniciado' },
  { id: 3, name: 'Visita Agendada' },
  { id: 4, name: 'Propuesta Enviada' },
  { id: 5, name: 'Negociación' },
  { id: 6, name: 'Cierre Ganado' },
  { id: 7, name: 'Cierre Perdido' },
]

interface DealDetailsDialogProps {
  deal: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onDealUpdated?: () => void
}

export function DealDetailsDialog({ deal, open, onOpenChange, onDealUpdated }: DealDetailsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [visitaRealizada, setVisitaRealizada] = useState(false)
  const [currentStage, setCurrentStage] = useState<number>(1)
  
  // States for Stage 4 (Cotizacion)
  const [cotizacionDetalles, setCotizacionDetalles] = useState("")
  const [valorNetoCotizado, setValorNetoCotizado] = useState("")
  
  // States for Images/Files
  const [files, setFiles] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  // States for Email tracking
  const [ultimoCorreoAt, setUltimoCorreoAt] = useState<string | null>(null)
  const [correoRespondido, setCorreoRespondido] = useState(false)

  // State for Loss Reason
  const [motivoPerdida, setMotivoPerdida] = useState("")

  // State for inline editing of commercial data
  const [isEditingValor, setIsEditingValor] = useState(false)
  const [newValorNeto, setNewValorNeto] = useState("")

  // State for recurring contracts (MRR)
  const [isContract, setIsContract] = useState(false)
  const [contractMonths, setContractMonths] = useState("")

  const fetchFiles = async () => {
    if (!deal) return
    const { data } = await supabase.from('deal_files').select('*').eq('deal_id', deal.id).order('created_at', { ascending: false })
    if (data) setFiles(data)
  }

  useEffect(() => {
    if (deal) {
      setVisitaRealizada(deal.visita_realizada || false)
      setCotizacionDetalles(deal.cotizacion_detalles || "")
      setValorNetoCotizado(deal.valor_neto ? String(deal.valor_neto) : "")
      setNewValorNeto(deal.valor_neto ? String(deal.valor_neto) : "")
      setCurrentStage(deal.stage || 1)
      setUltimoCorreoAt(deal.ultimo_correo_at || null)
      setCorreoRespondido(deal.correo_respondido || false)
      setMotivoPerdida(deal.motivo_perdida || "")
      setIsContract(deal.is_contract || false)
      setContractMonths(deal.contract_months ? String(deal.contract_months) : "")
      fetchFiles()
    }
  }, [deal])

  const updateMotivoPerdida = async (motivo: string) => {
    setMotivoPerdida(motivo)
    const { error } = await supabase.from('deals').update({ motivo_perdida: motivo }).eq('id', deal.id)
    if (error) {
      alert("Error actualizando motivo: " + error.message)
      setMotivoPerdida(deal.motivo_perdida || "")
    } else {
      if (onDealUpdated) onDealUpdated()
    }
  }

  const registerCorreo = async () => {
    const now = new Date().toISOString()
    const { error } = await supabase.from('deals').update({
      ultimo_correo_at: now,
      correo_respondido: false
    }).eq('id', deal.id)
    if (!error) {
      setUltimoCorreoAt(now)
      setCorreoRespondido(false)
      if (onDealUpdated) onDealUpdated()
    } else {
      alert("Error registrando correo: " + error.message)
    }
  }

  const markRespondido = async () => {
    const { error } = await supabase.from('deals').update({ correo_respondido: true }).eq('id', deal.id)
    if (!error) {
      setCorreoRespondido(true)
      if (onDealUpdated) onDealUpdated()
    } else {
      alert("Error marcando respuesta: " + error.message)
    }
  }

  const changeStage = async (newStage: number) => {
    setCurrentStage(newStage)
    const now = new Date().toISOString()
    const { error } = await supabase.from('deals').update({
      stage: newStage,
      stage_changed_at: now
    }).eq('id', deal.id)
    if (error) {
      alert("Error cambiando etapa: " + error.message)
      setCurrentStage(deal.stage)
    } else {
      if (onDealUpdated) onDealUpdated()
      // Traspaso a Operaciones: abrir correo pre-escrito automáticamente
      if (newStage === 6) {
        const empresa = deal.companies?.razon_social || deal.title
        const contacto = deal.companies?.contact_name || '—'
        const telefono = deal.companies?.contact_phone || '—'
        const email = deal.companies?.contact_email || '—'
        const comuna = deal.companies?.comuna?.replace(/_/g, ' ') || '—'
        const direccion = (deal.companies as any)?.direccion || '—'
        const m2 = deal.companies?.m2_estimados ? `${Number(deal.companies.m2_estimados).toLocaleString('es-CL')} m²` : '—'
        const neto = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(deal.valor_neto || 0)
        const req = deal.companies?.requisitos_legales?.join(', ') || 'Sin requisitos especificados'
        const cond = deal.companies?.condiciones_pago?.replace(/_/g, ' ') || '—'

        const subject = encodeURIComponent(`🎉 CIERRE GANADO - Traspaso Operaciones: ${empresa}`)
        const body = encodeURIComponent(
`Estimado equipo operativo,

Se ha confirmado el cierre del siguiente negocio. Por favor preparen los insumos y documentación necesaria.

═══════════════════════════════════
📋 RESUMEN DEL CLIENTE
═══════════════════════════════════
Empresa:        ${empresa}
Contacto:       ${contacto}
Teléfono:       ${telefono}
Email:          ${email}
Ubicación:      ${direccion}, ${comuna}
Área estimada:  ${m2}

═══════════════════════════════════
💰 DETALLES COMERCIALES
═══════════════════════════════════
Negocio:           ${deal.title}
Valor Neto:        ${neto}
Condiciones Pago:  ${cond}

═══════════════════════════════════
⚖️ REQUISITOS LEGALES
═══════════════════════════════════
${req}

Favor coordinar:
• Mutual de Seguridad (credenciales y registro)
• Certificados DT (Dirección del Trabajo)
• Preparación de insumos y equipos para ${m2}

Saludos,
Equipo Comercial`)

        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
      }
    }
  }

  const toggleVisita = async () => {
    setLoading(true)
    const newValue = !visitaRealizada
    const { error } = await supabase.from('deals').update({ visita_realizada: newValue }).eq('id', deal.id)
    if (!error) {
      setVisitaRealizada(newValue)
      if (onDealUpdated) onDealUpdated()
    } else {
      alert("Error actualizando visita: " + error.message)
    }
    setLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return
    
    setUploading(true)
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${deal.id}/${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('deal-documents')
        .upload(fileName, file)

      if (uploadError) {
        alert("Error subiendo foto: " + uploadError.message)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('deal-documents')
        .getPublicUrl(fileName)

      await supabase.from('deal_files').insert({
        deal_id: deal.id,
        file_type: 'FOTO_VISITA',
        file_url: publicUrl
      })
    }
    
    await fetchFiles()
    setUploading(false)
  }

  const saveCotizacion = async () => {
    setLoading(true)
    const neto = parseFloat(valorNetoCotizado) || 0
    const { error } = await supabase.from('deals').update({ 
      cotizacion_detalles: cotizacionDetalles,
      valor_neto: neto,
      valor_total: neto * 1.19
    }).eq('id', deal.id)
    
    setLoading(false)
    if (!error) {
      if (onDealUpdated) onDealUpdated()
      alert("Cotización guardada exitosamente.")
    } else {
      alert("Error guardando cotización: " + error.message)
    }
  }

  const saveValorComercial = async () => {
    setLoading(true)
    const neto = parseFloat(newValorNeto) || 0
    const { error } = await supabase.from('deals').update({
      valor_neto: neto,
      valor_total: neto * 1.19
    }).eq('id', deal.id)
    setLoading(false)
    if (!error) {
      setIsEditingValor(false)
      if (onDealUpdated) onDealUpdated()
    } else {
      alert("Error actualizando valor: " + error.message)
    }
  }

  const saveContractConfig = async () => {
    setLoading(true)
    const months = parseInt(contractMonths) || 0
    const { error } = await supabase.from('deals').update({
      is_contract: isContract,
      contract_months: isContract ? months : 0
    }).eq('id', deal.id)
    setLoading(false)
    if (!error) {
      if (onDealUpdated) onDealUpdated()
      alert("Configuración de contrato guardada exitosamente.")
    } else {
      alert("Error guardando contrato: " + error.message)
    }
  }

  if (!deal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{deal.title}</DialogTitle>
          <DialogDescription>
            {deal.companies?.razon_social} · Ficha del negocio
          </DialogDescription>
        </DialogHeader>

        {/* Stage Selector */}
        <div className="bg-muted/40 rounded-lg p-3 border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cambiar Etapa del Negocio</p>
          <Select value={String(currentStage)} onValueChange={(val) => changeStage(parseInt(val))}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecciona etapa..." />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      s.id === 6 ? 'bg-emerald-500' : 
                      s.id === 7 ? 'bg-red-500' : 
                      s.id === currentStage ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`} />
                    {s.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Motivo de Pérdida (solo si es Etapa 7) */}
        {currentStage === 7 && (
          <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/20">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" /> Indicar Motivo de Pérdida
            </p>
            <Select value={motivoPerdida} onValueChange={updateMotivoPerdida}>
              <SelectTrigger className="h-9 text-sm border-red-500/30 focus:ring-red-500">
                <SelectValue placeholder="¿Por qué se perdió el negocio?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Precio">Precio (Presupuesto excedido)</SelectItem>
                <SelectItem value="Competencia">Competencia (Eligieron a otro)</SelectItem>
                <SelectItem value="Requisito Legal">Falta de Requisito Legal</SelectItem>
                <SelectItem value="Otros">Otros / Sin respuesta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Configuración de Contrato (solo si es Etapa 6) */}
        {currentStage === 6 && (
          <div className="bg-emerald-500/5 rounded-2xl p-5 border border-emerald-500/20 space-y-4 shadow-inner">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Configuración de Cierre
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-1">¿Este negocio es un contrato recurrente?</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                <input type="checkbox" className="sr-only peer" checked={isContract} onChange={(e) => setIsContract(e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500 shadow-inner"></div>
              </label>
            </div>
            
            {isContract && (
              <div className="flex flex-col gap-3 pt-4 border-t border-emerald-500/10">
                <label className="text-[10px] font-black text-emerald-700/80 uppercase tracking-widest">Duración del contrato (meses)</label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    min="1"
                    placeholder="Ej. 12"
                    value={contractMonths}
                    onChange={(e) => setContractMonths(e.target.value)}
                    className="h-10 rounded-xl bg-white dark:bg-slate-900 border-emerald-500/30 focus-visible:ring-emerald-500/20 tabular-nums font-bold"
                  />
                  <Button onClick={saveContractConfig} disabled={loading} className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest px-6 shadow-md shadow-emerald-500/20">
                    {loading ? '...' : 'Guardar MRR'}
                  </Button>
                </div>
                {contractMonths && parseInt(contractMonths) > 0 && deal.valor_total > 0 && (
                  <div className="mt-2 bg-emerald-100 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                     <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">MRR Estimado Mensual</span>
                     <span className="text-[14px] font-black text-emerald-600 tabular-nums tracking-tighter">
                       {fmtCLP(deal.valor_total / parseInt(contractMonths))}
                     </span>
                  </div>
                )}
              </div>
            )}
            
            {!isContract && (
              <div className="pt-2 border-t border-emerald-500/10">
                 <Button onClick={saveContractConfig} disabled={loading} variant="outline" className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                   Confirmar Venta Única
                 </Button>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4">
          {/* Card: Información del Cliente */}
          <div className="border text-card-foreground rounded-lg bg-card shadow-sm p-4">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/10">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Información de la Empresa</h4>
              {/* Acciones Rápidas */}
              <div className="flex gap-2">
                {deal.companies?.contact_phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-tight border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all rounded-md"
                    onClick={() => window.open(`tel:${deal.companies.contact_phone}`, '_blank')}
                  >
                    <Phone className="h-3 w-3 mr-1.5 opacity-70" />
                    Llamar
                  </Button>
                )}
                {deal.companies?.contact_email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-tight border-primary/30 text-primary hover:bg-primary/5 hover:text-primary transition-all rounded-md"
                    onClick={() => window.open(`mailto:${deal.companies.contact_email}?subject=Cotización - ${deal.title}`, '_blank')}
                  >
                    <Mail className="h-3 w-3 mr-1.5 opacity-70" />
                    Correo
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1 opacity-60">Razón Social</span>
                <span className="font-bold tracking-tight">{deal.companies?.razon_social || 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1 opacity-60">RUT Empresa</span>
                <span className="font-bold tracking-tight">{deal.companies?.rut || 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1 opacity-60">Contacto Principal</span>
                <span className="font-bold tracking-tight">{deal.companies?.contact_name || 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1 opacity-60">Teléfono</span>
                <span className="font-bold tracking-tight text-emerald-600">{deal.companies?.contact_phone || 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1 opacity-60">Email Contacto</span>
                <span className="font-bold tracking-tight text-primary truncate max-w-[200px]">{deal.companies?.contact_email || 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1 opacity-60">Ubicación / Comuna</span>
                <span className="font-bold tracking-tight">{deal.companies?.comuna?.replace(/_/g, ' ') || 'N/A'}</span>
              </div>
              {deal.companies?.direccion && (
                <div className="flex flex-col col-span-2">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Dirección</span>
                  <span>{deal.companies.direccion}</span>
                </div>
              )}
            </div>

            {/* Ubicación - Enlace a Google Maps */}
            {(deal.companies?.direccion || deal.companies?.comuna) && (() => {
              const parts = [deal.companies?.direccion, deal.companies?.comuna?.replace(/_/g, ' '), 'Chile'].filter(Boolean)
              const q = parts.join(', ')
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
              return (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center gap-3 rounded-xl border border-border/30 bg-muted/20 px-4 py-4 hover:bg-muted/40 hover:border-primary/20 transition-all group shadow-sm"
                >
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                    <MapPin className="h-5 w-5 text-primary opacity-60 transition-transform group-hover:scale-110" />
                  </div>
                  <div className="flex-1 min-w-0 ml-1">
                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Ubicación del Cliente</p>
                    <p className="text-sm font-bold tracking-tight truncate mt-0.5">{q}</p>
                  </div>
                  <span className="text-[10px] text-primary font-black uppercase tracking-tighter shrink-0 group-hover:underline opacity-80 decoration-2">
                    MAPA ↗
                  </span>
                </a>
              )
            })()}
          </div>

          {/* Card: Seguimiento de Correos */}
          {(() => {
            const diasSinRespuesta = ultimoCorreoAt
              ? Math.floor((Date.now() - new Date(ultimoCorreoAt).getTime()) / (1000 * 60 * 60 * 24))
              : null
            const enAlerta = ultimoCorreoAt && !correoRespondido && diasSinRespuesta !== null && diasSinRespuesta >= 3

            return (
              <div className={`border rounded-lg shadow-sm p-4 ${enAlerta ? 'border-red-500/60 bg-red-500/5' : 'border-border bg-card'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                    <History className="h-3 w-3 opacity-60" /> Seguimiento de Correos
                    {enAlerta && (
                      <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter animate-pulse ml-2 shadow-sm shadow-red-500/20">
                        {diasSinRespuesta}d sin avance
                      </span>
                    )}
                    {correoRespondido && ultimoCorreoAt && (
                      <span className="text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ml-2 shadow-sm shadow-emerald-500/20">
                        Respondido
                      </span>
                    )}
                  </h4>
                </div>

                {ultimoCorreoAt ? (
                  <div className="text-xs text-muted-foreground mb-3">
                    Último correo enviado: <strong>{new Date(ultimoCorreoAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                    {diasSinRespuesta !== null && (
                      <span className={`ml-2 font-semibold ${diasSinRespuesta >= 3 && !correoRespondido ? 'text-red-500' : 'text-muted-foreground'}`}>
                        · Hace {diasSinRespuesta} día{diasSinRespuesta !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">Aún no se ha registrado ningún correo enviado a este cliente.</p>
                )}

                <div className="flex gap-2 flex-wrap mt-2">
                  <Button size="sm" variant="outline" className="text-[10px] font-bold uppercase tracking-tight h-8 px-4 rounded-md border-border/40 hover:bg-muted" onClick={registerCorreo}>
                    <Mail className="h-3 w-3 mr-2 opacity-60" /> Registrar Correo
                  </Button>
                  {ultimoCorreoAt && !correoRespondido && (
                    <Button size="sm" className="text-[10px] font-bold uppercase tracking-tight h-8 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={markRespondido}>
                      <CheckCircle2 className="h-3 w-3 mr-2" /> Marcar Respondido
                    </Button>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Card: Finanzas / Datos Comerciales */}
          <div className="bg-card border border-border/40 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Datos Comerciales</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                onClick={() => setIsEditingValor(!isEditingValor)}
              >
                {isEditingValor ? 'CANCELAR' : 'EDITAR VALOR'}
              </Button>
            </div>

            {isEditingValor ? (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
                <div>
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block opacity-60">Nuevo Valor Neto ($)</label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      value={newValorNeto}
                      onChange={(e) => setNewValorNeto(e.target.value)}
                      className="h-10 text-sm font-bold tracking-tight rounded-xl"
                      placeholder="Ej: 1500000"
                    />
                    <Button 
                      className="rounded-xl px-6 font-black text-[10px] uppercase tracking-widest"
                      onClick={saveValorComercial}
                      disabled={loading}
                    >
                      {loading ? '...' : 'GUARDAR'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1 opacity-60">Valor Neto Estimado</span>
                  <span className="text-xl font-black tracking-tight text-foreground">
                    {fmtCLP(deal.valor_neto || 0)}
                  </span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1 opacity-60">Valor Total (IVA Inc.)</span>
                  <span className="text-xl font-black tracking-tight text-primary">
                    {fmtCLP(deal.valor_total || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card: Traspaso a Operaciones (solo Cierre Ganado) */}
          {currentStage === 6 && (() => {
            const empresa = deal.companies?.razon_social || deal.title
            const contacto = deal.companies?.contact_name || '—'
            const telefono = deal.companies?.contact_phone || '—'
            const emailContacto = deal.companies?.contact_email || '—'
            const comuna = deal.companies?.comuna?.replace(/_/g, ' ') || '—'
            const direccion = (deal.companies as any)?.direccion || '—'
            const m2 = deal.companies?.m2_estimados ? `${Number(deal.companies.m2_estimados).toLocaleString('es-CL')} m²` : '—'
            const neto = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(deal.valor_neto || 0)
            const req = deal.companies?.requisitos_legales?.join(', ') || 'Sin requisitos especificados'
            const cond = deal.companies?.condiciones_pago?.replace(/_/g, ' ') || '—'

            const subject = encodeURIComponent(`🎉 CIERRE GANADO - Traspaso Operaciones: ${empresa}`)
            const body = encodeURIComponent(
`Estimado equipo operativo,

Se ha confirmado el cierre del siguiente negocio. Por favor preparen los insumos y documentación necesaria.

═══════════════════════════════════
📋 RESUMEN DEL CLIENTE
═══════════════════════════════════
Empresa:        ${empresa}
Contacto:       ${contacto}
Teléfono:       ${telefono}
Email:          ${emailContacto}
Ubicación:      ${direccion}, ${comuna}
Área estimada:  ${m2}

═══════════════════════════════════
💰 DETALLES COMERCIALES
═══════════════════════════════════
Negocio:           ${deal.title}
Valor Neto:        ${neto}
Condiciones Pago:  ${cond}

═══════════════════════════════════
⚖️ REQUISITOS LEGALES
═══════════════════════════════════
${req}

Favor coordinar:
• Mutual de Seguridad (credenciales y registro)
• Certificados DT (Dirección del Trabajo)
• Preparación de insumos y equipos para ${m2}

Saludos,
Equipo Comercial`)

            return (
              <div className="relative border border-emerald-500/20 bg-emerald-500/5 rounded-2xl shadow-sm p-5 overflow-hidden">
                {/* Accent Line */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-4 w-4 text-emerald-600 opacity-80" />
                  <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Traspaso a Operaciones</h4>
                  <span className="ml-auto text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm shadow-emerald-500/20">CIERRE GANADO</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Envía el resumen completo del cliente al equipo operativo para que preparen los insumos, credenciales Mutual y certificados DT.
                </p>
                <div className="bg-white/60 dark:bg-black/20 rounded-xl p-4 text-[11px] space-y-2 mb-5 border border-emerald-500/10 shadow-inner">
                  <div className="flex justify-between border-b border-emerald-500/5 pb-1"><span className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Empresa:</span> <strong className="font-bold tracking-tight text-emerald-800 dark:text-emerald-200">{empresa}</strong></div>
                  <div className="flex justify-between border-b border-emerald-500/5 pb-1"><span className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Contacto:</span> <span className="font-medium">{contacto} · {telefono}</span></div>
                  <div className="flex justify-between border-b border-emerald-500/5 pb-1"><span className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Área:</span> <span className="font-medium">{m2} · {direccion}</span></div>
                  <div className="flex justify-between border-b border-emerald-500/5 pb-1"><span className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Valor:</span> <span className="font-bold">{neto} · {cond}</span></div>
                  <div className="flex justify-between"><span className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Requisitos:</span> <span className="font-medium truncate max-w-[200px]">{req}</span></div>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest h-11 rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                  onClick={() => window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar a Operaciones
                </Button>
              </div>
            )
          })()}

          {/* Módulo Especial: Etapa 3 (Visita Agendada) */}
          {deal.stage === 3 && (
            <div className="border border-primary/40 text-card-foreground rounded-lg bg-primary/5 shadow-sm p-4">
              <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                📷 Evidencia en Terreno (Visita)
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Por favor, adjunta fotografías del área a intervenir para poder respaldar y generar la propuesta comercial con mayor precisión.
              </p>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-1">
                  <div className="text-sm font-medium">Estado de la Visita</div>
                  <Button 
                    size="sm" 
                    variant={visitaRealizada ? "default" : "outline"}
                    className={visitaRealizada ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                    onClick={toggleVisita}
                    disabled={loading}
                  >
                    {visitaRealizada ? "✅ Realizada" : "Marcar como Realizada"}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="text-xs cursor-pointer box-border" 
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  {uploading && <span className="text-xs text-muted-foreground animate-pulse">Subiendo...</span>}
                </div>
                {/* Zona de previsualización */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {files.length === 0 && !uploading && (
                    <div className="col-span-3 text-xs text-muted-foreground italic p-2 text-center bg-muted/50 rounded-md">
                      Aún no hay fotos subidas.
                    </div>
                  )}
                  {files.map((f, idx) => (
                    <div key={idx} className="aspect-square bg-muted rounded-md overflow-hidden border">
                      <img src={f.file_url} alt="Evidencia" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Módulo Especial: Etapa 4 (Propuesta Enviada) */}
          {deal.stage === 4 && (
            <div className="border border-primary/40 text-card-foreground rounded-lg bg-primary/5 shadow-sm p-4">
              <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                📄 Detalles de Cotización
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Define el monto cotizado final y añade detalles específicos de la propuesta formal enviada al cliente.
              </p>
              
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Monto Neto Cotizado ($)</label>
                  <Input 
                    type="number" 
                    value={valorNetoCotizado} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValorNetoCotizado(e.target.value)} 
                    className="h-8 text-sm" 
                    placeholder="Ej. 1500000" 
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Detalles de la Propuesta / Servicios Incluidos</label>
                  <Textarea 
                    value={cotizacionDetalles} 
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCotizacionDetalles(e.target.value)} 
                    className="min-h-[80px] text-sm resize-none" 
                    placeholder="Incluye limpieza de 500m2, insumos y maquinaria especializada..." 
                  />
                </div>
                <Button size="sm" className="w-full mt-2" onClick={saveCotizacion} disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Cotización Oficial'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
