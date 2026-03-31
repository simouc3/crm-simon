import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase/client"
import { Activity, DollarSign, Briefcase, TrendingUp, Target, Zap, TrendingDown, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardAIInsights } from "../components/DashboardAIInsights"

const fmtCLP = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

type TimeRange = 'MONTH' | 'QUARTER' | 'YEAR'

// ── Mini SVG Pie Chart ────────────────────────────────────────────────
function PieChart({ data, onSelect }: { data: { label: string; value: number; color: string; deals: any[] }[], onSelect?: (item: any) => void }) {
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
    <div className="flex flex-col sm:flex-row gap-6 items-center bg-slate-50/50 dark:bg-white/[0.03] p-6 rounded-[28px] border border-border/30 dark:border-white/[0.06]">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl rotate-0 transition-transform duration-700 hover:rotate-6">
          {total > 0 && slices.length === 1 ? (
            <circle cx="50" cy="50" r="42" fill={slices[0].color} stroke="currentColor" className="text-white/10 dark:text-black/20" strokeWidth="0.5" onClick={() => onSelect?.(slices[0])} style={{ cursor: onSelect ? 'pointer' : 'default' }} />
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
                  className="text-white/10 dark:text-black/20 cursor-pointer hover:opacity-80 transition-opacity"
                  strokeWidth="0.5"
                  onClick={() => onSelect?.(s)}
                />
              )
            })
          )}
          <circle cx="50" cy="50" r="26" fill="currentColor" className="text-white dark:text-[#1C1C1E]" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[8px] font-black text-muted-foreground/50 uppercase leading-none">Total</span>
          <span className="text-[10px] font-black text-foreground mt-0.5">{total > 1000 ? fmtCLP(total) : total}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 flex-1 w-full">
        {slices.map((s, i) => (
          <div 
            key={i} 
            className="flex items-center gap-3 text-xs p-1 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 rounded-lg transition-colors group/slice"
            onClick={() => onSelect?.(s)}
          >
            <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ background: s.color }} />
            <span className="truncate text-muted-foreground font-bold tracking-tight flex-1 group-hover/slice:text-primary">{s.label}</span>
            <span className="font-black tabular-nums text-[10px] text-muted-foreground mr-1">{s.value > 1000 ? fmtCLP(s.value) : s.value}</span>
            <span className="font-black tabular-nums bg-white dark:bg-[#2C2C2E] px-2 py-0.5 rounded-lg border border-border/20 dark:border-transparent">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ data, onSelect, color = '#10b981', prefix = '$' }: { data: { label: string; value: number; deals: any[] }[]; onSelect?: (item: any) => void; color?: string; prefix?: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-4 w-full">
      {data.map((d, i) => (
        <div key={i} className="space-y-2 group cursor-pointer" onClick={() => onSelect?.(d)}>
          <div className="flex justify-between items-end">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-tight truncate max-w-[60%] group-hover:text-primary transition-colors">{d.label}</span>
            <span className="text-xs font-black tabular-nums dark:text-slate-200">{prefix}{d.value.toLocaleString('es-CL')}</span>
          </div>
          <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded-2xl overflow-hidden shadow-inner border border-border/5">
            <div
              className="h-full rounded-2xl transition-all duration-1000 ease-out shadow-lg group-hover:brightness-110"
              style={{ width: `${(d.value / max) * 100}%`, background: `linear-gradient(90deg, ${color}dd, ${color})` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── KPI Card Widget ───────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, trend, onClick, highlight, variant = 'glass' }: any) {
  const baseStyles = "group relative overflow-hidden rounded-[28px] p-6 transition-all duration-700 cursor-pointer active:scale-[0.98]"
  const variants: any = {
    glass: "glass-island border border-black/[0.03] dark:border-white/[0.03] shadow-sm hover:shadow-[0_30px_60px_rgba(0,0,0,0.07)] hover:-translate-y-1.5",
    primary: "bg-primary text-white shadow-[0_20px_50px_rgba(0,122,255,0.25)] hover:shadow-[0_40px_80px_rgba(0,122,255,0.35)] hover:-translate-y-1.5",
    accent: "bg-black dark:bg-white text-white dark:text-black shadow-2xl hover:-translate-y-1.5"
  }

  return (
    <div onClick={onClick} className={`${baseStyles} ${variants[variant]} ${highlight ? 'ring-2 ring-primary/20' : ''}`}>
      {/* Icon + Trend row */}
      <div className="flex items-center justify-between mb-6">
        <div className={`p-3 rounded-2xl ${variant === 'glass' ? 'bg-slate-50 dark:bg-white/5 border border-black/[0.03] dark:border-white/5' : 'bg-white/10 border border-white/10'}`}>
          <Icon className={`h-5 w-5 ${variant === 'glass' ? 'text-primary' : 'text-white dark:text-black'}`} strokeWidth={2.5} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-full border ${
            variant !== 'glass'
              ? 'bg-white/10 border-white/10 text-white'
              : trend.up ? 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-800' : 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-800'
          }`}>
            {trend.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {trend.val}
          </div>
        )}
      </div>
      
      {/* Value block */}
      <div className="space-y-1 min-w-0">
        <span className={`text-[10px] font-black uppercase tracking-[0.3em] leading-none block mb-3 ${variant === 'glass' ? 'text-muted-foreground opacity-40' : 'opacity-60'}`}>{label}</span>
        <div className="text-[28px] font-black tracking-tighter leading-none tabular-nums truncate">
          {value}
        </div>
        {sub && (
          <p className={`text-[12px] font-bold tracking-tight mt-3 truncate ${variant === 'glass' ? 'text-muted-foreground' : 'opacity-70'}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}


// ── Section Title ─────────────────────────────────────────────────────
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
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BI'>('OVERVIEW')
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3))
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const availableYears = [2024, 2025, 2026]


  const [selectedMetric, setSelectedMetric] = useState<{ label: string, deals: any[] } | null>(null)

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

  // Filtrado por Tiempo
  const filteredDeals = deals.filter(deal => {
    const dateStr = deal.stage_changed_at || deal.created_at
    const d = new Date(dateStr)
    if (range === 'MONTH') {
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    }
    if (range === 'QUARTER') {
      const q_d = Math.floor(d.getMonth() / 3)
      return q_d === selectedQuarter && d.getFullYear() === selectedYear
    }
    return d.getFullYear() === selectedYear
  })

  // Cálculos Base
  const ganados = filteredDeals.filter(d => d.stage === 6)
  const perdidos = filteredDeals.filter(d => d.stage === 7)
  const propuestas = filteredDeals.filter(d => d.stage >= 1 && d.stage <= 5)
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

  // Métricas BI - Synchronized with KanbanBoard weights
  const getProbability = (stage: number, isRisk: boolean) => {
    let p = 0
    switch(stage) {
      case 1: p = 10; break // Prospección
      case 2: p = 20; break // Contacto
      case 3: p = 40; break // Visita
      case 4: p = 60; break // Propuesta 
      case 5: p = 80; break // Negociación
      case 6: p = 100; break // Ganado
      default: p = 0
    }
    return isRisk ? p * 0.5 : p
  }
  const totalPonderado = filteredDeals
    .filter(d => d.stage >= 1 && d.stage <= 6)
    .reduce((acc, d) => acc + ((d.valor_neto || 0) * (getProbability(d.stage, !!d.is_risk) / 100)), 0)

  const rentabilidadM2 = (() => {
    const data: Record<string, { totalValor: number, totalM2: number, deals: any[] }> = {}
    ganados.forEach(d => {
      const seg = d.companies?.segmento || 'OTROS'
      const m2 = Number(d.companies?.m2_estimados) || 0
      if (!data[seg]) data[seg] = { totalValor: 0, totalM2: 0, deals: [] }
      data[seg].totalValor += (d.valor_neto || 0)
      data[seg].totalM2 += m2
      data[seg].deals.push(d)
    })
    return Object.entries(data)
      .map(([label, { totalValor, totalM2, deals }]) => ({ 
        label, 
        value: totalM2 > 0 ? Math.round(totalValor / totalM2) : 0,
        deals
      }))
      .sort((a, b) => b.value - a.value).slice(0, 5)
  })()

  const marketingSpend = 1500000 
  const cac = ganados.length > 0 ? marketingSpend / ganados.length : 0
  const ltv = ticketPromedio * 18

  const motivosPerdida = (() => {
    const counts: Record<string, { total: number, deals: any[] }> = {}
    perdidos.forEach(d => {
      const m = d.motivo_perdida || 'Otros'
      if (!counts[m]) counts[m] = { total: 0, deals: [] }
      counts[m].total++
      counts[m].deals.push(d)
    })
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#dc2626', '#b91c1c']
    return Object.entries(counts).map(([label, info], i) => ({
      label, value: info.total, deals: info.deals, color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value).slice(0, 5)
  })()

  // Para BI y Analítica, a veces es mejor ver el histórico completo o un set más amplio
  const biHistoricalDeals = deals.filter(d => d.stage !== 7)
  const porIndustria = (() => {
    const counts: Record<string, { total: number, deals: any[] }> = {}
    biHistoricalDeals.forEach(d => {
      const seg = d.companies?.segmento || 'OTROS'
      if (!counts[seg]) counts[seg] = { total: 0, deals: [] }
      counts[seg].total++
      counts[seg].deals.push(d)
    })
    const colors = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308']
    return Object.entries(counts).map(([label, info], i) => ({
      label,
      value: info.total,
      deals: info.deals,
      color: colors[i % colors.length]
    })).sort((a,b) => b.value - a.value)
  })()

  const porComuna = (() => {
    const counts: Record<string, { total: number, deals: any[] }> = {}
    biHistoricalDeals.forEach(d => {
      const com = d.companies?.comuna || 'SIN COMUNA'
      if (!counts[com]) counts[com] = { total: 0, deals: [] }
      counts[com].total++
      counts[com].deals.push(d)
    })
    return Object.entries(counts)
      .map(([label, info]) => ({ label, value: info.total, deals: info.deals }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  })()

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans pb-24">
      
      {/* Dynamic Header with Tabs (Clean Slate) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between py-10 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-8 rounded-full bg-primary" />
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">Intelligence Hub</span>
          </div>
          <h1 className="text-[48px] md:text-[64px] font-black tracking-tight text-foreground leading-[0.9] -ml-1">
            {activeTab === 'OVERVIEW' ? 'Negocios' : 'Analítica BI'}
          </h1>
          
          <div className="flex glass-island p-1.5 rounded-full shadow-lg border border-white/5 mt-6 w-fit">
            <button 
              onClick={() => setActiveTab('OVERVIEW')}
              className={`text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-full transition-all ${activeTab === 'OVERVIEW' ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm' : 'text-muted-foreground hover:text-foreground opacity-40'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('BI')}
              className={`text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-full transition-all flex items-center gap-2 ${activeTab === 'BI' ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm' : 'text-muted-foreground hover:text-foreground opacity-40'}`}
            >
              Insights <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:items-end gap-4 mt-12 md:mt-0">
          <div className="glass-island p-1.5 rounded-full flex items-center shadow-lg border border-white/5">
            {[
              { id: 'MONTH', label: 'Mes' },
              { id: 'QUARTER', label: 'Trim' },
              { id: 'YEAR', label: 'Año' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setRange(item.id as TimeRange)}
                className={`h-9 px-6 rounded-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  range === item.id 
                    ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-md' 
                    : 'text-muted-foreground hover:text-foreground opacity-40'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {range === 'MONTH' && (
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-slate-50 dark:bg-white/5 rounded-full px-5 h-11 text-[10px] font-black uppercase tracking-widest text-foreground outline-none cursor-pointer border border-black/[0.03] dark:border-white/5 shadow-sm">
                {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            )}
            {range === 'QUARTER' && (
              <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(Number(e.target.value))} className="bg-slate-50 dark:bg-white/5 rounded-full px-5 h-11 text-[10px] font-black uppercase tracking-widest text-foreground outline-none cursor-pointer border border-black/[0.03] dark:border-white/5 shadow-sm">
                {[0,1,2,3].map(q => <option key={q} value={q}>Q{q+1}</option>)}
              </select>
            )}
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-slate-50 dark:bg-white/5 rounded-full px-5 h-11 text-[10px] font-black uppercase tracking-widest text-foreground outline-none cursor-pointer border border-black/[0.03] dark:border-white/5 shadow-sm">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {activeTab === 'OVERVIEW' ? (
        <>
          <section>
            <SectionTitle title="Ventas & Proyecciones" sub="Estado financiero de contratos y propuestas enviadas" />
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Nuevos Ingresos"
                value={fmtCLP(ingresosMes)}
                sub={`${ganados.length} Cierres Exitosos`}
                icon={DollarSign}
                variant="primary"
                onClick={() => setSelectedMetric({ label: 'Cierres (Ganados)', deals: ganados })}
              />
              <KpiCard
                label="Cierre Realista AI"
                value={fmtCLP(totalPonderado)}
                sub="Basado en scoring de riesgo"
                icon={Zap}
                highlight
                variant="glass"
                trend={{ val: "IA Forecast", up: true }}
                onClick={() => setSelectedMetric({ label: 'Cierre Realista AI (Activos)', deals: activos })}
              />
              <KpiCard
                label="Pipeline Activo"
                value={fmtCLP(pipelineForecast)}
                sub={`${propuestas.length} Negociaciones`}
                icon={Briefcase}
                onClick={() => setSelectedMetric({ label: 'Pipeline Activo', deals: propuestas })}
              />
              <KpiCard
                label="Win Rate"
                value={`${winRate}%`}
                sub="Conversión Comercial"
                icon={TrendingUp}
                trend={{ val: "Saludable", up: winRate > 30 }}
              />
            </div>

            <div className="mt-8 rounded-[32px] border border-border/30 dark:border-white/[0.06] bg-white/50 dark:bg-[#1C1C1E]/50 p-8 md:p-10 dark:shadow-none overflow-hidden relative">
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
                  { id: 1, name: 'Prospección', color: '#64748b', bg: 'bg-slate-500/5', border: 'border-slate-500/20' },
                  { id: 2, name: 'Contacto', color: '#0ea5e9', bg: 'bg-sky-500/5', border: 'border-sky-500/20' },
                  { id: 3, name: 'Visita', color: '#8b5cf6', bg: 'bg-violet-500/5', border: 'border-violet-500/20' },
                  { id: 4, name: 'Propuesta', color: '#f59e0b', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
                  { id: 5, name: 'Negociación', color: '#f97316', bg: 'bg-orange-500/5', border: 'border-orange-500/20' },
                ].map(s => {
                  const stageDeals = filteredDeals.filter(d => d.stage === s.id)
                  const count = stageDeals.length
                  const val = stageDeals.reduce((a, d) => a + (d.valor_neto || 0), 0)
                  const pct = activos.length > 0 ? (count / activos.length) * 100 : 0
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => setSelectedMetric({ label: `Etapa: ${s.name}`, deals: stageDeals })}
                      className="flex flex-col gap-2 group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] p-3 -mx-3 rounded-2xl transition-all"
                    >
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                           <span className="font-black text-[13px] tracking-tight text-foreground/80 group-hover:text-primary transition-colors">{s.name}</span>
                           <span className="text-[10px] font-bold text-muted-foreground opacity-40 tabular-nums">({count})</span>
                        </div>
                        <span className="text-[11px] font-black tabular-nums">{val > 0 ? fmtCLP(val) : '-'}</span>
                      </div>
                      <div className="h-[6px] w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-border/5">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                      </div>
                      {stageDeals.some(d => d.is_risk) && (
                        <div className="text-[9px] text-rose-500 font-black uppercase tracking-widest flex items-center gap-1">
                          <span className="animate-pulse">●</span> Riesgo detectado en {stageDeals.filter(d => d.is_risk).length} tratos
                        </div>
                      )}
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
                />
                <div className="rounded-[40px] border border-border/40 bg-primary p-8 text-white shadow-xl relative overflow-hidden group">
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-widest block mb-2">Estado General</span>
                  <div className="text-3xl font-black tracking-tighter leading-none mb-1">{winRate >= 50 ? 'Alta Tracción' : 'Operativo'}</div>
                  <p className="text-[11px] font-bold text-white/80 italic">Eficiencia de Cierre</p>
                  <p className="mt-4 text-[10px] text-white/60 font-medium leading-relaxed">
                    El Win Rate mide el porcentaje de oportunidades ganadas sobre el total de tratos cerrados. Un valor sobre el 40% es excelente en servicios B2B.
                  </p>
                  <ArrowUpRight className="absolute bottom-4 right-4 text-white/40 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </div>
              <div className="rounded-[32px] border border-border/30 dark:border-white/[0.06] bg-white dark:bg-[#1C1C1E] overflow-hidden p-6">
                 <h3 className="font-black text-[14px] text-foreground uppercase tracking-wider mb-6">Top Segmentos</h3>
                 <PieChart 
                    data={porIndustria} 
                    onSelect={(item) => setSelectedMetric({ label: `Segmento: ${item.label}`, deals: item.deals })}
                  />
              </div>
            </div>
            <div className="space-y-6">
               <SectionTitle title="Análisis Geográfico" sub="Top comunas con mayor tracción" />
               <div className="rounded-[32px] border border-border/30 dark:border-white/[0.06] bg-white dark:bg-[#1C1C1E] overflow-hidden p-6">
                  <BarChart 
                    data={porComuna} 
                    color="#10b981" 
                    onSelect={(item) => setSelectedMetric({ label: `Comuna: ${item.label}`, deals: item.deals })}
                  />
               </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="space-y-10">
            <SectionTitle title="KPIs de Rentabilidad" sub="Alineación estratégica y costos de adquisición" />
            
            <DashboardAIInsights 
              deals={filteredDeals} 
              metrics={{
                ingresos: ingresosMes,
                winRate: winRate,
                cac: cac,
                ltv: ltv,
                propuestas: propuestas.length
              }} 
            />

            {/* Modal de Detalle de Metrica (Drill-down) */}
            {selectedMetric && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white dark:bg-[#1C1C1E] rounded-[40px] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col border border-border/20">
                  <div className="p-8 border-b border-border/20 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight uppercase">{selectedMetric.label}</h3>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{selectedMetric.deals.length} Negocios en este grupo</p>
                    </div>
                    <button onClick={() => setSelectedMetric(null)} className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center font-bold">X</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-3">
                    {selectedMetric.deals.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-border/20 hover:border-primary/50 transition-all group">
                        <div className="space-y-1">
                          <div className="font-black text-[15px] group-hover:text-primary transition-colors">{d.companies?.razon_social || 'Cliente'}</div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{d.title} · Etapa {d.stage}</div>
                        </div>
                        <div className="text-right">
                           <div className="font-black text-lg">{fmtCLP(d.valor_neto)}</div>
                           {d.is_risk && <span className="text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">En Riesgo</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-8 border-t border-border/20 bg-slate-50/50 dark:bg-white/2">
                    <Button onClick={() => setSelectedMetric(null)} className="w-full h-12 rounded-2xl font-black uppercase tracking-widest">Cerrar Detalle</Button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label="CAC (Adquisición)"
                value={fmtCLP(cac)}
                sub="Inversión por contrato ganado"
                icon={Target}
                trend={{ val: "Target < $300k", up: cac < 300000 }}
              />
              <KpiCard
                label="LTV (Valor Cliente)"
                value={fmtCLP(ltv)}
                sub="Ciclo de vida estimado"
                icon={Zap}
                variant="accent"
              />
              <KpiCard
                label="Ratio LTV:CAC"
                value={`${Math.round(ltv / cac || 0)}x`}
                sub="Salud del Negocio"
                icon={TrendingUp}
                highlight
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
               {[
                 { 
                   title: 'CAC', 
                   full: 'Cost of Acquisition', 
                   desc: 'Inversión en marketing para captar un cliente. Si sube, tu rentabilidad baja.',
                   color: 'bg-indigo-500'
                 },
                 { 
                   title: 'LTV', 
                   full: 'Lifetime Value', 
                   desc: 'Ingreso proyectado de un cliente durante toda su relación con la empresa.',
                   color: 'bg-amber-500'
                 },
                 { 
                   title: 'Ratio LTV:CAC', 
                   full: 'Modelo de Negocio', 
                   desc: 'Un ratio de 3x o superior indica un negocio saludable y altamente escalable.',
                   color: 'bg-emerald-500'
                 }
               ].map(m => (
                 <div key={m.title} className="bg-white dark:bg-[#1C1C1E] p-8 rounded-[40px] border border-border/20 shadow-sm relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-24 h-24 ${m.color} opacity-5 blur-3xl -mr-12 -mt-12 transition-opacity group-hover:opacity-20`} />
                    <div className="relative z-10 space-y-3">
                       <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${m.color}`} />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{m.full}</span>
                       </div>
                       <h4 className="text-2xl font-black tracking-tighter">{m.title}</h4>
                       <p className="text-xs font-medium text-muted-foreground leading-relaxed">{m.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
          </section>

          <section className="grid gap-8 grid-cols-1 lg:grid-cols-2">
            <div className="space-y-6">
              <SectionTitle title="Rentabilidad Operativa" sub="Valor neto por M2 según industria" />
              <div className="rounded-[32px] border border-border/30 dark:border-white/[0.06] bg-white dark:bg-[#1C1C1E] overflow-hidden p-6">
                <BarChart data={rentabilidadM2} color="#6366f1" prefix="$" />
                <p className="mt-6 text-[11px] font-bold text-muted-foreground bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                  💡 **Insight BI:** La industria con mayor ratio $/M2 indica mayor disposición de pago por pulcritud técnica. Enfoca esfuerzos comerciales en los segmentos más altos.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <SectionTitle title="Análisis de Churn (Fuga)" sub="¿Por qué estamos perdiendo negocios?" />
              <div className="rounded-[32px] border border-border/30 dark:border-white/[0.06] bg-white dark:bg-[#1C1C1E] overflow-hidden p-6">
                 <PieChart data={motivosPerdida} />
                 <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                       <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Pérdida Total</p>
                       <p className="text-xl font-black text-rose-500">{perdidos.length}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                       <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Win Rate</p>
                       <p className="text-xl font-black text-primary">{winRate}%</p>
                    </div>
                 </div>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-4">
        {[
          { label: 'Operación Rango', value: filteredDeals.length, icon: Briefcase },
          { label: 'Oportunidades', value: activos.length, icon: Target },
          { label: 'Cierres GANADOS', value: ganados.length, icon: TrendingUp },
          { label: 'Cierres PERDIDOS', value: perdidos.length, icon: TrendingDown },
        ].map(item => (
          <div key={item.label} className="flex flex-col items-center gap-2 p-6 bg-white dark:bg-[#1C1C1E] border border-border/30 dark:border-white/[0.06] rounded-[28px] shadow-sm dark:shadow-none hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:translate-y-[-4px] transition-all duration-500 group cursor-default">
            <item.icon className="h-4 w-4 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
            <div className="text-2xl font-black tabular-nums tracking-tighter text-foreground">{item.value}</div>
            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center opacity-60 leading-none">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
