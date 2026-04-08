import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { CheckCircle2, Lock, Activity, FileText, ShieldCheck, Building2, Zap, Download, ClipboardCheck, ArrowRight } from 'lucide-react'

// Helper para sanitizar títulos corporativos
const formatHeader = (text: string) => {
  if (!text) return "";
  // Limpieza básica de ruido común y normalización a Capital Case
  return text.trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1C1C1E]/10 border-t-[#007AFF]" />
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 text-center">
        <ShieldCheck className="h-12 w-12 text-slate-300 mb-4" />
        <h1 className="text-xl font-bold text-[#1C1C1E] mb-2">Propuesta Protegida</h1>
        <p className="text-slate-500 text-sm">Este enlace es inválido o ha expirado.</p>
      </div>
    )
  }

  const report = deal.ia_proposal_report || null;
  const fallbackTitle = formatHeader(deal.title);
  const fallbackScope = deal.cotizacion_detalles || "Servicio integral diseñado para cubrir las necesidades operativas de la organización.";

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1C1C1E] font-sans selection:bg-[#007AFF]/10 overflow-x-hidden p-0 sm:p-8 md:p-12">
      
      {/* ── AMBIENT BACKGROUND GLOWS (MINIMAL) ── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[30vh] bg-blue-500/5 blur-[120px] pointer-events-none -z-10" />

      {/* ── MAIN CONTENT CONTAINER (WHITE PAPER CARD) ── */}
      <div className="max-w-4xl mx-auto bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.02)] min-h-screen sm:min-h-0 sm:rounded-[32px] overflow-hidden relative">
        
        {/* ── HEADER ── */}
        <header className="px-8 sm:px-12 py-8 border-b border-[#F5F5F7] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-[#1C1C1E] text-white rounded-[10px] flex items-center justify-center shadow-lg">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 leading-none mb-1">Cotización Corporativa</p>
              <h2 className="font-semibold text-sm leading-none">{deal.company_name}</h2>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F7] rounded-full text-[10px] font-bold tracking-tight text-black/50">
            <Lock className="w-3 h-3 text-[#34C759]" /> Documento Certificado SSL
          </div>
        </header>

        <main className="px-8 sm:px-12 pt-16 pb-32">
          
          {/* ── HERO ── */}
          <div className="mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F5F5F7] rounded-full text-[10px] font-bold uppercase tracking-tight text-black/40 mb-6">
              <FileText className="w-3.5 h-3.5" /> REF: {deal.id.split('-')[0].toUpperCase()}
            </div>
            <h1 className="text-[32px] md:text-[45px] font-bold tracking-tight leading-[1.1] mb-8 text-[#1C1C1E]">
               {report ? formatHeader(report.title) : fallbackTitle}
            </h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-y border-[#F5F5F7]">
              <div>
                <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-1">Validez de la Oferta</p>
                <p className="text-sm font-semibold">{deal.offer_validity || '15 días calendario'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-1">Consultor Ejecutivo</p>
                <p className="text-sm font-semibold">{deal.seller_name || 'Servicios Central'}</p>
              </div>
            </div>
          </div>

          {/* ── INVESTMENT (MINIMALIST) ── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 items-start">
            <div className="md:col-span-12">
              <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest mb-4">Monto Neto de Inversión</p>
              <div className="flex items-baseline gap-2">
                <span className="text-[24px] font-medium text-black/20">$</span>
                <p className="text-[44px] md:text-[62px] font-bold tracking-tight leading-none text-[#1C1C1E] tabular-nums">
                  {fmtCLP(deal.valor_neto || 0).replace('$', '').trim()}
                </p>
              </div>
              <div className="flex items-center gap-6 mt-4">
                <p className="text-[13px] font-medium text-black/40">
                  Total con IVA: <span className="text-black/80 font-bold">{fmtCLP(deal.valor_total || deal.valor_neto * 1.19)}</span>
                </p>
                <div className="h-4 w-px bg-black/5" />
                <p className={`text-[11px] font-bold flex items-center gap-1.5 ${accepted ? 'text-[#34C759]' : 'text-[#007AFF]'}`}>
                  {accepted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                  {accepted ? 'CONTRATO FIRMADO' : 'PENDIENTE DE FIRMA'}
                </p>
              </div>
            </div>
          </div>

          {/* ── FOCUS SECTION (INTELLIGENCE) ── */}
          {report && report.pain_points && (
            <div className="mb-20">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-1.5 h-6 bg-[#FF9500] rounded-full" />
                  <h3 className="text-lg font-bold tracking-tight">Análisis de Requerimientos</h3>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {report.pain_points.map((point: string, i: number) => (
                    <div key={i} className="p-6 bg-[#F5F5F7] rounded-24px border border-black/[0.02]">
                       <span className="text-[10px] font-black opacity-10 block mb-3">0{i+1}</span>
                       <p className="text-[15px] font-semibold leading-snug text-black/80">{point}</p>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* ── TECHNICAL SCOPE (PROTAGONIST) ── */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-1.5 h-6 bg-[#1C1C1E] rounded-full" />
               <h3 className="text-lg font-bold tracking-tight">Alcance Técnico del Servicio</h3>
            </div>
            <div className="text-[17px] sm:text-[18px] font-medium leading-[1.6] text-black/70 space-y-6 max-w-3xl">
               <p className="whitespace-pre-wrap">{report ? report.technical_scope : fallbackScope}</p>
               
               <div className="pt-10 grid grid-cols-1 sm:grid-cols-2 gap-10 text-sm">
                  <div className="flex gap-4 p-5 bg-[#F5F5F7]/50 rounded-2xl border border-black/[0.01]">
                     <Zap className="h-5 w-5 text-[#007AFF] opacity-80" />
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/30 mb-1">Duración del Acuerdo</p>
                        <p className="font-bold">{deal.contract_duration || 'Por definir'}</p>
                     </div>
                  </div>
                  <div className="flex gap-4 p-5 bg-[#F5F5F7]/50 rounded-2xl border border-black/[0.01]">
                     <ClipboardCheck className="h-5 w-5 text-[#34C759] opacity-80" />
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/30 mb-1">Condiciones de Pago</p>
                        <p className="font-bold">{deal.payment_terms || '30 días'}</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* ── LEGAL & PDF ── */}
          <footer className="border-t border-[#F5F5F7] pt-12">
            <div className="flex flex-col items-center gap-8 text-center">
              <p className="text-[11px] font-medium text-black/30 leading-relaxed max-w-xl italic">
                Este documento constituye una oferta comercial vinculante. Al formalizar la aceptación mediante el enlace seguro, se genera un registro de auditoría digital (IP/Timestamp) con validez operacional B2B.
              </p>
              
              <button 
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="flex items-center gap-2 group transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-[#F5F5F7] flex items-center justify-center group-hover:bg-[#1C1C1E] group-hover:text-white transition-all">
                  {downloadingPDF ? <Activity className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/40 group-hover:text-black">Versión PDF Digital</span>
              </button>
            </div>
          </footer>
        </main>
      </div>

      {/* ── INTERACTIVE CONTROLS ── */}
      {!accepted ? (
        <div className="fixed bottom-0 left-0 right-0 p-6 md:p-10 z-[100] flex justify-center pointer-events-none">
          <div className="w-full max-w-lg flex flex-col gap-4 pointer-events-auto">
            
            {/* Ambient Glow behind button */}
            <div className="absolute inset-0 bg-blue-500/10 blur-[60px] rounded-full -z-10" />

            <button
              onClick={handleApprove}
              disabled={accepting || modSent}
              className="w-full h-16 py-5 rounded-full bg-[#007AFF] text-white font-bold text-[16px] tracking-tight hover:bg-[#0062CC] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_-10px_rgba(0,122,255,0.3)] disabled:opacity-50"
            >
              {accepting ? (
                <><Activity className="h-5 w-5 animate-spin" /> Procesando...</>
              ) : (
                <>Aceptar Propuesta Comercial <ArrowRight className="w-5 h-5 opacity-40 ml-2" /></>
              )}
            </button>
            <button
              onClick={() => setShowModModal(true)}
              className="w-full h-10 rounded-full bg-white/60 backdrop-blur-xl border border-black/5 text-black/40 font-bold text-[11px] uppercase tracking-widest hover:text-black hover:bg-white transition-colors"
            >
              Solicitar Ajustes o Comentarios
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 p-6 md:p-10 z-[100] flex justify-center pointer-events-none">
          <div className="w-full max-w-md h-16 rounded-full bg-[#34C759] text-white font-bold text-[16px] tracking-tight flex items-center justify-center gap-3 shadow-[0_20px_40px_-10px_rgba(52,199,89,0.3)] animate-in slide-in-from-bottom-full">
            <CheckCircle2 className="h-6 w-6" /> Propuesta Aceptada Exitosamente
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      {showModModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-bold tracking-tight mb-2">Solicitar Cambios</h3>
            <p className="text-sm font-medium text-black/40 mb-8 leading-relaxed">
              Escribe tus comentarios a continuación. Notificaremos instantáneamente a tu consultor.
            </p>
            <textarea 
              autoFocus
              className="w-full bg-[#F5F5F7] border-none rounded-2xl p-6 text-[15px] font-medium outline-none min-h-[140px] mb-8 placeholder:opacity-30"
              placeholder="Ej: Necesitamos ajustar la fecha de inicio..."
              value={modMessage}
              onChange={(e) => setModMessage(e.target.value)}
            />
            <div className="flex flex-col gap-3">
              <button 
                disabled={sendingMod || !modMessage.trim()}
                onClick={handleRequestMods}
                className="w-full h-14 rounded-full font-bold text-white bg-[#007AFF] disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {sendingMod ? <Activity className="w-5 h-5 animate-spin" /> : 'Enviar Solicitud'}
              </button>
              <button 
                onClick={() => setShowModModal(false)}
                className="w-full h-12 rounded-full font-bold text-black/30 hover:text-black transition-colors uppercase tracking-[0.2em] text-[10px]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-48 sm:h-20"></div>
    </div>
  )
}
