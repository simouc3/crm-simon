import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase/client"
import { ArrowUpRight, TrendingUp, TrendingDown, Activity, DollarSign, Target, Briefcase, Calendar } from "lucide-react"

const fmtCLP = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

type TimeRange = 'MONTH' | 'QUARTER' | 'YEAR'

// ── Mini SVG Pie Chart ────────────────────────────────────────────────
function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="text-center text-muted-foreground text-[10px] py-10 font-bold uppercase tracking-widest opacity-40">Sin datos en este rango</div>

  let cumAngle = -90
  const slices = data.map(d => {
    const pct = d.value / total
    const startAngle = cumAngle
    cumAngle += pct * 360
    return { ...d, pct, startAngle, endAngle: cumAngle }
  })

  const polarToXY = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180
    return { x: 50 + r * Math.cos(rad), y: 50 + r * Math.sin(rad) }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-center bg-slate-50/50 dark:bg-slate-900/50 p-8 rounded-[40px] border border-border/40 shadow-sm hover:shadow-lg transition-shadow duration-500">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl rotate-0 transition-transform duration-700 hover:rotate-6">
          {total > 0 && slices.length === 1 ? (
            <circle cx="50" cy="50" r="42" fill={slices[0].color} stroke="currentColor" className="text-white/10 dark:text-black/20" strokeWidth="0.5" />
          ) : (
            slices.map((s, i) => {
              const start = polarToXY(s.startAngle, 42)
              const end = polarToXY(s.endAngle, 42)
              const largeArc = s.pct > 0.5 ? 1 : 0
              return (
                <path
                  key={i}
                  d={`M 50 50 L ${start.x} ${start.y} A 42 42 0 ${largeArc} 1 ${end.x} ${end.y} Z`}
                  fill={s.color}
                  stroke="currentColor"
                  className="text-white/10 dark:text-black/20"
                  strokeWidth="0.5"
                />
              )
            })
          )}
          <circle cx="50" cy="50" r="22" fill="var(--card)" className="dark:fill-slate-900" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-black text-muted-foreground uppercase leading-none opacity-40">Total</span>
          <span className="text-xs font-black text-foreground">{total}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 flex-1 w-full">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-3 text-xs p-1">
            <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ background: s.color }} />
            <span className="truncate text-muted-foreground font-bold tracking-tight">{s.label}</span>
            <span className="ml-auto font-black tabular-nums bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg shadow-sm border border-border/20">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mini Bar Chart ────────────────────────────────────────────────────
