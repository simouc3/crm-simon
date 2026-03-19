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
import { Pencil, Trash2, Mail, Phone, MapPin, Building2, User, Search } from "lucide-react"
import { type Company } from "../types/database"
import { ClientFormDialog } from "../components/ClientFormDialog"
import { ImportClientsDialog } from "../components/ImportClientsDialog"
import { supabase } from "../lib/supabase/client"

export default function ClientsList() {
  const [clients, setClients] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

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

  const filteredClients = clients.filter(c => 
    c.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-sm border border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg tracking-wider">DIRECTORIO</span>
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Clientes B2B</span>
          </div>
          <h1 className="text-[32px] md:text-[40px] font-black tracking-tighter text-foreground leading-[1.1]">
            Gestión de <span className="text-primary italic">Empresas</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <ImportClientsDialog onImported={fetchCompanies} />
          <ClientFormDialog onClientCreated={fetchCompanies} />
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
          className="w-full h-14 pl-12 pr-6 rounded-full bg-white dark:bg-slate-900 border border-border/40 shadow-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-sm tracking-tight"
        />
      </div>
      
      {/* Table Desktop / Cards Mobile */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-20 opacity-40 font-black uppercase tracking-widest text-xs animate-pulse">Sincronizando Clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20 opacity-40 font-black text-sm">No se encontraron clientes</div>
        ) : (
          filteredClients.map((client) => (
            <div key={client.id} className="bg-white dark:bg-slate-900 border border-border/40 rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] relative overflow-hidden group active:scale-95 transition-all duration-300">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors" />
               
               <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                   <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-border/20 shadow-inner">
                     <Building2 className="h-7 w-7 text-primary/60" />
                   </div>
                   <div>
                     <h3 className="font-black text-lg tracking-tighter text-foreground leading-tight">{client.razon_social}</h3>
                     <span className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">{client.rut || 'Sin RUT'}</span>
                   </div>
                 </div>
                 <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase">{client.segmento?.replace(/_/g, ' ') || 'S/E'}</Badge>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="flex flex-col gap-1">
                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Responsable</span>
                   <div className="flex items-center gap-2">
                     <User className="h-3 w-3 text-primary opacity-40" />
                     <span className="text-xs font-bold text-foreground truncate">{client.contact_name || 'Sin asignar'}</span>
                   </div>
                 </div>
                 <div className="flex flex-col gap-1">
                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Ubicación</span>
                   <div className="flex items-center gap-2">
                     <MapPin className="h-3 w-3 text-emerald-500 opacity-40" />
                     <span className="text-xs font-bold text-foreground truncate">{client.comuna?.replace(/_/g, ' ') || 'Sin comuna'}</span>
                   </div>
                 </div>
               </div>

               <div className="flex items-center justify-between pt-4 border-t border-border/40">
                 <div className="flex items-center gap-2">
                   {client.contact_phone && (
                     <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600" onClick={() => window.open(`tel:${client.contact_phone}`)}>
                       <Phone className="h-4 w-4" />
                     </Button>
                   )}
                   {client.contact_email && (
                     <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-sky-50 text-sky-600" onClick={() => window.open(`mailto:${client.contact_email}`)}>
                       <Mail className="h-4 w-4" />
                     </Button>
                   )}
                 </div>
                 <div className="flex items-center gap-2">
                   <ClientFormDialog 
                    clientToEdit={client}
                    onClientCreated={fetchCompanies}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/10">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                   />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl text-rose-500 hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
          ))
        )}
      </div>

      <div className="hidden md:block bg-white dark:bg-slate-900 border border-border/40 rounded-[32px] overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
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
                <TableRow key={client.id} className="border-border/40 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <TableCell className="py-5">
                    <div className="font-black text-[15px] tracking-tight">{client.razon_social}</div>
                    <div className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase">{client.rut || '—'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-[13px] tracking-tight">{client.contact_name || '—'}</div>
                    <div className="flex gap-3 mt-1">
                       {client.contact_email && <a href={`mailto:${client.contact_email}`} className="text-primary hover:underline text-[11px] font-bold uppercase tracking-tight">Email</a>}
                       {client.contact_phone && <a href={`tel:${client.contact_phone}`} className="text-emerald-600 hover:underline text-[11px] font-bold uppercase tracking-tight">Llamar</a>}
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
                          <AlertDialogTrigger asChild>
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
    </div>
  )
}
