import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { DealFormDialog } from '../components/DealFormDialog'
import { DealDetailsDialog } from '../components/DealDetailsDialog'
import { Briefcase } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

export const KANBAN_STAGES = [
  { id: 1, name: 'Prospección', color: '#64748b', bg: 'bg-slate-500/[0.03]', border: 'border-slate-500/10' },
  { id: 2, name: 'Contacto', color: '#0ea5e9', bg: 'bg-sky-500/[0.04]', border: 'border-sky-500/20' },
  { id: 3, name: 'Visita', color: '#8b5cf6', bg: 'bg-violet-500/[0.04]', border: 'border-violet-500/20' },
  { id: 4, name: 'Propuesta', color: '#f59e0b', bg: 'bg-amber-500/[0.04]', border: 'border-amber-500/20' },
  { id: 5, name: 'Negociación', color: '#f97316', bg: 'bg-orange-500/[0.04]', border: 'border-orange-500/20' },
  { id: 6, name: 'Ganado', color: '#10b981', bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/30' },
  { id: 7, name: 'Perdido', color: '#ef4444', bg: 'bg-rose-500/[0.06]', border: 'border-rose-500/30' },
]

const fmtCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function KanbanBoard() {
  const [deals, setDeals] = useState<any[]>([])
  const [selectedDeal, setSelectedDeal] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [activeStageId, setActiveStageId] = useState(1)
  
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())

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
    .filter(d => d.stage >= 1 && d.stage <= 5)
    .reduce((sum, d) => sum + (d.valor_neto || 0), 0)

  const totalDeals = filteredDeals.filter(d => d.stage >= 1 && d.stage <= 5).length

  const activeStageDeals = filteredDeals.filter(d => d.stage === activeStageId)
  const activeStageValue = activeStageDeals.reduce((sum, d) => sum + (d.valor_neto || 0), 0)
  const activeStage = KANBAN_STAGES.find(s => s.id === activeStageId)

  // Stage palette — Apple 2026
  const stageMap: Record<number, { tint: string; border: string; dot: string; label: string; hex: string }> = {
    1: { hex: '#8E8E93', tint: 'bg-white dark:bg-[#1C1C1E]',         border: 'border-l-slate-300',   dot: 'bg-slate-400',    label: 'Prospección'  },
    2: { hex: '#32ADE6', tint: 'bg-sky-50/60 dark:bg-sky-950/10',     border: 'border-l-sky-400',     dot: 'bg-sky-500',      label: 'Contacto'     },
    3: { hex: '#BF5AF2', tint: 'bg-violet-50/60 dark:bg-violet-950/10', border: 'border-l-violet-400', dot: 'bg-violet-500',   label: 'Visita'       },
    4: { hex: '#FF9F0A', tint: 'bg-amber-50/60 dark:bg-amber-950/10', border: 'border-l-amber-400',   dot: 'bg-amber-500',    label: 'Propuesta'    },
    5: { hex: '#FF6B00', tint: 'bg-orange-50/60 dark:bg-orange-950/10', border: 'border-l-orange-400', dot: 'bg-orange-500',  label: 'Negociación'  },
    6: { hex: '#34C759', tint: 'bg-emerald-50/60 dark:bg-emerald-950/10', border: 'border-l-emerald-400', dot: 'bg-emerald-500', label: 'Ganado'     },
    7: { hex: '#FF3B30', tint: 'bg-rose-50/60 dark:bg-rose-950/10',   border: 'border-l-rose-400',    dot: 'bg-rose-500',     label: 'Perdido'      },
  }

  // ── Deal Card — Ultra Minimalist Apple 2026 ─────────────────────
  const DealCard = ({ deal, isDragging = false }: { deal: any; isDragging?: boolean }) => {
    const s = stageMap[deal.stage] || stageMap[1]
    const isRisk = deal.is_risk
    return (
      <div
        onClick={() => openDeal(deal)}
        className={`
          relative cursor-pointer select-none
          rounded-2xl border-l-[3px] overflow-hidden
          transition-all duration-300 ease-out
          ${s.tint} ${isRisk ? 'border-l-rose-500' : s.border}
          border border-black/[0.06] dark:border-white/[0.06]
          ${isDragging
            ? 'scale-[1.03] rotate-[0.5deg] shadow-[0_24px_64px_rgba(0,0,0,0.2)] z-50'
            : 'shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.09)] hover:-translate-y-0.5'
          }
        `}
      >
        <div className="px-4 py-3.5 flex flex-col gap-2.5">

          {/* Row 1: Stage dot + label + risk + score */}
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isRisk ? 'bg-rose-500 animate-pulse' : s.dot}`} />
            <span className={`text-[9px] font-black uppercase tracking-[0.18em] ${isRisk ? 'text-rose-500' : 'text-muted-foreground/50'}`}>
              {isRisk ? 'Riesgo' : s.label}
            </span>
            {deal.companies?.lead_score > 0 && (
              <span className={`ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none ${
                deal.companies.lead_score >= 80 ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400' :
                deal.companies.lead_score >= 50 ? 'text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400' :
                'text-slate-500 bg-slate-100 dark:bg-slate-800'
              }`}>{deal.companies.lead_score}pts</span>
            )}
          </div>

          {/* Row 2: Company name */}
          <h4 className="font-black text-[14px] tracking-[-0.02em] leading-tight text-foreground line-clamp-1">
            {deal.companies?.razon_social || 'Sin empresa'}
          </h4>

          {/* Row 3: Amount + zone */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-black tracking-[-0.03em] tabular-nums text-foreground/80">
              {fmtCLP(deal.valor_neto || 0)}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest ml-2 truncate">
              {deal.is_contract ? `SLA ${deal.contract_months}M` : deal.companies?.comuna?.replace(/_/g, ' ') || 'Spot'}
            </span>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#F5F5F7] dark:bg-black">
      {/* ── Mobile Header — White card with rounded corners ── */}
      <div className="md:hidden shrink-0 p-4 pb-0">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[28px] p-5 border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
          
          {/* Title */}
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1.5 w-5 rounded-full bg-primary" />
            <span className="text-[9px] font-black uppercase tracking-[0.35em] text-muted-foreground opacity-40">Sales Pipeline</span>
          </div>
          <h1 className="text-[28px] font-black tracking-tighter text-foreground leading-none mb-1">
            Flujo Comercial
          </h1>
          <p className="text-[11px] text-muted-foreground font-bold opacity-40 mb-4">
            {totalDeals} oportunidades · {fmtCLP(totalPipeline)}
          </p>

          {/* Period selectors */}
          <div className="flex items-center gap-2">
            <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))} className="flex-1 bg-slate-50 dark:bg-white/5 rounded-xl px-3 h-9 text-[10px] font-black uppercase tracking-wider text-foreground outline-none border border-black/[0.04] dark:border-white/5">
              {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))} className="bg-slate-50 dark:bg-white/5 rounded-xl px-3 h-9 text-[10px] font-black uppercase tracking-wider text-foreground outline-none border border-black/[0.04] dark:border-white/5">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* New deal button — below period */}
          <div className="mt-3">
            <DealFormDialog onDealCreated={fetchDeals} />
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
            <p className="text-[14px] text-muted-foreground font-black uppercase tracking-widest opacity-40">
              {totalDeals} oportunidades en vuelo · {fmtCLP(totalPipeline)} proyectados
            </p>
          </div>
          <div className="flex flex-col md:items-end gap-5 mt-10 md:mt-0">
            <div className="flex items-center gap-3">
              <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))} className="bg-slate-50 dark:bg-white/5 rounded-full px-5 h-11 text-[10px] font-black uppercase tracking-widest text-foreground outline-none cursor-pointer border border-black/[0.03] dark:border-white/5 shadow-sm">
                {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))} className="bg-slate-50 dark:bg-white/5 rounded-full px-5 h-11 text-[10px] font-black uppercase tracking-widest text-foreground outline-none cursor-pointer border border-black/[0.03] dark:border-white/5 shadow-sm">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <DealFormDialog onDealCreated={fetchDeals} />
            </div>
          </div>
        </div>
      </div>


      {/* ── Mobile: Stage Tabs + List ────────────────── */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        
        {/* Stage Tabs */}
        <div className="shrink-0 px-4 pt-4 pb-2">
          <div className="flex overflow-x-auto gap-2 no-scrollbar">
            {KANBAN_STAGES.map(stage => {
              const count = filteredDeals.filter(d => d.stage === stage.id).length
              const isActive = activeStageId === stage.id
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageId(stage.id)}
                  className={`shrink-0 h-9 px-4 rounded-full flex items-center gap-2 transition-all duration-200 text-[11px] font-bold ${
                    isActive 
                      ? 'bg-foreground text-background' 
                      : 'bg-white dark:bg-[#1C1C1E] text-muted-foreground'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span>{stage.name}</span>
                  <span className={`text-[10px] font-black ${isActive ? 'text-background/60' : 'text-muted-foreground/40'}`}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Active Stage Info */}
        <div className="shrink-0 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeStage?.color }} />
            <span className="text-[11px] font-black text-foreground uppercase tracking-wider">{activeStage?.name}</span>
          </div>
          <span className="text-[12px] font-black text-primary tabular-nums">{fmtCLP(activeStageValue)}</span>
        </div>

        {/* Deal List */}
        <div className="flex-1 overflow-y-auto px-4 pb-32">
          <div className="space-y-2">
            {activeStageDeals.length > 0 ? (
              activeStageDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <Briefcase className="h-8 w-8 mb-3 text-muted-foreground" />
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Sin negocios en {activeStage?.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop: Kanban Columns ──────────────────── */}
      <div className="hidden md:block flex-1 overflow-x-auto px-6 py-6">
        <div className="flex gap-5 items-start min-h-[600px] max-w-[1600px] mx-auto">
          <DragDropContext onDragEnd={onDragEnd}>
            {KANBAN_STAGES.map(stage => {
              const stageDeals = filteredDeals.filter(d => d.stage === stage.id)
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.valor_neto || 0), 0)
              
              return (
                <div key={stage.id} className="flex flex-col w-[280px] shrink-0">
                  {/* Column Header */}
                  <div className="flex items-end justify-between mb-6 px-3">
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
                        className={`flex flex-col gap-2.5 p-3 rounded-2xl min-h-[500px] transition-colors duration-200 ${
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
                          <div className="flex-1 flex items-center justify-center opacity-20">
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
