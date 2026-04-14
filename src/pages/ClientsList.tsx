import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Search, MessageSquare } from "lucide-react"
import { type Company } from "../types/database"
import { ClientFormDialog } from "../components/ClientFormDialog"
import { ImportClientsDialog } from "../components/ImportClientsDialog"
import { supabase } from "../lib/supabase/client"
import { ClientDetailsDialog } from "../components/ClientDetailsDialog"
import { ClientMapView } from "../components/ClientMapView"
import { Map, List } from "lucide-react"

export default function ClientsList() {
  const [clients, setClients] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [deals, setDeals] = useState<any[]>([])

  const fetchCompanies = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching companies:", error)
    } else {
      setClients(data || [])
    }

    // Fetch deals for map stages
    const { data: dealsData } = await supabase.from('deals').select('company_id, stage, valor_neto')
    if (dealsData) setDeals(dealsData)

    setLoading(false)
  }

  const handleDeleteClient = async (id: string) => {
    setLoading(true)
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) {
      alert("Error eliminando cliente")
      setLoading(false)
    } else {
      fetchCompanies()
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  const openClientDetail = (client: any) => {
    setSelectedClientForDetail(client)
    setIsDetailOpen(true)
  }

  const filteredClients = clients.filter(c => 
    c.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Ultra Minimalist Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-[#1C1C1E] rounded-[40px] p-8 md:px-10 md:py-8 mb-8 border border-black/[0.02] dark:border-white/[0.02]">
        <div className="space-y-1">
          <h1 className="text-[36px] md:text-[42px] font-black tracking-tight text-foreground leading-none">
            Clientes
          </h1>
          <p className="text-[13px] text-muted-foreground font-semibold">
            {filteredClients.length} empresas · Directorio B2B
          </p>
        </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mt-8 md:mt-0 w-full md:w-auto">
            {/* View Toggle */}
            <div className="flex glass-island p-1 rounded-full shadow-sm border border-black/[0.03] dark:border-white/[0.05] w-full md:w-auto justify-center">
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === 'list' ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm' : 'text-muted-foreground opacity-40 hover:opacity-70'
                }`}
              >
                <List className="h-3.5 w-3.5" /> Lista
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === 'map' ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm' : 'text-muted-foreground opacity-40 hover:opacity-70'
                }`}
              >
                <Map className="h-3.5 w-3.5" /> Mapa
              </button>
            </div>
            <div className="w-full md:w-auto">
              <ImportClientsDialog onImported={fetchCompanies} />
            </div>
            <div className="w-full md:w-auto">
              <ClientFormDialog onClientCreated={fetchCompanies} />
            </div>
          </div>
      </div>

      {/* Search Bar Mobile Premium */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input 
          type="text"
          placeholder="Buscar por nombre, RUT o contacto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-14 pl-12 pr-6 rounded-full bg-white dark:bg-[#1C1C1E] border border-border/40 dark:border-white/5 shadow-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-sm tracking-tight"
        />
      </div>
      
      {/* Map View */}
      {viewMode === 'map' && (
        <ClientMapView
          clients={filteredClients}
          deals={deals}
          onClientClick={(client) => {
            setSelectedClientForDetail(client)
            setIsDetailOpen(true)
          }}
        />
      )}

      {/* List Views */}
      {viewMode === 'list' && (
      <>
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-20 opacity-40 font-black uppercase tracking-widest text-xs animate-pulse">Sincronizando Clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20 opacity-40 font-black text-sm">No se encontraron clientes</div>
        ) : (
          filteredClients.map((client) => {
            // Segment → color mapping (similar to stage colors in Pipeline)
            const segColorMap: Record<string, string> = {
              logistica: '#32ADE6', logística: '#32ADE6',
              industrial: '#FF9F0A',
              retail: '#BF5AF2',
              salud: '#34C759', 'salud clínica': '#34C759', 'salud clinica': '#34C759',
              educacion: '#007AFF', educación: '#007AFF',
              construccion: '#FF6B00', construcción: '#FF6B00',
              mineria: '#8E8E93', minería: '#8E8E93',
              adquisiciones: '#5AC8FA',
            }
            const segKey = (client.segmento || '').toLowerCase().replace(/_/g, ' ')
            const segHex = segColorMap[segKey] || '#007AFF'

            return (
              <div
                key={client.id}
                onClick={() => openClientDetail(client)}
                className="group cursor-pointer select-none bg-white dark:bg-[#141420] rounded-[32px] overflow-hidden border border-black/[0.05] dark:border-white/[0.07] relative transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:scale-[0.98] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)]"
              >
                {/* Left colored accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[32px]" style={{ backgroundColor: segHex }} />

                <div className="pl-5 pr-4 pt-4 pb-3">

                  {/* Row 1: Segment badge + RUT */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: segHex + '18', color: segHex }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: segHex }} />
                      {client.segmento?.replace(/_/g, ' ') || 'Sin segmento'}
                    </span>
                    <span className="text-[9px] font-black text-muted-foreground/40 tabular-nums tracking-wide">{client.rut || '—'}</span>
                  </div>

                  {/* Row 2: Avatar initial + company name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-[15px] text-white"
                      style={{ backgroundColor: segHex }}
                    >
                      {(client.razon_social || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-[15px] tracking-[-0.02em] leading-tight text-foreground truncate">
                        {client.razon_social}
                      </h3>
                      <p className="text-[11px] text-muted-foreground/50 truncate leading-snug mt-0.5">
                        {client.contact_name || (client.segmento?.replace(/_/g, ' ') || 'Sin contacto')}
                      </p>
                    </div>
                  </div>

                  {/* Row 3: m2 + location */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-black/[0.05] dark:border-white/[0.05]">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none mb-1">Área</p>
                      <p className="text-[16px] font-black tracking-[-0.03em] tabular-nums text-foreground leading-none">
                        {client.m2_estimados ? `${Number(client.m2_estimados).toLocaleString('es-CL')} m²` : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      {client.condiciones_pago && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                          {client.condiciones_pago.replace(/_/g, ' ')}
                        </span>
                      )}
                      {client.comuna && (
                        <p className="text-[9px] text-muted-foreground/30 font-semibold uppercase tracking-wider mt-0.5 truncate max-w-[110px]">
                          {client.comuna.replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Quick actions */}
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {client.contact_phone && (() => {
                      const digits = client.contact_phone.replace(/\D/g, '')
                      const waUrl = digits.startsWith('569') ? `https://wa.me/${digits}` :
                        digits.startsWith('9') && digits.length === 9 ? `https://wa.me/56${digits}` : null
                      return waUrl ? (
                        <a href={waUrl} target="_blank" rel="noreferrer"
                          className="flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/25 transition-colors flex-shrink-0"
                          title="WhatsApp">
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                      ) : (
                        <a href={`tel:${client.contact_phone}`}
                          className="flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/25 transition-colors flex-shrink-0">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.72 6.72l1.28-1.34a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                        </a>
                      )
                    })()}
                    {client.contact_email && (
                      <a href={`mailto:${client.contact_email}`}
                        className="flex items-center justify-center h-8 w-8 rounded-xl bg-blue-500/15 dark:bg-blue-500/20 text-blue-500 hover:bg-blue-500/25 transition-colors flex-shrink-0">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
                      </a>
                    )}
                    <div className="flex-1" />
                    {/* Edit */}
                    <ClientFormDialog
                      clientToEdit={client}
                      onClientCreated={fetchCompanies}
                      trigger={
                        <button className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-muted-foreground hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex-shrink-0">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      }
                    />
                    {/* Delete */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="flex items-center justify-center h-8 w-8 rounded-xl bg-rose-500/12 text-rose-500 hover:bg-rose-500/20 transition-colors flex-shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2.5rem] border-none">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-black tracking-tight text-2xl">¿Eliminar cliente?</AlertDialogTitle>
                          <AlertDialogDescription className="text-sm font-medium">Esta acción también eliminará todos los negocios de <strong>{client.razon_social}</strong>.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6">
                          <AlertDialogCancel className="rounded-xl font-bold">Volver</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteClient(client.id)} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="hidden md:block bg-white dark:bg-[#1C1C1E] border border-border/40 dark:border-white/5 rounded-[32px] overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-white/[0.02]">
            <TableRow className="border-border/40">
              <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Empresa / RUT</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Contacto Directo</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Segmento</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Logística</TableHead>
              <TableHead className="text-right font-black text-[10px] uppercase tracking-widest h-14">M2 Estimados</TableHead>
              <TableHead className="w-[100px] h-14"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 opacity-40 font-black uppercase text-xs">Cargando base de datos...</TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 opacity-40 font-black text-sm">No hay resultados para tu búsqueda</TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="border-border/40 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => openClientDetail(client)}>
                  <TableCell className="py-5">
                    <div className="font-black text-[15px] tracking-tight hover:text-primary transition-colors">{client.razon_social}</div>
                    <div className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase">{client.rut || '—'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-[13px] tracking-tight">{client.contact_name || '—'}</div>
                    <div className="flex gap-3 mt-1">
                       {client.contact_email && <a href={`mailto:${client.contact_email}`} className="text-primary hover:underline text-[11px] font-bold uppercase tracking-tight">Email</a>}
                       {client.contact_phone && (() => {
                         const digits = client.contact_phone.replace(/\D/g, '');
                         let waUrl = null;
                         if (digits.startsWith('569')) waUrl = `https://wa.me/${digits}`;
                         else if (digits.startsWith('9') && digits.length === 9) waUrl = `https://wa.me/56${digits}`;
                         
                         return waUrl ? (
                           <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline text-[11px] font-bold uppercase tracking-tight flex items-center gap-1">
                             <MessageSquare className="h-3 w-3 inline fill-emerald-600" /> WhatsApp
                           </a>
                         ) : (
                           <a href={`tel:${client.contact_phone}`} className="text-emerald-600 hover:underline text-[11px] font-bold uppercase tracking-tight">Llamar</a>
                         );
                       })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary tracking-widest">{client.segmento?.replace(/_/g, ' ') || 'INDUSTRIAL'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="text-[13px] font-bold text-foreground">{(client as any).direccion || '—'}</div>
                      <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-50">{client.comuna?.replace(/_/g, ' ') || 'SIN COMUNA'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black tabular-nums text-foreground">
                    {client.m2_estimados?.toLocaleString() || '0'} m²
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <ClientFormDialog clientToEdit={client} onClientCreated={fetchCompanies} trigger={
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      } />
                      <AlertDialog>
                          <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-black tracking-tight text-2xl">¿Eliminar empresa?</AlertDialogTitle>
                              <AlertDialogDescription className="font-medium">Confirma que deseas eliminar permanentemente a <strong>{client.razon_social}</strong> de la base de datos.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-8">
                              <AlertDialogCancel className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-border/40">Volver</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteClient(client.id)} className="h-12 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] tracking-widest">Proceder</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      </>
      )}
      <ClientDetailsDialog 
        client={selectedClientForDetail} 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
      />
    </div>
  )
}
