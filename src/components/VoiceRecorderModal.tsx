import { useState, useEffect } from "react";
import { Mic, Loader2, CheckCircle2, Building2 } from "lucide-react";
import { supabase } from "../lib/supabase/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

export function VoiceRecorderModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [recentDeals, setRecentDeals] = useState<any[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string>('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [stage, setStage] = useState<'select' | 'recording' | 'processing' | 'review'>('select');
  
  const [transcript, setTranscript] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [detectedTasks, setDetectedTasks] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      resetState();
      fetchRecentDeals();
    }
  }, [open]);

  const resetState = () => {
    setStage('select');
    setTranscript('');
    setSummaryText('');
    setDetectedTasks([]);
    setIsRecording(false);
    setErrorMsg('');
    setIsSaving(false);
  };

  const fetchRecentDeals = async () => {
    const { data } = await supabase.from('deals')
      .select('id, title, companies(razon_social)')
      .order('updated_at', { ascending: false })
      .limit(3);
    
    if (data && data.length > 0) {
      setRecentDeals(data);
      setSelectedDealId(data[0].id);
    }
  };

  const processVoiceTranscript = async (text: string) => {
    setStage('processing');
    try {
      const defaultKey = "AIzaSyAF4O7kEc1Vj2LuWbbgB6uvUEPy1TrwjD0";
      const apiKey = localStorage.getItem('gemini_api_key') || defaultKey;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `Eres un excelente asistente comercial B2B. Escucha/lee la siguiente nota dictada en terreno y devuelve una respuesta estrictamente en formato JSON plano (SIN MARKDOWN NI COMILLAS INVERTIDAS) con la siguiente estructura: 
{
  "transcripcion": "el texto literal corregido ortográficamente", 
  "resumen": ["punto clave 1", "dolor principal 2", "punto 3"], 
  "tareas": [{"accion": "titulo corto", "fecha_limite": "cuándo (ej: mañana, en 3 días)", "urgencia": "ALTA|MEDIA|BAJA"}]
}

Nota dictada: "${text}"`;

      const res = await model.generateContent(prompt);
      const rawText = res.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(rawText);
      
      setTranscript(parsed.transcripcion || text);
      const bulletSummary = (parsed.resumen || []).map((r: string) => `• ${r}`).join('\n');
      setSummaryText(bulletSummary);
      setDetectedTasks(parsed.tareas || []);
      
      setStage('review');
    } catch (err: any) {
       setErrorMsg(`Error procesando con Inteligencia Artificial. Por favor intenta grabar de nuevo. Detalle: ${err.message}`);
       setStage('select');
    }
  };

  const handleStartRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg("⚠️ Tu dispositivo no permite captura de voz web nativa. Intenta usar Google Chrome o revisa tus permisos.");
      return;
    }
    setErrorMsg('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CL';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setStage('recording');
      setIsRecording(true);
    };

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setIsRecording(false);
      await processVoiceTranscript(text);
    };

    recognition.onerror = (e: any) => { 
      setIsRecording(false); 
      setStage('select');
      setErrorMsg(`❌ Audio interrumpido (${e.error}). Toca grabar para reintentar.`);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  }

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no iniciada");

      // 1. Guardar Nota Resumen
      const finalNote = `🎙️ Transcripción:\n${transcript}\n\n✨ Puntos Clave Generados por IA:\n${summaryText}`;
      
      await supabase.from('activities').insert([{
         deal_id: selectedDealId,
         user_id: user.id,
         title: `Nota de Terreno AI`,
         type: 'Nota Interna',
         status: 'Completada',
         notes: finalNote
      }]);

      // 2. Tareas
      for (const t of detectedTasks) {
         let d = new Date();
         d.setDate(d.getDate() + 1); // Default to tomorrow, parsing natural language dates is tricky without real NLP, so we rely on context or default +1 for MVP
         if (t.fecha_limite && t.fecha_limite.toLowerCase().includes('hoy')) d = new Date();
         if (t.fecha_limite && t.fecha_limite.toLowerCase().includes('semana')) d.setDate(d.getDate() + 7);

         await supabase.from('activities').insert([{
           deal_id: selectedDealId,
           user_id: user.id,
           title: `[${t.urgencia}] ${t.accion}`,
           type: 'Por Hacer',
           status: 'Pendiente',
           notes: `Agendado por IA. Sugerencia original: ${t.fecha_limite}`,
           start_date: d.toISOString()
         }]);
      }

      setIsSaving(false);
      onOpenChange(false);
      // Optional: window.location.reload() or soft refresh
      alert("✅ Historial y Tareas auto-agendadas exitosamente en el negocio.");
    } catch (err: any) {
      alert("Error guardando en la BD: " + err.message);
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md transition-opacity" onClick={() => onOpenChange(false)} />
      <div className={`fixed bottom-0 left-0 right-0 z-[80] bg-white dark:bg-[#1C1C1E] rounded-t-[32px] p-6 shadow-2xl transition-transform duration-300 ease-out max-h-[90vh] overflow-y-auto ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        
        {/* Header Slider */}
        <div className="flex justify-center mb-6" onClick={() => onOpenChange(false)}>
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>

        {errorMsg && (
          <div className="mb-4 p-4 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-200 dark:border-rose-500/20">
            {errorMsg}
          </div>
        )}

        {(stage === 'select' || stage === 'recording') && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-black tracking-tight mb-1">Nueva Nota Terreno</h2>
              <p className="text-sm font-medium text-muted-foreground">Elija el negocio destino y el Asistente AI extraerá la información.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Vincular al negocio:</label>
              <div className="flex flex-col gap-2">
                {recentDeals.map(d => (
                  <button 
                    key={d.id}
                    onClick={() => setSelectedDealId(d.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${selectedDealId === d.id ? 'border-primary bg-primary/5' : 'border-border/50 bg-slate-50 dark:bg-white/5'}`}
                  >
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedDealId === d.id ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-muted-foreground'}`}>
                       <Building2 className="h-5 w-5" />
                     </div>
                     <div className="text-left overflow-hidden">
                       <div className="font-bold text-[15px] truncate text-foreground">{Array.isArray(d.companies) ? d.companies[0]?.razon_social : d.companies?.razon_social}</div>
                       <div className="text-xs font-bold text-muted-foreground truncate opacity-70">{d.title}</div>
                     </div>
                     {selectedDealId === d.id && <CheckCircle2 className="h-6 w-6 text-primary ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-center">
               <button 
                 onClick={handleStartRecording} 
                 disabled={isRecording}
                 className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl ${isRecording ? 'bg-rose-500 scale-110 animate-pulse' : 'bg-foreground hover:scale-105 active:scale-95'}`}
               >
                  <Mic className={`h-10 w-10 text-background ${isRecording ? 'animate-bounce' : ''}`} />
               </button>
            </div>
            {isRecording && <p className="text-center font-bold text-rose-500 text-sm animate-pulse">Grabando... Di en voz alta todo tu análisis.</p>}
          </div>
        )}

        {stage === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16 animate-in zoom-in-95 duration-500">
             <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
                <Mic className="h-8 w-8 text-indigo-500" />
             </div>
             <h3 className="font-black text-xl mb-2">Construyendo Magia AI...</h3>
             <p className="text-sm font-medium text-muted-foreground text-center">Analizando transcripción y buscando tareas inmersivas.</p>
          </div>
        )}

        {stage === 'review' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div>
              <h2 className="text-xl font-black tracking-tight mb-1">Revisión AI</h2>
              <p className="text-sm font-medium text-muted-foreground">Revisa y edita los puntos antes de guardar de forma definitiva.</p>
             </div>

             <div className="space-y-2">
               <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Resumen Editable</label>
               <textarea 
                 value={summaryText}
                 onChange={e => setSummaryText(e.target.value)}
                 className="w-full h-32 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-[14px] font-medium leading-relaxed resize-none focus:ring-2 focus:ring-amber-500 outline-none text-foreground"
               />
             </div>

             {detectedTasks.length > 0 && (
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Tareas Detectadas ({detectedTasks.length})</label>
                 <div className="space-y-2">
                   {detectedTasks.map((t, i) => (
                     <div key={i} className="p-3 bg-white dark:bg-[#2C2C2E] rounded-xl border border-border/50 flex gap-3 shadow-sm">
                        <div className={`w-2 h-full min-h-[40px] rounded-full shrink-0 ${t.urgencia === 'ALTA' ? 'bg-rose-500' : t.urgencia === 'MEDIA' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <div>
                          <div className="font-bold text-sm text-foreground leading-tight">{t.accion}</div>
                          <div className="text-[11px] font-extrabold text-muted-foreground mt-1 tracking-wider uppercase">Auto-Agenda: {t.fecha_limite}</div>
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setStage('select')}
                  className="flex-1 h-14 bg-slate-100 dark:bg-white/10 rounded-2xl font-bold text-foreground hover:bg-slate-200"
                >
                  Regrabar
                </button>
                <button 
                  onClick={handleSaveToDatabase}
                  disabled={isSaving}
                  className="flex-[2] h-14 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <><CheckCircle2 className="h-5 w-5"/> Guardar e Inyectar</>}
                </button>
             </div>
          </div>
        )}

      </div>
    </>
  )
}
