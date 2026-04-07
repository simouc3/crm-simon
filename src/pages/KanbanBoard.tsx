import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { DealDetailsDialog } from '../components/DealDetailsDialog'
import { Search } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

export const KANBAN_STAGES = [
  { id: 1, name: 'Prospección', color: '#64748b', probability: 0.1, label: 'P10%' },
  { id: 2, name: 'Contacto', color: '#0ea5e9', probability: 0.2, label: 'C20%' },
  { id: 3, name: 'Visita', color: '#8b5cf6', probability: 0.4, label: 'V40%' },
  { id: 4, name: 'Propuesta', color: '#f59e0b', probability: 0.6, label: 'P60%' },
  { id: 5, name: 'Negociación', color: '#f97316', probability: 0.8, label: 'N80%' },
  { id: 6, name: 'Ganado', color: '#10b981', probability: 1.0, label: 'G100%' },
  { id: 7, name: 'Perdido', color: '#ef4444', probability: 0.0, label: 'L0%' },
]

const fmtCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function KanbanBoard() {
  const [deals, setDeals] = useState<any[]>([])
  const [selectedDeal, setSelectedDeal] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [searchTerm, setSearchTerm] = useState('')

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const fetchDeals = async () => {
    const { data, error } = await supabase
      .from('deals')
      .select('*, companies(*)')
      .order('created_at', { ascending: false })
    if (!error && data) setDeals(data)
  }

  useEffect(() => { fetchDeals() }, [])

  // Filter deals logic: Stages 1-5 are always visible. Stages 6-7 are filtered by month/year.
  const filteredDeals = deals.filter(deal => {
    // Search filter
    if (searchTerm && !deal.title.toLowerCase().includes(searchTerm.toLowerCase()) && !deal.companies?.razon_social?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    if (deal.stage < 6) return true
    const dateStr = deal.stage_changed_at || deal.created_at
    const d = new Date(dateStr)
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear
  })

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStageId = parseInt(destination.droppableId)
    const oldStageId = parseInt(source.droppableId)
    const dealId = draggableId

    const updatedDeals = deals.map(d => 
      d.id === dealId ? { ...d, stage: newStageId, stage_changed_at: new Date().toISOString() } : d
    )
    setDeals(updatedDeals)

    const { error } = await supabase
      .from('deals')
      .update({ 
        stage: newStageId,
        stage_changed_at: new Date().toISOString()
      })
      .eq('id', dealId)

    if (!error && newStageId !== oldStageId) {
      // Automatización: Crear Tarea según la nueva etapa
      const d = new Date()
      let taskTitle = ''
      let daysToAdd = 0

      if (newStageId === 2) { taskTitle = 'Seguimiento de contacto inicial'; daysToAdd = 2; }
      else if (newStageId === 3) { taskTitle = 'Coordinar y preparar visita técnica'; daysToAdd = 2; }
      else if (newStageId === 4) { taskTitle = 'Hacer seguimiento de propuesta comercial'; daysToAdd = 3; }
      else if (newStageId === 5) { taskTitle = 'Revisar estado de cierre de negociación'; daysToAdd = 2; }

      if (taskTitle) {
        d.setDate(d.getDate() + daysToAdd)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const dealTitle = deals.find(x => x.id === dealId)?.nombre_proyecto || 'Oportunidad'
          await supabase.from('activities').insert([{
            deal_id: dealId,
            user_id: user.id,
            title: `[Automático] ${taskTitle} - ${dealTitle}`,
            type: 'Tarea',
            status: 'Pendiente',
            scheduled_at: d.toISOString(),
            notes: `Generado automáticamente al mover oportunidad a etapa: ${KANBAN_STAGES.find(s => s.id === newStageId)?.name || 'Nueva Etapa'}`
          }])
        }
      }
    }

    if (error) fetchDeals()
  }

  const openDeal = (deal: any) => {
    setSelectedDeal(deal)
    setIsDetailsOpen(true)
  }

  const totalPipeline = filteredDeals
    .filter(d => d.stage >= 1 && d.stage <= 6) // Include won
    .reduce((sum, d) => sum + (d.valor_neto || 0), 0)

  // Smart Forecast: Weighted Value (Probability * Value)
  const weightedForecast = filteredDeals
    .filter(d => d.stage >= 1 && d.stage <= 6)
    .reduce((sum, d) => {
      const prob = KANBAN_STAGES.find(s => s.id === d.stage)?.probability || 0
      return sum + ((d.valor_neto || 0) * prob)
    }, 0)

  const totalDeals = filteredDeals.filter(d => d.stage >= 1 && d.stage <= 6).length



  // ── Stage Palette — Apple System Precise ──────────
  const stageMap: Record<number, { hex: string; label: string }> = {
    1: { hex: '#8E8E93', label: 'Prospección' },  // System Gray
    2: { hex: '#007AFF', label: 'Contacto'    },  // System Blue
    3: { hex: '#AF52DE', label: 'Visita'      },  // System Purple
    4: { hex: '#FF9500', label: 'Propuesta'   },  // System Orange
    5: { hex: '#FFCC00', label: 'Negociación' },  // System Yellow
    6: { hex: '#34C759', label: 'Ganado'      },  // System Green
    7: { hex: '#FF3B30', label: 'Perdido'     },  // System Red
  }

  // ── Deal Card — Apple 2026 Minimal Execution ────────────────────
  const DealCard = ({ deal, isDragging = false }: { deal: any; isDragging?: boolean }) => {
    const s = stageMap[deal.stage] || stageMap[1]
    const isRisk = deal.is_risk

    return (
      <div
        onClick={() => openDeal(deal)}
        className={`
          group cursor-pointer select-none
          bg-white dark:bg-[#1C1C1E]
          rounded-[22px] overflow-hidden
          border border-black/[0.04] dark:border-white/[0.06]
          relative
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isDragging
            ? 'scale-[1.04] shadow-[0_30px_60px_rgba(0,0,0,0.15)] z-50 ring-1 ring-primary/30'
            : 'shadow-[0_4px_12px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.06)] active:scale-[0.98] hover:-translate-y-1'
          }
        `}
      >
        {/* Subtle top indicator — Apple Dynamic Style */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full opacity-60"
          style={{ backgroundColor: isRisk ? '#FF3B30' : s.hex }}
        />

        <div className="px-5 py-5 relative z-10">
          {/* Row 1: Badges (Refined Glass) */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tight px-2.5 py-1 rounded-full bg-slate-50 dark:bg-white/5 text-slate-500 border border-slate-100 dark:border-white/5"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isRisk ? 'animate-pulse' : ''}`} style={{ backgroundColor: isRisk ? '#FF3B30' : s.hex }} />
                {isRisk ? 'Alerta' : s.label}
              </span>
              
              {deal.ai_probability && (
                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tight px-2.5 py-1 rounded-full bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 backdrop-blur-sm">
                  {deal.ai_probability}%
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Header (Squircle + Info) */}
          <div className="flex items-center gap-3.5 mb-5">
            <div
              className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 font-bold text-base text-white shadow-sm ring-1 ring-black/[0.03]"
              style={{ backgroundColor: isRisk ? '#FF3B30' : s.hex + 'CC' }}
            >
              {(deal.companies?.razon_social || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-[15px] tracking-tight text-slate-900 dark:text-white truncate leading-none mb-1">
                {deal.companies?.razon_social || 'Empresa Sin Nombre'}
              </h4>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate leading-none">
                {deal.companies?.contact_name || 'Sin contacto'}
              </p>
            </div>
          </div>

          {/* Row 3: Metrics (Seamless, No island box) */}
          <div className="mb-5 pt-4 border-t border-slate-50 dark:border-white/5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 opacity-50">Inversión</p>
                <p className={`text-[19px] font-bold tracking-tight text-slate-900 dark:text-white tabular-nums leading-none`}>
                  {fmtCLP(deal.valor_neto || 0)}
                </p>
              </div>
              <div className="text-right">
                {deal.is_contract ? (
                  <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    SLA {deal.contract_months}M
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Spot</span>
                )}
              </div>
            </div>
          </div>

          {/* Row 4: Actions (Integrated & Subtle) */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              {deal.companies?.contact_phone && (
                <a href={`tel:${deal.companies.contact_phone}`}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-emerald-500 transition-all">
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.72 6.72l1.28-1.34a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                </a>
              )}
              {deal.companies?.contact_email && (
                <a href={`mailto:${deal.companies.contact_email}`}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-blue-500 transition-all">
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
                </a>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-tighter group-hover:text-primary transition-colors">
              Gestionar
              <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-[#F5F5F7] dark:bg-[#0D0D17]">
      {/* ── Mobile Header Area ── */}
      <div className="md:hidden shrink-0 p-4 pb-0">
        <div className="bg-white dark:bg-[#141420] rounded-[28px] p-4 border border-black/[0.04] dark:border-white/[0.07] shadow-sm">
          
          {/* Compact Mobile Header (Deeper Density) */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="h-1 w-3 rounded-full bg-primary" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">Pipeline</span>
              </div>
              <h1 className="text-[18px] font-black tracking-tighter text-foreground leading-none">
                Flujo Comercial
              </h1>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black uppercase tracking-widest text-primary opacity-60 leading-none mb-1">Cierre Realista</span>
              <p className="text-[14px] text-primary font-black tracking-tight leading-none">
                {fmtCLP(weightedForecast)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))} className="bg-slate-50 dark:bg-white/5 rounded-xl px-2 h-8 text-[9px] font-black uppercase tracking-wider text-foreground outline-none border border-black/[0.04] dark:border-white/5">
              {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))} className="bg-slate-50 dark:bg-white/5 rounded-xl px-2 h-8 text-[9px] font-black uppercase tracking-wider text-foreground outline-none border border-black/[0.04] dark:border-white/5">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-30 group-focus-within:text-primary transition-colors z-10" />
            <input 
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-full bg-slate-50 dark:bg-white/5 border border-border/40 dark:border-white/5 outline-none font-bold text-[11px] tracking-tight"
            />
          </div>
        </div>
      </div>

      {/* ── Desktop Header (Clean Slate) ── */}
      <div className="hidden md:block shrink-0 p-12 pb-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between max-w-[1600px] mx-auto py-10 border-b border-black/[0.03] dark:border-white/[0.03]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-8 rounded-full bg-primary" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">Sales Pipeline</span>
            </div>
            <h1 className="text-[64px] font-black tracking-tighter text-foreground leading-[0.9] -ml-1">
              Flujo Comercial
            </h1>
            <div className="space-y-1">
              <p className="text-[14px] text-muted-foreground font-black uppercase tracking-widest opacity-40">
                {totalDeals} oportunidades en vuelo · {fmtCLP(totalPipeline)} bruto total
              </p>
              <p className="text-[13px] text-primary font-black uppercase tracking-widest">
                Forecast Ponderado: {fmtCLP(weightedForecast)} (Probabilidad % aplicada)
              </p>
            </div>
          </div>
          <div className="flex flex-col md:items-end gap-5 mt-10 md:mt-0">
            <div className="flex items-center gap-3">
              <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))} className="bg-slate-50 dark:bg-white/5 rounded-full px-5 h-11 text-[10px] font-black uppercase tracking-widest text-foreground outline-none cursor-pointer border border-black/[0.03] dark:border-white/5 shadow-sm">
                {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))} className="bg-slate-50 dark:bg-white/5 rounded-full px-5 h-11 text-[10px] font-black uppercase tracking-widest text-foreground outline-none cursor-pointer border border-black/[0.03] dark:border-white/5 shadow-sm">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Kanban Columns (Unified Desktop & Mobile Snap-X) ──────────────────── */}
      <div className="flex-1 overflow-x-auto px-4 md:px-6 py-6 snap-x snap-mandatory scroll-smooth hide-scrollbar min-h-screen">
        <div className="flex gap-4 md:gap-5 items-start min-h-[600px] max-w-[1600px] mx-auto pb-32">
          <DragDropContext onDragEnd={onDragEnd}>
            {KANBAN_STAGES.map(stage => {
              const stageDeals = filteredDeals.filter(d => d.stage === stage.id)
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.valor_neto || 0), 0)
              
              return (
                <div key={stage.id} className="flex flex-col w-[85vw] md:w-[280px] shrink-0 snap-center">
                  {/* Column Header */}
                  <div className="flex items-end justify-between mb-4 md:mb-6 px-1 md:px-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">{stage.name}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                         <span className="text-2xl font-black tracking-tighter leading-none">{stageDeals.length}</span>
                         <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Deals</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="text-[13px] font-black tracking-tight tabular-nums opacity-60">
                         {stageValue > 0 ? fmtCLP(stageValue) : ''}
                       </span>
                    </div>
                  </div>

                  {/* Droppable Column */}
                  <Droppable droppableId={String(stage.id)}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex flex-col gap-2.5 p-2 md:p-3 rounded-2xl min-h-[70vh] md:min-h-[500px] transition-colors duration-200 ${
                          snapshot.isDraggingOver 
                            ? 'bg-primary/[0.05] ring-1 ring-primary/20 ring-inset' 
                            : 'bg-black/[0.02] dark:bg-white/[0.02]'
                        }`}
                      >
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={String(deal.id)} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <DealCard 
                                  deal={deal} 
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {stageDeals.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex-1 flex items-center justify-center opacity-20 py-10">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">
                              Arrastra aquí
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </DragDropContext>
        </div>
      </div>

      <DealDetailsDialog
        deal={selectedDeal}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onDealUpdated={fetchDeals}
      />
    </div>
  )
}
