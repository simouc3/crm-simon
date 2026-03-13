import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { supabase } from '../lib/supabase/client'
import { DealFormDialog } from '../components/DealFormDialog'
import { DealDetailsDialog } from '../components/DealDetailsDialog'
import { Maximize2, GripVertical } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

export const KANBAN_STAGES = [
  { id: 1, name: 'Prospección' },
  { id: 2, name: 'Contacto Iniciado' },
  { id: 3, name: 'Visita Agendada' },
  { id: 4, name: 'Propuesta Enviada' },
  { id: 5, name: 'Negociación' },
  { id: 6, name: 'Cierre Ganado' },
  { id: 7, name: 'Cierre Perdido' },
]

const fmtCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function KanbanBoard() {
  const [deals, setDeals] = useState<any[]>([])
  const [selectedDeal, setSelectedDeal] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

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

    // Optimistic update
    const updatedDeals = deals.map(d => 
      d.id === dealId ? { ...d, stage: newStageId, stage_changed_at: new Date().toISOString() } : d
    )
    setDeals(updatedDeals)

    // DB update
    const { error } = await supabase
      .from('deals')
      .update({ 
        stage: newStageId,
        stage_changed_at: new Date().toISOString()
      })
      .eq('id', dealId)

    if (error) {
      console.error('Error updating stage:', error)
      fetchDeals() // Rollback on error
    }
  }

  const openDeal = (deal: any) => {
    setSelectedDeal(deal)
    setIsDetailsOpen(true)
  }

  const totalGanado = deals
    .filter(d => d.stage === 6)
    .reduce((sum, d) => sum + (d.valor_neto || 0), 0)

  return (
    <div className="h-full flex flex-col bg-[#F6F8FA] dark:bg-slate-950">
      {/* Header */}
      <div className="shrink-0 px-8 py-6 bg-white dark:bg-slate-900 border-b dark:border-white/5 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-foreground">Pipeline de Ventas</h1>
            <div className="flex items-center gap-4 mt-1">
              {totalGanado > 0 && (
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">
                  {fmtCLP(totalGanado)} ganado este mes
                </p>
              )}
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                {deals.length} negocios totales
              </p>
            </div>
          </div>
          <DealFormDialog onDealCreated={fetchDeals} />
        </div>
      </div>

      {/* Pipeline Content Area - Full width with horizontal scroll */}
      <div className="flex-1 overflow-x-auto pb-10 custom-scrollbar bg-[#F6F8FA] dark:bg-slate-950">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="inline-flex gap-4 items-start px-8 py-6 list-none min-h-full">
            {KANBAN_STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage.id)
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.valor_neto || 0), 0)
              
              return (
                <div key={stage.id} className="flex flex-col w-[300px] shrink-0">
                  {/* Column Header */}
                  <div className="shrink-0 mb-4 px-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          stage.id === 6 ? 'bg-emerald-500' :
                          stage.id === 7 ? 'bg-red-500' :
                          'bg-primary/40'
                        }`} />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80 dark:text-slate-400">{stage.name}</h3>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground opacity-60 bg-muted dark:bg-white/5 px-1.5 py-0.5 rounded">
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="text-xs font-black text-foreground/80 dark:text-slate-200 tracking-tight">
                      {fmtCLP(stageValue)}
                    </div>
                  </div>

                  {/* Droppable Column Area */}
                  <Droppable droppableId={String(stage.id)}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex flex-col gap-3 p-2 transition-colors duration-200 rounded-xl min-h-[500px] ${
                          snapshot.isDraggingOver ? 'bg-primary/[0.03] ring-1 ring-primary/10' : 'bg-slate-50/50 dark:bg-white/[0.02]'
                        }`}
                      >
                        {stageDeals.map((deal, index) => {
                          const isGanado = deal.stage === 6
                          const isPerdido = deal.stage === 7
                          const isVisitada = deal.stage === 3 && deal.visita_realizada

                          return (
                            <Draggable key={deal.id} draggableId={String(deal.id)} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => openDeal(deal)}
                                  className={`bg-white dark:bg-slate-900 border border-border/40 dark:border-white/5 rounded-[1.25rem] p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-grab active:cursor-grabbing group mb-3 relative overflow-hidden
                                    ${snapshot.isDragging ? 'ring-2 ring-primary ring-offset-2 scale-105 shadow-xl rotate-2' : ''}
                                    ${isGanado ? 'border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/30' : ''}
                                    ${isPerdido ? 'border-red-500/20 bg-red-50/30 dark:bg-red-950/30' : ''}
                                  `}
                                >
                                  {/* Accent Stripe */}
                                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                    isGanado ? 'bg-emerald-500' :
                                    isPerdido ? 'bg-red-500' :
                                    'bg-primary/20 group-hover:bg-primary transition-colors'
                                  }`} />

                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-extrabold text-[13px] leading-tight text-foreground truncate">{deal.companies?.razon_social || 'Empresa'}</p>
                                      <div className="flex flex-col gap-0.5 mt-1">
                                        <p className="text-[10px] text-muted-foreground font-medium truncate">
                                          {deal.companies?.comuna?.replace(/_/g, ' ') || 'UBICACIÓN N/A'}
                                        </p>
                                        {deal.companies?.segmento && (
                                          <p className="text-[9px] text-primary/70 font-black uppercase tracking-widest">
                                            {deal.companies.segmento.replace(/_/g, ' ')}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                                  </div>

                                  <div className="flex flex-wrap gap-1 mb-4">
                                    {isGanado && <Badge className="text-[8px] font-black px-1.5 h-4 bg-emerald-500 text-white border-0">GANADO</Badge>}
                                    {isPerdido && <Badge className="text-[8px] font-black px-1.5 h-4 bg-red-500 text-white border-0">PERDIDO</Badge>}
                                    {isVisitada && !isGanado && !isPerdido && <Badge className="text-[8px] font-black px-1.5 h-4 bg-blue-500 text-white border-0">VISITADO</Badge>}
                                  </div>

                                  <div className="flex items-center justify-between pt-3 border-t border-border/10 dark:border-white/5">
                                    <div className="flex items-center gap-1">
                                      <Maximize2 className="h-2.5 w-2.5 text-muted-foreground/40" />
                                      <span className="text-[10px] font-bold text-foreground/70 dark:text-slate-400">
                                        {deal.companies?.m2_estimados ? `${Number(deal.companies.m2_estimados).toLocaleString('es-CL')}m²` : '—'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-black text-primary tracking-tighter">
                                      {fmtCLP(deal.valor_neto || 0)}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          )
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
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
