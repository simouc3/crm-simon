import jsPDF from 'jspdf'
import { supabase } from './supabase/client'

export async function generateQuotePDF(deal: any, companyData: any) {
  const doc = new jsPDF()

  // 1. Obtener Datos Legales del CRM
  const { data: settings } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()

  const miEmpresa = settings || {}
  const miLogo = miEmpresa.company_logo_url
  
  // ── HEADER ──
  // Si hay logo, idealmente se cargaría, por ahora usamos texto si falla
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(30, 30, 40)
  doc.text(miEmpresa.company_name || "Mi Empresa", 20, 25)
  
  // Datos de mi empresa
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  if (miEmpresa.company_rut) doc.text(`RUT: ${miEmpresa.company_rut}`, 20, 32)
  if (miEmpresa.company_giro) doc.text(`Giro: ${miEmpresa.company_giro}`, 20, 37)
  if (miEmpresa.company_address) doc.text(`Dir: ${miEmpresa.company_address}`, 20, 42)
  if (miEmpresa.company_phone) doc.text(`Tel: ${miEmpresa.company_phone}`, 20, 47)

  // Tipo de Documento
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(40, 100, 255) // Azul primario
  doc.text("COTIZACIÓN DE SERVICIOS", 120, 25)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.setFont("helvetica", "normal")
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, 120, 32)
  doc.text(`Validez: ${deal.offer_validity || "15 días"}`, 120, 37)
  doc.text(`ID Ref: #${deal.id.split('-')[0].toUpperCase()}`, 120, 42)

  // ── LÍNEA SEPARADORA ──
  doc.setDrawColor(230, 230, 230)
  doc.line(20, 55, 190, 55)

  // ── DATOS DEL CLIENTE ──
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 30, 40)
  doc.text("Facturar a:", 20, 65)

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text(companyData?.razon_social || "Cliente General", 20, 72)
  if (companyData?.comuna) doc.text(`Comuna: ${companyData.comuna}`, 20, 77)

  // ── DETALLE DEL PROYECTO ──
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Detalle del Proyecto:", 20, 95)
  
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text(deal.title || "Servicios", 20, 103)
  
  // ── TABLA DE PRECIOS ──
  doc.setFillColor(245, 245, 247)
  doc.rect(20, 115, 170, 10, 'F')
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Descripción", 25, 122)
  doc.text("Subtotal", 160, 122)

  doc.setFont("helvetica", "normal")
  doc.text("Servicios Estipulados según propuesta", 25, 132)
  
  const amount = deal.valor_total || deal.valor_neto || 0
  const formatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
  doc.text(formatter.format(amount), 160, 132)

  // ── TOTALES ──
  const iva = amount * 0.19
  const total = amount + iva

  doc.line(120, 145, 190, 145)
  doc.setFontSize(10)
  doc.text("Valor Neto:", 125, 153)
  doc.text(formatter.format(amount), 160, 153)
  
  doc.text("IVA (19%):", 125, 160)
  doc.text(formatter.format(iva), 160, 160)
  
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("TOTAL CLP:", 125, 170)
  doc.text(formatter.format(total), 160, 170)

  // ── CONDICIONES COMERCIALES ──
  const startY = 190
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Términos Adicionales:", 20, startY)
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  if(deal.contract_duration) doc.text(`• Duración del contrato: ${deal.contract_duration}`, 20, startY + 8)
  if(deal.payment_terms) doc.text(`• Condiciones de pago: ${deal.payment_terms}`, 20, startY + 14)
  
  // ── FOOTER ──
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text("Documento generado automáticamente por el sistema B2B.", 20, 280)
  if (miEmpresa.company_website) doc.text(miEmpresa.company_website, 20, 285)

  // Descargar Archivo
  doc.save(`Cotizacion_${(companyData?.razon_social || "Cliente").replace(/\s+/g, '_')}.pdf`)
}
