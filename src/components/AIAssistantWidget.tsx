import { useState, useEffect } from 'react';
import { Sparkles, Key, Mail, Activity, Check, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '../lib/supabase/client';

const API_URL = "https://api.openai.com/v1/chat/completions";

export function AIAssistantWidget({ deal, onNewActivity }: { deal: any, onNewActivity?: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  
  const [loadingType, setLoadingType] = useState<'summary'|'email'|null>(null);
  const [response, setResponse] = useState('');

  // Cargar llave desde localStorage al montar
  useEffect(() => {
    const stored = localStorage.getItem('openai_api_key');
    if (stored) {
      setApiKey(stored);
      setHasKey(true);
    } else {
      setIsConfiguring(true);
    }
  }, []);

  const saveKey = () => {
    if (apiKey.trim().length > 20) {
      localStorage.setItem('openai_api_key', apiKey.trim());
      setHasKey(true);
      setIsConfiguring(false);
    }
  };

  const removeKey = () => {
    localStorage.removeItem('openai_api_key');
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

  const callOpenAI = async (prompt: string, type: 'summary' | 'email') => {
    setLoadingType(type);
    setResponse('');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      
      const text = json.choices[0].message.content;
      setResponse(text);
      
      // Auto-guardar como actividad tipo IA
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('activities').insert([{
          deal_id: deal.id,
          user_id: user.id,
          title: type === 'summary' ? 'Resumen Ejecutivo AI' : 'Draft de Email Guardado (AI)',
          type: type === 'summary' ? 'Nota Interna' : 'Email',
          status: 'Completada',
          notes: text
        }]);
        if (onNewActivity) onNewActivity();
      }

    } catch (err: any) {
      setResponse(`Error: ${err.message || 'No se pudo conectar con OpenAI. Revisa tu API Key.'}`);
    } finally {
      setLoadingType(null);
    }
  };

  const handleSummarize = async () => {
    const activities = await fetchActivities();
    let prompt = `Eres un asistente ejecutivo de ventas B2B experto. Tu misión es leer el historial de este Negocio y devolver 2 cosas: 1) Un resumen sucinto en 2-3 líneas de estado. 2) Tres viñetas (bullet points) concretas sobre qué acciones debería tomar el vendedor inmediatamente.\n\nContexto del Negocio:\nCliente: ${deal.companies?.razon_social || 'Desconocido'}\nMonto: $${deal.valor_neto || 0}\nEtapa actual: ${deal.stage}\n\nHistorial Reciente de Actividades:\n`;
    
    if (activities.length === 0) {
      prompt += "No hay actividades registradas en este negocio.";
    } else {
      activities.slice(0, 10).forEach(a => {
        prompt += `- [${new Date(a.created_at).toLocaleDateString()}] ${a.title} (${a.type}): ${a.notes || ''}\n`;
      });
    }
    
    callOpenAI(prompt, 'summary');
  };

  const handleEmailDraft = async () => {
     const activities = await fetchActivities();
     let prompt = `Eres un asistente de ventas experto en B2B. Redacta un correo electrónico persuasivo, elegante y directo para enviárselo al cliente de este negocio con el objetivo de empujar el cierre o concretar una reunión clave. No uses placeholders o corchetes, redacta un texto que esté listo para enviar.\n\nContexto:\nCliente: ${deal.companies?.razon_social || 'Prospecto'}\nProyecto: ${deal.nombre_proyecto || 'Servicio Corporativo'}\nEtapa del Embudo (1-6): ${deal.stage}\n\nÚltima actividad registrada (para contexto): ${activities.length > 0 ? activities[0].notes : 'Ninguna'}`;
     
     callOpenAI(prompt, 'email');
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
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Impulsado por OpenAI</p>
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
                <p className="text-xs font-bold text-foreground">Conecta tu clave de API de OpenAI</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Tus llamadas saldrán directo desde tu navegador. La llave se guardará localmente (encriptada en localStorage).</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input 
                type="password" 
                placeholder="sk-proj-..........." 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)}
                className="rounded-full bg-slate-50 dark:bg-slate-800 border-border/50 h-10 px-4 text-xs font-mono"
              />
              <Button onClick={saveKey} className="rounded-full h-10 px-6 font-bold text-xs" disabled={apiKey.length < 20}>
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
            <div className="flex flex-wrap gap-3">
               <Button 
                onClick={handleSummarize} 
                disabled={loadingType !== null}
                className="flex-1 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 h-auto py-4 flex flex-col items-center justify-center gap-2 transition-all shadow-none"
               >
                 {loadingType === 'summary' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Activity className="h-5 w-5" />}
                 <span className="font-black text-[11px] uppercase tracking-wider">Resumir Historial</span>
               </Button>
               
               <Button 
                onClick={handleEmailDraft} 
                disabled={loadingType !== null}
                className="flex-1 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 h-auto py-4 flex flex-col items-center justify-center gap-2 transition-all shadow-none"
               >
                 {loadingType === 'email' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
                 <span className="font-black text-[11px] uppercase tracking-wider">Redactar Seguimiento</span>
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
