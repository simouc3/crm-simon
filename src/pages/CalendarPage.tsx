import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { ChevronLeft, ChevronRight, Plus, Phone, Mail, MapPin, Trash2, Calendar as CalendarIcon, List as ListIcon, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [activityNote, setActivityNote] = useState("")
  const [selectedCompany, setSelectedCompany] = useState("")
  const [activityType, setActivityType] = useState("LLAMADA")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID')

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    const startPadding = firstDay.getDay()
    for (let i = startPadding; i > 0; i--) {
      days.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false })
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }
    const endPadding = 42 - days.length
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }
    return days
  }

  const days = getDaysInMonth(currentDate)

  useEffect(() => {
    fetchEvents()
    fetchCompanies()
    // Default select today
    setSelectedDate(new Date())
  }, [currentDate])

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, razon_social').order('razon_social')
    if (data) setCompanies(data)
  }

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('activities')
      .select('*, companies(*)')
      .order('scheduled_at')
    
    if (data) setEvents(data)
  }

  const handleSaveActivity = async () => {
    if (!selectedCompany || !selectedDate) return
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('activities').insert({
      company_id: selectedCompany,
      user_id: user.id,
      title: activityType === 'LLAMADA' ? 'Llamar a cliente' : 
             activityType === 'VISITA' ? 'Visita en terreno' :
             activityType === 'REUNION' ? 'Reunión comercial' : 'Enviar correo',
      activity_type: activityType,
      notes: activityNote,
      scheduled_at: selectedDate.toISOString()
    })

    setLoading(false)
    if (!error) {
      setIsAddOpen(false)
      setActivityNote("")
      setSelectedCompany("")
      fetchEvents()
    }
  }

  const toggleComplete = async (id: string, current: boolean) => {
    const { error } = await supabase.from('activities').update({ completed: !current }).eq('id', id)
    if (!error) {
      if (selectedEvent && selectedEvent.id === id) {
        setSelectedEvent({ ...selectedEvent, completed: !current })
      }
      fetchEvents()
    }
  }

  const handleDeleteActivity = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta gestión?")) return
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (!error) {
      setIsDetailOpen(false)
      setSelectedEvent(null)
      fetchEvents()
    }
  }


  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))

  const selectedDateStr = selectedDate?.toISOString().split('T')[0]
  const selectedDayEvents = events.filter(e => e.scheduled_at.startsWith(selectedDateStr || ''))

  return (
    <div className="h-full flex flex-col bg-[#F5F5F7] dark:bg-black">
      {/* Premium Header */}
      <div className="shrink-0 p-4 md:p-6 pb-0 md:pb-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px] mx-auto bg-white/70 dark:bg-[#1C1C1E]/50 backdrop-blur-3xl border border-white/50 dark:border-white/[0.05] rounded-[32px] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-none">
          <div>
            <h1 className="text-[28px] md:text-[36px] font-black tracking-tight text-foreground leading-none">
              Agenda
            </h1>
            <p className="text-[13px] text-muted-foreground font-semibold mt-1">
              Calendario de actividades comerciales
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="bg-white dark:bg-[#2C2C2E] p-1 rounded-full flex items-center shadow-sm border border-border/10 dark:border-transparent">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-[#3A3A3C]">
                  <ChevronLeft size={16} />
                </Button>
                <span className="px-3 text-[11px] font-bold text-foreground min-w-[120px] text-center capitalize">
                  {currentDate.toLocaleString('es-CL', { month: 'long', year: 'numeric' })}
                </span>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-[#3A3A3C]">
                  <ChevronRight size={16} />
                </Button>
             </div>
             
             <div className="bg-slate-50 dark:bg-[#2C2C2E] p-1 rounded-2xl border border-border/40 hidden sm:flex">
               <Button 
                variant={viewMode === 'GRID' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('GRID')} 
                className="rounded-xl h-9 px-3 gap-2"
               >
                 <CalendarIcon size={16} />
                 <span className="text-[10px] font-black uppercase">Mes</span>
               </Button>
               <Button 
                variant={viewMode === 'LIST' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('LIST')} 
                className="rounded-xl h-9 px-3 gap-2"
               >
                 <ListIcon size={16} />
                 <span className="text-[10px] font-black uppercase">Lista</span>
               </Button>
             </div>

             <Button onClick={() => setIsAddOpen(true)} className="gap-2 rounded-2xl h-11 px-6 shadow-lg shadow-black/20 bg-foreground text-background hover:bg-foreground/90 flex-1 md:flex-none">
                <Plus size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Nueva</span>
             </Button>
          </div>
        </div>
      </div>

      {/* Main Content: Split View Mobile (Calendar + List) */}
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-10 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Calendar Mobile Optimized Grid */}
        <section className="space-y-4">
           <div className="flex items-center gap-2 mb-2 px-2">
             <div className="w-1.5 h-4 bg-foreground rounded-full" />
             <h3 className="font-black text-[13px] uppercase tracking-widest text-muted-foreground opacity-60">Seleccionar Día</h3>
           </div>
           
           <div className="grid grid-cols-7 gap-1 md:gap-2">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(day => (
                <div key={day} className="h-8 flex items-center justify-center">
                  <span className="text-[9px] font-black text-muted-foreground/40">{day}</span>
                </div>
              ))}
              {days.map((day, i) => {
                const isSelected = selectedDateStr === day.date.toISOString().split('T')[0]
                const hasEvents = events.some(e => e.scheduled_at.startsWith(day.date.toISOString().split('T')[0]))
                const isToday = day.date.toDateString() === new Date().toDateString()

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day.date)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all border ${
                      isSelected 
                        ? 'bg-foreground border-foreground text-background shadow-lg shadow-black/30 scale-105 z-10' 
                        : isToday 
                          ? 'bg-slate-200 dark:bg-slate-800 border-border/80 text-foreground font-black'
                          : !day.isCurrentMonth
                            ? 'opacity-20 border-transparent'
                            : 'bg-white dark:bg-slate-900 border-border/40 hover:border-primary/40'
                    }`}
                  >
                    <span className="text-xs font-black tracking-tighter">{day.date.getDate()}</span>
                    {hasEvents && !isSelected && (
                      <div className={`absolute bottom-2 w-1 h-1 rounded-full ${isToday ? 'bg-foreground' : 'bg-foreground/40'}`} />
                    )}
                  </button>
                )
              })}
           </div>
        </section>

        {/* Selected Day Activities List */}
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-2">
               <div className="w-1.5 h-4 bg-foreground rounded-full shadow-lg shadow-black/20" />
               <h3 className="font-black text-[18px] tracking-tight">{selectedDate?.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric' })}</h3>
             </div>
             <Badge className="bg-slate-100 dark:bg-slate-800 text-muted-foreground border-transparent px-3 py-1 text-[10px] font-black uppercase">
               {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'Actividad' : 'Actividades'}
             </Badge>
           </div>

           <div className="space-y-4">
             {selectedDayEvents.length > 0 ? (
               selectedDayEvents.map((event) => (
                 <div 
                   key={event.id}
                   onClick={() => { setSelectedEvent(event); setIsDetailOpen(true); }}
                   className={`group bg-white dark:bg-slate-900 border border-border/40 p-5 rounded-[28px] shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-300 relative overflow-hidden ${event.completed ? 'opacity-60 grayscale-[0.5]' : ''}`}
                 >
                   <div className="absolute top-0 right-0 w-32 h-32 bg-foreground/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-foreground/10 transition-colors" />
                   
                   <div className="flex items-start gap-4 h-full">
                     <div className={`p-3 rounded-2xl shrink-0 transition-all ${
                       event.completed ? 'bg-slate-100 dark:bg-slate-800' : 'bg-primary/10 group-hover:bg-primary/20'
                     }`}>
                       {event.activity_type === 'LLAMADA' ? <Phone className="h-5 w-5 text-primary" /> : 
                        event.activity_type === 'VISITA' ? <MapPin className="h-5 w-5 text-emerald-500" /> :
                        event.activity_type === 'CORREO' ? <Mail className="h-5 w-5 text-sky-500" /> :
                        <MessageSquare className="h-5 w-5 text-primary" />}
                     </div>
                     
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">
                         <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{event.activity_type}</span>
                         {event.completed && (
                           <Badge className="bg-slate-100 text-muted-foreground border-transparent text-[8px] h-4 font-black">COMPLETADA</Badge>
                         )}
                       </div>
                       <h4 className="font-black text-[17px] tracking-tight truncate mb-1 text-foreground dark:text-slate-100">
                         {event.companies?.razon_social || 'Empresa sin nombre'}
                       </h4>
                       <p className="text-[12px] text-muted-foreground font-medium line-clamp-2 leading-relaxed opacity-80">
                         {event.notes || 'Sin detalles registrados para esta gestión.'}
                       </p>
                     </div>
                     
                     <div className="flex flex-col items-end gap-2 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-50 text-muted-foreground/40 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteActivity(event.id); }}>
                          <Trash2 size={16} />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 opacity-60 group-hover:translate-x-1 transition-transform" />
                     </div>
                   </div>
                 </div>
               ))
             ) : (
               <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-dashed border-border/60 rounded-[32px] gap-4">
                 <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground/20" />
                 </div>
                 <div className="text-center">
                   <p className="text-sm font-black text-foreground/80 uppercase tracking-widest leading-none mb-1">Todo Despejado</p>
                   <p className="text-[11px] font-bold text-muted-foreground opacity-60">Para este día no hay gestiones aún.</p>
                 </div>
                 <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)} className="rounded-xl mt-2 font-black text-[9px] uppercase tracking-widest border-border/40">Programar Ahora</Button>
               </div>
             )}
           </div>
        </section>
      </div>

      {/* Add Dialog optimized for mobile */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] border-none bg-white dark:bg-slate-900 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl safe-p-bottom">
           <div className="p-8">
              <DialogHeader className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-foreground flex items-center justify-center shadow-lg shadow-black/20">
                    <Plus className="text-background" size={20} />
                  </div>
                  <DialogTitle className="text-2xl font-black tracking-tighter">Nueva Gestión</DialogTitle>
                </div>
                <p className="text-muted-foreground text-[11px] font-black uppercase tracking-[0.15em] opacity-60">
                  PROGRAMACIÓN PARA: {selectedDate?.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Empresa Destino</label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-border/40 font-bold px-4">
                      <SelectValue placeholder="Selecciona Cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id} className="font-bold py-3">{c.razon_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Modalidad</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'LLAMADA', icon: Phone, label: 'Llamada' },
                      { id: 'VISITA', icon: MapPin, label: 'Visita' },
                      { id: 'REUNION', icon: MessageSquare, label: 'Reunión' },
                      { id: 'CORREO', icon: Mail, label: 'Correo' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActivityType(t.id)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                          activityType === t.id 
                            ? 'bg-foreground border-foreground text-background shadow-sm' 
                            : 'bg-white dark:bg-slate-800/40 border-transparent text-muted-foreground hover:border-slate-200'
                        }`}
                      >
                        <t.icon size={18} className={activityType === t.id ? 'opacity-100' : 'opacity-40'} />
                        <span className="text-[11px] font-black uppercase tracking-widest">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Notas Estratégicas</label>
                  <textarea 
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    placeholder="Objetivo de la gestión..."
                    className="w-full h-28 p-5 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-border/40 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-10">
                <Button onClick={handleSaveActivity} disabled={loading || !selectedCompany} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-black/20 bg-foreground text-background">
                  {loading ? 'Sincronizando...' : 'Confirmar Gestión'}
                </Button>
                <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="h-12 rounded-2xl font-black text-[10px] uppercase text-muted-foreground opacity-60">Volver</Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog optimized for mobile */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px] border-none bg-white dark:bg-slate-900 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl safe-p-bottom">
          {selectedEvent && (
            <div className="animate-in slide-in-from-bottom-6 duration-500">
              <div className="h-24 bg-foreground relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-background/20 rounded-full blur-3xl" />
                <div className="absolute top-4 right-6 uppercase text-[9px] font-black text-background/60 tracking-widest">Agenda Comercial</div>
              </div>
              
              <div className="p-8 -mt-12 bg-white dark:bg-slate-900 rounded-t-[3rem] relative z-10">
                <div className="flex items-start justify-between mb-8">
                  <div className="space-y-4 flex-1">
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-xl shadow-black/5 inline-flex mb-2 border border-border/20">
                      {selectedEvent.activity_type === 'LLAMADA' ? <Phone className="h-6 w-6 text-foreground" /> : 
                       selectedEvent.activity_type === 'VISITA' ? <MapPin className="h-6 w-6 text-emerald-500" /> :
                       <MessageSquare className="h-6 w-6 text-foreground" />}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-foreground tracking-tighter leading-none mb-2">
                        {selectedEvent.companies?.razon_social || 'Gestión'}
                      </h2>
                      <div className="flex items-center gap-3">
                        <Badge className={`${selectedEvent.completed ? 'bg-emerald-500 text-white' : 'bg-foreground text-background'} border-none h-5 text-[9px] font-black uppercase tracking-widest px-2 shadow-lg shadow-black/10`}>
                          {selectedEvent.completed ? 'Realizada' : 'Acción Pendiente'}
                        </Badge>
                        <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40 tabular-nums">ID: {selectedEvent.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-border/10">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1 opacity-40">COMUNA</span>
                    <span className="text-[13px] font-black text-foreground truncate block">{selectedEvent.companies?.comuna?.replace(/_/g, ' ') || 'Zonas Varias'}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-border/10">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1 opacity-40">MODALIDAD</span>
                    <span className="text-[13px] font-black text-foreground truncate block">{selectedEvent.activity_type || 'GESTIÓN'}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-60">Notas de la Gestión</label>
                  <div className="w-full bg-slate-50 dark:bg-slate-800/20 border border-border/40 rounded-[2.5rem] p-6 min-h-[140px] shadow-inner">
                    <p className={`text-[15px] font-medium text-foreground/90 leading-relaxed ${selectedEvent.completed ? 'line-through opacity-40' : ''}`}>
                      {selectedEvent.notes || "Sin instrucciones específicas para este día."}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={() => toggleComplete(selectedEvent.id, selectedEvent.completed)}
                    className={`flex-1 h-16 rounded-3xl font-black uppercase text-xs tracking-widest transition-all duration-500 ${
                        selectedEvent.completed 
                        ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-white/40' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 active:scale-95'
                    }`}
                  >
                    {selectedEvent.completed ? 'Re-activar Tarea' : 'Completar Ahora'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteActivity(selectedEvent.id)}
                    className="h-16 w-16 rounded-3xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-500"
                  >
                    <Trash2 size={24} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
