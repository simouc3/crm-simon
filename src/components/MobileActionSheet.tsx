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
    const { data } = await supabase
      .from('deals')
      .select('id, title, companies(id, razon_social)')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    return data as any;
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
      
      if (user) {
        // 4. Crear actividad tipo visita y enlazar la URL en MD
        // Si no hay deal, creamos una actividad general
        const activityData = {
          user_id: user.id,
          title: 'Captura de Terreno (Foto)',
          type: 'Visita',
          status: 'Completada',
          notes: `Imagen capturada:\n\n<img src="${publicUrl}" alt="Visita Terreno" style="max-width:100%; border-radius:12px; margin-top:10px;" />`,
          scheduled_at: new Date().toISOString()
        };

        if (latestDeal) {
          (activityData as any).deal_id = latestDeal.id;
          (activityData as any).company_id = latestDeal.companies?.id || (Array.isArray(latestDeal.companies) ? latestDeal.companies[0]?.id : null);
        }

        const { error: activityError } = await supabase.from('activities').insert([activityData]);
        
        if (activityError) {
          console.warn("Error vinculando actividad:", activityError);
          alert("📸 Foto subida, pero hubo un error al crear la actividad: " + activityError.message);
        } else {
          const companyName = latestDeal?.companies?.razon_social || (Array.isArray(latestDeal?.companies) ? latestDeal?.companies[0]?.razon_social : null);
          alert(latestDeal 
            ? `✅ ¡Foto guardada en: ${companyName || 'Negocio'}!` 
            : "✅ ¡Foto guardada como actividad general!");
        }
      }

      onClose();

    } catch (err: any) {
      console.error("Critical upload error:", err);
      alert("❌ Error: " + err.message + "\n\n(Asegúrate de tener conexión y que el bucket 'evidencias' exista en Supabase).");
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
          <span className="text-[10px] font-black tracking-tight glass-island px-3 py-1 rounded-full shadow-sm">Cliente</span>
        </button>

        {/* Center Button - Mic / IA */}
        <button 
          onClick={() => { setShowVoiceRecorder(true); onClose(); }}
          className={`absolute flex flex-col items-center gap-2 transition-all duration-500 delay-75 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'opacity-100 translate-x-[-28px] translate-y-[-140px] scale-100 pointer-events-auto' : 'opacity-0 translate-x-[-28px] translate-y-0 scale-50 pointer-events-none'}`}
        >
           <div className="w-16 h-16 bg-white dark:bg-[#2C2C2E] border border-border/10 rounded-full flex items-center justify-center text-purple-600 shadow-xl hover:scale-110 active:scale-95 transition-transform">
            <Mic className="h-7 w-7" />
          </div>
          <span className="text-[10px] font-black tracking-tight glass-island px-3 py-1 rounded-full shadow-sm">Audio IA</span>
        </button>

        {/* Right Button - Camera */}
        <button 
          onClick={handleCameraClick}
          className={`absolute flex flex-col items-center gap-2 transition-all duration-500 delay-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'opacity-100 translate-x-[44px] translate-y-[-100px] scale-100 pointer-events-auto' : 'opacity-0 translate-x-0 translate-y-0 scale-50 pointer-events-none'}`}
        >
          <div className="w-14 h-14 bg-white dark:bg-[#2C2C2E] border border-border/10 rounded-full flex items-center justify-center text-emerald-500 shadow-xl hover:scale-110 active:scale-95 transition-transform">
            <Camera className="h-6 w-6" />
          </div>
          <span className="text-[10px] font-black tracking-tight glass-island px-3 py-1 rounded-full shadow-sm">Cámara</span>
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
