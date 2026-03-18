import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { supabase } from '../lib/supabase/client'
import { DealFormDialog } from '../components/DealFormDialog'
import { DealDetailsDialog } from '../components/DealDetailsDialog'
import { Maximize2, GripVertical, Building2, MapPin, ChevronRight, Activity } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'

export const KANBAN_STAGES = [
  { id: 1, name: 'Prospección' },
  { id: 2, name: 'Contacto' },
  { id: 3, name: 'Visita' },
  { id: 4, name: 'Propuesta' },
  { id: 5, name: 'Negociación' },
  { id: 6, name: 'Ganado' },
  { id: 7, name: 'Perdido' },
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

  const totalGanado = deals
    .filter(d => d.stage === 6)
    .reduce((sum, d) => sum + (d.valor_neto || 0), 0)

  const activeStageDeals = deals.filter(d => d.stage === activeStageId)
  const activeStageValue = activeStageDeals.reduce((sum, d) => sum + (d.valor_neto || 0), 0)

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] dark:bg-slate-950">
      {/* Header Premium */}
      <div className="shrink-0 p-6 md:p-10 bg-white dark:bg-slate-900 border-b border-border/40 dark:border-white/5 mx-[-1.5rem] mt-[-1.5rem] md:mx-0 md:mt-0 shadow-sm md:shadow-none">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between max-w-7xl mx-auto">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg tracking-wider">COMERCIAL</span>
              <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Pipeline Progress</span>
            </div>
            <h1 className="text-[32px] font-black tracking-tighter text-foreground leading-[1.1] md:text-4xl">
              Flujo de <span className="text-primary italic">Negocios</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border border-border/40 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Total Ganado</span>
                <span className="text-[18px] font-black text-emerald-600 tabular-nums tracking-tighter">{fmtCLP(totalGanado)}</span>
              </div>
              <div className="w-px h-8 bg-border/40" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase opacity-60">En Vuelo</span>
                <span className="text-[18px] font-black text-foreground tabular-nums tracking-tighter">{deals.filter(d => d.stage < 6).length}</span>
              </div>
            </div>
            <DealFormDialog onDealCreated={fetchDeals} />
          </div>
        </div>
      </div>

      {/* Mobile Stage Selector (Carousel) */}
      <div className="md:hidden shrink-0 bg-white dark:bg-slate-900 border-b border-border/40 sticky top-0 z-20 py-4 flex flex-col gap-4">
         <div className="px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Activity className="h-4 w-4 text-primary" />
               <span className="text-[11px] font-black text-foreground uppercase tracking-widest">Estado: {KANBAN_STAGES.find(s => s.id === activeStageId)?.name}</span>
            </div>
            <span className="text-[11px] font-black bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full tabular-nums">{fmtCLP(activeStageValue)}</span>
         </div>
         
         <div className="flex overflow-x-auto px-6 gap-2 no-scrollbar pb-1">
            {KANBAN_STAGES.map(stage => {
              const count = deals.filter(d => d.stage === stage.id).length
              const isActive = activeStageId === stage.id
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageId(stage.id)}
                  className={`shrink-0 h-12 px-6 rounded-full flex items-center gap-3 transition-all border ${
                    isActive 
                      ? 'bg-primary border-primary text-white shadow-[0_10px_30px_rgba(0,122,255,0.3)] scale-105' 
                      : 'bg-slate-50 dark:bg-slate-800 border-border/40 text-muted-foreground'
                  }`}
                >
                  <span className="text-[11px] font-black uppercase tracking-tight">{stage.name}</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>{count}</span>
                </button>
              )
            })}
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-x-auto md:overflow-visible custom-scrollbar px-6 md:px-10 py-8 max-w-7xl mx-auto w-full">
        
        {/* Mobile Vertical List View */}
        <div className="md:hidden space-y-4 pb-20">
           {activeStageDeals.length > 0 ? (
             activeStageDeals.map((deal) => (
               <div 
                 key={deal.id}
                 onClick={() => openDeal(deal)}
                 className="bg-white dark:bg-slate-900 border border-border/40 rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] relative overflow-hidden group active:scale-95 transition-all duration-500"
               >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
                 
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-14 h-14 rounded-[20px] bg-white dark:bg-slate-800 flex items-center justify-center border border-border/20 shadow-sm relative z-10">
                          <Building2 className="h-7 w-7 text-primary/60" />
                       </div>
                       <div>
                          <h3 className="font-black text-lg tracking-tighter text-foreground leading-tight">{deal.companies?.razon_social || 'Empresa'}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                             <MapPin className="h-3 w-3 text-emerald-500 opacity-40 shrink-0" />
                             <span className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">{deal.companies?.comuna?.replace(/_/g, ' ') || 'Zonas Varias'}</span>
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="text-[16px] font-black text-primary tracking-tighter">{fmtCLP(deal.valor_neto || 0)}</div>
                       <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40 tracking-widest">Valor Neto</span>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 pt-4 border-t border-border/40">
                    <div className="flex flex-col gap-0.5">
                       <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Superficie</span>
                       <span className="text-xs font-bold text-foreground">{deal.companies?.m2_estimados ? `${Number(deal.companies.m2_estimados).toLocaleString('es-CL')}m²` : '—'}</span>
                    </div>
                    <div className="w-px h-6 bg-border/40" />
                    <div className="flex flex-col gap-0.5">
                       <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Segmento</span>
                       <span className="text-xs font-bold text-primary">{deal.companies?.segmento?.replace(/_/g, ' ') || 'Industrial'}</span>
                    </div>
                    <div className="ml-auto">
                       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-primary/5 text-primary">
                          <ChevronRight className="h-5 w-5" />
                       </Button>
                    </div>
                 </div>
               </div>
             ))
           ) : (
             <div className="flex flex-col items-center justify-center p-20 opacity-40 font-black uppercase text-xs tracking-[0.2em] text-center border-2 border-dashed border-border/40 rounded-[40px]">
                Escenario Despejado en {KANBAN_STAGES.find(s => s.id === activeStageId)?.name}
             </div>
           )}
        </div>

        {/* Desktop Kanban View */}
        <div className="hidden md:flex gap-6 items-start list-none min-h-[500px]">
          <DragDropContext onDragEnd={onDragEnd}>
            {KANBAN_STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage.id)
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.valor_neto || 0), 0)
              
              return (
                <div key={stage.id} className="flex flex-col w-[300px] shrink-0">
                  <div className="shrink-0 mb-6 px-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shadow-lg ${
                          stage.id === 6 ? 'bg-emerald-500 shadow-emerald-500/30' :
                          stage.id === 7 ? 'bg-rose-500 shadow-rose-500/30' :
                          'bg-primary/40 shadow-primary/20'
                        }`} />
                        <h3 className="text-[12px] font-black uppercase tracking-widest text-foreground/80">{stage.name}</h3>
                      </div>
                      <span className="text-[11px] font-black tabular-nums bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl">
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="text-sm font-black text-primary tabular-nums tracking-tighter opacity-80">
                      {fmtCLP(stageValue)}
                    </div>
                  </div>

                  <Droppable droppableId={String(stage.id)}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex flex-col gap-4 p-4 transition-all duration-500 rounded-[40px] min-h-[600px] border shadow-inner ${
                          snapshot.isDraggingOver ? 'bg-primary/[0.04] border-primary/20 shadow-primary/5' : 'bg-slate-50/50 dark:bg-white/[0.02] border-transparent'
                        }`}
                      >
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={String(deal.id)} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => openDeal(deal)}
                                className={`bg-white dark:bg-slate-900 border border-border/40 dark:border-white/5 rounded-[32px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500 cursor-grab active:cursor-grabbing group relative overflow-hidden
                                  ${snapshot.isDragging ? 'ring-[3px] ring-primary/40 scale-105 shadow-[0_30px_60px_rgba(0,0,0,0.12)] rotate-2 z-50' : ''}
                                  ${deal.stage === 6 ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}
                                  ${deal.stage === 7 ? 'border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20' : ''}
                                `}
                              >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors" />
                                
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-black text-[15px] leading-tight text-foreground group-hover:text-primary transition-colors truncate">{deal.companies?.razon_social || 'Empresa'}</p>
                                    <div className="flex flex-col gap-1 mt-2">
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="h-3 w-3 text-emerald-500 opacity-40 shrink-0" />
                                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest truncate">
                                          {deal.companies?.comuna?.replace(/_/g, ' ') || 'UBICACIÓN N/A'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <GripVertical className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4">
                                  <Badge className="text-[8px] font-black px-2 h-5 bg-primary/10 text-primary border-none tracking-widest uppercase">
                                    {deal.companies?.segmento?.replace(/_/g, ' ') || 'Industrial'}
                                  </Badge>
                                  {deal.visita_realizada && <Badge className="text-[8px] font-black px-2 h-5 bg-emerald-500/10 text-emerald-600 border-none tracking-widest uppercase">Visitado</Badge>}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                                  <div className="flex items-center gap-1.5 opacity-60">
                                    <Maximize2 className="h-3 w-3 text-primary" />
                                    <span className="text-[11px] font-black tabular-nums tracking-tighter">
                                      {deal.companies?.m2_estimados ? `${Number(deal.companies.m2_estimados).toLocaleString('es-CL')}m²` : '—'}
                                    </span>
                                  </div>
                                  <div className="text-[15px] font-black text-foreground tracking-tighter group-hover:text-primary transition-colors tabular-nums">
                                    {fmtCLP(deal.valor_neto || 0)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
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
