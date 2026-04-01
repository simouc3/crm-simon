import { useState } from "react"
import { UserPlus, Mic, Briefcase } from "lucide-react"
import { QuickClientFormDialog } from "./QuickClientFormDialog"
import { VoiceRecorderModal } from "./VoiceRecorderModal"
import { DealFormDialog } from "./DealFormDialog"

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function MobileActionSheet({ isOpen, onClose }: Props) {
  const [showQuickClient, setShowQuickClient] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [showDealForm, setShowDealForm] = useState(false)

  return (
    <>
      {/* Backdrop with High-Fidelity Blur - Apple 2026 Style */}
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-[12px] z-50 transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* The Abanico (Fan) Container */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
        
        {/* Left Action: Nuevo Cliente */}
        <button 
          onClick={() => { setShowQuickClient(true); onClose(); }}
          className={`absolute flex flex-col items-center gap-3 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'opacity-100 translate-x-[-130px] translate-y-[-20px] scale-100 pointer-events-auto' : 'opacity-0 translate-x-0 translate-y-0 scale-50 pointer-events-none'}`}
        >
          <div className="w-14 h-14 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-full flex items-center justify-center text-blue-500 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-95 transition-transform">
            <UserPlus className="h-6 w-6" />
          </div>
          <span className={`text-[10px] font-black tracking-[0.2em] uppercase text-white/90 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-2xl transition-all duration-500 delay-200 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            Cliente
          </span>
        </button>

        {/* Center Action: Audio IA (Featured) */}
        <button 
          onClick={() => { setShowVoiceRecorder(true); onClose(); }}
          className={`absolute flex flex-col items-center gap-4 transition-all duration-600 delay-75 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'opacity-100 translate-x-[-40px] translate-y-[-180px] scale-110 pointer-events-auto' : 'opacity-0 translate-x-[-40px] translate-y-0 scale-50 pointer-events-none'}`}
        >
           <div className="w-20 h-20 bg-purple-600 dark:bg-purple-500 border-4 border-white/20 rounded-full flex items-center justify-center text-white shadow-[0_30px_70px_-15px_rgba(147,51,234,0.5)] hover:scale-110 active:scale-95 transition-transform">
            <Mic className="h-10 w-10" />
          </div>
          <span className={`text-[11px] font-black tracking-[0.25em] uppercase text-purple-100 bg-purple-900/80 backdrop-blur-2xl px-5 py-2.5 rounded-full border border-purple-400/30 shadow-[0_10px_40px_rgba(147,51,234,0.3)] transition-all duration-500 delay-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            Audio IA
          </span>
        </button>

        {/* Right Action: Nuevo Negocio (Strategic Operational Replacement) */}
        <button 
          onClick={() => { setShowDealForm(true); onClose(); }}
          className={`absolute flex flex-col items-center gap-3 transition-all duration-500 delay-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'opacity-100 translate-x-[58px] translate-y-[-20px] scale-100 pointer-events-auto' : 'opacity-0 translate-x-0 translate-y-0 scale-50 pointer-events-none'}`}
        >
          <div className="w-14 h-14 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-full flex items-center justify-center text-emerald-500 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-95 transition-transform">
            <Briefcase className="h-6 w-6" />
          </div>
          <span className={`text-[10px] font-black tracking-[0.2em] uppercase text-white/90 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-2xl transition-all duration-500 delay-400 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            Negocio
          </span>
        </button>
      </div>

      {/* Dialogs */}
      <QuickClientFormDialog 
        open={showQuickClient} 
        onOpenChange={setShowQuickClient} 
      />

      <VoiceRecorderModal
        open={showVoiceRecorder}
        onOpenChange={setShowVoiceRecorder}
      />

      <DealFormDialog
        open={showDealForm}
        onOpenChange={setShowDealForm}
      />
    </>
  );
}
