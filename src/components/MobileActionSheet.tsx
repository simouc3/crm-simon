import { useState, useRef, useEffect } from "react";
import { UserPlus, Camera, Mic } from "lucide-react";
import { QuickClientFormDialog } from "./QuickClientFormDialog";
import { VoiceRecorderModal } from "./VoiceRecorderModal";

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileActionSheet({ isOpen, onClose }: MobileActionSheetProps) {
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevenir scroll cuando el sheet está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCameraClick = () => {
    // Abre la cámara nativa del celular
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Logica de subida a supabase para la foto geolocalizada a Visita Técnica
      alert(`Foto "${file.name}" capturada. Falta enlazar a lógica de subida.`);
      onClose();
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div 
        className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-[#1C1C1E] transition-transform duration-300 ease-out translate-y-0"
        style={{
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          paddingBottom: 'env(safe-area-inset-bottom, 32px)'
        }}
      >
        {/* Grab Handle */}
        <div className="flex justify-center pt-3 pb-2 w-full" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="px-4 py-4 space-y-2">
          
          <button 
            onClick={() => { setShowQuickClient(true); onClose(); }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[0.98] transition-all text-left"
          >
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-[17px] text-foreground tracking-tight">Nuevo Cliente</div>
              <div className="text-[13px] text-muted-foreground font-medium">Añadir contacto rápido en terreno</div>
            </div>
          </button>

          <button 
            onClick={handleCameraClick}
            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[0.98] transition-all text-left"
          >
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center shrink-0">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-[17px] text-foreground tracking-tight">Subir Visita Técnica</div>
              <div className="text-[13px] text-muted-foreground font-medium">Tomar foto o elegir de la galería</div>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
          </button>

          <button 
            onClick={() => { setShowVoiceRecorder(true); onClose(); }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[0.98] transition-all text-left"
          >
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center shrink-0">
              <Mic className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-[17px] text-foreground tracking-tight">Nota de Voz con IA</div>
              <div className="text-[13px] text-muted-foreground font-medium">Grabar audio y detectar tareas</div>
            </div>
          </button>
          
        </div>

        <div className="px-4 pb-6 pt-2">
          <button 
            onClick={onClose}
            className="w-full h-14 bg-slate-100 dark:bg-white/10 text-foreground font-bold text-[17px] rounded-2xl hover:bg-slate-200 dark:hover:bg-white/20 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>

      <QuickClientFormDialog open={showQuickClient} onOpenChange={setShowQuickClient} />
      <VoiceRecorderModal open={showVoiceRecorder} onOpenChange={setShowVoiceRecorder} />
    </>
  );
}
