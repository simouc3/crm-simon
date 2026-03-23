import { useState, useEffect } from 'react';
import { Sparkles, Key, Mail, Activity, Check, Lock, Loader2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '../lib/supabase/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

export function AIAssistantWidget({ deal, onNewActivity }: { deal: any, onNewActivity?: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  
  const [loadingType, setLoadingType] = useState<'summary'|'email'|'voice'|null>(null);
  const [response, setResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Cargar llave desde localStorage al montar
  useEffect(() => {
    const defaultKey = "AIzaSyAF4O7kEc1Vj2LuWbbgB6uvUEPy1TrwjD0";
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) {
      setApiKey(stored);
      setHasKey(true);
    } else {
      // Inyectar la llave predeterminada entregada por el usuario
      setApiKey(defaultKey);
      setHasKey(true);
    }
  }, []);

  const saveKey = () => {
    if (apiKey.trim().startsWith('AIza') && apiKey.trim().length > 30) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setHasKey(true);
      setIsConfiguring(false);
    } else {
      alert('La clave de Gemini debe comenzar con "AIza" y tener la longitud correcta.');
    }
  };

  const removeKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setHasKey(false);
    setIsConfiguring(true);
    setResponse('');
  };

  const fetchActivities = async () => {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('deal_id', deal.id)
      .order('created_at', { ascending: false });
    return data || [];
  };

  const callGemini = async (prompt: string, type: 'summary' | 'email') => {
    setLoadingType(type);
    setResponse('');
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      setResponse(text);
      
      // Auto-guardar como actividad tipo IA
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('activities').insert([{
          deal_id: deal.id,
          user_id: user.id,
          title: type === 'summary' ? 'Resumen Ejecutivo AI (Gemini)' : 'Draft de Email Guardado (Gemini)',
          type: type === 'summary' ? 'Nota Interna' : 'Email',
          status: 'Completada',
          notes: text
        }]);
        if (onNewActivity) onNewActivity();
      }

    } catch (err: any) {
       const errMsg = err.message || '';
       if (errMsg.includes('API key expired') || errMsg.includes('API_KEY_INVALID')) {
         setResponse(`❌ Tu clave de Gemini AI expiró o es inválida.\n\nPresiona el icono de candado 🔒 en la esquina de esta tarjeta para actualizar tu API Key secreta.`);
       } else {
         setResponse(`❌ Error IA: ${errMsg}`);
       }
    } finally {
      setLoadingType(null);
    }
  };

  const handleSummarize = async () => {
    const activities = await fetchActivities();
    let prompt = `Actúa como un Director Comercial Estratégico experto en servicios industriales. Tu misión es analizar el historial de este Negocio y devolver un informe ejecutivo de alto nivel que incluya: 

1) ANÁLISIS DE SITUACIÓN: Resumen corto de dónde estamos parados.
2) GAP ANALYSIS: ¿Qué información o compromiso nos falta hoy para cerrar este trato? ($${deal.valor_neto || 0}).
3) PULSO DEL CLIENTE: Dolores detectados y nivel de urgencia percibida. 
4) HOJA DE RUTA: 3 acciones críticas para que el vendedor mueva el negocio al siguiente hito.

Utiliza un lenguaje profesional, directo y orientado a resultados.

Contexto del Negocio:
Cliente: ${deal.companies?.razon_social || 'Desconocido'}
Etapa actual: ${deal.stage} / 6

Historial Reciente de Actividades:
`;
    
    if (activities.length === 0) {
      prompt += "No hay actividades registradas en este negocio.";
    } else {
      activities.slice(0, 10).forEach(a => {
        prompt += `- [${new Date(a.created_at).toLocaleDateString()}] ${a.title} (${a.type}): ${a.notes || ''}\n`;
      });
    }
    
    callGemini(prompt, 'summary');
  };

  const handleEmailDraft = async () => {
     const activities = await fetchActivities();
     let prompt = `Actúa como un Consultor de Negocios Senior. Redacta un correo electrónico de seguimiento altamente persuasivo, impecablemente formal pero cercano (estilo corporativo moderno chileno). 
El objetivo es empoderar al cliente para que tome la decisión de cierre o agende la reunión determinante. Evita sonar como un vendedor genérico; firma como un "Socio Estratégico" que busca solucionar sus problemas operativos.

CRITERIOS:
- No uses [placeholders]. Escribe el texto completo, listo para copiar y enviar.
- Menciona beneficios específicos de limpieza técnica industrial/clínica según el contexto.
- Propón un "Call to Action" claro pero no presionante.

Contexto:
Cliente: ${deal.companies?.razon_social || 'Prospecto'}
Proyecto: ${deal.nombre_proyecto || 'Servicio Corporativo'}
Etapa del Embudo (1-6): ${deal.stage}

Última actividad registrada (para guiar el correo): ${activities.length > 0 ? activities[0].notes : 'Ninguna'}`;
     
     callGemini(prompt, 'email');
  };

  const processVoiceTranscript = async (text: string) => {
    setLoadingType('voice');
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `Alguien de ventas B2B recién dictó esta nota de terreno: "${text}".
Extrae si hay compromisos u obligaciones futuras. Devuelve estrictamente un JSON puro sin formato markdown, con esta estructura:
{
  "resumen_nota": "La nota redactada de forma profesional y clara corporativamente, corrigiendo posibles errores de dicción",
  "tiene_tarea": true o false,
  "titulo_tarea": "Títular corto de la tarea a realizar" o null,
  "dias_para_vencer": número de días estimado desde hoy para cumplirla o null
}`;

      const res = await model.generateContent(prompt);
      const rawText = res.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(rawText);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Guardar la Nota Mejorada
      let notesAdded = `🎙️ Nota de voz transcrita: "${text}"\n\n✨ Resumen IA: ${parsed.resumen_nota}`;
      await supabase.from('activities').insert([{
         deal_id: deal.id,
         user_id: user.id,
         title: 'Nota de Visita (Voz)',
         type: 'Nota Interna',
         status: 'Completada',
         notes: notesAdded
      }]);

      let uiRespons = `¡Nota de voz guardada y transcrita con éxito!\n\n${parsed.resumen_nota}`;

      // 2. Crear Tarea si la IA detecta que la hay
      if (parsed.tiene_tarea && parsed.titulo_tarea) {
         const d = new Date();
         d.setDate(d.getDate() + (parsed.dias_para_vencer || 1));
         await supabase.from('activities').insert([{
           deal_id: deal.id,
           user_id: user.id,
           title: parsed.titulo_tarea,
           type: 'Por Hacer',
           status: 'Pendiente',
           notes: 'Generado automáticamente por Gemini desde nota de voz en terreno.',
           start_date: d.toISOString()
         }]);
         uiRespons += `\n\n✅ Se auto-agendó la tarea: "${parsed.titulo_tarea}" para los próximos días.`;
      }

      setResponse(uiRespons);
      
      // 3. Analizar Riesgo con IA
      import("../lib/ai/AIPredictor").then(({ AIPredictor }) => {
        AIPredictor.analyzeActivityRisk(deal.id, text);
      });

      if (onNewActivity) onNewActivity();

    } catch (err: any) {
       setResponse(`Error procesando la nota con IA: ${err.message}`);
    } finally {
       setLoadingType(null);
    }
  };

  const handleVoiceNote = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta grabación de voz nativa.");
      return;
    }
    
    if (isRecording) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CL';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setResponse("🎙️ Grabando te escucho... (Habla claro y conciso)");
    };

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setIsRecording(false);
      setResponse(`Procesando nota de voz transcrita: "${text}"...`);
      await processVoiceTranscript(text);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };


  return (
    <div className="rounded-[32px] border border-border/30 dark:border-white/[0.06] bg-white dark:bg-[#1C1C1E] overflow-hidden shadow-sm dark:shadow-none hover:shadow-xl transition-shadow duration-500 mb-6 group relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
      
      {/* Header */}
      <div className="p-6 border-b border-border/30 dark:border-white/[0.06] flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-[15px] tracking-tight dark:text-slate-100 uppercase">Copiloto AI</h3>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Impulsado por Google Gemini</p>
          </div>
        </div>
        
        {hasKey && !isConfiguring && (
          <Button variant="ghost" size="icon" onClick={() => setIsConfiguring(true)} className="h-8 w-8 rounded-full hover:bg-slate-200 dark:hover:bg-[#2C2C2E] text-muted-foreground">
            <Lock className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="p-6 relative z-10">
        {isConfiguring || !hasKey ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-border/30">
              <Key className="h-8 w-8 text-primary shrink-0 opacity-50" />
              <div>
                <p className="text-xs font-bold text-foreground">Conecta tu clave Gemini API</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Consigue tu llave gratis en Google AI Studio. Se guardará de forma segura en tu propio navegador.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input 
                type="password" 
                placeholder="AIzaSy..." 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)}
                className="rounded-full bg-slate-50 dark:bg-slate-800 border-border/50 h-10 px-4 text-xs font-mono"
              />
              <Button onClick={saveKey} className="rounded-full h-10 px-6 font-bold text-xs" disabled={apiKey.length < 10}>
                 Conectar
              </Button>
              {hasKey && (
                <Button variant="ghost" onClick={() => setIsConfiguring(false)} className="rounded-full h-10 w-10 p-0 shrink-0 text-muted-foreground">
                   x
                </Button>
              )}
            </div>
            {hasKey && (
              <Button variant="ghost" onClick={removeKey} className="w-full text-rose-500 h-8 text-[11px] font-bold rounded-full">
                Eliminar llave almacenada
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <Button 
                onClick={handleSummarize} 
                disabled={loadingType !== null}
                className="w-full rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 h-auto py-4 flex flex-col items-center justify-center gap-2 transition-all shadow-none"
               >
                 {loadingType === 'summary' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Activity className="h-5 w-5" />}
                 <span className="font-black text-[11px] uppercase tracking-wider">Resumir Historial</span>
               </Button>
               
               <Button 
                onClick={handleEmailDraft} 
                disabled={loadingType !== null || isRecording}
                className="w-full rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 h-auto py-4 flex flex-col items-center justify-center gap-2 transition-all shadow-none"
               >
                 {loadingType === 'email' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
                 <span className="font-black text-[11px] uppercase tracking-wider">Redactar Seguimiento</span>
               </Button>
               
               <Button 
                onClick={handleVoiceNote} 
                disabled={loadingType !== null || isRecording}
                className={`w-full rounded-2xl border h-auto py-4 flex flex-col items-center justify-center gap-2 transition-all shadow-none ${isRecording ? 'bg-rose-500 text-white animate-pulse border-rose-600' : 'bg-slate-100 dark:bg-[#2C2C2E] hover:bg-slate-200 text-foreground border-border/40'}`}
               >
                 {loadingType === 'voice' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className={`h-5 w-5 ${isRecording ? 'animate-bounce' : ''}`} />}
                 <span className="font-black text-[11px] uppercase tracking-wider">{isRecording ? 'Escuchando...' : 'Grabar Nota en Terreno'}</span>
               </Button>
            </div>

            {response && (
              <div className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/50 border border-border/40 prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed relative">
                  <div className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-widest text-indigo-500/50 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                    Respuesta Simulada
                  </div>
                  <div className="whitespace-pre-wrap font-medium pt-3">{response}</div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center font-bold mt-3 opacity-50 flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> Este texto se ha guardado en el historial de actividades automáticamente.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
