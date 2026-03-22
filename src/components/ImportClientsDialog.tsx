import { useState, useRef } from "react"
import { supabase } from "../lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, Download, CheckCircle, AlertCircle } from "lucide-react"
import { useAuth } from "../hooks/useAuth"

interface ImportRow {
  razon_social: string
  rut?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  cargo?: string
  segmento?: string
  comuna?: string
  direccion?: string
  m2_estimados?: string
  condiciones_pago?: string
  _valid: boolean
  _error?: string
}

const TEMPLATE_HEADERS = [
  "Razón Social", "RUT", "Nombre Contacto", "Teléfono",
  "Email", "Cargo", "Segmento", "Comuna",
  "Dirección", "M2 Estimados", "Condiciones Pago"
]

const TEMPLATE_EXAMPLE = [
  "Empresa Ejemplo S.A.", "12.345.678-9", "Juan Pérez", "+56912345678",
  "juan@empresa.cl", "GERENTE_OP", "CORPORATIVO", "PUERTO_MONTT",
  "Av. Los Carrera 1234", "2500", "30_DIAS"
]

const HEADER_MAP: Record<string, string> = {
  "razon_social": "razon_social", "razón_social": "razon_social", "empresa": "razon_social", "nombre_empresa": "razon_social",
  "rut": "rut", "identificacion": "rut",
  "contact_name": "contact_name", "nombre_contacto": "contact_name", "contacto": "contact_name",
  "contact_phone": "contact_phone", "teléfono": "contact_phone", "telefono": "contact_phone", "celular": "contact_phone",
  "contact_email": "contact_email", "email": "contact_email", "correo": "contact_email",
  "cargo": "cargo", "puesto": "cargo",
  "segmento": "segmento", "categoría": "segmento",
  "comuna": "comuna", "ciudad": "comuna",
  "direccion": "direccion", "dirección": "direccion",
  "m2_estimados": "m2_estimados", "m2": "m2_estimados", "superficie": "m2_estimados",
  "condiciones_pago": "condiciones_pago", "pago": "condiciones_pago", "forma_pago": "condiciones_pago"
}

function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/)
  return lines.map(line => {
    const result: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if ((ch === ',' || ch === ';') && !inQuotes) {
        result.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  })
}

function downloadTemplate() {
  const csvContent = [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]
    .map(row => row.map(cell => `"${cell}"`).join(","))
    .join("\n")
  const bom = "\uFEFF" 
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "plantilla_clientes_CRM.csv"
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  onImported?: () => void
}

export function ImportClientsDialog({ onImported }: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: number; errors: number }>({ ok: 0, errors: 0 })
  const fileRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setRows([])
    setDone(false)
    setImportResult({ ok: 0, errors: 0 })
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length < 2) return

      const rawHeaders = parsed[0]
      const dataRows = parsed.slice(1).filter(r => r.some(c => c.trim()))

      const mapped: ImportRow[] = dataRows.map(row => {
        const obj: any = {}
        rawHeaders.forEach((rawH, i) => {
          const standardized = rawH.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '')
          const field = HEADER_MAP[standardized] || standardized
          obj[field] = row[i] || ""
        })

        const valid = !!(obj.razon_social?.trim())
        return {
          razon_social: obj.razon_social || "",
          rut: obj.rut || undefined,
          contact_name: obj.contact_name || undefined,
          contact_phone: obj.contact_phone || undefined,
          contact_email: obj.contact_email || undefined,
          cargo: obj.cargo || undefined,
          segmento: obj.segmento || undefined,
          comuna: obj.comuna || undefined,
          direccion: obj.direccion || undefined,
          m2_estimados: obj.m2_estimados || undefined,
          condiciones_pago: obj.condiciones_pago || undefined,
          _valid: valid,
          _error: !valid ? "Falta Razón Social" : undefined
        }
      })
      setRows(mapped)
    }
    reader.readAsText(file, "UTF-8")
  }

  const handleImport = async () => {
    const validRows = rows.filter(r => r._valid)
    setImporting(true)
    let ok = 0; let errors = 0
    for (const row of validRows) {
      const { _valid, _error, ...data } = row
      const m2 = data.m2_estimados ? parseInt(data.m2_estimados.replace(/[^\d]/g, '')) : null
      
      const { error } = await supabase.from('companies').insert([{
        ...data,
        m2_estimados: isNaN(m2 as any) ? null : m2,
        created_by: user?.id,
        requisitos_legales: []
      }])
      if (error) {
        console.error('Import error:', error)
        errors++
      } else {
        ok++
      }
    }
    setImportResult({ ok, errors })
    setImporting(false)
    setDone(true)
    if (onImported) onImported()
  }

  const validCount = rows.filter(r => r._valid).length
  const invalidCount = rows.filter(r => !r._valid).length

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full">
          <Upload className="h-4 w-4" />
          Importar Excel/CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Clientes desde Excel / CSV</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV con los datos de tus clientes. Compatible con archivos guardados desde Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Step 1: Download template */}
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-1">① Descarga la plantilla (opcional)</p>
            <p className="text-xs text-muted-foreground mb-3">
              Abre en Excel, completa las filas y guarda como <strong>CSV UTF-8</strong>.
            </p>
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" />
              Descargar plantilla CSV
            </Button>
          </div>

          {/* Step 2: Upload */}
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-1">② Sube tu archivo</p>
            <p className="text-xs text-muted-foreground mb-3">Formatos soportados: <strong>.csv</strong> (guarda Excel como CSV UTF-8)</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:text-xs file:font-medium file:bg-background file:hover:bg-muted cursor-pointer"
              onChange={handleFile}
            />
          </div>

          {/* Preview */}
          {rows.length > 0 && !done && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle className="h-4 w-4" /> {validCount} válidos
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-red-500 font-medium">
                    <AlertCircle className="h-4 w-4" /> {invalidCount} con error
                  </span>
                )}
              </div>

              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Razón Social</th>
                        <th className="text-left px-3 py-2 font-medium">RUT</th>
                        <th className="text-left px-3 py-2 font-medium">Contacto</th>
                        <th className="text-left px-3 py-2 font-medium">Teléfono</th>
                        <th className="text-left px-3 py-2 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className={`border-t ${!row._valid ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                          <td className="px-3 py-1.5 font-medium">{row.razon_social || <span className="text-red-500 italic">vacío</span>}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{row.rut || '—'}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{row.contact_name || '—'}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{row.contact_phone || '—'}</td>
                          <td className="px-3 py-1.5">
                            {row._valid
                              ? <span className="text-emerald-600">✓ OK</span>
                              : <span className="text-red-500">✗ {row._error}</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleImport}
                disabled={importing || validCount === 0}
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Importando {validCount} clientes...
                  </span>
                ) : (
                  `Importar ${validCount} cliente${validCount !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          )}

          {/* Result */}
          {done && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4 text-center space-y-2">
              <p className="text-2xl">🎉</p>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                ¡Importación completada!
              </p>
              <p className="text-sm text-muted-foreground">
                <strong className="text-emerald-600">{importResult.ok}</strong> clientes importados
                {importResult.errors > 0 && (
                  <span>, <strong className="text-red-500">{importResult.errors}</strong> con error</span>
                )}
              </p>
              <Button size="sm" variant="outline" onClick={() => { setOpen(false); resetState() }}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
