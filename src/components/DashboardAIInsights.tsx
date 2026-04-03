import { useState } from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Loader2, 
  AlertTriangle, 
  Copy, 
  Check,
  ArrowRight,
  Orbit,
  Cpu
} from 'lucide-react';
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
      if (!apiKey) {
        throw new Error("API Key no configurada. Por favor, revisa los ajustes del sistema.");
      }
      const model = getAIModel(apiKey);

      const prompt = `Actúa como un Consultor de Estrategia de Negocios Senior especializado en Servicios Industriales B2B. 
Analiza los siguientes datos de rendimiento de mi empresa de limpieza industrial y genera un REPORTE ESTRATÉGICO EJECUTIVO de alto impacto.

DATOS DEL PERIODO:
- Ingresos Proyectados: $${metrics.ingresos.toLocaleString('es-CL')}
- Win Rate (Tasa de Cierre): ${metrics.winRate}%
- Costo de Adquisición (CAC): $${metrics.cac.toLocaleString('es-CL')}
- Lifetime Value (LTV): $${metrics.ltv.toLocaleString('es-CL')}
- Propuestas en Vuelo: ${metrics.propuestas}

CONTEXTO DE TRANSACCIONES:
${deals.slice(0, 10).map(d => `- ${d.companies?.razon_social || 'Negocio'}: $${(d.valor_neto || 0).toLocaleString('es-CL')} (Etapa: ${d.stage})`).join('\n')}

TU MISIÓN:
Genera un análisis en 4 puntos clave estricta y únicamente con este formato (incluye el emoji al inicio):
1. 📈 DIAGNÓSTICO DE SALUD: [Análisis profundo del Win Rate y LTV:CAC]
2. ⚠️ ALERTA DE CONTINUIDAD: [Identifica fugas o riesgos en el funnel]
3. 🎯 FOCO ESTRATÉGICO: [Segmentos o acciones de alta rentabilidad]
4. 🚀 KPI PRIORITARIO: [La acción táctica número 1 para esta semana]

INSTRUCCIONES DE ESTILO:
- No uses introducciones largas. Ve al grano.
- Usa lenguaje corporativo de "C-Level".
- Usa negritas (**) para destacar cifras o conceptos críticos.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      setInsight(text);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con CORE AI');
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
    <div className="space-y-12">
      {/* Dashboard AI Branding Header (Apple-style Clean) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white dark:bg-[#1C1C1E] rounded-[48px] p-10 md:px-12 md:py-10 border border-black/[0.03] dark:border-white/[0.03] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden relative group">
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-primary/5 blur-[120px] rounded-full group-hover:bg-primary/10 transition-all duration-1000" />
        
        <div className="flex items-center gap-8 relative z-10">
          <div className="w-20 h-20 rounded-[32px] bg-slate-50 dark:bg-black flex items-center justify-center border border-black/[0.05] dark:border-white/[0.05] shadow-inner transition-transform duration-700 group-hover:scale-105">
            <div className="relative">
              <Orbit className="h-10 w-10 text-primary animate-[spin_10s_linear_infinite]" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              </div>
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-3xl md:text-4xl font-black text-foreground tracking-tighter leading-none">CORE <span className="text-primary">AI</span></h3>
            <p className="text-[12px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40 leading-none">Kernel de Inteligencia Estratégica</p>
          </div>
        </div>
        
        {!insight ? (
          <button
            onClick={generateInsights}
            disabled={loading}
            className="relative z-10 bg-primary text-white hover:bg-primary/90 px-10 py-5 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-2xl shadow-primary/20"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analizando...</span>
              </div>
            ) : (
              <>
                <Cpu className="h-4 w-4" />
                <span>Generar Informe de Núcleo</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex gap-2 relative z-10">
            <Button 
              variant="outline" 
              onClick={() => setInsight(null)}
              className="rounded-full h-10 px-6 font-black text-[10px] uppercase tracking-widest bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Nuevo Análisis
            </Button>
            <Button 
              variant="outline" 
              onClick={copyToClipboard}
              className="rounded-full h-10 w-10 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-6 rounded-[32px] bg-rose-500/10 border border-rose-500/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <p className="text-sm font-black text-rose-600 dark:text-rose-400 tracking-tight">{error}</p>
        </div>
      )}

      {/* Guide Cards (Visible when no insight) */}
      {!insight && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
           {[
             {
               label: 'CAC',
               title: 'Cost of Acquisition',
               desc: 'Indica cuánto estás invirtiendo en marketing para conseguir un cliente. Si este valor sube demasiado, tu rentabilidad se ve afectada.',
               icon: Target,
               color: 'text-blue-500',
               bg: 'bg-blue-500/5',
               border: 'border-blue-500/10'
             },
             {
               label: 'LTV',
               title: 'Lifetime Value',
               desc: 'Es la proyección de cuánto dinero dejará un cliente durante toda su relación con la empresa.',
               icon: TrendingUp,
               color: 'text-purple-500',
               bg: 'bg-purple-500/5',
               border: 'border-purple-500/10'
             },
             {
               label: 'Ratio 3x+',
               title: 'Escalabilidad',
               desc: 'Un ratio de 3x o superior indica un modelo de negocio saludable y escalable. Crucial para medir la salud financiera.',
               icon: BarChart3,
               color: 'text-emerald-500',
               bg: 'bg-emerald-500/5',
               border: 'border-emerald-500/10'
             }
           ].map((card, i) => (
             <div key={i} className={`p-8 rounded-[48px] border ${card.border} ${card.bg} flex flex-col gap-6 group hover:translate-y-[-8px] transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/5`}>
                <div className={`w-14 h-14 rounded-2xl ${card.bg} border ${card.border} flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm`}>
                   <card.icon className={`h-6 w-6 ${card.color}`} strokeWidth={2.5} />
                </div>
                <div className="space-y-2">
                   <h5 className={`text-xl font-black tracking-tighter ${card.color}`}>{card.label}</h5>
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 leading-none">{card.title}</p>
                   <p className="text-[13px] font-bold text-muted-foreground leading-relaxed pt-2">
                     {card.desc}
                   </p>
                </div>
                <div className="mt-auto pt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                  Saber más <ArrowRight className="h-3 w-3" />
                </div>
             </div>
           ))}
        </div>
      )}

       {/* Insight Result */}
      {insight && (
        <div className="animate-in fade-in zoom-in-95 duration-1000 font-sans">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[60px] p-8 md:p-14 border border-black/[0.03] dark:border-white/[0.03] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] relative overflow-hidden">
             {/* Decorative Background Elements */}
             <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none overflow-hidden">
                <Orbit className="absolute -top-20 -right-20 h-[500px] w-[500px] text-primary" />
             </div>
             
             <div className="relative z-10 flex flex-col gap-10">
                <div className="flex items-center gap-4 border-b border-border/10 pb-8">
                  <div className="h-10 w-1 rounded-full bg-primary" />
                  <h4 className="text-2xl font-black tracking-tight text-foreground">Análisis de Generación Cuántica</h4>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {insight.split('\n').filter(line => line.match(/^\d\.|📈|⚠️|🎯|🚀/)).map((item, idx) => {
                    const [header, ...content] = item.replace(/^\d\.\s+/, '').split(':');
                    const emoji = header.match(/📈|⚠️|🎯|🚀/)?.[0] || '✨';
                    const title = header.replace(/📈|⚠️|🎯|🚀/, '').trim();
                    const body = content.join(':').trim();

                    // Dynamic styling based on type
                    const cardStyles: Record<string, string> = {
                      '📈': 'border-blue-500/10 bg-blue-500/[0.02]',
                      '⚠️': 'border-amber-500/10 bg-amber-500/[0.02]',
                      '🎯': 'border-indigo-500/10 bg-indigo-500/[0.02]',
                      '🚀': 'border-emerald-500/10 bg-emerald-500/[0.02]'
                    };

                    const tagColors: Record<string, string> = {
                      '📈': 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
                      '⚠️': 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
                      '🎯': 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
                      '🚀': 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    };

                    return (
                      <div 
                        key={idx} 
                        className={`p-1 w-full rounded-[40px] border ${cardStyles[emoji] || 'border-border/30'} flex flex-col group hover:shadow-2xl transition-all duration-700`}
                        style={{ animationDelay: `${idx * 200}ms` }}
                      >
                         <div className="bg-white dark:bg-[#232326] rounded-[38px] p-8 h-full flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${tagColors[emoji]}`}>
                                {emoji} {title}
                              </span>
                              <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="text-[14px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                               {body.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="font-black text-foreground">{part}</strong> : part)}
                            </div>
                         </div>
                      </div>
                    );
                  })}
                </div>
             </div>
          </div>

          <div className="mt-8 p-8 bg-slate-50 dark:bg-white/[0.02] rounded-[40px] border border-border/40 flex flex-col md:flex-row md:items-center gap-8">
             <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-2xl shadow-primary/30">
                <Lightbulb className="h-8 w-8 text-white animate-pulse" />
             </div>
             <p className="text-[13px] font-black text-foreground opacity-60 leading-relaxed uppercase tracking-[0.1em]">
                Informe CORE AI v2.0 <br />
                <span className="text-[10px] font-bold opacity-40 tracking-widest italic lowercase">Sincronización basada en parámetros de rentabilidad industrial.</span>
             </p>
          </div>
        </div>
      )}
    </div>
  );
}
