import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase/client"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { LeadEnricher } from "../lib/ai/LeadEnricher"
import { Sparkles, Copy, ExternalLink, Globe, Activity } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AIAssistantWidget } from "./AIAssistantWidget"
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Zap, 
  ShieldCheck, 
  FileText,
  BarChart4,
  History,
  CheckCircle2
} from 'lucide-react'
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
  const [visitaRealizada, setVisitaRealizada] = useState(false)
  const [currentStage, setCurrentStage] = useState<number>(1)
  
  // Cotizacion
  const [cotizacionDetalles, setCotizacionDetalles] = useState("")
  const [valorNetoCotizado, setValorNetoCotizado] = useState("")
  
  // Términos Comerciales Avanzados
  const [contractDuration, setContractDuration] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("")
  const [offerValidity, setOfferValidity] = useState("")
  
  // States for Images/Files
  const [files, setFiles] = useState<any[]>([])

  // States for Email tracking
  const [ultimoCorreoAt, setUltimoCorreoAt] = useState<string | null>(null)
  const [correoRespondido, setCorreoRespondido] = useState(false)

  // State for Loss Reason
  const [motivoPerdida, setMotivoPerdida] = useState("")

  // State for recurring contracts (MRR)
  const [isContract, setIsContract] = useState(false)
  const [contractMonths, setContractMonths] = useState("")

  const [notaTecnica, setNotaTecnica] = useState("")
  const [showNotaField, setShowNotaField] = useState(false)

  const [m2Limpieza, setM2Limpieza] = useState("")
  const [isEditingM2, setIsEditingM2] = useState(false)

  const [generatingIA, setGeneratingIA] = useState(false)

  const fetchFiles = async () => {
    if (!deal) return
    const { data } = await supabase.from('deal_files').select('*').eq('deal_id', deal.id).order('created_at', { ascending: false })
    if (data) setFiles(data)
  }

  useEffect(() => {
    if (deal) {
      setVisitaRealizada(deal.visita_realizada || false)
      setCotizacionDetalles(deal.cotizacion_detalles || "")
      setNotaTecnica(deal.nota_tecnica || "")
      setValorNetoCotizado(deal.valor_neto ? String(deal.valor_neto) : "")
      setCurrentStage(deal.stage || 1)
      setUltimoCorreoAt(deal.ultimo_correo_at || null)
      setCorreoRespondido(deal.correo_respondido || false)
      setMotivoPerdida(deal.motivo_perdida || "")
      setIsContract(deal.is_contract || false)
      setContractMonths(deal.contract_months ? String(deal.contract_months) : "")
      setM2Limpieza(deal.m2_limpieza ? String(deal.m2_limpieza) : "")
      
      // Load commercial terms
      setContractDuration(deal.contract_duration || "")
      setPaymentTerms(deal.payment_terms || "")
      setOfferValidity(deal.offer_validity || "")
      
      fetchFiles()
    }
  }, [deal])

  const saveNotaTecnica = async () => {
    const { error } = await supabase.from('deals').update({ nota_tecnica: notaTecnica }).eq('id', deal.id)
    if (!error) {
      if (onDealUpdated) onDealUpdated()
      setShowNotaField(false)
    } else {
      // Fallback if column doesn't exist yet: use cotizacion_detalles or just show success locally
      console.error("Error saving technical note:", error)
      alert("Error guardando nota técnica. Verifique conexión.")
    }
  }

  const saveM2Limpieza = async () => {
    const value = m2Limpieza ? parseFloat(m2Limpieza) : null
    const { error } = await supabase.from('deals').update({ m2_limpieza: value }).eq('id', deal.id)
    if (!error) {
      if (onDealUpdated) onDealUpdated()
      setIsEditingM2(false)
    } else {
      alert("Error guardando m²: " + error.message)
    }
  }

  const generateIAProposal = async () => {
    if (!deal.nota_tecnica) {
      alert("Debes tener una Nota Técnica registrada para generar la propuesta con IA.")
      return
    }
    setGeneratingIA(true)
    try {
      const report = await LeadEnricher.generateQuantumProposal(deal.nota_tecnica)
      const { error } = await supabase.from('deals').update({ 
        ia_proposal_report: report,
        proposal_status: 'DRAFT'
      }).eq('id', deal.id)
      
      if (!error) {
        if (onDealUpdated) onDealUpdated()
      } else {
        alert("Error guardando propuesta IA: " + error.message)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGeneratingIA(false)
    }
  }

  const updateMotivoPerdida = async (motivo: string) => {
    setMotivoPerdida(motivo)
    const { error } = await supabase.from('deals').update({ motivo_perdida: motivo }).eq('id', deal.id)
    if (error) {
      alert("Error actualizando motivo: " + error.message)
      if (deal.motivo_perdida) {
        setMotivoPerdida(deal.motivo_perdida || "")
      }
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
    const newValue = !visitaRealizada
    const { error } = await supabase.from('deals').update({ visita_realizada: newValue }).eq('id', deal.id)
    if (!error) {
      setVisitaRealizada(newValue)
      if (onDealUpdated) onDealUpdated()
    } else {
      alert("Error actualizando visita: " + error.message)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return
    
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
  }

  const saveCotizacion = async () => {
    const neto = parseFloat(valorNetoCotizado) || 0
    const { error } = await supabase.from('deals').update({ 
      cotizacion_detalles: cotizacionDetalles,
      valor_neto: neto,
      valor_total: neto * 1.19,
      contract_duration: contractDuration,
      payment_terms: paymentTerms,
      offer_validity: offerValidity
    }).eq('id', deal.id)
    
    if (!error) {
      if (onDealUpdated) onDealUpdated()
      alert("Cotización y Términos Comerciales guardados exitosamente.")
    } else {
      alert("Error guardando cotización: " + error.message)
    }
  }

  if (!deal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-5xl max-h-[94vh] overflow-y-auto rounded-[32px] p-0 border-none bg-white dark:bg-[#0D0D17] shadow-[0_40px_100px_rgba(0,0,0,0.3)]">
        
        {/* ── Compact Header (mobile-first) ── */}
        <div className="px-5 pt-5 pb-4 md:px-10 md:pt-8 md:pb-6 bg-[#F5F5F7] dark:bg-[#141420] border-b border-black/[0.04] dark:border-white/[0.08] relative">
           <div className="relative z-10">
              {/* Top: ID + stage badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">ID: {deal.id.split('-')[0]}</span>
                </div>
              </div>

              {/* Company + title row */}
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/5 flex-shrink-0 flex items-center justify-center border border-black/[0.04]">
                  <Building2 className="h-5 w-5 text-primary/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[22px] md:text-[32px] font-black tracking-tight leading-none text-foreground mb-1">
                    {deal.nombre_proyecto || 'Oportunidad'}
                  </h2>
                  <p className="text-[13px] font-semibold text-muted-foreground/60 truncate">{deal.companies?.razon_social}</p>
                </div>
                {/* Amount — right aligned */}
                <div className="text-right flex-shrink-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none mb-1">Inversión</p>
                  <p className="text-[20px] md:text-[28px] font-black tracking-tighter text-foreground tabular-nums leading-none">
                    {fmtCLP(deal.valor_neto || 0)}
                  </p>
                  {deal.companies?.lead_score !== undefined && deal.companies?.lead_score !== null && deal.companies?.lead_score > 0 && (
                    <div className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[9px] font-black px-2 py-0.5 rounded-full mt-1">
                      <Zap className="h-2.5 w-2.5 fill-primary" /> {deal.companies.lead_score}pts
                    </div>
                  )}
                </div>
              </div>
           </div>
        </div>

        <div className="p-4 md:p-8 space-y-4 md:space-y-8">
          
          {/* ── Status Bar (Apple iOS Cards Style) ── */}
          {/* ── Unified Status Bar (Apple System Style) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 bg-slate-50 dark:bg-white/[0.02] rounded-[24px] border border-black/[0.04] dark:border-white/[0.04] divide-y md:divide-y-0 md:divide-x divide-black/[0.04] dark:divide-white/[0.04] shadow-sm mb-6">
            
            {/* Sector 1: Selector de Etapa */}
            <div className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <BarChart4 className="h-4 w-4 text-primary opacity-60" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">Etapa Actual</p>
              </div>
              <Select value={String(currentStage)} onValueChange={(val) => changeStage(parseInt(val))}>
                <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.05] font-black text-[13px] px-4 shadow-sm focus:ring-2 focus:ring-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl p-2 backdrop-blur-xl">
                  {STAGES.map(s => (
                    <SelectItem key={s.id} value={String(s.id)} className="rounded-xl my-0.5 focus:bg-primary focus:text-white font-bold px-3">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentStage === 7 && (
                <div className="mt-2 animate-in slide-in-from-top-2 duration-300">
                  <Select value={motivoPerdida} onValueChange={updateMotivoPerdida}>
                    <SelectTrigger className="h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200/50 font-bold text-[12px]">
                      <SelectValue placeholder="¿Por qué se perdió?" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Precio">Precio</SelectItem>
                      <SelectItem value="Competencia">Competencia</SelectItem>
                      <SelectItem value="Requisito Legal">Requisito Legal</SelectItem>
                      <SelectItem value="Otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Sector 2: Permanencia */}
            <div className="p-5 flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 mb-1">Días en Etapa</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[32px] font-black tracking-tighter tabular-nums leading-none text-foreground">
                  {deal.stage_changed_at ? Math.floor((Date.now() - new Date(deal.stage_changed_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                </span>
                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest pb-0.5">días</span>
              </div>
              <p className="text-[9px] text-muted-foreground/50 font-bold mt-1.5 uppercase tracking-widest">
                {currentStage === 6 ? 'Contrato Asegurado' : 'Moviéndose'}
              </p>
            </div>

            {/* Sector 3: Contrato */}
            <div className={`p-5 flex flex-col justify-center transition-colors rounded-r-[24px] ${
              isContract ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''
            }`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isContract ? 'text-indigo-600/70 dark:text-indigo-400/70' : 'text-muted-foreground opacity-50'}`}>
                  SLA Activo
                </p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isContract} onChange={(e) => setIsContract(e.target.checked)} />
                  <div className={`relative w-10 h-6 rounded-full transition-colors ${isContract ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-white/10'}`}>
                    <div className={`absolute top-1 h-4 w-4 rounded-full shadow-sm bg-white transition-all ${
                      isContract ? 'left-[22px]' : 'left-1'
                    }`} />
                  </div>
                </label>
              </div>
              {isContract ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={contractMonths}
                    onChange={(e) => setContractMonths(e.target.value)}
                    placeholder="0"
                    className="w-16 h-10 rounded-xl bg-white dark:bg-[#1C1C1E] border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-black text-[16px] text-center outline-none focus:ring-2 focus:ring-indigo-500/20 tabular-nums shadow-sm"
                  />
                  <span className="text-indigo-600/70 dark:text-indigo-400/70 font-black text-[9px] uppercase tracking-widest">meses</span>
                  <button onClick={async () => {
                      const months = parseInt(contractMonths) || 0
                      const { error } = await supabase.from('deals').update({ is_contract: true, contract_months: months }).eq('id', deal.id)
                      if (!error && onDealUpdated) onDealUpdated()
                    }}
                    className="ml-auto px-3 h-8 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-black text-[9px] uppercase tracking-widest transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              ) : (
                <div className="mt-1">
                  <p className="text-[18px] font-black tracking-tight text-foreground/40">Spot</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Grid: compact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            
            {/* Column Left: Insights & AI */}
            <div className="space-y-8">
               
               {/* Risk & Indicators */}
               {/* Risk & Indicators (Translucent Banner) */}
               {deal.is_risk ? (
                 <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-600 dark:text-rose-400 relative">
                    <div className="flex items-center gap-2 mb-1">
                       <Zap className="h-4 w-4 animate-pulse" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em]">Alerta de Fricción</span>
                    </div>
                    <h4 className="text-[14px] font-bold leading-tight">"{deal.risk_reason}"</h4>
                 </div>
               ) : (
                 <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-indigo-600 dark:text-indigo-400 relative">
                    <div className="flex items-center gap-2 mb-1">
                       <CheckCircle2 className="h-4 w-4" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em]">Salud del Negocio</span>
                    </div>
                    <p className="text-[14px] font-bold leading-tight">Oportunidad Estable. Sin desviaciones detectadas.</p>
                 </div>
               )}

               <div className={`transition-all duration-500 ${currentStage === 6 ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                 <div className="bg-slate-50 dark:bg-white/[0.02] rounded-2xl p-1.5 border border-black/[0.03] dark:border-white/[0.03] mb-8">
                    <AIAssistantWidget deal={deal} onNewActivity={onDealUpdated} />
                 </div>

                 {/* Communication Tracking */}
                 <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.03] dark:border-white/[0.03] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Registro de Contacto</h4>
                       <History className="h-4 w-4 text-muted-foreground opacity-20" />
                    </div>

                    <div className="space-y-3">
                       <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-black/[0.03]">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ultimoCorreoAt ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'}`}>
                             <Mail className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40 leading-none mb-0.5">Último Contacto</p>
                             <p className="text-[13px] font-black tracking-tight truncate">
                               {ultimoCorreoAt ? new Date(ultimoCorreoAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'long' }) : 'Pendiente'}
                             </p>
                          </div>
                          {!correoRespondido && ultimoCorreoAt && (
                            <div className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                          )}
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" className="h-10 rounded-full font-black text-[10px] uppercase tracking-widest" onClick={registerCorreo}>
                             Registrar Envío
                          </Button>
                          {!correoRespondido && ultimoCorreoAt && (
                            <Button className="h-10 rounded-full font-black text-[10px] uppercase tracking-widest bg-primary text-white" onClick={markRespondido}>
                               Respuesta
                            </Button>
                          )}
                       </div>
                    </div>
                 </div>
               </div>
            </div>

            {/* Column Right: Details & Operations */}
            <div className="space-y-10">
               
               {/* Contact Card */}
               <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.03] dark:border-white/[0.03] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                     <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Perfil del Partner</h4>
                     <Building2 className="h-4 w-4 opacity-30 text-primary" />
                  </div>

                  <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">RUT</p>
                           <p className="text-[13px] font-black tracking-tighter">{deal.companies?.rut || '—'}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">Punto Operativo</p>
                           <p className="text-[13px] font-black tracking-tighter text-primary">{deal.companies?.comuna?.replace(/_/g, ' ') || '—'}</p>
                        </div>
                     </div>

                     <div className="pt-4 border-t border-black/[0.05] dark:border-white/[0.05] space-y-3">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-slate-950 dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0 shadow-md">
                              <span className="font-black text-base">{deal.companies?.contact_name?.[0] || '?'}</span>
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="font-black tracking-tighter text-[16px] leading-none truncate">{deal.companies?.contact_name || 'Sin Contacto'}</p>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40 mt-0.5">{deal.companies?.cargo || 'Key Decision Maker'}</p>
                           </div>
                        </div>
                         {/* Quick Actions (iOS Circular Style) */}
                         <div className="flex items-center gap-3 pt-2">
                            {deal.companies?.contact_phone && (
                              <a href={`tel:${deal.companies.contact_phone}`} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-white/10 transition-colors border border-black/[0.03] dark:border-white/5">
                                <Phone className="h-4 w-4" />
                              </a>
                            )}
                            {deal.companies?.contact_email && (
                              <a href={`mailto:${deal.companies.contact_email}`} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-white/10 transition-colors border border-black/[0.03] dark:border-white/5" title={deal.companies.contact_email}>
                                <Mail className="h-4 w-4" />
                              </a>
                            )}
                            {(deal.companies?.direccion || deal.companies?.comuna) && (
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([deal.companies.direccion, deal.companies.comuna?.replace(/_/g, ' ')].filter(Boolean).join(', '))}`} target="_blank" className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-white/10 transition-colors border border-black/[0.03] dark:border-white/5" title="Abrir en Maps">
                                <MapPin className="h-4 w-4" />
                              </a>
                            )}
                         </div>
                      </div>
                   </div>
                </div>

               {/* Operational Metrics  */}
               <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-black/[0.03] dark:border-white/[0.03] shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                     <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Métricas Operativas</h4>
                     <FileText className="h-4 w-4 text-muted-foreground opacity-20" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                     <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40 flex items-center justify-between">
                           <span>Área (m²)</span>
                           <button onClick={() => setIsEditingM2(!isEditingM2)} className="text-primary hover:underline lowercase font-bold text-[8px] tracking-widest">
                              {isEditingM2 ? 'Cancelar' : 'Editar'}
                           </button>
                        </p>
                        {isEditingM2 ? (
                           <div className="flex items-center gap-2">
                              <Input 
                                type="number" 
                                value={m2Limpieza} 
                                onChange={(e) => setM2Limpieza(e.target.value)} 
                                className="h-8 w-24 rounded-lg font-black text-sm p-1 px-2"
                              />
                              <Button onClick={saveM2Limpieza} className="h-8 px-3 rounded-lg text-[9px] font-black uppercase">Ok</Button>
                           </div>
                        ) : (
                           <p className="text-[22px] font-black tracking-tighter tabular-nums leading-none cursor-pointer" onClick={() => setIsEditingM2(true)}>
                              {m2Limpieza ? `${Number(m2Limpieza).toLocaleString('es-CL')} m²` : (deal.companies?.m2_estimados ? `${Number(deal.companies.m2_estimados).toLocaleString('es-CL')} m²*` : '—')}
                           </p>
                        )}
                        {!m2Limpieza && deal.companies?.m2_estimados && !isEditingM2 && (
                           <p className="text-[8px] font-bold text-muted-foreground opacity-40 leading-tight">* Sugerido por empresa</p>
                        )}
                     </div>
                     <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">SLA de Pago</p>
                        <p className="text-[15px] font-black tracking-tighter uppercase leading-none">
                           {deal.companies?.condiciones_pago?.replace(/_/g, ' ') || '—'}
                        </p>
                     </div>
                  </div>

                  {/* Stage-Specific Modules (Apple Style) */}
                  <div className="space-y-6">
                     {currentStage === 3 && (
                        <div className="space-y-4">
                           <div className="p-6 rounded-[24px] bg-slate-50 dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.05] space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Auditoría de Visita</p>
                                <Button 
                                  size="sm" 
                                  variant={visitaRealizada ? "default" : "outline"} 
                                  className={`rounded-full h-10 px-6 text-[10px] font-black uppercase tracking-widest ${visitaRealizada ? 'bg-primary text-white border-transparent shadow-lg shadow-primary/20' : 'border-black/10 dark:border-white/10'}`} 
                                  onClick={toggleVisita}
                                >
                                  {visitaRealizada ? "✅ VISITADO" : "MARCAR VISITA"}
                                </Button>
                              </div>
                              
                              <div className="space-y-4">
                                 {!showNotaField ? (
                                   <Button 
                                     onClick={() => setShowNotaField(true)}
                                     className="w-full h-16 rounded-2xl bg-white dark:bg-white/5 border border-black/[0.03] dark:border-white/[0.05] text-foreground hover:bg-slate-50 dark:hover:bg-white/10 flex items-center justify-between px-6 transition-all group"
                                   >
                                     <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                         <FileText className="h-5 w-5 text-primary" />
                                       </div>
                                       <span className="font-black text-[14px]">Grabar Nota Técnica</span>
                                     </div>
                                     <Zap className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                   </Button>
                                 ) : (
                                   <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                     <Textarea 
                                       placeholder="Resumen técnico de la visita, requerimientos especiales..." 
                                       value={notaTecnica} 
                                       onChange={(e) => setNotaTecnica(e.target.value)} 
                                       className="rounded-[24px] min-h-[140px] font-bold text-[14px] p-5 border-black/[0.05] dark:bg-black/20 focus:ring-primary/20" 
                                     />
                                     <div className="flex gap-2">
                                       <Button className="flex-1 h-12 rounded-full bg-primary text-white font-black text-[11px] uppercase tracking-widest" onClick={saveNotaTecnica}>
                                         Guardar Nota
                                       </Button>
                                       <Button variant="outline" className="h-12 rounded-full px-6 font-black text-[11px] uppercase tracking-widest" onClick={() => setShowNotaField(false)}>
                                         Cancelar
                                       </Button>
                                     </div>
                                   </div>
                                 )}

                                 <label className="block p-8 border-2 border-dashed border-black/[0.1] dark:border-white/[0.1] rounded-[32px] hover:bg-white dark:hover:bg-black/20 hover:border-primary/40 transition-all cursor-pointer text-center">
                                    <Input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">Subir Evidencia Fotográfica</p>
                                 </label>
                                 
                                 <div className="grid grid-cols-3 gap-3">
                                   {files.map((f, i) => (
                                     <div key={i} className="aspect-square rounded-[24px] overflow-hidden border border-black/[0.05] dark:border-white/[0.05] shadow-sm transform hover:scale-105 transition-all duration-500">
                                       <img src={f.file_url} className="w-full h-full object-cover" />
                                     </div>
                                   ))}
                                 </div>
                              </div>
                           </div>
                        </div>
                     )}

                     {/* ETAPA 4: PROPUESTA — Quantum Parser Integration */}
                     {currentStage === 4 && (
                       <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 border border-black/[0.03] dark:border-white/[0.03] shadow-sm mb-6 relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                         
                         <div className="relative z-10">
                           <div className="flex items-center gap-3 mb-6">
                             <div className="w-10 h-10 rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                                <Globe className="h-5 w-5 text-white" />
                             </div>
                             <div>
                               <h3 className="font-black text-[15px] tracking-tight text-foreground uppercase">Magic Link & Propuesta IA</h3>
                               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">Configuración Comercial</p>
                             </div>
                           </div>

                           {!deal.ia_proposal_report ? (
                             <div className="space-y-4">
                               <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                 Utiliza el **Quantum Block Parser** para transformar tus notas técnicas en una propuesta comercial de alto impacto.
                               </p>
                               <Button 
                                 onClick={generateIAProposal} 
                                 disabled={generatingIA}
                                 className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest gap-2"
                               >
                                 {generatingIA ? (
                                   <><Activity className="h-4 w-4 animate-spin" /> Analizando Notas...</>
                                 ) : (
                                   <><Sparkles className="h-4 w-4" /> Generar Propuesta IA</>
                                 )}
                               </Button>
                             </div>
                           ) : (
                             <div className="space-y-6">
                               <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-black/[0.02] dark:border-white/[0.02]">
                                 <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 mb-2">Previsualización IA</p>
                                 <h4 className="font-black text-sm text-foreground mb-1">{deal.ia_proposal_report.title}</h4>
                                 <p className="text-[10px] text-muted-foreground italic line-clamp-2">{deal.ia_proposal_report.technical_scope}</p>
                               </div>

                               <div className="flex flex-col gap-3">
                                 <Button 
                                   variant="outline" 
                                   onClick={generateIAProposal} 
                                   disabled={generatingIA}
                                   className="h-11 rounded-xl border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/5 font-bold text-xs"
                                 >
                                   Recalcular con IA
                                 </Button>
                                 
                                 <div className="h-px bg-black/[0.05] dark:bg-white/[0.05] my-1" />
                                 
                                 <div className="space-y-3">
                                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center opacity-40">Enlace Público para Cliente</p>
                                   <div className="flex gap-2">
                                     <Input 
                                       readOnly 
                                       value={`crm-simon.com/p/${deal.public_token}`} 
                                       className="h-11 rounded-xl bg-slate-100 dark:bg-white/5 border-none font-mono text-[10px]"
                                     />
                                     <Button 
                                       variant="outline" 
                                       size="icon" 
                                       className="h-11 w-11 shrink-0 rounded-xl"
                                       onClick={() => {
                                         navigator.clipboard.writeText(`${window.location.origin}/p/${deal.public_token}`)
                                         alert("Enlace copiado al portapapeles")
                                       }}
                                     >
                                       <Copy className="h-4 w-4" />
                                     </Button>
                                     <Button 
                                       variant="outline" 
                                       size="icon" 
                                       className="h-11 w-11 shrink-0 rounded-xl"
                                       onClick={() => window.open(`/p/${deal.public_token}`, '_blank')}
                                     >
                                       <ExternalLink className="h-4 w-4" />
                                     </Button>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           )}
                         </div>
                       </div>
                     )}

                     {(currentStage === 4 || currentStage === 5) && (
                        <div className="p-8 rounded-[40px] bg-amber-500/5 border border-amber-500/20 space-y-6">
                           <div className="flex items-center gap-3">
                              <div className="h-2 w-2 rounded-full bg-amber-500" />
                              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">Configuración de Propuesta</p>
                           </div>
                           <div className="space-y-4">
                              <Input type="number" placeholder="Monto Neto Ofertado ($)..." value={valorNetoCotizado} onChange={(e) => setValorNetoCotizado(e.target.value)} className="h-14 rounded-full font-black text-lg px-8 border-amber-500/10 dark:bg-black/20" />
                              <Textarea placeholder="Desglose de servicios y alcances técnicos..." value={cotizacionDetalles} onChange={(e) => setCotizacionDetalles(e.target.value)} className="rounded-[32px] min-h-[120px] font-bold text-[14px] p-6 border-amber-500/10 dark:bg-black/20" />
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                   <label className="text-[10px] font-black uppercase text-amber-600/70 ml-2">Duración (Meses)</label>
                                   <Input type="text" placeholder="Ej: 12 meses" value={contractDuration} onChange={(e) => setContractDuration(e.target.value)} className="h-12 rounded-2xl font-bold px-4 border-amber-500/10 dark:bg-black/20" />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[10px] font-black uppercase text-amber-600/70 ml-2">Forma de Pago</label>
                                   <Input type="text" placeholder="Ej: 30 Días" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="h-12 rounded-2xl font-bold px-4 border-amber-500/10 dark:bg-black/20" />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[10px] font-black uppercase text-amber-600/70 ml-2">Validez</label>
                                   <Input type="text" placeholder="Ej: 15 Días" value={offerValidity} onChange={(e) => setOfferValidity(e.target.value)} className="h-12 rounded-2xl font-bold px-4 border-amber-500/10 dark:bg-black/20" />
                                </div>
                              </div>

                               <Button className="w-full h-14 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20" onClick={saveCotizacion}>
                                 Fijar Propuesta y Términos B2B
                               </Button>

                               {/* Magic Link Section */}
                               {deal.public_token && (
                                 <div className="pt-4 mt-2 border-t border-amber-500/10 space-y-3">
                                   <div className="flex items-center justify-between">
                                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 opacity-60">Magic Link B2B</p>
                                     <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full">
                                       {deal.proposal_status === 'ACCEPTED' ? '✅ APROBADO' : deal.proposal_status === 'VIEWED' ? '👀 VISTO' : deal.proposal_status || 'DRAFT'}
                                     </span>
                                   </div>
                                   <Button
                                     variant="outline"
                                     onClick={() => {
                                       const url = `${window.location.origin}/p/${deal.public_token}`
                                       navigator.clipboard.writeText(url)
                                       alert('Magic Link copiado al portapapeles.')
                                     }}
                                     className="w-full h-12 rounded-full border-amber-500/20 hover:bg-amber-500/10 text-amber-700 dark:text-amber-500 font-bold text-[11px] uppercase tracking-widest"
                                   >
                                     Copiar Enlace para Cliente
                                   </Button>
                                   <p className="text-center text-[10px] font-black text-amber-600/50 uppercase tracking-[0.2em]">
                                     Aperturas detectadas: {deal.proposal_view_count || 0}
                                   </p>
                                 </div>
                               )}
                            </div>
                        </div>
                     )}
                     
                     {currentStage === 6 && (
                        <div className="p-8 md:p-12 rounded-[48px] bg-slate-950 dark:bg-white text-white dark:text-black shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 -mr-16 -mt-16 opacity-5 group-hover:opacity-10 transition-all duration-1000 rotate-12">
                              <ShieldCheck className="h-64 w-64" />
                           </div>
                           <div className="relative z-10 space-y-8">
                              <div className="space-y-3">
                                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Deploy Ready
                                 </div>
                                 <h4 className="text-3xl md:text-4xl font-black tracking-tighter leading-none">Entrega a Operaciones</h4>
                                 <p className="text-[14px] md:text-[16px] font-bold opacity-60 leading-relaxed max-w-[90%]">Ejecutar traspaso técnico y notificar al equipo de despliegue para inicio de servicios.</p>
                              </div>
                              <Button className="w-full h-16 rounded-full bg-primary text-white hover:bg-primary/90 font-black text-[13px] uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]" onClick={() => {
                                 const empresa = deal.companies?.razon_social || deal.title
                                 const subject = encodeURIComponent(`📦 TRASPASO TÉCNICO - ${empresa}`)
                                 window.open(`mailto:?subject=${subject}&body=Resumen ejecutivo de cierre listo en plataforma...`, '_blank')
                              }}>
                                 <Mail className="h-6 w-6" /> Notificar Despliegue
                              </Button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
