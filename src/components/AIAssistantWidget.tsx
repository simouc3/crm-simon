import { useState, useEffect } from 'react';
import { Orbit, Key, Mail, Activity, Lock, Loader2, Mic, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '../lib/supabase/client';
import { getGeminiKey, getAIModel } from '../lib/ai/config';

export function AIAssistantWidget({ deal, onNewActivity }: { deal: any, onNewActivity?: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string, type?: string }[]>(() => {
    const saved = localStorage.getItem(`ai_deal_chat_${deal.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [loadingType, setLoadingType] = useState<'summary'|'email'|'voice'|null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(`ai_deal_chat_${deal.id}`, JSON.stringify(chatHistory));
  }, [chatHistory, deal.id]);

  // Cargar llave desde localStorage al montar
  useEffect(() => {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) {
      setApiKey(stored);
      setHasKey(true);
    } else {
      setApiKey(getGeminiKey()); // Usar la default si no hay almacenada
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
    setChatHistory([]);
  };

  const fetchActivities = async () => {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('deal_id', deal.id)
      .order('created_at', { ascending: false });
    return data || [];
  };

  const callGemini = async (prompt: string, type: 'summary' | 'email', userPrompt?: string) => {
    setLoadingType(type);
    if (userPrompt) {
      setChatHistory(prev => [...prev, { role: 'user', content: userPrompt, type }]);
    }
    try {
      const apiKeyToUse = getGeminiKey();
      const model = getAIModel(apiKeyToUse);
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      setChatHistory(prev => [...prev, { role: 'assistant', content: text, type }]);
      
      // Auto-guardar como actividad tipo IA
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('activities').insert([{
          deal_id: deal.id,
          user_id: user.id,
          title: type === 'summary' ? 'Análisis Estratégico CORE' : 'Borrador Guardado por CORE',
          activity_type: type === 'summary' ? 'REUNION' : 'CORREO',
          completed: true,
          notes: text,
          scheduled_at: new Date().toISOString()
        }]);
        if (onNewActivity) onNewActivity();
      }

    } catch (err: any) {
       const errMsg = err.message || '';
       if (errMsg.includes('API key expired') || errMsg.includes('API_KEY_INVALID')) {
         setChatHistory(prev => [...prev, { role: 'assistant', content: `❌ Tu clave de Gemini AI expiró o es inválida.\n\nPresiona el icono de candado 🔒 en la esquina de esta tarjeta para actualizar tu API Key secreta.`, type: 'error' }]);
       } else {
         setChatHistory(prev => [...prev, { role: 'assistant', content: `❌ Error IA: ${errMsg}`, type: 'error' }]);
       }
    } finally {
      setLoadingType(null);
    }
  };

  const handleSummarize = async () => {
    const activities = await fetchActivities();
    let prompt = `Actúa como un Director Comercial Estratégico experto en servicios industriales. 
1. 📈 DIAGNÓSTICO DE SALUD: ¿Cómo va el motor comercial según el Win Rate y el Ratio LTV:CAC?
2. ⚠️ ALERTA DE CONTINUIDAD: Identifica fugas en el embudo y cuellos de botella operativos.
3. 🎯 FOCO ESTRATÉGICO: ¿En qué segmentos de alta rentabilidad (clínico, alimentario, logístico) deberíamos redoblar esfuerzos?
4. 🚀 KPI PRIORITARIO: Una acción táctica obligatoria para subir el Win Rate un 5% esta semana.

Utiliza jerga industrial experta (ej: "SLA", "Continuidad Operacional", "Protocolos de Higiene Técnica") en un tono senior y resolutivo.

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
    
    callGemini(prompt, 'summary', "Generar resumen estratégico");
  };

  const handleEmailDraft = async () => {
     const activities = await fetchActivities();
     let prompt = `Actúa como un Consultor de Negocios Senior. Redacta un correo electrónico de seguimiento altamente persuasivo, impecablemente formal pero cercano (estilo corporativo moderno chileno). 
El objetivo es empoderar al cliente para que tome la decisión de cierre o agende la reunión determinante. Evita sonar como un vendedor genérico; firma como un "Socio Estratégico" que busca solucionar sus problemas operativos.

CRITERIOS:
- No uses [placeholders]. Escribe el texto completo, listo para copiar y enviar.
- Menciona beneficios específicos de limpieza técnica industrial/clínica según el contexto (SLA, cumplimiento normativo, seguridad de planta).
- Propón un "Próximo Paso" técnico y resolutivo.

Contexto:
Cliente: ${deal.companies?.razon_social || 'Prospecto'}
Proyecto: ${deal.nombre_proyecto || 'Servicio Corporativo'}
Etapa del Embudo (1-6): ${deal.stage}

Última actividad registrada (para guiar el correo): ${activities.length > 0 ? activities[0].notes : 'Ninguna'}`;
     
     callGemini(prompt, 'email', "Redactar borrador de correo");
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const processVoiceTranscript = async (text: string) => {
    setLoadingType('voice');
    setChatHistory(prev => [...prev, { role: 'user', content: `🎙️ Voz: ${text}`, type: 'voice' }]);
    try {
      const apiKeyToUse = getGeminiKey();
      const model = getAIModel(apiKeyToUse);
      
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
            activity_type: 'LLAMADA',
            completed: false,
            notes: 'Generado automáticamente por Gemini desde nota de voz en terreno.',
            scheduled_at: d.toISOString()
          }]);
         uiRespons += `\n\n✅ Se auto-agendó la tarea: "${parsed.titulo_tarea}" para los próximos días.`;
      }

      setChatHistory(prev => [...prev, { role: 'assistant', content: uiRespons, type: 'voice' }]);
      
      // 3. Analizar Riesgo con IA
      import("../lib/ai/AIPredictor").then(({ AIPredictor }) => {
        AIPredictor.analyzeFullDealRisk(deal.id);
      });

      if (onNewActivity) onNewActivity();

    } catch (err: any) {
       setChatHistory(prev => [...prev, { role: 'assistant', content: `Error procesando la nota con IA: ${err.message}`, type: 'error' }]);
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
      setChatHistory(prev => [...prev, { role: 'assistant', content: "🎙️ Grabando te escucho... (Habla claro y conciso)", type: 'voice' }]);
    };

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setIsRecording(false);
      await processVoiceTranscript(text);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };


  return (
    <div className="rounded-[40px] border border-border/30 dark:border-white/[0.06] bg-white dark:bg-[#1C1C1E] overflow-hidden shadow-sm dark:shadow-none hover:shadow-2xl transition-all duration-700 mb-6 group relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
      
      {/* Header */}
      <div className="p-8 border-b border-border/30 dark:border-white/[0.06] flex items-center justify-between bg-slate-50/30 dark:bg-white/[0.01]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[18px] bg-primary/10 flex items-center justify-center border border-primary/20">
            <Orbit className="h-6 w-6 text-primary animate-[spin_8s_linear_infinite]" />
          </div>
          <div>
            <h3 className="font-black text-[16px] tracking-tight dark:text-slate-100 uppercase">CORE AI</h3>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">Módulo de Apoyo Estratégico</p>
          </div>
        </div>
        
        {hasKey && !isConfiguring && (
          <Button variant="ghost" size="icon" onClick={() => setIsConfiguring(true)} className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-muted-foreground">
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
            <div className="grid grid-cols-1 gap-3">
               <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={handleSummarize} 
                    disabled={loadingType !== null}
                    className="w-full rounded-[24px] bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-foreground border border-black/[0.05] dark:border-white/[0.05] h-auto py-5 flex flex-col items-center justify-center gap-2 transition-all shadow-none"
                  >
                    {loadingType === 'summary' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Activity className="h-5 w-5 text-primary" />}
                    <span className="font-black text-[10px] uppercase tracking-wider">Análisis CORE</span>
                  </Button>
                  
                  <Button 
                    onClick={handleEmailDraft} 
                    disabled={loadingType !== null || isRecording}
                    className="w-full rounded-[24px] bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-foreground border border-black/[0.05] dark:border-white/[0.05] h-auto py-5 flex flex-col items-center justify-center gap-2 transition-all shadow-none"
                  >
                    {loadingType === 'email' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5 text-primary" />}
                    <span className="font-black text-[10px] uppercase tracking-wider">Borrador Email</span>
                  </Button>
               </div>
               
               <Button 
                onClick={handleVoiceNote} 
                disabled={loadingType !== null || isRecording}
                className={`w-full rounded-full border h-14 flex items-center justify-center gap-4 transition-all shadow-none ${isRecording ? 'bg-rose-500 text-white animate-pulse border-rose-600' : 'bg-primary text-white hover:bg-primary/90 border-transparent shadow-xl shadow-primary/20'}`}
               >
                 {loadingType === 'voice' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className={`h-5 w-5 ${isRecording ? 'animate-bounce' : ''}`} />}
                 <span className="font-black text-[11px] uppercase tracking-[0.2em]">{isRecording ? 'Escuchando Voz...' : 'Grabar Nota Técnica'}</span>
               </Button>
            </div>

            {chatHistory.length > 0 && (
              <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-500 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl text-[13px] leading-relaxed relative max-w-[90%] ${
                      msg.role === 'user' 
                        ? 'bg-slate-100 dark:bg-white/5 border border-border/20 text-muted-foreground italic' 
                        : 'bg-primary/5 dark:bg-primary/10 border border-primary/20 text-foreground shadow-sm'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="absolute top-2 right-2 flex gap-1 items-center">
                          <button 
                            onClick={() => copyToClipboard(msg.content, i)}
                            className="p-1 rounded-md hover:bg-primary/10 text-primary/50 hover:text-primary transition-colors"
                          >
                            {copiedIndex === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                          <div className="text-[8px] font-black uppercase tracking-widest text-primary/30 bg-primary/10 px-1.5 py-0.5 rounded-full">
                            {msg.type || 'Gemini'}
                          </div>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                    </div>
                  </div>
                ))}
                
                {chatHistory.some(m => m.role === 'assistant') && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                       if (confirm('¿Limpiar historial del copiloto?')) setChatHistory([]);
                    }}
                    className="w-full text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 hover:text-rose-500 transition-colors"
                  >
                    Borrar historial
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
