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
        ${deal.is_risk ? 'border-l-[3px] border-l-rose-600 ring-1 ring-rose-500/20 shadow-lg shadow-rose-500/10' : ''}
        ${deal.stage < 6 && !deal.is_risk ? 'border border-border/20 dark:border-white/[0.06]' : ''}
      `}
    >
      {/* Top: Company + Grip */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            deal.is_risk ? 'bg-rose-500 shadow-lg shadow-rose-500/30' : 'bg-slate-100/50 dark:bg-white/5'
          }`}>
            {deal.is_risk ? <span className="text-white text-[10px] font-black animate-pulse">!</span> : <Building2 className="h-4 w-4 text-muted-foreground/60" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-[13px] text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                {deal.companies?.razon_social || 'Empresa'}
              </p>
              {deal.is_risk && (
                 <span className="shrink-0 text-[8px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter animate-bounce">Riesgo</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {deal.companies?.lead_score && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 shadow-sm ${
                  deal.companies.lead_score >= 80 ? 'bg-emerald-500 text-white' : 
                  deal.companies.lead_score >= 50 ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'
                }`}>
                  {deal.companies.lead_score}
                </span>
              )}
              {deal.nombre_proyecto && (
                <p className="text-[11px] text-primary/80 font-semibold truncate leading-tight">
                  {deal.nombre_proyecto}
                </p>
              )}
            </div>
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
      
      {/* Ultra Minimalist Header */}
      <div className="shrink-0 p-4 md:p-6 pb-0 md:pb-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-[#1C1C1E] rounded-[40px] p-8 md:px-10 md:py-8 mb-4 border border-black/[0.02] dark:border-white/[0.02] max-w-[1600px] mx-auto">
          <div className="space-y-1">
            <h1 className="text-[36px] md:text-[42px] font-black tracking-tight text-foreground leading-none">
              Pipeline
            </h1>
            <p className="text-[13px] text-muted-foreground font-semibold">
              {totalDeals} oportunidades · {fmtCLP(totalPipeline)} en vuelo
            </p>
          </div>
          <div className="flex flex-col md:items-end gap-3 mt-6 md:mt-0">
            <div className="flex items-center gap-2">
              <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))} className="bg-[#F8FAFC] dark:bg-[#2C2C2E] rounded-full px-4 h-9 text-[11px] font-black uppercase tracking-widest text-foreground outline-none cursor-pointer border border-border/20">
                {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))} className="bg-[#F8FAFC] dark:bg-[#2C2C2E] rounded-full px-4 h-9 text-[11px] font-black uppercase tracking-widest text-foreground outline-none cursor-pointer border border-border/20">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <DealFormDialog onDealCreated={fetchDeals} />
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-40 text-right pr-4">
               Filtrando Histórico (Ganados/Perdidos)
            </p>
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
