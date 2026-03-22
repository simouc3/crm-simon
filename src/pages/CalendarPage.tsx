import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { ChevronLeft, ChevronRight, Plus, Phone, Mail, MapPin, Trash2, Calendar as CalendarIcon, MessageSquare, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
    setSelectedDate(new Date())
  }, [])

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

  const [mobileView, setMobileView] = useState<'grid' | 'list'>('grid')

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))

  const selectedDateStr = selectedDate?.toISOString().split('T')[0]
  const selectedDayEvents = events.filter(e => e.scheduled_at && e.scheduled_at.startsWith(selectedDateStr || ''))

  return (
    <div className="h-full flex flex-col lg:flex-row bg-[#F5F5F7] dark:bg-black font-sans overflow-hidden">
      
      {/* LEFT PORTION: CALENDAR GRID */}
      <div className={`flex-1 flex flex-col h-full overflow-y-auto w-full lg:w-3/5 lg:border-r border-border/40 pb-8 lg:pb-0 safe-bottom transition-all duration-500 ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* DESKTOP STANDARD HEADER (Exacto a la imagen de referencia) */}
        <div className="hidden lg:block px-6 md:px-12 pt-12 pb-4 w-full max-w-5xl mx-auto">
          <div className="bg-white dark:bg-[#1C1C1E] border border-border/40 rounded-[40px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground mb-1">Agenda</h1>
              <p className="text-muted-foreground font-medium text-sm md:text-base opacity-70">
                {events.length} gestiones · Operación B2B
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsAddOpen(true)}
                className="bg-black dark:bg-white text-white dark:text-black px-8 h-14 rounded-full font-black text-sm hover:scale-105 transition-all shadow-lg shadow-black/10 flex items-center gap-2"
              >
                <Plus size={20} />
                + Nueva Gestión
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE & NAVIGATION HEADER */}
        <div className="pt-8 lg:pt-4 px-6 md:px-12 pb-6 flex justify-between items-center shrink-0 w-full max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner lg:hidden">
               <CalendarIcon className="h-6 w-6" />
            </div>
            <div className="lg:hidden">
               <h3 className="text-2xl font-black tracking-tighter capitalize text-foreground leading-none">
                 {currentDate.toLocaleString('es-CL', { month: 'long' })}
               </h3>
               <span className="text-[12px] font-bold text-muted-foreground uppercase opacity-80 tracking-widest">{currentDate.getFullYear()}</span>
            </div>
            {/* Navigation Desktop (Compacto debajo del header) */}
            <div className="hidden lg:flex items-center gap-4">
              <h3 className="text-2xl font-black tracking-tighter capitalize text-foreground">
                 {currentDate.toLocaleString('es-CL', { month: 'long' })} {currentDate.getFullYear()}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Vista Móvil */}
            <div className="flex p-1 bg-slate-200/50 dark:bg-white/5 rounded-2xl lg:hidden">
              <button 
                onClick={() => setMobileView('grid')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mobileView === 'grid' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                Mes
              </button>
              <button 
                onClick={() => setMobileView('list')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mobileView === 'list' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                Día
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={prevMonth} className="w-11 h-11 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 flex items-center justify-center shadow-sm hover:scale-105 transition-transform text-foreground"><ChevronLeft size={20}/></button>
              <button onClick={nextMonth} className="w-11 h-11 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 flex items-center justify-center shadow-sm hover:scale-105 transition-transform text-foreground"><ChevronRight size={20}/></button>
            </div>
          </div>
        </div>

        {/* GRID CALENDARIO */}
        <div className="px-6 md:px-12 shrink-0 w-full max-w-4xl mx-auto mt-4 pb-4">
           <div className="grid grid-cols-7 mb-4">
             {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => (
                <div key={i} className="text-center text-[11px] font-black text-muted-foreground tracking-widest uppercase opacity-60 mb-2">{d}</div>
             ))}
           </div>
           
           <div className="grid grid-cols-7 gap-y-3 gap-x-2 md:gap-x-4 md:gap-y-4">
             {days.map((day, i) => {
                const isSelected = selectedDateStr === day.date.toISOString().split('T')[0];
                const hasEvents = events.some(e => e.scheduled_at && e.scheduled_at.startsWith(day.date.toISOString().split('T')[0]));
                const isToday = day.date.toDateString() === new Date().toDateString();
                
                return (
                  <button 
                     key={i} 
                     onClick={() => setSelectedDate(day.date)} 
                     className="relative flex flex-col items-center justify-center w-full aspect-square group"
                  >
                     <div className={`w-full max-w-[3.5rem] aspect-square flex items-center justify-center rounded-[1.2rem] text-[16px] md:text-[18px] transition-all duration-300 font-bold
                       ${isSelected 
                          ? 'bg-foreground text-background scale-105 shadow-xl shadow-black/20 dark:shadow-none font-black' 
                          : isToday 
                            ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:scale-105'
                            : day.isCurrentMonth 
                               ? 'text-foreground bg-white/50 dark:bg-[#1C1C1E]/50 border border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-[#2C2C2E] shadow-sm hover:scale-105' 
                               : 'text-muted-foreground/30 border border-transparent'
                       }`}
                     >
                        {day.date.getDate()}
                     </div>
                     {hasEvents && !isSelected && (
                       <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                     )}
                  </button>
                )
             })}
           </div>
        </div>
      </div>

      {/* RIGHT PORTION: PANEL DE TAREAS BIMODAL (Side Panel on Desktop, Bottom Panel on Mobile) */}
      <div className="w-full lg:w-2/5 xl:w-[450px] shrink-0 bg-white dark:bg-[#1C1C1E] rounded-t-[2.5rem] lg:rounded-none lg:h-full shadow-[0_-20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_-20px_50px_rgba(0,0,0,0.4)] transition-all z-10 flex flex-col lg:min-h-0 min-h-[60vh]">
         
         <div className="p-8 pb-4 shrink-0 bg-gradient-to-b from-slate-50 to-white dark:from-[#242426] dark:to-[#1C1C1E] border-b border-border/40 lg:rounded-tl-[2.5rem] sticky top-0 z-20">
            <div className="w-12 h-1.5 bg-border/50 rounded-full mx-auto mb-6 lg:hidden" />
            
            <div className="flex justify-between items-start">
               <div>
                 <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full mb-3">Agenda del Día</span>
                 <h2 className="text-3xl font-black capitalize tracking-tight text-foreground leading-none mb-1">
                    {selectedDate.toLocaleDateString('es-CL', { weekday: 'long' })}
                 </h2>
                 <span className="text-sm font-bold text-muted-foreground uppercase opacity-80">
                    {selectedDate.getDate()} {selectedDate.toLocaleDateString('es-CL', { month: 'long' })}
                 </span>
               </div>
               <button onClick={() => setIsAddOpen(true)} className="w-12 h-12 rounded-[1.2rem] bg-foreground text-background shadow-lg shadow-black/20 dark:shadow-none hover:scale-105 flex items-center justify-center transition-all shrink-0">
                 <Plus size={24} />
               </button>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-32 lg:pb-8">
           {selectedDayEvents.length > 0 ? (
             selectedDayEvents.map(event => (
               <div 
                 key={event.id} 
                 onClick={() => { setSelectedEvent(event); setIsDetailOpen(true); }} 
                 className={`group relative p-5 rounded-[1.5rem] bg-slate-50 dark:bg-[#2C2C2E] hover:bg-white dark:hover:bg-[#3A3A3C] border border-border/60 hover:border-border transition-all cursor-pointer shadow-sm hover:shadow-xl active:scale-[0.98]
                    ${event.completed ? 'opacity-60 scale-[0.98] bg-slate-100/50 dark:bg-[#1C1C1E]/50 border-dashed' : ''}
                 `}
               >
                  {/* Etiqueta Visual a la izquierda */}
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-r-full
                     ${event.completed ? 'bg-muted/30' : 
                       event.activity_type === 'VISITA' ? 'bg-emerald-500' :
                       event.activity_type === 'CORREO' ? 'bg-sky-500' :
                       'bg-primary'
                     }`} 
                  />

                  <div className="flex gap-4 pl-3">
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                           <div className={`p-1.5 rounded-lg flex items-center justify-center bg-background border border-border/40 shadow-sm shrink-0
                             ${event.completed ? 'text-muted-foreground' : 'text-foreground'}
                           `}>
                              {event.activity_type === 'LLAMADA' ? <Phone size={12} /> : 
                               event.activity_type === 'VISITA' ? <MapPin size={12} /> : 
                               event.activity_type === 'CORREO' ? <Mail size={12} /> : 
                               <MessageSquare size={12} />}
                           </div>
                           <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{event.activity_type}</span>
                           {event.completed && (
                             <span className="ml-auto bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1">
                               <CheckCircle2 size={10} /> Completada
                             </span>
                           )}
                        </div>

                        <h4 className={`text-foreground font-black text-[16px] leading-snug mb-1 truncate ${event.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {event.title || 'Agendamiento Genérico'}
                        </h4>
                        
                        <p className={`text-[12px] font-medium leading-relaxed line-clamp-2 ${event.completed ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                           {event.notes || 'No hay notas descriptivas para esta tarea.'}
                        </p>
                        
                        {event.companies?.razon_social && (
                           <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-primary font-bold">
                              <MapPin size={12} className="opacity-70" />
                              <span className="text-[11px] truncate">{event.companies.razon_social}</span>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
             ))
           ) : (
              <div className="text-center py-16 px-6 opacity-80 animate-in fade-in fill-mode-both duration-700">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-[#2C2C2E] border-2 border-dashed border-border flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="text-muted-foreground h-7 w-7 opacity-50" />
                </div>
                <p className="text-foreground font-black text-lg mb-1 tracking-tight">Día Despejado</p>
                <p className="text-muted-foreground text-[12px] font-medium leading-relaxed">No hay tareas o clientes agendados. Disfruta tu día o presiona el botón (+) para planificar nuevas acciones.</p>
              </div>
           )}
         </div>
      </div>

      {/* Add Dialog (Form nativo optimizado) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[420px] border border-border/40 bg-white dark:bg-[#1C1C1E] p-0 overflow-hidden rounded-[2.5rem] shadow-2xl safe-p-bottom">
           <div className="p-8">
              <DialogHeader className="mb-6 flex flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                   <CalendarIcon size={24} />
                </div>
                <div className="flex-1 text-left space-y-1">
                  <DialogTitle className="text-2xl font-black tracking-tighter leading-none">Nueva Gestión</DialogTitle>
                  <p className="text-muted-foreground text-[11px] font-black uppercase tracking-widest opacity-80">
                    {selectedDate?.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tipo de Actividad</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ id: 'LLAMADA', icon: Phone, label: 'Llamada' }, { id: 'VISITA', icon: MapPin, label: 'Visita' }, { id: 'REUNION', icon: MessageSquare, label: 'Reunión' }, { id: 'CORREO', icon: Mail, label: 'Correo' }].map(t => (
                      <button key={t.id} onClick={() => setActivityType(t.id)} className={`flex items-center gap-2 p-3.5 rounded-2xl border transition-all shadow-sm ${activityType === t.id ? 'bg-primary border-primary text-primary-foreground font-black ring-4 ring-primary/20' : 'bg-background hover:bg-slate-50 dark:hover:bg-[#2C2C2E] border-border text-foreground font-bold'}`}>
                        <t.icon size={16} className={activityType === t.id ? 'opacity-100' : 'opacity-60 text-muted-foreground mt-0.5'} />
                        <span className="text-[11px] uppercase tracking-wider">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Vincular a Empresa</label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-[#2C2C2E] border border-border/60 hover:border-primary/50 font-bold px-4 text-sm shadow-inner transition-all">
                      <SelectValue placeholder="Busca un cliente..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/40 max-h-[250px]">
                      {companies.map(c => <SelectItem key={c.id} value={c.id} className="font-bold py-3 cursor-pointer">{c.razon_social}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Instrucciones o Detalles</label>
                  <textarea value={activityNote} onChange={(e) => setActivityNote(e.target.value)} placeholder="¿Cuál es el objetivo de esta gestión? 🤔" className="w-full h-28 p-5 rounded-[1.5rem] bg-slate-50 dark:bg-[#2C2C2E] border border-border/60 hover:border-primary/50 text-[13px] font-medium outline-none resize-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 h-14 rounded-[1.2rem] font-black uppercase text-[11px] tracking-widest border-border hover:bg-slate-100 dark:hover:bg-[#2C2C2E]">Cancelar</Button>
                <Button onClick={handleSaveActivity} disabled={loading || !selectedCompany} className="flex-[1.5] h-14 rounded-[1.2rem] font-black uppercase text-[11px] tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  {loading ? 'Guardando...' : 'Confirmar'}
                </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[420px] border border-border/40 bg-white dark:bg-[#1C1C1E] p-0 overflow-hidden rounded-[2.5rem] shadow-2xl safe-p-bottom">
          {selectedEvent && (
            <div className="p-8">
               <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${selectedEvent.completed ? 'bg-slate-100 dark:bg-[#2C2C2E] text-muted-foreground' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                     {selectedEvent.activity_type === 'LLAMADA' ? <Phone size={24} /> : selectedEvent.activity_type === 'VISITA' ? <MapPin size={24} /> : selectedEvent.activity_type === 'CORREO' ? <Mail size={24} /> : <MessageSquare size={24} />}
                  </div>
                  <button onClick={() => handleDeleteActivity(selectedEvent.id)} className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all">
                     <Trash2 size={16} />
                  </button>
               </div>
               
               <h2 className={`text-[22px] font-black text-foreground leading-tight mb-2 tracking-tight ${selectedEvent.completed ? 'opacity-60 line-through' : ''}`}>
                 {selectedEvent.title || 'Resolución Pendiente'}
               </h2>
               
               <div className="flex items-center gap-2 mb-8">
                 <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                   {selectedEvent.companies?.razon_social || 'Cliente Interno'}
                 </span>
               </div>

               <div className="space-y-3 mb-8">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Notas de la Actividad</h4>
                  <div className="bg-slate-50 dark:bg-[#2C2C2E] rounded-[1.5rem] p-6 border border-border/40 shadow-inner">
                    <p className="text-[13px] text-foreground font-medium leading-relaxed whitespace-pre-wrap">
                      {selectedEvent.notes || 'No se registraron notas adicionales para este evento.'}
                    </p>
                  </div>
               </div>

               <Button 
                 onClick={() => toggleComplete(selectedEvent.id, selectedEvent.completed)}
                 className={`w-full h-14 rounded-[1.2rem] font-black flex items-center justify-center gap-3 transition-all text-[11px] uppercase tracking-widest ${
                   selectedEvent.completed 
                     ? 'bg-slate-100 text-slate-500 dark:bg-[#2C2C2E] dark:text-muted-foreground border border-border/50 hover:bg-slate-200 dark:hover:bg-[#3A3A3C]' 
                     : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 active:scale-95'
                 }`}
               >
                 {selectedEvent.completed ? 'Re-Activar Tarea' : <><CheckCircle2 size={18}/> Marcar como Realizada</>}
               </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
