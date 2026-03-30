import { useState } from 'react';
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Target, Lightbulb, Copy, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGeminiKey, getAIModel } from '../lib/ai/config';

interface DashboardAIInsightsProps {
  deals: any[];
  metrics: {
    ingresos: number;
    winRate: number;
    cac: number;
    ltv: number;
    propuestas: number;
  };
}

export function DashboardAIInsights({ deals, metrics }: DashboardAIInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiKey = getGeminiKey();
      const model = getAIModel(apiKey);

      const prompt = `Actúa como un Consultor de Estrategia de Negocios Senior especializado en Servicios Industriales B2B. 
Analiza los siguientes datos de rendimiento de mi empresa de limpieza industrial y genera un REPORTE ESTRATÉGICO EJECUTIVO.

DATOS DEL PERIODO:
- Ingresos Proyectados: $${metrics.ingresos.toLocaleString('es-CL')}
- Win Rate (Tasa de Cierre): ${metrics.winRate}%
- Costo de Adquisición (CAC): $${metrics.cac.toLocaleString('es-CL')}
- Lifetime Value (LTV): $${metrics.ltv.toLocaleString('es-CL')}
- Propuestas en Vuelo: ${metrics.propuestas}

CONTEXTO DE TRANSACCIONES:
${deals.slice(0, 10).map(d => `- ${d.companies?.razon_social || 'Negocio'}: $${(d.valor_neto || 0).toLocaleString('es-CL')} (Etapa: ${d.stage})`).join('\n')}

TU MISIÓN:
Genera un análisis en 4 puntos clave, usando un tono directo, corporativo y motivador:
1. 📈 DIAGNÓSTICO DE SALUD: ¿Cómo va el motor comercial según el Win Rate y el Ratio LTV:CAC?
2. ⚠️ ALERTA DE CONTINUIDAD: Identifica fugas en el embudo y cuellos de botella operativos.
3. 🎯 FOCO ESTRATÉGICO: ¿En qué segmentos de alta rentabilidad (clínico, alimentario, logístico) deberíamos redoblar esfuerzos?
4. 🚀 KPI PRIORITARIO: Una acción táctica obligatoria para subir el Win Rate un 5% esta semana.

Usa emojis de lucide-react (simbolizados por texto) y Markdown para estructura. Mantén el texto pulcro y profesional. Evita generalidades.`;

      const result = await model.generateContent(prompt);
      setInsight(result.response.text());
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el cerebro de la IA');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!insight) return;
    navigator.clipboard.writeText(insight);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group overflow-hidden rounded-[40px] border border-border/30 dark:border-white/[0.06] bg-white dark:bg-[#1C1C1E] p-8 transition-all duration-500 shadow-sm hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)]">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -mr-40 -mt-40 blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[22px] bg-indigo-500 shadow-xl shadow-indigo-500/20 flex items-center justify-center border border-white/20">
            <Sparkles className="h-7 w-7 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight dark:text-slate-100 uppercase">Consultor Estratégico AI</h3>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">Análisis Deep-BI con Google Gemini</p>
          </div>
        </div>

        {!insight ? (
          <Button 
            onClick={generateInsights} 
            disabled={loading}
            className="rounded-full h-12 px-8 font-black text-xs uppercase tracking-widest bg-foreground text-background hover:scale-105 transition-transform"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            {loading ? 'Analizando Datos...' : 'Generar Reporte Estratégico'}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setInsight(null)}
              className="rounded-full h-10 px-6 font-bold text-[10px] uppercase tracking-widest border-border/40"
            >
              Nuevo Análisis
            </Button>
            <Button 
              variant="outline" 
              onClick={copyToClipboard}
              className="rounded-full h-10 w-10 p-0 border-border/40"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-5 w-5 text-rose-500" />
          <p className="text-xs font-bold text-rose-600">{error}</p>
        </div>
      )}

      {insight && (
        <div className="mt-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Aquí simulamos una estructura limpia si la IA sigue el formato, o simplemente mostramos el texto */}
              <div className="col-span-2 bg-slate-50/50 dark:bg-white/[0.02] rounded-[32px] p-8 border border-border/20 dark:border-white/[0.04] relative overflow-hidden text-sm leading-loose whitespace-pre-wrap font-medium">
                <div className="absolute top-4 right-4 opacity-10">
                   <Target className="h-24 w-24" />
                </div>
                {insight}
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex items-center gap-2 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
             <Lightbulb className="h-5 w-5 text-indigo-500" />
             <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 italic">
               Este reporte es generado por IA basado en tus KPIs actuales. Úsalo como guía para tus próximas reuniones de directorio.
             </p>
          </div>
        </div>
      )}

      {!insight && !loading && (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700">
            <div className="space-y-2">
               <TrendingUp className="h-5 w-5" />
               <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Optimización de Win Rate</p>
            </div>
            <div className="space-y-2">
               <AlertTriangle className="h-5 w-5" />
               <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Detección de Fugas</p>
            </div>
            <div className="space-y-2">
               <Lightbulb className="h-5 w-5" />
               <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Oportunidades Escondidas</p>
            </div>
        </div>
      )}
    </div>
  );
}
