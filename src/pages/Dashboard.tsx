import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase/client"

const fmtCLP = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
const fmtNum = (n: number) => new Intl.NumberFormat('es-CL').format(n)

// ── Mini SVG Pie Chart ────────────────────────────────────────────────
function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="text-center text-muted-foreground text-xs py-6">Sin datos</div>

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
    <div className="flex gap-4 items-center bg-muted/20 p-4 rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <svg viewBox="0 0 100 100" className="w-32 h-32 shrink-0 drop-shadow-sm">
        {total > 0 && slices.length === 1 ? (
          <circle cx="50" cy="50" r="40" fill={slices[0].color} stroke="var(--background)" strokeWidth="1.5" />
        ) : (
          slices.map((s, i) => {
            const start = polarToXY(s.startAngle, 40)
            const end = polarToXY(s.endAngle, 40)
            const largeArc = s.pct > 0.5 ? 1 : 0
            return (
              <path
                key={i}
                d={`M 50 50 L ${start.x} ${start.y} A 40 40 0 ${largeArc} 1 ${end.x} ${end.y} Z`}
                fill={s.color}
                stroke="var(--background)"
                strokeWidth="1.5"
              />
            )
          })
        )}
        <circle cx="50" cy="50" r="18" fill="var(--card)" />
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="truncate text-muted-foreground">{s.label}</span>
            <span className="ml-auto font-semibold">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mini Bar Chart ────────────────────────────────────────────────────
