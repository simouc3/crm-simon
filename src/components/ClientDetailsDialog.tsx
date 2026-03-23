import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Building2, User, Phone, Mail, MapPin, Ruler, Tag, Briefcase } from 'lucide-react'

interface ClientDetailsDialogProps {
  client: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientDetailsDialog({ client, open, onOpenChange }: ClientDetailsDialogProps) {
  if (!client) return null

  const InfoItem = ({ icon: Icon, label, value, colorClass = "text-primary" }: any) => (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.02] dark:border-white/[0.02] shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-slate-50 dark:bg-white/5 ${colorClass}`}>
          <Icon size={18} />
        </div>
        <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-tight opacity-60">{label}</span>
      </div>
      <span className="text-[15px] font-black text-foreground text-right max-w-[200px] truncate">
        {value || '—'}
      </span>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden border-none bg-[#F5F5F7] dark:bg-black shadow-2xl">
        <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
          {/* Header Section */}
          <div className="p-8 pb-6 bg-white dark:bg-[#1C1C1E] border-b border-border/10">
            <div className="flex items-center gap-5 mb-6">
              <div className="w-20 h-20 rounded-[28px] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Building2 size={40} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[28px] font-black tracking-tight text-foreground leading-tight truncate">
                  {client.razon_social}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-[10px] font-black text-muted-foreground uppercase tracking-widest border border-border/10">
                    RUT: {client.rut || 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <div className="p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-1">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Segmento</span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate">{client.segmento?.replace('_', ' ') || 'GENERAL'}</span>
               </div>
               <div className="p-4 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex flex-col gap-1">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Condiciones</span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-400 truncate">{client.condiciones_pago || 'CONTADO'}</span>
               </div>
            </div>
          </div>

          {/* Body Section */}
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="ml-4 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">Contacto Directo</h3>
              <div className="grid gap-2">
                <InfoItem icon={User} label="Nombre" value={client.contact_name} colorClass="text-indigo-500" />
                <InfoItem icon={Briefcase} label="Cargo" value={client.cargo} colorClass="text-slate-500" />
                <InfoItem icon={Phone} label="Teléfono" value={client.contact_phone} colorClass="text-emerald-500" />
                <InfoItem icon={Mail} label="Email" value={client.contact_email} colorClass="text-blue-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="ml-4 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">Ubicación y Métricas</h3>
              <div className="grid gap-2">
                <InfoItem icon={MapPin} label="Comuna" value={client.comuna} colorClass="text-rose-500" />
                <InfoItem icon={Tag} label="Dirección" value={client.direccion} colorClass="text-orange-500" />
                <InfoItem icon={Ruler} label="M2 Estimados" value={client.m2_estimados > 0 ? `${client.m2_estimados} m²` : '0 m²'} colorClass="text-purple-500" />
              </div>
            </div>

            {client.requisitos_legales?.length > 0 && (
              <div className="space-y-2">
                <h3 className="ml-4 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">Requisitos Legales</h3>
                <div className="p-4 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-border/10 flex flex-wrap gap-2">
                  {client.requisitos_legales.map((req: string) => (
                    <span key={req} className="px-3 py-1 bg-slate-50 dark:bg-white/5 rounded-lg text-[10px] font-bold text-muted-foreground border border-border/10">
                      {req}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <button 
              onClick={() => onOpenChange(false)}
              className="w-full h-14 rounded-3xl bg-foreground text-background font-black uppercase text-[12px] tracking-widest shadow-xl shadow-black/10 active:scale-95 transition-all mt-4"
            >
              Cerrar Ficha
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
