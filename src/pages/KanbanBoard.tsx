import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { supabase } from '../lib/supabase/client'
import { DealFormDialog } from '../components/DealFormDialog'
import { DealDetailsDialog } from '../components/DealDetailsDialog'
import { GripVertical, Building2, MapPin, ChevronRight, Briefcase } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

export const KANBAN_STAGES = [
  { id: 1, name: 'Prospección', color: '#94a3b8' },
  { id: 2, name: 'Contacto', color: '#60a5fa' },
  { id: 3, name: 'Visita', color: '#818cf8' },
  { id: 4, name: 'Propuesta', color: '#f59e0b' },
  { id: 5, name: 'Negociación', color: '#fb923c' },
  { id: 6, name: 'Ganado', color: '#10b981' },
  { id: 7, name: 'Perdido', color: '#ef4444' },
]

const fmtCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function KanbanBoard() {
  const [deals, setDeals] = useState<any[]>([])
  const [selectedDeal, setSelectedDeal] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [activeStageId, setActiveStageId] = useState(1)

  const fetchDeals = async () => {
    const { data, error } = await supabase
      .from('deals')
      .select('*, companies(*)')
      .order('created_at', { ascending: false })
    if (!error && data) setDeals(data)
  }

  useEffect(() => { fetchDeals() }, [])

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStageId = parseInt(destination.droppableId)
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

    if (error) fetchDeals()
  }

  const openDeal = (deal: any) => {
    setSelectedDeal(deal)
    setIsDetailsOpen(true)
  }

  const totalPipeline = deals
    .filter(d => d.stage >= 1 && d.stage <= 5)
    .reduce((sum, d) => sum + (d.valor_neto || 0), 0)

  const totalDeals = deals.filter(d => d.stage >= 1 && d.stage <= 5).length

  const activeStageDeals = deals.filter(d => d.stage === activeStageId)
  const activeStageValue = activeStageDeals.reduce((sum, d) => sum + (d.valor_neto || 0), 0)
  const activeStage = KANBAN_STAGES.find(s => s.id === activeStageId)

  // ── Deal Card Component ──────────────────────────────────────────
  const DealCard = ({ deal, isDragging = false, showGrip = false }: { deal: any; isDragging?: boolean; showGrip?: boolean }) => (
    <div
      onClick={() => openDeal(deal)}
      className={`bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 cursor-pointer group transition-all duration-300
        ${isDragging 
          ? 'shadow-2xl shadow-primary/20 ring-2 ring-primary/30 scale-[1.03] rotate-1' 
          : 'shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none hover:shadow-lg hover:-translate-y-0.5'
        }
        ${deal.stage === 6 ? 'border-l-[3px] border-l-emerald-500' : ''}
        ${deal.stage === 7 ? 'border-l-[3px] border-l-rose-500' : ''}
        ${deal.stage < 6 ? 'border border-border/20 dark:border-white/[0.06]' : ''}
      `}
    >
      {/* Top: Company + Grip */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-muted-foreground/60" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[13px] text-foreground truncate leading-tight group-hover:text-primary transition-colors">
              {deal.companies?.razon_social || 'Empresa'}
            </p>
            {deal.nombre_proyecto && (
              <p className="text-[11px] text-primary/80 font-semibold truncate leading-tight mt-0.5">
                {deal.nombre_proyecto}
              </p>
            )}
          </div>
        </div>
        {showGrip && (
          <GripVertical className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors shrink-0 mt-1" />
        )}
        {!showGrip && (
          <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary/60 transition-colors shrink-0 mt-1" />
        )}
      </div>

      {/* Location */}
      <div className="flex items-center gap-1.5 mt-2.5">
        <MapPin className="h-3 w-3 text-muted-foreground/30 shrink-0" />
        <span className="text-[10px] text-muted-foreground/60 font-semibold truncate uppercase tracking-wider">
          {deal.companies?.comuna?.replace(/_/g, ' ') || 'Sin ubicación'}
        </span>
      </div>

      {/* Bottom: Tags + Value */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-border/10 dark:border-white/[0.04]">
        <div className="flex gap-1.5 flex-wrap">
          <Badge className="text-[9px] font-bold px-2 h-5 bg-slate-100 dark:bg-[#2C2C2E] text-muted-foreground border-none tracking-wide">
            {deal.companies?.segmento?.replace(/_/g, ' ') || 'Industrial'}
          </Badge>
          {deal.is_contract && (
            <Badge className="text-[9px] font-bold px-2 h-5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 border-none tracking-wide">
              {deal.contract_months}M
            </Badge>
          )}
        </div>
        <span className="text-[14px] font-black text-foreground tabular-nums tracking-tight">
          {fmtCLP(deal.valor_neto || 0)}
        </span>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-[#F5F5F7] dark:bg-black">
      
      {/* Premium Header */}
      <div className="shrink-0 p-4 md:p-6 pb-0 md:pb-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px] mx-auto bg-white/70 dark:bg-[#1C1C1E]/50 backdrop-blur-3xl border border-white/50 dark:border-white/[0.05] rounded-[32px] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-none mb-2">
          <div>
            <h1 className="text-[28px] md:text-[36px] font-black tracking-tight text-foreground leading-none">
              Pipeline
            </h1>
            <p className="text-[13px] text-muted-foreground font-semibold mt-1">
              {totalDeals} oportunidades · {fmtCLP(totalPipeline)} en vuelo
            </p>
          </div>
          <DealFormDialog onDealCreated={fetchDeals} />
        </div>
      </div>

      {/* ── Mobile: Stage Tabs + List ────────────────── */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        
        {/* Stage Tabs */}
        <div className="shrink-0 px-4 pt-4 pb-2">
          <div className="flex overflow-x-auto gap-2 no-scrollbar">
            {KANBAN_STAGES.map(stage => {
              const count = deals.filter(d => d.stage === stage.id).length
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
              const stageDeals = deals.filter(d => d.stage === stage.id)
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.valor_neto || 0), 0)
              
              return (
                <div key={stage.id} className="flex flex-col w-[280px] shrink-0">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-[12px] font-bold text-foreground tracking-tight">{stage.name}</span>
                      <span className="text-[10px] font-bold text-muted-foreground/50 tabular-nums">{stageDeals.length}</span>
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground/50 tabular-nums">
                      {stageValue > 0 ? fmtCLP(stageValue) : ''}
                    </span>
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
                                <DealCard deal={deal} isDragging={snapshot.isDragging} showGrip />
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
