import { useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

export function VoiceRecorderModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState('');

  // Fetch nearest or latest deal context
  const getLatestDeal = async () => {
    // Si no tenemos geolocalización, usamos el último negocio tocado
    const { data } = await supabase.from('deals').select('id, title, companies(razon_social)').order('updated_at', { ascending: false }).limit(1).single();
    return data;
  }

  const processVoiceTranscript = async (text: string) => {
    setLoading(true);
    try {
      const defaultKey = "AIzaSyAF4O7kEc1Vj2LuWbbgB6uvUEPy1TrwjD0";
      const apiKey = localStorage.getItem('gemini_api_key') || defaultKey;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `Alguien de ventas dictó esta nota de terreno: "${text}". Extrae si hay tareas. Formato JSON estricto sin markdown: { "resumen_nota": "texto formal", "tiene_tarea": true o false, "titulo_tarea": "nombre corto", "dias_vencer": numero de dias }`;

      const res = await model.generateContent(prompt);
      const rawText = res.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(rawText);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const latestDeal = await getLatestDeal();
      const dealId = latestDeal?.id || null;
      const companyInfo = Array.isArray(latestDeal?.companies) ? latestDeal?.companies[0] : latestDeal?.companies;
      const dealName = (companyInfo as any)?.razon_social || 'Desconocido';

      let notesAdded = `🎙️ Transcrito: "${text}"\n\n✨ Resumen IA: ${parsed.resumen_nota}`;
      
      if (dealId) {
          await supabase.from('activities').insert([{
             deal_id: dealId,
             user_id: user.id,
             title: `Nota Terreno`,
             type: 'Nota Interna',
             status: 'Completada',
             notes: notesAdded
          }]);
      }

      let uiRes = `Guardado con éxito en ${dealName}.\n\n${parsed.resumen_nota}`;

      if (parsed.tiene_tarea && parsed.titulo_tarea && dealId) {
         const d = new Date();
         d.setDate(d.getDate() + (parsed.dias_vencer || 1));
         await supabase.from('activities').insert([{
           deal_id: dealId,
           user_id: user.id,
           title: parsed.titulo_tarea,
           type: 'Por Hacer',
           status: 'Pendiente',
           notes: 'Auto-generado por IA (Nota global)',
           start_date: d.toISOString()
         }]);
         uiRes += `\n\n✅ Tarea auto-agendada: "${parsed.titulo_tarea}"`;
      }

      setResponseMsg(uiRes);
    } catch (err: any) {
       const errMsg = err.message || '';
       if (errMsg.includes('API key expired') || errMsg.includes('API_KEY_INVALID')) {
         setResponseMsg(`❌ Tu clave de Gemini AI expiró o es inválida.\n\nAbre cualquier negocio, ve a la tarjeta "Copiloto AI", presiona el candado 🔒 y actualiza tu API Key secreta.`);
       } else {
         setResponseMsg(`❌ Error IA: ${errMsg}`);
       }
    } finally {
       setLoading(false);
    }
  };

  const handleStart = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setResponseMsg("⚠️ Ojo: Tu dispositivo (ej. iPhone antiguo o Safari cerrado) no permite aún capturar audio directo por web. Inténtalo usando Chrome o revisa los permisos de tu celular.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CL';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setResponseMsg("🎤 Grabando... Te escucho claro.");
    };

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setIsRecording(false);
      setResponseMsg(`🧠 Procesando tu voz con Inteligencia Artificial...\n\n"${text}"`);
      await processVoiceTranscript(text);
    };

    recognition.onerror = (e: any) => { 
      setIsRecording(false); 
      setResponseMsg(`❌ Audio interrumpido (${e.error}). Toca para reintentar.`);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md transition-opacity" onClick={() => onOpenChange(false)} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm z-[80] bg-white dark:bg-[#1C1C1E] rounded-[40px] p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
        
        <div className="absolute top-4 right-4">
          <button onClick={() => onOpenChange(false)} className="w-8 h-8 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center text-muted-foreground font-black text-xs hover:bg-slate-200">X</button>
        </div>

        <div className="w-20 h-20 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center mb-6 relative">
           {isRecording && <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />}
           <Mic className={`h-10 w-10 ${isRecording ? 'animate-bounce text-purple-600' : ''}`} />
        </div>

        <h2 className="text-2xl font-black tracking-tight mb-2">Dictado B2B</h2>
        <p className="text-sm font-medium text-muted-foreground mb-8">Graba una nota verbal. Gemini se encargará de extraer tareas y adjuntarla al negocio más reciente.</p>

        {responseMsg ? (
          <div className="w-full p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-border/10 text-[13px] font-medium text-left whitespace-pre-wrap mb-6 leading-relaxed">
            {responseMsg}
          </div>
        ) : null}

        <button 
          onClick={handleStart} 
          disabled={loading || isRecording}
          className={`w-full h-16 rounded-[24px] font-black text-white text-[17px] transition-all flex items-center justify-center gap-2 ${isRecording ? 'bg-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)]' : 'bg-foreground hover:bg-foreground/90'}`}
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (isRecording ? 'Escuchando...' : 'Presiona para Hablar')}
        </button>
      </div>
    </>
  )
}
