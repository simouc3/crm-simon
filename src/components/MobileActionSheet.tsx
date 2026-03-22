import { useState, useRef, useEffect } from "react";
import { UserPlus, Camera, Mic } from "lucide-react";
import { supabase } from "../lib/supabase/client";
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

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getLatestDeal = async () => {
    const { data } = await supabase.from('deals').select('id, title, companies(razon_social)').order('updated_at', { ascending: false }).limit(1).single();
    return data;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Alert simple nativo para PWA UX rápida
      alert("📸 Subiendo foto...");
      
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      // 2. Subir al bucket 'evidencias' (debe estar creado y público en Supabase)
      const { error: uploadError } = await supabase.storage.from('evidencias').upload(filePath, file);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // 3. Obtener contexto
      const { data: { user } } = await supabase.auth.getUser();
      const latestDeal = await getLatestDeal();
      
      if (user && latestDeal) {
        // 4. Crear actividad tipo visita y enlazar la URL en MD
        await supabase.from('activities').insert([{
           deal_id: latestDeal.id,
           user_id: user.id,
           title: 'Visita Técnica (Foto)',
           type: 'Visita',
           status: 'Completada',
           notes: `Captura en Terreno:\n\n<img src="${publicUrl}" alt="Visita Terreno" style="max-width:100%; border-radius:12px; margin-top:10px;" />`
        }]);
      }

      alert("✅ ¡Foto guardada y enlazada al último negocio modificado!");
      onClose();

    } catch (err: any) {
      alert("❌ Error: " + err.message + "\n\n(Revisar si el Bucket 'evidencias' está creado).");
    }
  };

  return (
    <>
      <div 
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-all duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
        {/* Left Button - Nuevo Cliente */}
        <button 
          onClick={() => { setShowQuickClient(true); onClose(); }}
          className={`absolute flex flex-col items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'opacity-100 translate-x-[-100px] translate-y-[-100px] scale-100 pointer-events-auto' : 'opacity-0 translate-x-0 translate-y-0 scale-50 pointer-events-none'}`}
        >
          <div className="w-14 h-14 bg-white dark:bg-[#2C2C2E] border border-border/10 rounded-full flex items-center justify-center text-blue-500 shadow-xl hover:scale-110 active:scale-95 transition-transform">
            <UserPlus className="h-6 w-6" />
          </div>
          <span className="text-[10px] font-black tracking-tight text-white bg-black/60 px-2 py-1 rounded-full backdrop-blur-md">Cliente</span>
        </button>

        {/* Center Button - Mic / IA */}
        <button 
          onClick={() => { setShowVoiceRecorder(true); onClose(); }}
          className={`absolute flex flex-col items-center gap-2 transition-all duration-500 delay-75 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'opacity-100 translate-x-[-28px] translate-y-[-140px] scale-100 pointer-events-auto' : 'opacity-0 translate-x-[-28px] translate-y-0 scale-50 pointer-events-none'}`}
        >
           <div className="w-16 h-16 bg-white dark:bg-[#2C2C2E] border border-border/10 rounded-full flex items-center justify-center text-purple-600 shadow-xl hover:scale-110 active:scale-95 transition-transform">
            <Mic className="h-7 w-7" />
          </div>
          <span className="text-[10px] font-black tracking-tight text-white bg-black/60 px-2 py-1 rounded-full backdrop-blur-md">Audio IA</span>
        </button>

        {/* Right Button - Camera */}
        <button 
          onClick={handleCameraClick}
          className={`absolute flex flex-col items-center gap-2 transition-all duration-500 delay-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'opacity-100 translate-x-[44px] translate-y-[-100px] scale-100 pointer-events-auto' : 'opacity-0 translate-x-0 translate-y-0 scale-50 pointer-events-none'}`}
        >
          <div className="w-14 h-14 bg-white dark:bg-[#2C2C2E] border border-border/10 rounded-full flex items-center justify-center text-emerald-500 shadow-xl hover:scale-110 active:scale-95 transition-transform">
            <Camera className="h-6 w-6" />
          </div>
          <span className="text-[10px] font-black tracking-tight text-white bg-black/60 px-2 py-1 rounded-full backdrop-blur-md">Cámara</span>
          <input 
            type="file" accept="image/*" capture="environment" 
            className="hidden" ref={fileInputRef} onChange={handleFileChange}
          />
        </button>
      </div>

      <QuickClientFormDialog open={showQuickClient} onOpenChange={setShowQuickClient} />
      <VoiceRecorderModal open={showVoiceRecorder} onOpenChange={setShowVoiceRecorder} />
    </>
  );
}
