import {
  Dialog,
  DialogContent,
  DialogStickyFooter,
  DialogMacClose,
} from "@/components/ui/dialog"
import { Building2, User, Phone, Mail, MapPin, Ruler, Tag, Briefcase } from 'lucide-react'

interface ClientDetailsDialogProps {
  client: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientDetailsDialog({ client, open, onOpenChange }: ClientDetailsDialogProps) {
  if (!client) return null

  const InfoItem = ({ icon: Icon, label, value, colorClass = "text-primary", fullWidth = false }: any) => (
    <div className={`flex items-center justify-between p-3.5 bg-white dark:bg-[#141420] rounded-[22px] border border-black/[0.03] dark:border-white/[0.03] shadow-sm ${fullWidth ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-[14px] bg-slate-50 dark:bg-white/5 ${colorClass} shrink-0`}>
          <Icon size={16} />
        </div>
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40 leading-none">{label}</span>
      </div>
      <span className="text-[13px] font-bold text-foreground text-right truncate pl-4">
        {value || '—'}
      </span>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] rounded-[2.5rem] p-0 overflow-hidden border-none bg-[#F5F5F7] dark:bg-black shadow-2xl [&>button]:hidden">
        <div className="flex flex-col max-h-[90vh] relative">
          
          {/* Botón Cerrar "Mac Style" - Global Component */}
          <DialogMacClose onClick={() => onOpenChange(false)} />

          <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
            {/* Header Section — Deep Polish */}
            <div className="p-6 pb-5 bg-white dark:bg-[#111119] border-b border-black/[0.03] dark:border-white/[0.03]">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-[22px] bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                  <Building2 size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[22px] font-black tracking-tighter text-foreground leading-tight truncate">
                    {client.razon_social}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest border border-black/[0.03] dark:border-white/[0.03]">
                      RUT: {client.rut || 'Pendiente'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                 <div className="p-3.5 rounded-[22px] bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-0.5">
                    <span className="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest">Segmento</span>
                    <span className="text-[13px] font-black text-emerald-700 dark:text-emerald-400 truncate">{client.segmento?.replace('_', ' ') || 'GENERAL'}</span>
                 </div>
                 <div className="p-3.5 rounded-[22px] bg-blue-500/5 border border-blue-500/10 flex flex-col gap-0.5">
                    <span className="text-[8px] font-black text-blue-600/60 uppercase tracking-widest">Condiciones</span>
                    <span className="text-[13px] font-black text-blue-700 dark:text-blue-400 truncate">{client.condiciones_pago || 'CONTADO'}</span>
                 </div>
              </div>
            </div>

            {/* Body Section — High Density Layout */}
            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <h3 className="ml-3 text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-30">Información de Contacto</h3>
                <div className="grid grid-cols-2 gap-2">
                  <InfoItem icon={User} label="Nombre" value={client.contact_name} colorClass="text-indigo-500" fullWidth />
                  <InfoItem icon={Briefcase} label="Cargo" value={client.cargo} colorClass="text-slate-500" />
                  <InfoItem icon={Phone} label="Teléfono" value={client.contact_phone} colorClass="text-emerald-500" />
                  <InfoItem icon={Mail} label="Email" value={client.contact_email} colorClass="text-blue-500" fullWidth />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="ml-3 text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-30">Operación y Medidas</h3>
                <div className="grid grid-cols-2 gap-2">
                  <InfoItem icon={MapPin} label="Comuna" value={client.comuna} colorClass="text-rose-500" />
                  <InfoItem icon={Ruler} label="M2" value={client.m2_estimados > 0 ? `${client.m2_estimados} m²` : '0 m²'} colorClass="text-purple-500" />
                  <InfoItem icon={Tag} label="Dirección" value={client.direccion} colorClass="text-orange-500" fullWidth />
                </div>
              </div>

              {client.requisitos_legales?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="ml-3 text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-30">Requisitos Legales</h3>
                  <div className="p-3.5 bg-white dark:bg-[#141420] rounded-[22px] border border-black/[0.03] dark:border-white/[0.03] flex flex-wrap gap-1.5 shadow-sm">
                    {client.requisitos_legales.map((req: string) => (
                      <span key={req} className="px-2.5 py-1 bg-slate-50 dark:bg-white/5 rounded-lg text-[9px] font-bold text-muted-foreground/60 border border-black/[0.03] dark:border-white/[0.03]">
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Footer Action Bar — Apple Style (Abstracción Global) */}
          <DialogStickyFooter>
            <button 
              onClick={() => onOpenChange(false)}
              className="w-full h-14 rounded-[22px] bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all"
            >
              Cerrar Ficha
            </button>
          </DialogStickyFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
