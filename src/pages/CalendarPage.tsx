import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { ChevronLeft, ChevronRight, Plus, Clock, X, Info, Phone, Mail, MapPin, CheckCircle2, MessageSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [activityNote, setActivityNote] = useState("")
  const [selectedCompany, setSelectedCompany] = useState("")
  const [activityType, setActivityType] = useState("LLAMADA")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Calcular días del mes
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
    
    if (data) {
      setEvents(data)
    }
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
    } else {
      alert("Error: " + error.message)
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
    } else {
      alert("Error al eliminar: " + error.message)
    }
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsAddOpen(true);
  }

  const onDragEnd = async (result: any) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newDateStr = destination.droppableId
    
    // Update in DB
    const { error } = await supabase
      .from('activities')
      .update({ scheduled_at: new Date(newDateStr).toISOString() })
      .eq('id', draggableId)

    if (error) {
      alert("Error al mover actividad: " + error.message)
    }
    fetchEvents()
  }

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 animate-in fade-in duration-700">
      {/* Calendar Header */}
      <div className="shrink-0 p-8 border-b dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground mb-1">Calendario Comercial</h1>
          <p className="text-muted-foreground text-sm font-medium">Haz clic en un día para programar actividades.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-white/5 items-center">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800">
              <ChevronLeft size={18} />
            </Button>
            <div className="px-4 flex items-center justify-center min-w-[160px]">
              <span className="text-sm font-black uppercase tracking-widest text-foreground">
                {currentDate.toLocaleString('es-CL', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800">
              <ChevronRight size={18} />
            </Button>
          </div>
          
          <Button onClick={() => handleDayClick(new Date())} className="gap-2 rounded-xl h-11 px-6 shadow-lg shadow-primary/20">
            <Plus size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Nueva Actividad</span>
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent className="sm:max-w-[500px] border-none bg-white dark:bg-slate-900 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
              <div className="p-8">
                <DialogHeader className="mb-6 text-center md:text-left">
                  <DialogTitle className="text-2xl font-black tracking-tighter">Programar Actividad</DialogTitle>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2">
                    {selectedDate?.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Seleccionar Empresa</label>
                      <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 font-bold">
                          <SelectValue placeholder="Busca una empresa..." />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.razon_social}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tipo de Actividad</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'LLAMADA', icon: Phone, label: 'Llamada' },
                          { id: 'VISITA', icon: MapPin, label: 'Visita' },
                          { id: 'REUNION', icon: MessageSquare, label: 'Reunión' },
                          { id: 'CORREO', icon: Mail, label: 'Correo' }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => setActivityType(t.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              activityType === t.id 
                                ? 'bg-primary/10 border-primary text-primary' 
                                : 'bg-slate-50 dark:bg-white/5 border-transparent text-muted-foreground hover:border-slate-200'
                            }`}
                          >
                            <t.icon size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Notas / Detalles</label>
                      <textarea 
                        value={activityNote}
                        onChange={(e) => setActivityNote(e.target.value)}
                        placeholder="Escribe lo que esperas realizar..."
                        className="w-full h-24 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <Button variant="outline" onClick={() => setIsAddOpen(false)} className="h-12 rounded-xl font-bold border-border/40">Cancelar</Button>
                    <Button onClick={handleSaveActivity} disabled={loading} className="h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
                      {loading ? 'Guardando...' : 'Programar Gestión'}
                    </Button>
                  </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-visible p-4 pb-20">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="bg-slate-50 dark:bg-slate-900/50 py-4 text-center border-b border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{day}</span>
              </div>
            ))}
            
            {days.map((day, i) => {
              const dateStr = day.date.toISOString().split('T')[0]
              const dayEvents = events.filter(e => e.scheduled_at.startsWith(dateStr))
              
              return (
                <Droppable key={i} droppableId={dateStr}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      onClick={() => handleDayClick(day.date)}
                      className={`min-h-[160px] bg-white dark:bg-slate-900 p-2 transition-all relative border-r border-b border-slate-50 dark:border-white/5 cursor-pointer group ${
                        !day.isCurrentMonth ? 'bg-slate-50/[0.15] dark:bg-slate-900/20 text-muted-foreground/30' : 'text-foreground'
                      } ${snapshot.isDraggingOver ? 'bg-primary/[0.03] dark:bg-primary/[0.05]' : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'}`}
                    >
                      <div className="flex justify-between items-start mb-3 px-1">
                        <span className={`text-xs font-black p-1 transition-all ${
                          day.date.toDateString() === new Date().toDateString() 
                            ? 'h-7 w-7 bg-primary text-white rounded-lg flex items-center justify-center -mt-1 shadow-lg shadow-primary/40' 
                            : 'opacity-40 group-hover:opacity-100'
                        }`}>
                          {day.date.getDate()}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 min-h-[80px]">
                        {dayEvents.map((event, idx) => (
                          <Draggable key={event.id} draggableId={event.id} index={idx}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setIsDetailOpen(true); }}
                                className={`bg-white dark:bg-slate-800 border border-border/40 dark:border-white/10 p-2 rounded-xl shadow-sm cursor-pointer group hover:border-primary/50 transition-all duration-300 ${event.completed ? 'opacity-50 grayscale' : ''}`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    event.completed ? 'bg-slate-400' : 
                                    event.activity_type === 'VISITA' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                    event.activity_type === 'LLAMADA' ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]' :
                                    'bg-primary shadow-[0_0_8px_rgba(255,122,89,0.5)]'
                                  }`} />
                                  <span className={`text-[10px] font-black uppercase tracking-tight text-foreground truncate ${event.completed ? 'line-through' : ''}`}>
                                    {event.companies?.razon_social || 'S/E'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <div className="text-[8px] text-muted-foreground font-black truncate opacity-60 uppercase tracking-tighter">
                                    {event.activity_type}
                                  </div>
                                  {event.completed && <CheckCircle2 size={8} className="text-emerald-500" />}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px] border-none bg-white dark:bg-slate-900 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
          {selectedEvent && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="p-8">
                <div className="flex items-start justify-between mb-8">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between mr-4">
                      <DialogTitle className="text-2xl font-black text-foreground tracking-tight leading-tight">
                        {selectedEvent.companies?.razon_social || 'Gestión'}
                      </DialogTitle>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteActivity(selectedEvent.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-10 w-10 transition-colors -mt-1"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge className="bg-primary/10 text-primary border-transparent h-5 text-[9px] font-black uppercase tracking-wider px-2">Gestión Comercial</Badge>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">ID: {selectedEvent.id.slice(0, 8)}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setIsDetailOpen(false)}
                    className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-8">
                  <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1 opacity-50">TIPO</span>
                    <span className="text-[11px] font-black text-foreground">{selectedEvent.activity_type || 'GESTIÓN'}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1 opacity-50">COMUNA</span>
                    <span className="text-[11px] font-black text-foreground truncate block">{selectedEvent.companies?.comuna?.replace(/_/g, ' ') || '---'}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1 opacity-50">CONTACTO</span>
                    <span className="text-[11px] font-black text-foreground truncate block">{selectedEvent.companies?.contact_phone || '---'}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Detalles de la Gestión</label>
                    <Badge variant="outline" className={`h-5 text-[8px] font-black uppercase tracking-widest ${selectedEvent.completed ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                      {selectedEvent.completed ? 'Realizada' : 'Pendiente'}
                    </Badge>
                  </div>
                  <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 min-h-[140px] relative overflow-hidden group shadow-inner">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      {selectedEvent.activity_type === 'LLAMADA' ? <Phone size={40} className="text-sky-500" /> : <Clock size={40} className="text-primary" />}
                    </div>
                    <p className={`text-sm font-medium text-foreground leading-relaxed relative z-10 ${selectedEvent.completed ? 'line-through opacity-60' : ''}`}>
                      {selectedEvent.notes || "No hay notas adicionales para esta actividad."}
                    </p>
                  </div>
                </div>

                {/* Acciones Rápidas */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                        const q = `${selectedEvent.companies?.direccion || ''} ${selectedEvent.companies?.comuna || ''} Chile`;
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
                    }}
                    className="h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest border-border/40"
                  >
                    <MapPin size={16} className="text-primary" />
                    Ubicación
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(`tel:${selectedEvent.companies?.contact_phone}`, '_blank')}
                    className="h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest border-border/40"
                  >
                    <Phone size={16} className="text-emerald-500" />
                    Llamar
                  </Button>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={() => toggleComplete(selectedEvent.id, selectedEvent.completed)}
                    className={`flex-1 h-14 rounded-2xl font-black uppercase text-xs tracking-[0.1em] shadow-xl transition-all ${
                        selectedEvent.completed 
                        ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                    }`}
                  >
                    {selectedEvent.completed ? 'Desmarcar Realizada' : 'Marcar como Realizada'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                        window.history.pushState({}, '', '/pipeline');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                        setIsDetailOpen(false);
                    }}
                    className="h-14 px-6 rounded-2xl border-border/40 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                  >
                    <Info size={20} className="text-muted-foreground" />
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
