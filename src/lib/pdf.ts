import jsPDF from 'jspdf'

export function generateQuotePDF(companyName: string, dealTitle: string, amount: number) {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text("COTIZACIÓN DE SERVICIOS", 20, 20)
  
  // Detalle Empresa
  doc.setFontSize(12)
  doc.text(`Cliente: ${companyName}`, 20, 40)
  doc.text(`Proyecto: ${dealTitle}`, 20, 50)
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 60)

  // Montos
  doc.setFontSize(14)
  const formatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
  const iva = amount * 0.19
  const total = amount + iva

  doc.text(`Valor Neto: ${formatter.format(amount)}`, 20, 90)
  doc.text(`IVA (19%): ${formatter.format(iva)}`, 20, 100)
  doc.setFont("helvetica", "bold")
  doc.text(`TOTAL: ${formatter.format(total)}`, 20, 115)

  // Footer / Legales
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("Las condiciones de este servicio están sujetas a los Requisitos Legales acordados.", 20, 250)
  doc.text("Validez de la cotización: 15 días.", 20, 260)

  // Descargar Archivo
  doc.save(`Cotizacion_${companyName.replace(/\s+/g, '_')}.pdf`)
}
