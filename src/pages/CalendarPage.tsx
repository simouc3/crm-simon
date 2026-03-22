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

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))

  const selectedDateStr = selectedDate?.toISOString().split('T')[0]
  const selectedDayEvents = events.filter(e => e.scheduled_at && e.scheduled_at.startsWith(selectedDateStr || ''))

  return (
    <div className="h-full flex flex-col bg-[#0B0C10] text-[#FFFFFF] font-sans overflow-hidden">
      {/* HEADER: Oscuro y minimalista */}
      <div className="pt-10 md:pt-14 px-8 pb-4 flex justify-between items-center shrink-0 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-cyan-400" />
          <h1 className="text-3xl font-black tracking-widest uppercase">
             {currentDate.toLocaleString('es-CL', { month: 'long' })}
             <span className="text-cyan-400 font-light ml-2">{currentDate.getFullYear()}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><ChevronLeft size={20}/></button>
          <button onClick={nextMonth} className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* GRID CALENDARIO */}
      <div className="px-6 shrink-0 max-w-lg mx-auto w-full mb-6">
         <div className="grid grid-cols-7 mb-4">
           {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-white/40 tracking-widest">{d}</div>
           ))}
         </div>
         <div className="grid grid-cols-7 gap-y-3 gap-x-2">
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
                   <div className={`w-10 h-10 flex items-center justify-center rounded-full text-[15px] transition-all duration-300 font-semibold
                     ${isSelected 
                        ? 'bg-cyan-400 text-black scale-110 shadow-[0_0_20px_rgba(34,211,238,0.4)]' 
                        : isToday 
                          ? 'border border-cyan-400/50 text-cyan-400'
                          : day.isCurrentMonth 
                             ? 'text-white hover:bg-white/10' 
                             : 'text-white/20'
                     }`}
                   >
                      {day.date.getDate()}
                   </div>
                   {hasEvents && !isSelected && (
                     <div className="absolute bottom-[-2px] w-1.5 h-1.5 rounded-full bg-cyan-400" />
                   )}
                </button>
              )
           })}
         </div>
      </div>

      {/* PANEL DE TAREAS Bimodal (Color Vibrante Rose) */}
      <div className="flex-1 bg-[#E11D48] rounded-t-[40px] px-8 pt-10 pb-28 md:pb-10 overflow-y-auto relative shadow-[0_-20px_50px_rgba(225,29,72,0.2)] max-w-lg mx-auto w-full transition-all duration-500 will-change-transform">
         
         <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-[28px] font-black uppercase tracking-widest text-white leading-none mb-1">
                 {selectedDate.toLocaleDateString('es-CL', { weekday: 'long' })}
              </h2>
              <span className="text-sm font-medium tracking-widest text-white/70 uppercase">
                 {selectedDate.getDate()} {selectedDate.toLocaleDateString('es-CL', { month: 'long' })}
              </span>
            </div>
            <button onClick={() => setIsAddOpen(true)} className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-all shadow-xl shadow-black/10 active:scale-95 text-white shrink-0">
              <Plus size={28} />
            </button>
         </div>

         <div className="space-y-4">
           <h3 className="text-[10px] font-black text-white/50 tracking-[0.2em] mb-4 uppercase">Agenda Programada</h3>
           
           {selectedDayEvents.length > 0 ? (
             selectedDayEvents.map(event => (
               <div 
                 key={event.id} 
                 onClick={() => { setSelectedEvent(event); setIsDetailOpen(true); }} 
                 className={`p-6 rounded-[32px] bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-lg active:scale-[0.98] ${event.completed ? 'opacity-60' : ''}`}
               >
                  <div className="flex gap-4">
                     <div className={`w-1.5 h-auto min-h-[40px] rounded-full shrink-0 ${event.completed ? 'bg-white/30' : 'bg-[#22D3EE] shadow-[0_0_15px_rgba(34,211,238,0.5)]'}`} />
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                           <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{event.activity_type}</span>
                           {event.completed && (
                             <span className="bg-white/20 text-white rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                               <CheckCircle2 size={10} /> Lista
                             </span>
                           )}
                        </div>
                        <h4 className={`text-white font-black text-lg leading-tight mb-2 truncate ${event.completed ? 'line-through' : ''}`}>
                          {event.title || 'Agendamiento Genérico'}
                        </h4>
                        <p className="text-white/80 text-[13px] font-medium leading-snug line-clamp-2 mt-1">
                           {event.notes || 'No hay notas registradas para esta tarea.'}
                        </p>
                        
                        {event.companies?.razon_social && (
                           <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                              <MapPin size={12} className="text-[#22D3EE]" />
                              <span className="text-[11px] font-bold text-white/90 truncate">{event.companies.razon_social}</span>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
             ))
           ) : (
              <div className="text-center py-16 opacity-80 animate-in fade-in duration-700">
                <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center mx-auto mb-4 border-dashed">
                  <CalendarIcon className="text-white/50 h-8 w-8" />
                </div>
                <p className="text-white font-black text-xl mb-1 tracking-tight">Día Despejado</p>
                <p className="text-white/70 text-[13px] font-medium px-8">No hay tareas o clientes agendados. Disfruta tu día o presiona el botón (+) para planificar nuevas acciones.</p>
              </div>
           )}
         </div>
      </div>

      {/* Add Dialog (Preservando theme claro/oscuro del SO para el formulario complex) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[400px] border-none bg-white dark:bg-slate-900 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl safe-p-bottom">
           <div className="p-8">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black tracking-tighter">Nueva Gestión</DialogTitle>
                <p className="text-muted-foreground text-[11px] font-black uppercase tracking-[0.15em] opacity-60">
                  {selectedDate?.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </DialogHeader>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Modalidad</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ id: 'LLAMADA', icon: Phone, label: 'Llamada' }, { id: 'VISITA', icon: MapPin, label: 'Visita' }, { id: 'REUNION', icon: MessageSquare, label: 'Reunión' }, { id: 'CORREO', icon: Mail, label: 'Correo' }].map(t => (
                      <button key={t.id} onClick={() => setActivityType(t.id)} className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all ${activityType === t.id ? 'bg-foreground border-foreground text-background' : 'bg-transparent border-border/40 text-muted-foreground'}`}>
                        <t.icon size={16} className={activityType === t.id ? 'opacity-100' : 'opacity-40'} />
                        <span className="text-[10px] font-black uppercase">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cliente</label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-border/40 font-bold px-4">
                      <SelectValue placeholder="Opcional: Vincular Cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.razon_social}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Detalle (Opcional)</label>
                  <textarea value={activityNote} onChange={(e) => setActivityNote(e.target.value)} placeholder="Objetivo de la gestión..." className="w-full h-24 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-border/40 text-[13px] font-medium outline-none resize-none" />
                </div>
              </div>
              <div className="flex gap-2 mt-8">
                <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="flex-1 h-14 rounded-2xl font-bold">Cancelar</Button>
                <Button onClick={handleSaveActivity} disabled={loading} className="flex-1 h-14 rounded-2xl font-black bg-foreground text-background">
                  {loading ? '...' : 'Guardar'}
                </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[400px] border-none bg-[#0B0C10] p-0 overflow-hidden rounded-[3rem] shadow-2xl safe-p-bottom">
          {selectedEvent && (
            <div className="p-8 pb-12">
               <div className="flex justify-between items-start mb-8">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedEvent.completed ? 'bg-white/10 text-white/50' : 'bg-[#E11D48] text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]'}`}>
                     {selectedEvent.activity_type === 'LLAMADA' ? <Phone size={20} /> : selectedEvent.activity_type === 'VISITA' ? <MapPin size={20} /> : <MessageSquare size={20} />}
                  </div>
                  <button onClick={() => handleDeleteActivity(selectedEvent.id)} className="w-10 h-10 rounded-full hover:bg-rose-500/20 text-white/40 hover:text-rose-500 flex items-center justify-center transition-colors">
                     <Trash2 size={18} />
                  </button>
               </div>
               
               <h2 className={`text-2xl font-black text-white leading-tight mb-2 ${selectedEvent.completed ? 'opacity-50 line-through' : ''}`}>
                 {selectedEvent.title || 'Resolución Pendiente'}
               </h2>
               <div className="text-[11px] font-black text-[#22D3EE] uppercase tracking-widest mb-6">
                 {selectedEvent.companies?.razon_social || 'Desconocido'}
               </div>

               <div className="bg-white/5 rounded-3xl p-6 mb-8 border border-white/5">
                 <p className="text-[13px] text-white/80 font-medium leading-relaxed whitespace-pre-wrap">
                   {selectedEvent.notes || 'No hay notas descriptivas para este evento.'}
                 </p>
               </div>

               <Button 
                 onClick={() => toggleComplete(selectedEvent.id, selectedEvent.completed)}
                 className={`w-full h-16 rounded-[2rem] font-black flex items-center justify-center gap-3 transition-all text-sm uppercase tracking-widest ${
                   selectedEvent.completed 
                     ? 'bg-white/10 text-white hover:bg-white/20' 
                     : 'bg-[#22D3EE] text-[#0B0C10] hover:bg-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:scale-105 active:scale-95'
                 }`}
               >
                 {selectedEvent.completed ? 'Desmarcar' : <><CheckCircle2 size={20}/> Completar Tarea</>}
               </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
