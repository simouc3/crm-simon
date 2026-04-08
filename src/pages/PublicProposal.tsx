import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { CheckCircle2, ChevronRight, Lock, Activity, FileText, ShieldCheck, Building2, Zap, Download, Target, ClipboardCheck } from 'lucide-react'

const fmtCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function PublicProposal() {
  const { token } = useParams()
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  
  const [showModModal, setShowModModal] = useState(false)
  const [modMessage, setModMessage] = useState('')
  const [sendingMod, setSendingMod] = useState(false)
  const [modSent, setModSent] = useState(false)

  useEffect(() => {
    const fetchDealAndLogView = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase.rpc('get_deal_by_token', { p_token: token })
      
      if (error || !data) {
        console.error('Error fetching deal:', error)
        setLoading(false)
        return
      }

      setDeal(data)
      
      if (data.proposal_status === 'ACCEPTED') {
        setAccepted(true)
      }

      if (data.proposal_status !== 'ACCEPTED') {
        await supabase.rpc('log_proposal_view', { p_token: token })
      }

      setLoading(false)
    }

    fetchDealAndLogView()
  }, [token])

  const handleApprove = async () => {
    if (!token) return
    setAccepting(true)

    const ua = navigator.userAgent
    // En un entorno real capturaríamos la IP real si fuera posible desde el cliente, 
    // pero Supabase puede hacerlo en el backend si se configura.
    const ip = 'Registrado via Web'

    const { data: success, error } = await supabase.rpc('approve_deal', {
      p_token: token,
      p_ip: ip,
      p_ua: ua
    })

    if (!error && success) {
      setAccepted(true)
    } else {
      console.error('Approval failed', error)
      alert('Hubo un problema al aprobar. Por favor contacta a tu asesor.')
    }
    setAccepting(false)
  }

  const handleRequestMods = async () => {
    if (!token || !modMessage.trim()) return
    setSendingMod(true)
    
    const { error } = await supabase.rpc('request_proposal_changes', {
      p_token: token,
      p_message: modMessage
    })

    if (!error) {
      setModSent(true)
      setShowModModal(false)
    } else {
      alert('Hubo un error al enviar tu solicitud.')
    }
    setSendingMod(false)
  }

  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const handleDownloadPDF = async () => {
    setDownloadingPDF(true)
    try {
      const { generateQuotePDF } = await import('../lib/pdf')
      await generateQuotePDF(deal, { razon_social: deal.company_name })
    } catch (e) {
      console.error(e)
      alert('Error descargando el PDF.')
    }
    setDownloadingPDF(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-black/5 border-t-black shadow-sm" />
          <div className="absolute font-black text-[10px]">B2B</div>
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 text-center">
        <ShieldCheck className="h-16 w-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-black text-slate-900 mb-2">Propuesta Protegida</h1>
        <p className="text-slate-500 font-medium">Este enlace es inválido o ha expirado.</p>
      </div>
    )
  }

  const report = deal.ia_proposal_report || null;
  const fallbackTitle = deal.title;
  const fallbackScope = deal.cotizacion_detalles || "Servicio integral diseñado para cubrir las necesidades operativas de la organización.";

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-black selection:text-white pb-32 overflow-x-hidden">
      
      {/* ── AMBIENT BACKGROUND GLOWS ── */}
      <div className="fixed top-[-10%] right-[-10%] w-[60vw] h-[60vh] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* ── HEADER ── */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white rounded-[14px] flex items-center justify-center font-black shadow-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 leading-none mb-1">Propuesta Corporativa</p>
              <h2 className="font-bold text-[16px] leading-tight tracking-tight">Confidencial</h2>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-black/[0.04] rounded-full border border-black/[0.04] text-[10px] font-black uppercase tracking-widest text-black/60">
            <Lock className="w-3 h-3 text-emerald-500" /> Secure Link
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-16 md:pt-24">
        
        {/* ── HERO SECTION ── */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-black/[0.04] rounded-full text-[10px] font-black uppercase tracking-widest text-black/40 mb-6 shadow-sm">
            <FileText className="w-3.5 h-3.5" /> ID: {deal.id.split('-')[0].toUpperCase()}
          </div>
          <h1 className="text-[44px] md:text-[64px] font-black tracking-tighter leading-[0.95] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             {report ? report.title : fallbackTitle}
          </h1>
          
          <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-16 pt-8 border-t border-black/[0.08]">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Socio Comercial</p>
              <p className="text-[17px] font-black text-black tracking-tight">{deal.company_name}</p>
            </div>
            <div className="hidden md:block w-px h-10 bg-black/[0.08]" />
            <div className="space-y-1">
              <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Consultor Asignado</p>
              <p className="text-[17px] font-black text-black tracking-tight">{deal.seller_name || 'Servicios Central'}</p>
            </div>
          </div>
        </div>

        {/* ── INVESTMENT CARD ── */}
        <div className="relative p-10 md:p-14 bg-white rounded-[40px] border border-black/[0.04] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] mb-16 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div>
              <p className="text-[11px] font-black text-black/40 uppercase tracking-[0.25em] mb-4">Inversión Neta</p>
              <div className="flex items-baseline gap-2">
                <span className="text-[18px] font-black opacity-30 mt-[-10px]">$</span>
                <p className="text-[64px] md:text-[88px] font-black tracking-tighter leading-none tabular-nums">
                  {fmtCLP(deal.valor_neto || 0).replace('$', '').trim()}
                </p>
              </div>
              <p className="text-[14px] font-bold text-black/40 mt-4 flex items-center gap-2">
                Total estimado con IVA: <span className="text-black/60">{fmtCLP(deal.valor_total || deal.valor_neto * 1.19)}</span>
              </p>
            </div>
            
            <div className={`px-6 py-4 rounded-[22px] border ${accepted ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-[#F5F5F7] border-black/[0.04] text-blue-600'} flex flex-col items-center gap-1 min-w-[200px]`}>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Documento</p>
              <div className="flex items-center gap-2">
                {accepted ? (
                  <><CheckCircle2 className="w-5 h-5" /><span className="font-black tracking-tight">VIGENTE / ACEPTADO</span></>
                ) : (
                  <><Activity className="w-5 h-5" /><span className="font-black tracking-tight">ESTADO: PENDIENTE</span></>
                ) }
              </div>
            </div>
          </div>
        </div>

        {/* ── INTELLIGENCE INSIGHTS (PAIN POINTS) ── */}
        {report && report.pain_points && (
          <div className="mb-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                  <Target className="w-3 h-3" /> Foco de la Solución
               </div>
               <h3 className="text-2xl font-black tracking-tight leading-none mb-4">Análisis de Necesidades</h3>
               <p className="text-sm font-medium text-black/40 leading-relaxed">
                  Este reporte resume los puntos críticos detectados por nuestro consultor durante el diagnóstico inicial.
               </p>
            </div>
            <div className="md:col-span-2 grid gap-3">
               {report.pain_points.map((point: string, i: number) => (
                  <div key={i} className="flex gap-4 p-6 bg-white rounded-[24px] border border-black/[0.03] shadow-sm animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                     <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                        <span className="font-black text-xs opacity-20">0{i+1}</span>
                      </div>
                      <p className="font-bold text-[16px] tracking-tight text-black/70 py-2">{point}</p>
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* ── TECHNICAL SCOPE ── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-2 h-8 bg-black rounded-full" />
             <h3 className="text-[28px] font-black tracking-tight uppercase">Alcance Técnico del Servicio</h3>
          </div>
          <div className="bg-white rounded-[40px] p-10 md:p-14 border border-black/[0.04] shadow-sm text-[18px] md:text-[20px] font-medium leading-relaxed text-black/80 space-y-6">
             <p className="whitespace-pre-wrap">{report ? report.technical_scope : fallbackScope}</p>
             
             <div className="pt-10 grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
                <div className="flex gap-4">
                   <div className="w-10 h-10 rounded-2xl bg-[#F5F5F7] flex items-center justify-center shrink-0">
                      <Zap className="h-5 w-5 opacity-40" />
                   </div>
                   <div>
                      <p className="font-black uppercase tracking-widest text-black/30 text-[10px] mb-1">Duración del Contrato</p>
                      <p className="font-black opacity-80">{deal.contract_duration || 'No especificado'}</p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="w-10 h-10 rounded-2xl bg-[#F5F5F7] flex items-center justify-center shrink-0">
                      <ClipboardCheck className="h-5 w-5 opacity-40" />
                   </div>
                   <div>
                      <p className="font-black uppercase tracking-widest text-black/40 text-[10px] mb-1">Términos de Pago</p>
                      <p className="font-black opacity-80">{deal.payment_terms || 'No especificado'}</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* ── LEGAL TERMS ── */}
        <div className="p-8 bg-black/5 rounded-[28px] border border-black/[0.04] mb-20">
          <p className="text-[12px] font-bold text-black/40 leading-relaxed italic max-w-2xl mx-auto text-center">
            Este documento genera una obligación vinculante al ser aceptado. Al presionar "Aceptar Propuesta", declara que el representante de <strong>{deal.company_name}</strong> ha revisado y validado los términos enumerados, constituyendo una Firma Electrónica Simple según protocolos operativos B2B.
          </p>
        </div>

        {/* ── DOWNLOAD PDF ── */}
        <div className="flex justify-center mb-10">
           <button 
             onClick={handleDownloadPDF}
             disabled={downloadingPDF}
             className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
           >
             {downloadingPDF ? <Activity className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
             Descargar Versión PDF Imprimible
           </button>
        </div>

        {/* ── CTA BAR ── */}
        {!accepted ? (
          <div className="fixed bottom-0 left-0 right-0 p-6 md:p-10 bg-white/40 backdrop-blur-3xl border-t border-black/[0.04] z-50 animate-in slide-in-from-bottom-full duration-500 delay-500 fill-mode-both">
            <div className="max-w-md mx-auto flex flex-col gap-4">
              <button
                onClick={handleApprove}
                disabled={accepting || modSent}
                className="w-full h-18 py-5 rounded-[22px] bg-black text-white font-black text-[18px] tracking-tight hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] disabled:opacity-50"
              >
                {accepting ? (
                  <><Activity className="h-6 w-6 animate-spin" /> Procesando Firma...</>
                ) : (
                  <>Aceptar Propuesta Comercial <ChevronRight className="w-6 h-6 opacity-30" /></>
                )}
              </button>
              <button
                onClick={() => setShowModModal(true)}
                className="w-full h-12 rounded-xl text-black/40 font-black text-[11px] uppercase tracking-widest hover:text-black transition-colors"
              >
                Solicitar Ajustes o Modificaciones
              </button>
            </div>
          </div>
        ) : (
          <div className="fixed bottom-0 left-0 right-0 p-6 md:p-10 bg-white/40 backdrop-blur-3xl border-t border-black/[0.04] z-50">
            <div className="max-w-md mx-auto h-18 rounded-[22px] bg-emerald-500 text-white font-black text-[18px] tracking-tight flex items-center justify-center gap-3 shadow-xl">
              <CheckCircle2 className="h-6 w-6" /> Propuesta Aceptada Exitosamente
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {showModModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black tracking-tight mb-2">Solicitar Ajustes</h3>
            <p className="text-sm font-medium text-black/40 mb-8 leading-relaxed">
              Describe los cambios requeridos. Tu consultor asignado será notificado instantáneamente para actualizar los términos.
            </p>
            <textarea 
              autoFocus
              className="w-full bg-[#F5F5F7] border-none rounded-2xl p-6 text-[15px] font-medium outline-none min-h-[140px] mb-8 placeholder:opacity-30"
              placeholder="Ej: El plazo de inicio debe ser postergado 15 días..."
              value={modMessage}
              onChange={(e) => setModMessage(e.target.value)}
            />
            <div className="flex flex-col gap-3">
              <button 
                disabled={sendingMod || !modMessage.trim()}
                onClick={handleRequestMods}
                className="w-full h-14 rounded-2xl font-black text-white bg-blue-600 disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {sendingMod ? <Activity className="w-5 h-5 animate-spin" /> : 'Enviar Solicitud'}
              </button>
              <button 
                onClick={() => setShowModModal(false)}
                className="w-full h-12 rounded-2xl font-black text-black/30 hover:text-black transition-colors uppercase tracking-widest text-[10px]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-40 sm:h-20"></div>
    </div>
  )
}
