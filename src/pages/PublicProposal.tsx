import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { CheckCircle2, ChevronRight, Lock, Activity, FileText, ShieldCheck, Building2, UserCircle } from 'lucide-react'

const fmtCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function PublicProposal() {
  const { token } = useParams()
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    const fetchDealAndLogView = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase.rpc('get_deal_by_token', { p_token: token })
      
      if (error || !data || data.length === 0) {
        console.error('Error fetching deal:', error)
        setLoading(false)
        return
      }

      const currentDeal = data[0]
      setDeal(currentDeal)
      
      if (currentDeal.proposal_status === 'ACCEPTED') {
        setAccepted(true)
      }

      if (currentDeal.proposal_status !== 'ACCEPTED') {
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
      alert('Hubo un problema al aprobar. Por favor, asegúrate de que el enlace sea el correcto o contacta a tu asesor.')
    }
    setAccepting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Activity className="h-8 w-8 text-slate-400 animate-spin" />
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <ShieldCheck className="h-16 w-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Propuesta Protegida</h1>
        <p className="text-slate-500">Este enlace es inválido, ha expirado o requiere nuevos permisos de acceso.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-slate-900 selection:text-white pb-32">
      {/* Executive Static Header */}
      <div className="w-full bg-white border-b border-black/[0.04] sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-sm tracking-tight shadow-md">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">Documento Oficial</span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block leading-none mt-0.5">Confidencial B2B</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100 text-[11px] font-bold tracking-widest uppercase shadow-sm">
            <Lock className="w-3.5 h-3.5" /> TLS Encrypted
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-8 pt-12 md:pt-20">
        
        {/* Deal Title & Counterpart Info */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full mb-6 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <FileText className="w-3.5 h-3.5" /> ID Referencia: {deal.id.split('-')[0]}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1] mb-6">
            {deal.title}
          </h1>
          
          <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-16 pt-6 border-t border-slate-200">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preparado Para</p>
              <p className="text-[15px] font-bold text-slate-900">{deal.company_name}</p>
              <p className="text-[12px] font-medium text-slate-500 font-mono">{deal.company_rut || 'RUT No especificado'}</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200"></div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Representante Comercial</p>
              <p className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-slate-400" /> {deal.seller_name || 'Equipo Comercial'}
              </p>
            </div>
          </div>
        </div>

        {/* Investment Card */}
        <div className="bg-white rounded-[24px] p-8 md:p-10 border border-slate-200 shadow-sm mb-12 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-blue-50 transition-colors duration-1000" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Valor Neto Ofertado</p>
              <div className="flex items-baseline gap-2">
                <p className="text-[48px] md:text-[64px] font-black tracking-tighter text-slate-900 tabular-nums leading-none">
                  {fmtCLP(deal.valor_neto || 0)}
                </p>
              </div>
              <p className="text-[13px] font-bold text-slate-400 mt-2">
                Valor Total (Incluye IVA): {fmtCLP(deal.valor_total || deal.valor_neto * 1.19)}
              </p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Estado de la Propuesta</p>
              <div className="flex items-center gap-2">
                {accepted ? (
                  <><CheckCircle2 className="w-5 h-5 text-emerald-500" /><span className="font-bold text-emerald-600">Aceptada Legalmente</span></>
                ) : (
                  <><Activity className="w-5 h-5 text-blue-500" /><span className="font-bold text-blue-600">Pendiente de Aprobación</span></>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Technical/Scope Details */}
        <div className="mb-16">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" /> Alcance del Servicio
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            {deal.cotizacion_detalles ? (
              <div className="prose prose-sm md:prose-base prose-slate max-w-none font-medium whitespace-pre-wrap">
                {deal.cotizacion_detalles}
              </div>
            ) : (
              <p className="text-slate-500 font-medium italic">Se aplicarán los términos de servicio estándar acordados verbalmente.</p>
            )}
          </div>
        </div>

        {/* T&C Context */}
        <div className="bg-slate-100 rounded-xl p-6 border border-slate-200 mb-12">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Términos Comerciales</h4>
          <p className="text-[13px] text-slate-600 font-medium leading-relaxed">
            Al aceptar esta propuesta mediante el botón adjunto, la entidad representada ({deal.company_name}) confirma la exactitud técnica de los datos descritos y autoriza formalmente a nuestro equipo para iniciar el proceso de onboarding corporativo, despliegue logístico y auditoría final. Esta acción constituye una Firma Electrónica Simple bajo normativa local.
          </p>
        </div>

        {/* Floating Action Button (1-Click Approve / Modify) */}
        {!accepted ? (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent z-40 pb-safe pointer-events-none flex justify-center">
            <div className="w-full max-w-md flex flex-col gap-3">
              <button
                onClick={handleApprove}
                disabled={accepting}
                className="pointer-events-auto h-16 w-full rounded-2xl bg-slate-900 text-white font-bold text-[16px] tracking-tight hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.4)] disabled:opacity-50 disabled:scale-100 hover:bg-black"
              >
                {accepting ? (
                  <><Activity className="h-5 w-5 animate-spin" /> Procesando Firma Electrónica...</>
                ) : (
                  <>Aceptar Propuesta Comercial <ChevronRight className="w-5 h-5 opacity-60" /></>
                )}
              </button>
              <button
                onClick={() => {
                  window.location.href = `mailto:contacto@asesor.com?subject=Revisión Propuesta: ${deal.title}&body=Hola, por favor revisemos algunos puntos técnicos de la propuesta...`
                }}
                className="pointer-events-auto h-12 w-full rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-[13px] hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center shadow-sm"
              >
                Necesito solicitar modificaciones
              </button>
            </div>
          </div>
        ) : (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent z-40 pb-safe pointer-events-none flex justify-center">
            <div className="pointer-events-auto h-16 w-full max-w-md rounded-2xl bg-emerald-500 text-white font-bold text-lg tracking-tight flex items-center justify-center gap-3 shadow-[0_12px_24px_-8px_rgba(16,185,129,0.4)]">
              <CheckCircle2 className="h-6 w-6" /> Contrato Aceptado Exitosamente
            </div>
          </div>
        )}
      </div>

      <div className="h-32"></div>
    </div>
  )
}
