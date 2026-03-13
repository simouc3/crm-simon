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
import { Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react"
import { type Company } from "../types/database"
import { ClientFormDialog } from "../components/ClientFormDialog"
import { ImportClientsDialog } from "../components/ImportClientsDialog"
import { supabase } from "../lib/supabase/client"

export default function ClientsList() {
  const [clients, setClients] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

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
      alert("Error eliminando cliente: " + error.message)
      setLoading(false)
    } else {
      fetchCompanies()
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-foreground">Directorio de Clientes</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Gestión de empresas y perfiles industriales</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ImportClientsDialog onImported={fetchCompanies} />
          <ClientFormDialog onClientCreated={fetchCompanies} />
        </div>
      </div>
      
      <div className="bg-card border border-border/40 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden transition-all hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] duration-500">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Razón Social / RUT</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-right">M2</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Cargando clientes...
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Aún no hay clientes registrados. Crea el primero.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="font-medium">{client.razon_social}</div>
                    <div className="text-xs text-muted-foreground">{client.rut}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-sm tracking-tight">{client.contact_name}</div>
                    {client.contact_email && (
                      <a
                        href={`mailto:${client.contact_email}`}
                        className="text-[10px] font-bold text-muted-foreground/60 hover:text-primary transition-colors flex items-center gap-1.5 mt-1 truncate max-w-[180px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-2.5 w-2.5 opacity-40" />
                        {client.contact_email}
                      </a>
                    )}
                    {client.contact_phone && (
                      <a
                        href={`tel:${client.contact_phone}`}
                        className="text-[10px] font-bold text-muted-foreground/40 hover:text-primary transition-colors flex items-center gap-1.5 mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-2.5 w-2.5 opacity-30" />
                        {client.contact_phone}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{client.segmento?.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-foreground tracking-tight">
                        <MapPin className="h-2.5 w-2.5 opacity-30 shrink-0" />
                        <span>{(client as any).direccion || '—'}</span>
                      </div>
                      <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1 ml-4 opacity-70">{client.comuna?.replace(/_/g, ' ') || 'SIN COMUNA'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {client.m2_estimados?.toLocaleString() || '0'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <ClientFormDialog 
                        clientToEdit={client}
                        onClientCreated={fetchCompanies}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-[425px]">
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que deseas eliminar <strong>{client.razon_social}</strong>? Esta acción no se puede deshacer y también eliminará todos los negocios asociados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteClient(client.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Sí, eliminar
                            </AlertDialogAction>
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
