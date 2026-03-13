export type Role = 'ADMIN' | 'VENTAS'

export type Cargo = 'GERENCIA_OP' | 'ADQUISICIONES' | 'FACILITY' | 'RRHH' | 'DUENO'
export type Segmento = 'ACUICOLA_MARITIMO' | 'SALUD_CLINICO' | 'CORPORATIVO' | 'LOGISTICA'
export type Comuna = 'PUERTO_MONTT' | 'PUERTO_VARAS' | 'LLANQUIHUE' | 'CHILOE' | 'OTRO'
export type CondicionesPago = 'CONTADO' | '30_DIAS' | '45_DIAS' | '60_DIAS'
export type RequisitoLegal = 'F30' | 'MUTUAL' | 'SEREMI' | 'INDUCCION' | 'EPP'

export interface Company {
  id: string
  razon_social: string
  rut: string
  contact_name: string
  contact_phone: string
  contact_email: string
  cargo: Cargo
  segmento: Segmento
  comuna: Comuna
  m2_estimados: number
  requisitos_legales: RequisitoLegal[]
  condiciones_pago: CondicionesPago
  created_by?: string
  created_at?: string
}

export type DealStage = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface Deal {
  id: string
  title: string
  company_id: string
  user_id?: string
  stage: DealStage
  valor_neto: number
  valor_total: number
  motivo_perdida?: string
  stage_updated_at?: string
  created_at?: string
}
