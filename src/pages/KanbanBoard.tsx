import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { DealDetailsDialog } from '../components/DealDetailsDialog'
import { DealFormDialog } from '../components/DealFormDialog'
import { Search, Plus } from 'lucide-react'
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
  // ── Deal Card — B2B Contextual ────────────────────
  const DealCard = ({ deal, isDragging = false }: { deal: any; isDragging?: boolean }) => {
    const s = stageMap[deal.stage] || stageMap[1]
    const isRisk = deal.is_risk
    const stg = deal.stage
    
    // Prioridad inferida temporalmente por valor financiero
    const priorityColor = (deal.valor_neto || 0) > 3000000 ? '#ef4444' : (deal.valor_neto || 0) < 500000 ? '#0ea5e9' : '#10b981'

    return (
      <div
        onClick={() => openDeal(deal)}
        className={`
          group cursor-pointer select-none
          bg-slate-50 dark:bg-[#14141A]
          rounded-[18px] overflow-hidden
          relative
          transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isDragging
            ? 'scale-[1.02] shadow-2xl z-50 ring-1 ring-primary/30'
            : 'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] active:scale-[0.98] hover:-translate-y-0.5'
          }
        `}
      >
        {/* Priority Dot */}
        <div className="absolute top-3 left-3 w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: priorityColor }} />

        <div className="p-4 relative z-10">
          
          {/* Header Layout for all stages */}
          <div className="flex items-center gap-3 mb-3 ml-4">
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 font-black text-[13px] text-white shadow-sm"
              style={{ backgroundColor: s.hex }}
            >
              {(deal.companies?.razon_social || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-[14px] tracking-tight text-slate-900 dark:text-white truncate leading-none mb-1">
                {deal.companies?.razon_social || 'Desconocido'}
              </h4>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate leading-none">
                {deal.title}
              </p>
            </div>
          </div>

          {/* ── CONTEXTUAL UI ── */}
          
          {/* Etapas 1, 2, 3: Foco en Contacto */}
          {stg <= 3 && (
            <div className="flex items-center justify-between pt-2 border-t border-black/[0.03] dark:border-white/[0.03]">
              <div className="flex gap-1">
                {deal.companies?.contact_phone && (
                  <a href={`https://wa.me/${deal.companies.contact_phone.replace(/\D/g,'')}`} onClick={e => e.stopPropagation()} className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-emerald-500 transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.125-.397-.179-.974-.435-1.906-1.259-1.258-1.115-2.087-2.367-2.329-2.692-.243-.323-.586-.749-.585-1.396.002-.638.337-.96.468-1.109.117-.132.259-.168.347-.168.087 0 .178-.002.256-.002.091 0 .215-.034.341.272.13.315.441 1.077.48 1.157.04.08.056.176.012.261-.044.085-.067.136-.134.215-.068.079-.144.17-.203.238-.065.074-.131.154-.055.285.074.13.332.551.71.887 1.488.423 1.093.045 1.439.117 1.543.071.106.311.085.426.024.116-.06.508-.595.637-.698.13-.102.247-.087.34-.05z"/></svg>
                  </a>
                )}
                {deal.companies?.contact_email && (
                  <a href={`mailto:${deal.companies.contact_email}`} onClick={e => e.stopPropagation()} className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-blue-500 transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </a>
                )}
              </div>
              {deal.companies?.comuna && (
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                   <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                   {deal.companies.comuna}
                </div>
              )}
            </div>
          )}

          {/* Etapas 4, 5: Foco Financiero e IA */}
          {(stg === 4 || stg === 5) && (
            <div className="pt-3 border-t border-black/[0.03] dark:border-white/[0.03]">
               <div className="flex justify-between items-end mb-2">
                 <p className="text-[22px] font-black tracking-tighter text-slate-900 dark:text-white leading-none">
                   {fmtCLP(deal.valor_neto || 0)}
                 </p>
                 {deal.proposal_status && (
                   <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">Visto</span>
                 )}
               </div>
               
               {isRisk && (
                 <div className="flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md mt-1">
                   ⚠️ IA: Riesgo de Deserción
                 </div>
               )}
            </div>
          )}

          {/* Etapa 6: Ganado y Operativo */}
          {stg === 6 && (
            <div className="pt-3 border-t border-black/[0.03] dark:border-white/[0.03]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pago acordado</span>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                  {deal.companies?.condiciones_pago?.replace('_', ' ') || 'CONTADO'}
                </span>
              </div>
              <button 
                onClick={e => { e.stopPropagation(); alert('Se enviará notificación PUSH al departamento.'); }}
                className="w-full mt-1 bg-slate-900 dark:bg-white text-white dark:text-black py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-transform"
              >
                Notificar Despliegue
              </button>
            </div>
          )}

        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-[#F5F5F7] dark:bg-[#0D0D17]">
      {/* ── Mobile Header Area ── */}
      <div className="md:hidden shrink-0 p-4 pb-0 sticky top-0 z-40 backdrop-blur-xl bg-[#F5F5F7]/80 dark:bg-[#0D0D17]/80">
        <div className="bg-white/90 dark:bg-[#141420]/90 backdrop-blur-md rounded-[28px] p-4 border border-black/[0.05] dark:border-white/[0.07] shadow-sm">
          
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

      {/* ── Desktop Header (Refined B2B Slate) ── */}
      <div className="hidden md:block shrink-0 px-6 md:px-12 pt-8 pb-4 sticky top-0 z-40 backdrop-blur-xl bg-[#F5F5F7]/90 dark:bg-[#0D0D17]/90 border-b border-black/[0.04] dark:border-white/[0.04]">
        <div className="flex flex-col md:flex-row md:items-end justify-between max-w-[1600px] mx-auto pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1.5 w-6 rounded-full bg-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Sales Pipeline</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-foreground leading-none">
              Pipeline de Ventas
            </h1>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[12px] font-bold text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 md:px-2.5 px-2 py-1 flex-shrink-0 rounded-full text-foreground/80 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {totalDeals} Activos
              </span>
              <span className="whitespace-nowrap">Bruto: {fmtCLP(totalPipeline)}</span>
              <span className="opacity-40 hidden md:inline">|</span>
              <span className="text-primary font-black whitespace-nowrap">Forecast: {fmtCLP(weightedForecast)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-6 md:mt-0 relative z-10">
            <div className="flex bg-slate-50 dark:bg-white/5 rounded-full border border-black/[0.04] dark:border-white/5 shadow-sm">
              <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))} className="bg-transparent text-[11px] font-bold uppercase tracking-widest text-foreground outline-none cursor-pointer pl-4 pr-3 py-2.5">
                {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <div className="w-px bg-black/[0.08] dark:bg-white/[0.08] my-1.5" />
              <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))} className="bg-transparent text-[11px] font-bold uppercase tracking-widest text-foreground outline-none cursor-pointer pr-4 pl-3 py-2.5">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            
            <DealFormDialog 
              onDealCreated={fetchDeals}
              trigger={
                <button className="h-[38px] px-5 rounded-full bg-foreground text-background font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shrink-0">
                  <Plus className="w-4 h-4" /> Nuevo Negocio
                </button>
              }
            />
          </div>
        </div>
      </div>

      {/* ── Kanban Columns (Unified Desktop & Mobile Snap-X) ──────────────────── */}
      <div className="flex-1 overflow-x-auto px-0 md:px-6 py-6 snap-x snap-mandatory scroll-smooth hide-scrollbar min-h-screen">
        {/* En móvil quitamos el gap de Flex y usamos paddings en los hijos para que el Snap tome la pantalla completa sin desfasarse por el flex-gap */}
        <div className="flex md:gap-5 items-start min-h-[600px] max-w-[1600px] md:mx-auto pb-32">
          <DragDropContext onDragEnd={onDragEnd}>
            {KANBAN_STAGES.map(stage => {
              const stageDeals = filteredDeals.filter(d => d.stage === stage.id)
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.valor_neto || 0), 0)
              
              return (
                <div key={stage.id} className="flex flex-col w-[85vw] md:w-[280px] px-4 md:px-0 shrink-0 snap-center snap-always">
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
                          <div className="flex-1 flex flex-col items-center justify-center opacity-40 py-12 gap-3 grayscale animate-in fade-in duration-500">
                            <div className="w-10 h-10 rounded-full border border-dashed border-foreground/30 flex items-center justify-center bg-black/[0.02] dark:bg-white/[0.02]">
                              <span className="text-[9px] uppercase font-black tracking-widest text-foreground/50">Vacío</span>
                            </div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] text-center max-w-[140px] leading-relaxed">
                              Sin negocios en esta etapa
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
