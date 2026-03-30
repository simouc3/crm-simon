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

  // Stage palette — Apple 2026 style (tinted backgrounds, not gradients)
  const stageMap: Record<number, { hex: string; tint: string; border: string; badge: string; dot: string; label: string }> = {
    1: { hex: '#8E8E93', tint: 'bg-slate-50/80 dark:bg-slate-900/30',       border: 'border-l-slate-300 dark:border-l-slate-600',   badge: 'text-slate-500 bg-slate-100/80 dark:bg-slate-800/60',    dot: 'bg-slate-400',    label: 'Prospección'  },
    2: { hex: '#32ADE6', tint: 'bg-sky-50/80 dark:bg-sky-950/20',           border: 'border-l-sky-400 dark:border-l-sky-500',         badge: 'text-sky-600 bg-sky-100/80 dark:bg-sky-950/50',          dot: 'bg-sky-500',      label: 'Contacto'     },
    3: { hex: '#BF5AF2', tint: 'bg-violet-50/80 dark:bg-violet-950/20',     border: 'border-l-violet-400 dark:border-l-violet-500',   badge: 'text-violet-600 bg-violet-100/80 dark:bg-violet-950/50', dot: 'bg-violet-500',   label: 'Visita'       },
    4: { hex: '#FF9F0A', tint: 'bg-amber-50/80 dark:bg-amber-950/20',       border: 'border-l-amber-400 dark:border-l-amber-500',     badge: 'text-amber-700 bg-amber-100/80 dark:bg-amber-950/50',    dot: 'bg-amber-500',    label: 'Propuesta'    },
    5: { hex: '#FF6B00', tint: 'bg-orange-50/80 dark:bg-orange-950/20',     border: 'border-l-orange-400 dark:border-l-orange-500',   badge: 'text-orange-700 bg-orange-100/80 dark:bg-orange-950/50', dot: 'bg-orange-500',   label: 'Negociación'  },
    6: { hex: '#34C759', tint: 'bg-emerald-50/80 dark:bg-emerald-950/20',   border: 'border-l-emerald-400 dark:border-l-emerald-500', badge: 'text-emerald-700 bg-emerald-100/80 dark:bg-emerald-950/50', dot: 'bg-emerald-500', label: 'Ganado'       },
    7: { hex: '#FF3B30', tint: 'bg-rose-50/80 dark:bg-rose-950/20',         border: 'border-l-rose-400 dark:border-l-rose-500',       badge: 'text-rose-600 bg-rose-100/80 dark:bg-rose-950/50',       dot: 'bg-rose-500',     label: 'Perdido'      },
  }

  // ── Deal Card Component — Apple 2026 ─────────────────────────────
  const DealCard = ({ deal, isDragging = false }: { deal: any; isDragging?: boolean }) => {
    const s = stageMap[deal.stage] || stageMap[1]
    const isRisk = deal.is_risk

    return (
      <div
        onClick={() => openDeal(deal)}
        className={`
          relative cursor-pointer group select-none
          rounded-[22px] border-l-[3px] overflow-hidden
          transition-all duration-500 ease-out
          ${s.tint} ${isRisk ? 'border-l-rose-500' : s.border}
          ${isDragging
            ? 'scale-[1.04] rotate-[0.8deg] shadow-[0_32px_80px_rgba(0,0,0,0.22)] z-50'
            : 'shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.10)] hover:-translate-y-1'
          }
          border border-black/[0.05] dark:border-white/[0.05]
        `}
      >
        {/* Content */}
        <div className="p-5">

          {/* Top row: Stage badge + lead score */}
          <div className="flex items-center justify-between mb-4">
            <div className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-1 rounded-full ${isRisk ? 'bg-rose-100/80 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300' : s.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isRisk ? 'bg-rose-500 animate-pulse' : s.dot}`} />
              {isRisk ? 'Riesgo Activo' : s.label}
            </div>

            {deal.companies?.lead_score > 0 && (
              <div className={`text-[10px] font-black tabular-nums px-2 py-0.5 rounded-lg ${
                deal.companies.lead_score >= 80 ? 'text-emerald-700 bg-emerald-100/80 dark:bg-emerald-950/50 dark:text-emerald-400' :
                deal.companies.lead_score >= 50 ? 'text-amber-700 bg-amber-100/80 dark:bg-amber-950/50 dark:text-amber-400' :
                'text-slate-500 bg-slate-100/80 dark:bg-slate-800/60'
              }`}>
                {deal.companies.lead_score}pts
              </div>
            )}
          </div>

          {/* Company name — Hero element */}
          <div className="mb-4">
            <h4 className="font-black text-[17px] tracking-[-0.03em] leading-[1.15] text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
              {deal.companies?.razon_social || 'Sin empresa'}
            </h4>
            {deal.nombre_proyecto && deal.nombre_proyecto !== 'Nuevo Proyecto' && (
              <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] mt-1 truncate">
                {deal.nombre_proyecto}
              </p>
            )}
          </div>

          {/* Key metric: Value */}
          <div className="mb-4">
            <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest mb-0.5">Inversión</p>
            <p className="text-[20px] font-black tracking-[-0.04em] tabular-nums text-foreground leading-none">
              {fmtCLP(deal.valor_neto || 0)}
            </p>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between pt-3.5 border-t border-black/[0.05] dark:border-white/[0.05]">
            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest truncate">
              {deal.companies?.comuna?.replace(/_/g, ' ') || '—'}
            </span>

            {deal.is_contract ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full uppercase tracking-widest flex-shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                SLA {deal.contract_months}M
              </span>
            ) : (
              <span className="text-[9px] font-black text-muted-foreground/25 uppercase tracking-widest flex-shrink-0">Spot</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#F5F5F7] dark:bg-black">
      
      {/* Ultra Minimalist Header (Clean Slate) */}
      <div className="shrink-0 p-8 md:p-12 pb-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between max-w-[1600px] mx-auto py-10 border-b border-black/[0.03] dark:border-white/[0.03]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-8 rounded-full bg-primary" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">Sales Pipeline</span>
            </div>
            <h1 className="text-[48px] md:text-[64px] font-black tracking-tighter text-foreground leading-[0.9] -ml-1">
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