function BarChart({ data, color = '#10b981' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-4 w-full">
      {data.map((d, i) => (
        <div key={i} className="space-y-2 group">
          <div className="flex justify-between items-end">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-tight truncate max-w-[60%] group-hover:text-primary transition-colors">{d.label}</span>
            <span className="text-xs font-black tabular-nums dark:text-slate-200">{fmtCLP(d.value)}</span>
          </div>
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden shadow-inner border border-border/5">
            <div
              className="h-full rounded-2xl transition-all duration-1000 ease-out shadow-lg"
              style={{ width: `${(d.value / max) * 100}%`, background: `linear-gradient(90deg, ${color}dd, ${color})` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── KPI Card Widget ───────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, trend, gradientClass }: {
  label: string; value: string; sub: string; icon: any; trend?: { val: string; up: boolean }; gradientClass?: string
}) {
  return (
    <div className={`group relative overflow-hidden rounded-[40px] border border-border/40 p-8 flex flex-col gap-1 shadow-sm transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-2 active:scale-[0.98] duration-500 ${gradientClass || 'bg-white dark:bg-slate-900'}`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-colors" />
      
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className={`p-3 rounded-3xl border shadow-sm transition-all duration-300 ${gradientClass ? 'bg-white/20 border-white/20' : 'bg-slate-50 dark:bg-slate-800/80 border-border/20 group-hover:bg-primary/10 group-hover:border-primary/20'}`}>
          <Icon className={`h-6 w-6 ${gradientClass ? 'text-white' : 'text-primary'}`} strokeWidth={2.5} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-2xl shadow-sm border ${
            gradientClass 
              ? 'bg-white/20 border-white/20 text-white backdrop-blur-md'
              : trend.up ? 'text-emerald-600 bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-800' : 'text-rose-600 bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-800'
          }`}>
            {trend.up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {trend.val}
          </div>
        )}
      </div>
      
      <div className="flex flex-col relative z-10 mt-2">
        <span className={`text-[11px] font-black uppercase tracking-[0.2em] leading-none mb-2 ${gradientClass ? 'text-white/70' : 'text-muted-foreground opacity-60'}`}>{label}</span>
        <div className={`text-4xl font-black tracking-tighter transition-all duration-300 ${gradientClass ? 'text-white' : 'text-foreground group-hover:text-primary'}`}>
          {value}
        </div>
        <p className={`text-[12px] font-bold tracking-tight mt-1 truncate ${gradientClass ? 'text-white/80' : 'text-muted-foreground'}`}>
          {sub}
        </p>
      </div>
    </div>
  )
}

// ── Section Title Mobile ──────────────────────────────────────────────
function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="relative mb-8 pb-2">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-foreground rounded-full shadow-lg" />
          <h2 className="font-black text-[32px] md:text-[40px] tracking-tighter text-foreground dark:text-slate-100 leading-tight">
            {title}
          </h2>
        </div>
        <p className="text-[14px] text-muted-foreground font-bold tracking-tight pl-5 opacity-80">
          {sub}
        </p>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────
export default function Dashboard() {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<TimeRange>('MONTH')

  const now = new Date()
  const rangeLabels: Record<TimeRange, string> = {
    MONTH: new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(now),
    QUARTER: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`,
    YEAR: String(now.getFullYear()),
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const { data } = await supabase
        .from('deals')
        .select('*, companies(razon_social, segmento, comuna, m2_estimados, condiciones_pago)')
        .order('created_at', { ascending: true })
      setDeals(data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="relative flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-primary/20 border-t-primary shadow-sm" />
        <div className="absolute font-black text-[10px] text-primary">CRM</div>
      </div>
      <p className="text-muted-foreground text-xs font-black uppercase tracking-widest animate-pulse">Sincronizando Métricas...</p>
    </div>
  )

  // Filtrado por Tiempo — usa stage_changed_at para ganados/perdidos, created_at para activos
  const filteredDeals = deals.filter(deal => {
    // Usamos la fecha más significativa: stage_changed_at si existe, si no created_at
    const dateStr = deal.stage_changed_at || deal.created_at
    const d = new Date(dateStr)
    if (range === 'MONTH') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }
    if (range === 'QUARTER') {
      const q_now = Math.floor(now.getMonth() / 3)
      const q_d = Math.floor(d.getMonth() / 3)
      return q_now === q_d && d.getFullYear() === now.getFullYear()
    }
    return d.getFullYear() === now.getFullYear()
  })

  const ganados = filteredDeals.filter(d => d.stage === 6)
  const perdidos = filteredDeals.filter(d => d.stage === 7)
  const propuestas = filteredDeals.filter(d => d.stage === 4)
  const activos = filteredDeals.filter(d => d.stage >= 1 && d.stage <= 5)

  const mrrContractual = ganados
    .filter(d => d.is_contract && d.contract_months)
    .reduce((s, d) => s + ((d.valor_total || 0) / (d.contract_months || 1)), 0)

  const ventasUnicas = ganados
    .filter(d => !d.is_contract)
    .reduce((s, d) => s + (d.valor_neto || 0), 0)

  const ingresosMes = mrrContractual + ventasUnicas

  const pipelineForecast = propuestas.reduce((s, d) => s + (d.valor_neto || 0), 0)
  const ticketPromedio = ganados.length > 0 ? (ganados.reduce((s, d) => s + (d.valor_neto || 0), 0)) / ganados.length : 0
  const winRate = (ganados.length + perdidos.length) > 0 ? Math.round((ganados.length / (ganados.length + perdidos.length)) * 100) : 0

  const motivosPerdida = (() => {
    const counts: Record<string, number> = {}
    perdidos.forEach(d => {
      const m = d.motivo_perdida || 'Otros'
      counts[m] = (counts[m] || 0) + 1
    })
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#dc2626', '#b91c1c']
    return Object.entries(counts).map(([label, value], i) => ({
      label, value, color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value).slice(0, 5)
  })()

  const porIndustria = (() => {
    const map: Record<string, number> = {}
    ganados.forEach(d => {
      const seg = d.companies?.segmento?.replace(/_/g, ' ') || 'Sin clasificar'
      map[seg] = (map[seg] || 0) + (d.valor_neto || 0)
    })
    const colors = ['#10b981', '#6366f1', '#06b6d4', '#f59e0b', '#ec4899']
    return Object.entries(map).map(([label, value], i) => ({
      label, value, color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value).slice(0, 5)
  })()

  const porComuna = (() => {
    const map: Record<string, number> = {}
    ganados.forEach(d => {
      const c = d.companies?.comuna?.replace(/_/g, ' ') || 'Zonas Varias'
      map[c] = (map[c] || 0) + (d.valor_neto || 0)
    })
    return Object.entries(map).map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value).slice(0, 5)
  })()

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans">
      
      {/* Header Premium con Selector de Rango Estilo Apple */}
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between bg-white dark:bg-slate-900 mx-[-1.5rem] mt-[-1.5rem] p-8 md:mx-0 md:mt-0 md:p-0 border-b md:border-none border-border/40 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-primary bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-lg tracking-wider">EXECUTIVE PANEL</span>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Industrial Intelligence</span>
          </div>
          <h1 className="text-[32px] font-black tracking-tighter text-foreground leading-[1.1] md:text-4xl">
            Resumen de <span className="text-primary italic">Ventas</span>
          </h1>
        </div>

        {/* Segmented Control iOS Style */}
          <div className="flex flex-col gap-4">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full flex items-center shadow-inner self-start md:self-auto min-w-[300px]">
            {[
              { id: 'MONTH', label: 'Mes' },
              { id: 'QUARTER', label: 'Trimestre' },
              { id: 'YEAR', label: 'Año' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setRange(item.id as TimeRange)}
                className={`flex-1 h-10 rounded-full flex items-center justify-center text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                  range === item.id 
                    ? 'bg-white dark:bg-slate-700 text-foreground shadow-lg shadow-black/5 scale-[1.02]' 
                    : 'text-muted-foreground hover:text-foreground opacity-60'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-2 opacity-50">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Viendo: <span className="text-foreground capitalize">{rangeLabels[range]}</span>
            </span>
          </div>
        </div>
      </div>

      <section>
        <SectionTitle title="Ventas & Proyecciones" sub="Estado financiero de contratos y propuestas enviadas" />
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Nuevos Ingresos (Ventas + MRR)"
            value={fmtCLP(ingresosMes)}
            sub={`${ganados.length} Cierres en el Periodo`}
            icon={DollarSign}
            trend={{ val: "+12.5%", up: true }}
            gradientClass="bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-400 bg-noise"
          />
          <KpiCard
            label="Pipeline en Oferta"
            value={fmtCLP(pipelineForecast)}
            sub={`${propuestas.length} Propuestas Activas`}
            icon={Target}
            gradientClass="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 bg-noise"
          />
          <KpiCard
            label="Ticket Promedio"
            value={fmtCLP(ticketPromedio)}
            sub="Medida por Cierre B2B"
            icon={Briefcase}
            gradientClass="bg-gradient-to-br from-orange-500 via-rose-500 to-red-500 bg-noise"
          />
        </div>

        <div className="mt-8 rounded-[40px] border border-border/40 bg-white/50 dark:bg-slate-900/50 p-8 md:p-10 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-[17px] tracking-tight dark:text-slate-100 uppercase">Flujo Comercial</h3>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Pipeline Progress</p>
            </div>
          </div>
          
          <div className="grid gap-6">
            {[
              { label: 'Prospección inicial', stage: 1, c: '#94a3b8' },
              { label: 'Contacto establecido', stage: 2, c: '#60a5fa' },
              { label: 'Visita técnica', stage: 3, c: '#818cf8' },
              { label: 'Propuesta emitida', stage: 4, c: '#f59e0b' },
              { label: 'Cierre negociación', stage: 5, c: '#fb923c' },
            ].map(s => {
              const count = filteredDeals.filter(d => d.stage === s.stage).length
              const val = filteredDeals.filter(d => d.stage === s.stage).reduce((a, d) => a + (d.valor_neto || 0), 0)
              const pct = activos.length > 0 ? (count / activos.length) * 100 : 0
              return (
                <div key={s.stage} className="flex flex-col gap-2 group">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                       <span className="font-black text-[13px] tracking-tight text-foreground/80 group-hover:text-primary transition-colors">{s.label}</span>
                       <span className="text-[10px] font-bold text-muted-foreground opacity-40 tabular-nums">({count})</span>
                    </div>
                    <span className="text-[11px] font-black tabular-nums">{val > 0 ? fmtCLP(val) : '-'}</span>
                  </div>
                  <div className="h-[6px] w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-border/5">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: s.c }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        <div className="space-y-6">
          <SectionTitle title="Eficiencia de Ventas" sub="Conversión y ciclo comercial" />
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
            <KpiCard
              label="Win Rate Total"
              value={`${winRate}%`}
              sub="Tasa de Éxito Comercial"
              icon={TrendingUp}
              trend={{ val: "Estable", up: true }}
            />
            <div className="rounded-[40px] border border-border/40 bg-primary p-8 text-white shadow-[0_20px_50px_rgba(0,122,255,0.25)] relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-2 block">Performance Rango</span>
              <div className="text-3xl font-black tracking-tighter leading-none mb-1">{winRate >= 50 ? 'Alta' : winRate > 0 ? 'Media' : 'Pendiente'}</div>
              <p className="text-[11px] font-bold text-white/80 opacity-80 decoration-white/20 underline underline-offset-4 decoration-dashed italic">Enfoque B2B Táctico</p>
              <ArrowUpRight className="absolute bottom-4 right-4 text-white/40 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>
          </div>
          
          <div className="rounded-[40px] border border-border/40 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-500">
            <div className="p-6 border-b border-border/40 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
              <h3 className="font-black text-[14px] text-foreground uppercase tracking-wider">Causas de Cierre Perdido</h3>
              <span className="text-[9px] font-black bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-lg border border-rose-500/20">ALERTA ROJA</span>
            </div>
            <div className="p-6">
              {motivosPerdida.length > 0 ? <PieChart data={motivosPerdida} /> : <div className="text-center py-10 opacity-40 font-black text-[10px] uppercase tracking-widest leading-relaxed">Sin métricas de pérdida en este período</div>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <SectionTitle title="Logística Industrial" sub="Mercado por segmento y zona" />
          <div className="rounded-[40px] border border-border/40 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-500 flex-1 flex flex-col h-full">
            <div className="p-6 border-b border-border/40 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
              <h3 className="font-black text-[14px] text-foreground uppercase tracking-wider">Top Segmentos Clientes</h3>
              <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-lg border border-primary/20">PULSO INDUSTRIAL</span>
            </div>
            <div className="p-6 flex-1">
               {porIndustria.length > 0 ? <PieChart data={porIndustria} /> : <div className="text-center py-10 opacity-40 font-black text-[10px] uppercase tracking-widest leading-relaxed">Sin datos de segmentación en este período</div>}
            </div>
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-t border-border/40">
              <h3 className="font-black text-[12px] text-foreground uppercase tracking-widest mb-6 opacity-60">Top Comunas (Facturación)</h3>
              {porComuna.length > 0 ? <BarChart data={porComuna} /> : <div className="text-center py-4 opacity-40 font-black text-[10px] uppercase tracking-widest leading-relaxed">Sin datos geográficos</div>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-4">
        {[
          { label: 'Operación Rango', value: filteredDeals.length, icon: Briefcase },
          { label: 'Oportunidades', value: activos.length, icon: Target },
          { label: 'Cierres GANADOS', value: ganados.length, icon: TrendingUp },
          { label: 'Cierres PERDIDOS', value: perdidos.length, icon: TrendingDown },
        ].map(item => (
          <div key={item.label} className="flex flex-col items-center gap-2 p-6 bg-white dark:bg-slate-900 border border-border/40 rounded-[32px] shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:translate-y-[-4px] transition-all duration-500 group cursor-default">
            <item.icon className="h-4 w-4 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
            <div className="text-2xl font-black tabular-nums tracking-tighter text-foreground">{item.value}</div>
            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center opacity-60 leading-none">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
