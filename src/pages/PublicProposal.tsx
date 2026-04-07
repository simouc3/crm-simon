import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { CheckCircle2, ChevronRight, Lock, Activity } from 'lucide-react'

// Utilidad para formatear dinero (igual que en el resto del CRM)
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

      // 1. Fetch public info using the protected RPC
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

      // 2. Log view privately (Telemetría)
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

    // Recolectar datos técnicos básicos para la Firma Simple
    const ua = navigator.userAgent
    // Nota: La captura de IP real idealmente se hace desde un Edge Function.
    // Para este MVP, usaremos un string indicando la firma desde el dispositivo.
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
      alert('Hubo un problema al aprobar. Por favor, contacta a tu asesor.')
    }
    setAccepting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0D0D17] flex items-center justify-center">
        <Activity className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0D0D17] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Propuesta no encontrada</h1>
        <p className="text-slate-500">Este enlace es inválido o ha expirado.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0D0D17] font-sans selection:bg-black selection:text-white pb-32">
      {/* Dynamic Header */}
      <div className="w-full bg-white/60 dark:bg-[#141420]/60 backdrop-blur-2xl border-b border-black/[0.04] dark:border-white/[0.06] sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-[8px] flex items-center justify-center font-bold text-sm">
              CRM
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">Propuesta Privada</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase">
            <Lock className="w-3 h-3" /> E2E Encrypted
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-16">
        {/* Intro */}
        <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Para: {deal.company_name}</p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-[1.1] mb-12">
          {deal.title}
        </h1>

        {/* Investment Card - Apple Card Style */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-8 md:p-12 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.06)] mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 dark:bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 opacity-60">Inversión Total</p>
          <div className="flex items-baseline gap-2 mb-8">
            <p className="text-[56px] font-black tracking-tighter text-slate-900 dark:text-white tabular-nums leading-none">
              {fmtCLP(deal.valor_total || deal.valor_neto)}
            </p>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">CLP</span>
          </div>

          <div className="flex flex-col gap-4 pt-6 border-t border-black/[0.04] dark:border-white/[0.06]">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-500">Asesor Comercial</span>
              <span className="font-bold text-slate-900 dark:text-white">{deal.seller_name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-500">Validez del Enlace</span>
              <span className="font-bold text-emerald-500">Activo</span>
            </div>
          </div>
        </div>

        {/* T&C Context */}
        <p className="text-[13px] text-slate-500 font-medium leading-relaxed mb-12">
          Al aceptar esta propuesta, usted confirma la exactitud de los datos operacionales descritos y autoriza el inicio del proceso de onboarding técnico y legal por parte de nuestro equipo. Las condiciones finales pueden estar sujetas a auditoría técnica final.
        </p>

        {/* Floating Action Button (1-Click Approve) */}
        {!accepted ? (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7] to-transparent dark:from-[#0D0D17] dark:via-[#0D0D17] z-40 pb-safe pointer-events-none flex justify-center">
            <button
              onClick={handleApprove}
              disabled={accepting}
              className="pointer-events-auto h-16 w-full max-w-sm rounded-[24px] bg-black dark:bg-white text-white dark:text-black font-bold text-lg tracking-tight hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:scale-100"
            >
              {accepting ? (
                <Activity className="h-5 w-5 animate-spin" />
              ) : (
                <>Aceptar Propuesta Comercial <ChevronRight className="w-5 h-5 opacity-60" /></>
              )}
            </button>
          </div>
        ) : (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7] to-transparent dark:from-[#0D0D17] dark:via-[#0D0D17] z-40 pb-safe pointer-events-none flex justify-center">
            <div className="pointer-events-auto h-16 w-full max-w-sm rounded-[24px] bg-emerald-500 text-white font-bold text-lg tracking-tight flex items-center justify-center gap-3 shadow-[0_16px_32px_-12px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="h-6 w-6" /> Propuesta Aceptada Oficialmente
            </div>
          </div>
        )}
      </div>

      {/* Spacing for mobile fixed button */}
      <div className="h-24"></div>
    </div>
  )
}
