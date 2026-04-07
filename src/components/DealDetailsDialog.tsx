import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase/client"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AIAssistantWidget } from "./AIAssistantWidget"
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  ChevronRight, 
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
      setCurrentStage(deal.stage || 1)
      setUltimoCorreoAt(deal.ultimo_correo_at || null)
      setCorreoRespondido(deal.correo_respondido || false)
      setMotivoPerdida(deal.motivo_perdida || "")
      setIsContract(deal.is_contract || false)
      setContractMonths(deal.contract_months ? String(deal.contract_months) : "")
      
      // Load commercial terms
      setContractDuration(deal.contract_duration || "")
      setPaymentTerms(deal.payment_terms || "")
      setOfferValidity(deal.offer_validity || "")
      
      fetchFiles()
    }
  }, [deal])

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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

            {/* Pipeline Stage — wide card */}
            <div className="md:col-span-5 relative overflow-hidden rounded-2xl p-4 bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.04] shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Etapa Actual</p>
                <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart4 className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>

              <Select value={String(currentStage)} onValueChange={(val) => changeStage(parseInt(val))}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-black/30 border border-black/[0.04] dark:border-white/[0.04] font-bold text-[13px] px-4 shadow-none focus:ring-2 focus:ring-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl p-2 backdrop-blur-xl">
                  {STAGES.map(s => (
                    <SelectItem key={s.id} value={String(s.id)} className="rounded-xl my-0.5 focus:bg-primary focus:text-white font-bold px-4">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentStage === 7 && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <Select value={motivoPerdida} onValueChange={updateMotivoPerdida}>
                    <SelectTrigger className="h-11 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200/50 font-bold text-sm">
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

            {/* Tempo en Etapa */}
            <div className="md:col-span-3 relative overflow-hidden rounded-2xl p-4 bg-[#1C1C1E] dark:bg-white/5 text-white flex flex-col justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Días en Etapa</p>
              <div className="mt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-[36px] font-black tracking-tighter tabular-nums leading-none">
                    {deal.stage_changed_at ? Math.floor((Date.now() - new Date(deal.stage_changed_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30 pb-0.5">días</span>
                </div>
                <p className="text-[9px] text-white/30 font-bold mt-1 uppercase tracking-widest">
                  {currentStage === 6 ? 'Contrato cerrado' : 'Sin cambio'}
                </p>
              </div>
            </div>

            {/* Contrato */}
            <div className={`md:col-span-4 relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between transition-all duration-700 ${
              isContract 
                ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)]' 
                : 'bg-white dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.04]'
            }`}>
              {/* Background decoration */}
              {isContract && (
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
              )}

              <div className="flex items-center justify-between relative z-10">
                <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isContract ? 'text-white/60' : 'text-muted-foreground opacity-40'}`}>
                  Contrato SLA
                </p>
                {/* Apple-style toggle */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isContract}
                    onChange={(e) => setIsContract(e.target.checked)}
                  />
                  <div className={`relative w-12 h-7 rounded-full transition-all duration-500 ${isContract ? 'bg-white/30' : 'bg-slate-200 dark:bg-white/10'}`}>
                    <div className={`absolute top-1 h-5 w-5 rounded-full shadow-md transition-all duration-500 ${
                      isContract ? 'left-[26px] bg-white' : 'left-1 bg-white dark:bg-slate-400'
                    }`} />
                  </div>
                </label>
              </div>

              <div className="relative z-10 mt-4 space-y-3">
                {isContract ? (
                  <>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isContract ? 'text-white/50' : 'text-muted-foreground/40'}`}>
                      Duración (meses)
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={contractMonths}
                        onChange={(e) => setContractMonths(e.target.value)}
                        placeholder="0"
                        className="w-24 h-12 rounded-2xl bg-white/20 border border-white/20 text-white font-black text-[22px] text-center placeholder:text-white/30 outline-none focus:ring-2 focus:ring-white/40 tabular-nums"
                      />
                      <span className="text-white/70 font-black text-[13px] uppercase tracking-widest">meses</span>
                    </div>
                    <button
                      onClick={async () => {
                        const months = parseInt(contractMonths) || 0
                        const { error } = await supabase.from('deals').update({
                          is_contract: true,
                          contract_months: months
                        }).eq('id', deal.id)
                        if (!error && onDealUpdated) onDealUpdated()
                      }}
                      className="w-full h-10 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/20 text-white font-black text-[11px] uppercase tracking-widest transition-all duration-300"
                    >
                      Guardar SLA
                    </button>
                  </>
                ) : (
                  <div>
                    <p className="text-2xl font-black tracking-tight text-muted-foreground/30">Spot</p>
                    <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest mt-1">Sin compromiso fijo</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Main Grid: compact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            
            {/* Column Left: Insights & AI */}
            <div className="space-y-8">
               
               {/* Risk & Indicators */}
               {deal.is_risk ? (
                 <div className="bg-rose-500 p-5 rounded-2xl text-white shadow-xl shadow-rose-500/20 relative overflow-hidden">
                    <div className="relative z-10 space-y-2">
                       <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 fill-white animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Alerta de Riesgo</span>
                       </div>
                       <h4 className="text-[15px] font-black tracking-tight leading-tight">"{deal.risk_reason}"</h4>
                    </div>
                 </div>
               ) : (
                 <div className="bg-indigo-600 p-5 rounded-2xl text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                       <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Salud del Negocio</span>
                       </div>
                       <p className="text-[15px] font-black tracking-tight">Oportunidad Estable</p>
                       <p className="text-[11px] font-semibold opacity-60 mt-0.5">Sin desviaciones detectadas.</p>
                    </div>
                 </div>
               )}

               <div className="bg-slate-50 dark:bg-white/[0.02] rounded-2xl p-1.5 border border-black/[0.03] dark:border-white/[0.03]">
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

                        <div className="grid grid-cols-1 gap-2">
                           <Button asChild variant="outline" className="h-10 rounded-full border-black/[0.1] dark:border-white/[0.1] group px-4 text-[13px]">
                              <a href={`tel:${deal.companies?.contact_phone}`} className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <Phone className="h-4 w-4 text-primary" />
                                  <span className="text-[13px] font-bold tracking-tight">{deal.companies?.contact_phone || 'Registrar Número'}</span>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                              </a>
                           </Button>
                           <Button asChild variant="outline" className="h-10 rounded-full border-black/[0.1] dark:border-white/[0.1] group px-4">
                              <a href={`mailto:${deal.companies?.contact_email}`} className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <Mail className="h-4 w-4 text-primary" />
                                  <span className="text-[13px] font-bold tracking-tight truncate max-w-[180px]">{deal.companies?.contact_email || 'Enviar Invitación'}</span>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                              </a>
                           </Button>
                        </div>
                     </div>

                     {/* Strategic Map Link */}
                     {(deal.companies?.direccion || deal.companies?.comuna) && (
                        <Button asChild className="h-16 w-full rounded-[24px] bg-slate-50 dark:bg-white/5 border border-black/[0.03] dark:border-white/[0.05] hover:bg-slate-100 group transition-all px-6 text-foreground shadow-none">
                           <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([deal.companies?.direccion, deal.companies?.comuna?.replace(/_/g, ' '), 'Chile'].filter(Boolean).join(', '))}`}
                              target="_blank"
                              className="flex items-center justify-between w-full"
                           >
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-white dark:bg-black flex items-center justify-center shadow-sm">
                                    <MapPin className="h-5 w-5 text-primary" />
                                 </div>
                                 <div className="flex-1 min-w-0 text-left">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-1">Geolocalización</p>
                                    <p className="text-[13px] font-black tracking-tight truncate">{deal.companies?.direccion || deal.companies?.comuna?.replace(/_/g, ' ')}</p>
                                 </div>
                              </div>
                              <ChevronRight className="h-4 w-4 opacity-20 group-hover:translate-x-1 transition-transform" />
                           </a>
                        </Button>
                     )}
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
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">Área Estimada</p>
                        <p className="text-[22px] font-black tracking-tighter tabular-nums leading-none">
                           {deal.companies?.m2_estimados ? `${Number(deal.companies.m2_estimados).toLocaleString('es-CL')} m²` : '—'}
                        </p>
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
                        <div className="p-8 rounded-[40px] bg-slate-50 dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.05] space-y-6">
                           <div className="flex items-center justify-between">
                             <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Auditoría de Visita</p>
                             <Button size="sm" variant={visitaRealizada ? "default" : "outline"} className={`rounded-full h-10 px-6 text-[10px] font-black uppercase tracking-widest ${visitaRealizada ? 'bg-primary text-white border-transparent shadow-lg shadow-primary/20' : 'border-black/10 dark:border-white/10'}`} onClick={toggleVisita}>
                               {visitaRealizada ? "✅ VISITADO" : "MARCAR VISITA"}
                             </Button>
                           </div>
                           <div className="space-y-4">
                              <label className="block p-8 border-2 border-dashed border-black/[0.1] dark:border-white/[0.1] rounded-[32px] hover:bg-white dark:hover:bg-black/20 hover:border-primary/40 transition-all cursor-pointer text-center">
                                 <Input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                                 <FileText className="h-8 w-8 text-muted-foreground opacity-20 mx-auto mb-3" />
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
                        <div className="p-10 rounded-[48px] bg-primary text-white shadow-[0_30px_70px_rgba(0,122,255,0.3)] relative overflow-hidden group">
                           <div className="absolute top-0 right-0 -mr-12 -mt-12 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
                              <ShieldCheck className="h-56 w-56" />
                           </div>
                           <div className="relative z-10 space-y-6">
                              <div className="space-y-2">
                                 <h4 className="text-3xl font-black tracking-tighter leading-none">Entrega a Operaciones</h4>
                                 <p className="text-[13px] font-bold opacity-70 leading-relaxed max-w-[80%]">Sincronización automatizada de datos técnicos para el despliegue del proyecto.</p>
                              </div>
                              <Button className="w-full h-16 rounded-full bg-white text-primary hover:bg-slate-100 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-4 shadow-2xl" onClick={() => {
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