function BarChart({ data, color = '#6366f1' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground truncate max-w-[60%]">{d.label}</span>
            <span className="font-semibold">{fmtCLP(d.value)}</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(d.value / max) * 100}%`, background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = '#6366f1', trend }: {
  label: string; value: string; sub: string; color?: string; trend?: string
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col gap-2 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5 duration-300 group">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black tracking-tighter text-foreground transition-colors" style={{ color: value === '$0' ? 'inherit' : color }}>{value}</div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-[11px] text-muted-foreground/80 font-medium">{sub}</p>
        {trend && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{trend}</span>}
      </div>
    </div>
  )
}

// ── Section Title ─────────────────────────────────────────────────────
function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
      <div>
        <h2 className="font-extrabold text-lg tracking-tight text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────
export default function Dashboard() {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
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
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="text-muted-foreground animate-pulse text-sm">Cargando métricas...</div>
    </div>
  )

  // ── Data Calculations ────────────────────────────────────────────
  const ganados = deals.filter(d => d.stage === 6)
  const perdidos = deals.filter(d => d.stage === 7)
  const propuestas = deals.filter(d => d.stage === 4)
  const activos = deals.filter(d => d.stage >= 1 && d.stage <= 5)

  // A. Métricas Financieras
  const mrr = ganados.reduce((s, d) => s + (d.valor_neto || 0), 0)
  const pipelineForecast = propuestas.reduce((s, d) => s + (d.valor_neto || 0), 0)
  const ticketPromedio = ganados.length > 0 ? mrr / ganados.length : 0

  // B. Rendimiento Comercial
  const totalCerrados = ganados.length + perdidos.length
  const winRate = totalCerrados > 0 ? Math.round((ganados.length / totalCerrados) * 100) : 0

  const cicloVentas = (() => {
    const ciclos = ganados
      .filter(d => d.created_at)
      .map(d => {
        const fechaCierre = d.stage_changed_at || d.updated_at
        const dias = Math.floor((new Date(fechaCierre).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24))
        return dias > 0 ? dias : 0
      })
    return ciclos.length > 0 ? Math.round(ciclos.reduce((a, b) => a + b, 0) / ciclos.length) : -1
  })()

  const motivosPerdida = (() => {
    const counts: Record<string, number> = {}
    perdidos.forEach(d => {
      const m = d.motivo_perdida || 'No especificado'
      counts[m] = (counts[m] || 0) + 1
    })
    const colors = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#06b6d4', '#64748b']
    return Object.entries(counts).map(([label, value], i) => ({
      label, value, color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value)
  })()

  // C. Estrategia y Logística
  const porIndustria = (() => {
    const map: Record<string, number> = {}
    ganados.forEach(d => {
      const seg = d.companies?.segmento?.replace(/_/g, ' ') || 'Sin segmento'
      map[seg] = (map[seg] || 0) + (d.valor_neto || 0)
    })
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
    return Object.entries(map).map(([label, value], i) => ({
      label, value, color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value)
  })()

  const porComuna = (() => {
    const map: Record<string, number> = {}
    ganados.forEach(d => {
      const c = d.companies?.comuna?.replace(/_/g, ' ') || 'Sin comuna'
      map[c] = (map[c] || 0) + (d.valor_neto || 0)
    })
    return Object.entries(map).map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  })()

  const pipelineByStage = [
    { label: 'Prospección', stage: 1, color: '#94a3b8' },
    { label: 'Contacto Iniciado', stage: 2, color: '#60a5fa' },
    { label: 'Visita Agendada', stage: 3, color: '#818cf8' },
    { label: 'Propuesta Enviada', stage: 4, color: '#f59e0b' },
    { label: 'Negociación', stage: 5, color: '#fb923c' },
  ].map(s => ({
    label: s.label,
    stage: s.stage,
    color: s.color,
    count: deals.filter(d => d.stage === s.stage).length,
    value: deals.filter(d => d.stage === s.stage).reduce((a, d) => a + (d.valor_neto || 0), 0)
  }))

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard Ejecutivo</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Vista administrador · Datos en tiempo real</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="font-semibold text-foreground">{fmtNum(deals.length)} negocios</div>
          <div>en el pipeline</div>
        </div>
      </div>

      {/* ── A. MÉTRICAS FINANCIERAS ──────────────────────────────── */}
      <section>
        <SectionTitle title="Métricas Financieras y de Proyección" sub="Contratos activos, forecast y ticket promedio" />
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">
          <KpiCard
            label="MRR · Ingresos Cierres"
            value={fmtCLP(mrr)}
            sub={`${ganados.length} contratos cerrados ganados`}
            color="#10b981"
          />
          <KpiCard
            label="Pipeline Forecast"
            value={fmtCLP(pipelineForecast)}
            sub={`${propuestas.length} propuestas enviadas activas`}
            color="#6366f1"
          />
          <KpiCard
            label="Ticket Promedio B2B"
            value={fmtCLP(ticketPromedio)}
            sub={`Promedio por cierre ganado`}
            color="#f59e0b"
          />
        </div>

        {/* Pipeline por etapa */}
        <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-primary rounded-full" />
            Estado del Pipeline por Etapa
          </h3>
          <div className="space-y-3">
            {pipelineByStage.map(s => (
              <div key={s.stage} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-xs text-muted-foreground w-36 truncate">{s.label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${activos.length > 0 ? (s.count / activos.length) * 100 : 0}%`,
                    background: s.color
                  }} />
                </div>
                <span className="text-xs font-semibold w-6 text-center">{s.count}</span>
                <span className="text-xs text-muted-foreground w-28 text-right">{s.value > 0 ? fmtCLP(s.value) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── B. RENDIMIENTO COMERCIAL ─────────────────────────────── */}
      <section>
        <SectionTitle title="Rendimiento Comercial (Ventas)" sub="Conversión, ciclo de ventas y análisis de pérdidas" />
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
          <KpiCard
            label="Win Rate (Tasa Conv.)"
            value={`${winRate}%`}
            sub={`${ganados.length} ganados / ${perdidos.length} perdidos de ${totalCerrados} cerrados`}
            color={winRate >= 50 ? '#10b981' : winRate >= 30 ? '#f59e0b' : '#ef4444'}
          />
          <KpiCard
            label="Ciclo de Ventas"
            value={cicloVentas >= 0 ? `${cicloVentas} días` : '---'}
            sub="Promedio primer contacto → cierre ganado"
            color="#8b5cf6"
          />
        </div>

        {/* Pie chart motivos de pérdida */}
        <div className="mt-4 rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm mb-4">Motivos de Pérdida</h3>
          {motivosPerdida.length > 0 ? (
            <PieChart data={motivosPerdida} />
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">Sin negocios perdidos registrados</p>
              <p className="text-xs text-muted-foreground mt-1">Los motivos de pérdida se registran al mover un negocio a "Cierre Perdido"</p>
            </div>
          )}
        </div>
      </section>

      {/* ── C. ESTRATEGIA Y LOGÍSTICA ────────────────────────────── */}
      <section>
        <SectionTitle title="Estrategia y Logística" sub="Distribución por industria y concentración geográfica" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {/* Por industria */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm mb-4">Distribución por Industria</h3>
            {porIndustria.length > 0 ? (
              <PieChart data={porIndustria} />
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Sin datos de cierres ganados</p>
            )}
          </div>

          {/* Por comuna */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm mb-4">Concentración Geográfica (Ingresos)</h3>
            {porComuna.length > 0 ? (
              <BarChart data={porComuna} color="#6366f1" />
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Sin datos de cierres ganados</p>
            )}
          </div>
        </div>

        {/* Tabla resumen final */}
        <div className="mt-4 rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Resumen Ejecutivo</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Negocios', value: deals.length },
              { label: 'Negocios Activos', value: activos.length },
              { label: 'Cierres Ganados', value: ganados.length },
              { label: 'Cierres Perdidos', value: perdidos.length },
            ].map(item => (
              <div key={item.label} className="text-center p-4 bg-muted/20 border border-border/40 rounded-2xl shadow-sm hover:shadow-md transition-all">
                <div className="text-2xl font-black tracking-tighter text-foreground">{item.value}</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
