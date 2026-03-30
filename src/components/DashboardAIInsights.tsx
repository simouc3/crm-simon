import { useState } from 'react';
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb, Copy, Check, Zap } from 'lucide-react';
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
          <div className="col-span-2 bg-slate-50/50 dark:bg-white/[0.03] rounded-[40px] p-10 border border-border/20 dark:border-white/[0.06] relative overflow-hidden shadow-inner font-medium leading-relaxed">
            <div className="absolute top-6 right-6 opacity-[0.03] pointer-events-none">
               <Sparkles className="h-48 w-48 text-indigo-500" />
            </div>
            
            <div className="relative z-10 space-y-6 prose prose-indigo dark:prose-invert max-w-none">
              {insight.split('\n\n').map((paragraph, idx) => {
                const headerMatch = paragraph.match(/^(\d\.|📈|⚠️|🎯|🚀)\s+(.*)/);
                if (headerMatch) {
                  return (
                    <div key={idx} className="bg-white/40 dark:bg-black/20 p-6 rounded-[24px] border border-white/40 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow group/card">
                       <h4 className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2">
                         {headerMatch[1]} {headerMatch[2]}
                       </h4>
                       <div className="text-[13px] text-slate-600 dark:text-slate-300">
                         {paragraph.replace(/^\d\.|📈|⚠️|🎯|🚀.*?\n/, '')}
                       </div>
                    </div>
                  );
                }
                return <p key={idx} className="text-sm whitespace-pre-wrap">{paragraph}</p>;
              })}
            </div>
          </div>
          
          <div className="mt-8 flex items-center gap-3 p-5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-[24px] border border-indigo-500/20">
             <div className="bg-indigo-500 p-2 rounded-lg shadow-lg">
                <Lightbulb className="h-4 w-4 text-white" />
             </div>
             <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 italic opacity-80 leading-snug">
               Reporte generado bajo demanda. Esta estrategia se ajusta en tiempo real según tu flujo de caja y tasa de cierre actual.
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
