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
      {/* High-Fidelity Backdrop with softer translucency */}
      <div 
        className={`fixed inset-0 bg-white/20 dark:bg-black/40 backdrop-blur-[12px] z-[9998] transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Uniform Circular Menu - Apple 2026 Aesthetic */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
        
        {/* Left Action: Nuevo Cliente */}
        <button 
          onClick={() => { setShowQuickClient(true); onClose(); }}
          className={`absolute flex flex-col items-center gap-2.5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'opacity-100 translate-x-[-115px] translate-y-[-30px] scale-100 pointer-events-auto' : 'opacity-0 translate-x-0 translate-y-0 scale-50 pointer-events-none'}`}
        >
          <div className="w-14 h-14 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center text-foreground shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] hover:bg-slate-50 transition-colors">
            <UserPlus className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest text-foreground/50 bg-white/40 dark:bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/5 dark:border-white/5 transition-all duration-500 delay-100 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            Cliente
          </span>
        </button>

        {/* Center Action: Audio IA (Now uniform with others) */}
        <button 
          onClick={() => { setShowVoiceRecorder(true); onClose(); }}
          className={`absolute flex flex-col items-center gap-2.5 transition-all duration-500 delay-75 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'opacity-100 translate-x-[-28px] translate-y-[-140px] scale-100 pointer-events-auto' : 'opacity-0 translate-x-[-28px] translate-y-0 scale-50 pointer-events-none'}`}
        >
           <div className="w-14 h-14 bg-black dark:bg-white border-2 border-black/10 dark:border-white/10 rounded-full flex items-center justify-center text-white dark:text-black shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] transition-colors">
            <Mic className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest text-[#007AFF] bg-white/40 dark:bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/5 dark:border-white/5 transition-all duration-500 delay-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            Audio IA
          </span>
        </button>

        {/* Right Action: Nuevo Negocio */}
        <button 
          onClick={() => { setShowDealForm(true); onClose(); }}
          className={`absolute flex flex-col items-center gap-2.5 transition-all duration-500 delay-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'opacity-100 translate-x-[60px] translate-y-[-30px] scale-100 pointer-events-auto' : 'opacity-0 translate-x-0 translate-y-0 scale-50 pointer-events-none'}`}
        >
          <div className="w-14 h-14 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center text-foreground shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] hover:bg-slate-50 transition-colors">
            <Briefcase className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest text-foreground/50 bg-white/40 dark:bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/5 dark:border-white/5 transition-all duration-500 delay-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            Negocio
          </span>
        </button>
      </div>

      {/* Forms */}
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
