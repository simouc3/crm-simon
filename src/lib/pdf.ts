import jsPDF from 'jspdf'
import { supabase } from './supabase/client'

export async function generateQuotePDF(deal: any, companyData: any) {
  // 1. Obtener Datos Legales del CRM
  const { data: settings } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()

  const miEmpresa = settings || {
    company_name: "LimpioSur SPA",
    company_rut: "76.XXX.XXX-X",
    company_address: "Dirección Central, Chile"
  }

  const neto = Number(deal.valor_neto) || 0
  const iva = neto * 0.19
  const total = neto + iva
  const formatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
  const report = deal.ia_proposal_report
  const technicalText = report?.technical_scope || deal.cotizacion_detalles || "Servicios integrales de limpieza y sanitización industrial según requerimiento."

  // 2. Crear Contenedor HTML Temporal
  const container = document.createElement('div')
  container.style.width = '190mm' // Ancho A4 menos márgenes
  container.style.padding = '20mm'
  container.style.backgroundColor = '#FFFFFF'
  container.style.color = '#1C1C1E'
  container.style.fontFamily = "'Inter', sans-serif"
  container.style.fontSize = '12px'
  container.style.lineHeight = '1.5'
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'

  // Estilos CSS de la Plantilla
  const style = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
      
      .pdf-wrapper { 
        border-top: 4px solid #007AFF; 
        background: #fff;
      }
      .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
      .company-info h1 { font-size: 24px; font-weight: 800; margin: 0; color: #1C1C1E; letter-spacing: -1px; }
      .company-info p { margin: 2px 0; color: #8E8E93; font-size: 9px; }
      .document-type { text-align: right; }
      .document-type h2 { font-size: 14px; font-weight: 800; color: #007AFF; margin: 0; }
      .document-type p { font-size: 10px; color: #8E8E93; margin: 2px 0; }
      
      .client-section { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #F2F2F7; }
      .section-label { font-size: 9px; font-weight: 800; color: #8E8E93; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
      .client-name { font-size: 14px; font-weight: 700; }
      
      .scope-section { margin-bottom: 40px; page-break-inside: avoid; }
      .scope-title { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
      .scope-dot { width: 4px; height: 20px; background: #007AFF; border-radius: 2px; }
      .scope-content { font-size: 11px; color: #3C3C43; white-space: pre-wrap; }
      
      .pricing-table { w-full border-collapse: collapse; margin-top: 20px; }
      .pricing-table th { background: #F9FAFB; color: #4B5563; font-size: 9px; font-weight: 800; text-transform: uppercase; text-align: left; padding: 12px 16px; }
      .pricing-table td { padding: 16px; border-bottom: 1px solid #E5E5EA; font-size: 11px; }
      .pricing-table tr:last-child td { border-bottom: none; }
      .pricing-table .amount { text-align: right; font-weight: 600; }
      
      .totals-section { margin-left: auto; width: 250px; margin-top: 30px; page-break-inside: avoid; }
      .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 11px; }
      .total-row.grand-total { border-top: 2px solid #1C1C1E; margin-top: 12px; padding-top: 16px; }
      .total-amount { font-weight: 600; }
      .grand-total-label { font-size: 14px; font-weight: 800; }
      .grand-total-amount { font-size: 18px; font-weight: 800; color: #007AFF; }
      
      .footer { margin-top: 60px; font-size: 8px; color: #8E8E93; font-style: italic; page-break-inside: avoid; border-top: 1px solid #F2F2F7; padding-top: 20px; }
    </style>
  `

  container.innerHTML = `
    ${style}
    <div class="pdf-wrapper">
      <div class="header">
        <div class="company-info">
          <h1>${miEmpresa.company_name.toUpperCase()}</h1>
          <p>RUT: ${miEmpresa.company_rut} &nbsp;|&nbsp; Giro: ${miEmpresa.company_giro || 'Servicios Integrales'}</p>
          <p>${miEmpresa.company_address} &nbsp;|&nbsp; ${miEmpresa.company_phone || '+56 9 XXXX XXXX'}</p>
        </div>
        <div class="document-type">
          <h2>PROPUESTA B2B</h2>
          <p>REF: #${deal.id.split('-')[0].toUpperCase()}</p>
          <p>Fecha: ${new Date().toLocaleDateString('es-CL')}</p>
        </div>
      </div>

      <div class="client-section">
        <div>
          <div class="section-label">Cliente / Socio Estratégico</div>
          <div class="client-name">${companyData?.razon_social || "Cliente General"}</div>
          <p style="margin:4px 0; color:#8E8E93; font-size:10px;">RUT: ${companyData?.rut || 'Pendiente'} | Comuna: ${companyData?.comuna || 'Chile'}</p>
        </div>
        <div style="text-align: right;">
          <div class="section-label">Consultor Ejecutivo</div>
          <div class="client-name">${deal.seller_name || "Consultor LimpioSur"}</div>
          <p style="margin:4px 0; color:#8E8E93; font-size:10px;">Vigencia: ${deal.offer_validity || '15 días'}</p>
        </div>
      </div>

      <div class="scope-section">
        <div class="scope-title">
          <div class="scope-dot"></div>
          <div style="font-size: 14px; font-weight: 700;">Alcance Técnico del Servicio</div>
        </div>
        <div class="scope-content">${technicalText}</div>
      </div>

      <table class="pricing-table" style="width: 100%;">
        <thead>
          <tr>
            <th style="width: 70%;">Descripción del Servicio</th>
            <th style="width: 30%; text-align: right;">Inversión Neta</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight: 700; margin-bottom: 4px;">${deal.title}</div>
              <div style="color: #8E8E93; font-size: 10px;">Servicios de limpieza avanzada y sanitización industrial según requerimiento operativo.</div>
            </td>
            <td class="amount">${formatter.format(neto)}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals-section">
        <div class="total-row">
          <span>Subtotal Neto</span>
          <span class="total-amount">${formatter.format(neto)}</span>
        </div>
        <div class="total-row">
          <span>IVA (19%)</span>
          <span class="total-amount">${formatter.format(iva)}</span>
        </div>
        <div class="total-row grand-total">
          <span class="grand-total-label">TOTAL CLP</span>
          <span class="grand-total-amount">${formatter.format(total)}</span>
        </div>
      </div>

      <div class="footer">
        Certificado de Aceptación Digital: Este documento constituye una oferta comercial vinculante. 
        Fue aprobado electrónicamente mediante el protocolo de Firma Simple B2B. 
        IP Registro: ${deal.signature_ip || 'Registrada via Web'} &nbsp;|&nbsp; 
        ID Transacción: ${deal.id} &nbsp;|&nbsp; 
        Timestamp: ${deal.signature_date ? new Date(deal.signature_date).toLocaleString() : new Date().toLocaleString()}.
        <br/><br/>
        ${miEmpresa.company_website || ''}
      </div>
    </div>
  `

  document.body.appendChild(container)

  // 3. Generar PDF
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait'
  })

  await doc.html(container, {
    callback: function(doc) {
      doc.save(`Propuesta_${(companyData?.razon_social || "Cliente").replace(/\s+/g, '_')}_${deal.id.split('-')[0]}.pdf`)
      document.body.removeChild(container)
    },
    x: 0,
    y: 0,
    width: 210, // Ancho A4
    windowWidth: 794, // Resolución para 190mm a 96dpi aprox
    autoPaging: 'text'
  })
}


