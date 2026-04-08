import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
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

  // 2. Crear Contenedor HTML Temporal (Invisible para el usuario pero rastreable por html2canvas)
  const container = document.createElement('div')
  container.style.width = '800px'
  container.style.padding = '60px'
  container.style.backgroundColor = '#FFFFFF'
  container.style.position = 'absolute'
  container.style.left = '0'
  container.style.top = '0'
  container.style.zIndex = '-9999'
  container.style.opacity = '0.01' // Casi invisible pero el motor lo renderiza
  container.style.pointerEvents = 'none'

  const style = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
      .pdf-root { font-family: 'Inter', sans-serif; color: #1C1C1E; line-height: 1.5; background: white; width: 100%; border-top: 5px solid #007AFF; padding-top: 20px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
      .company-info h1 { font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -1px; }
      .company-info p { margin: 2px 0; color: #8E8E93; font-size: 11px; }
      .document-type { text-align: right; }
      .document-type h2 { font-size: 16px; font-weight: 800; color: #007AFF; margin: 0; }
      .document-type p { font-size: 11px; color: #8E8E93; margin: 2px 0; }
      .client-section { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 1px solid #F2F2F7; padding-bottom: 25px; }
      .label { font-size: 10px; font-weight: 800; color: #8E8E93; text-transform: uppercase; margin-bottom: 10px; }
      .val { font-size: 15px; font-weight: 700; }
      .scope-card { margin-bottom: 40px; }
      .scope-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
      .blue-bar { width: 5px; height: 25px; background: #007AFF; border-radius: 4px; }
      .scope-content { font-size: 13px; color: #3A3A3C; white-space: pre-wrap; margin-left: 15px; }
      .table { width: 100%; border-collapse: collapse; margin: 30px 0; }
      .table th { background: #F9FAFB; padding: 15px; text-align: left; font-size: 11px; text-transform: uppercase; color: #48484A; font-weight: 800; }
      .table td { padding: 20px 15px; border-bottom: 1px solid #E5E5EA; font-size: 13px; }
      .totals { margin-left: auto; width: 300px; margin-top: 40px; }
      .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 13px; }
      .grand-total { border-top: 2px solid #1C1C1E; margin-top: 15px; padding-top: 20px; color: #007AFF; font-size: 20px; font-weight: 800; }
      .footer { margin-top: 80px; padding-top: 30px; border-top: 1px solid #F2F2F7; font-size: 10px; color: #8E8E93; font-style: italic; }
    </style>
  `

  container.innerHTML = `
    ${style}
    <div class="pdf-root">
      <div class="header">
        <div class="company-info">
          <h1>${miEmpresa.company_name.toUpperCase()}</h1>
          <p>RUT: ${miEmpresa.company_rut} &nbsp;|&nbsp; Giro: ${miEmpresa.company_giro || 'Servicios Industriales'}</p>
          <p>${miEmpresa.company_address} &nbsp;|&nbsp; ${miEmpresa.company_phone || '+56 9 XXXX XXXX'}</p>
        </div>
        <div class="document-type">
          <h2>PROPUESTA COMERCIAL</h2>
          <p>REF: #${deal.id.split('-')[0].toUpperCase()}</p>
          <p>Emisión: ${new Date().toLocaleDateString('es-CL')}</p>
        </div>
      </div>

      <div class="client-section">
        <div>
          <div class="label">Socio Estratégico</div>
          <div class="val">${companyData?.razon_social || "Cliente General"}</div>
          <p style="margin:5px 0; color:#8E8E93; font-size:11px;">RUT: ${companyData?.rut || 'Pendiente'}</p>
        </div>
        <div style="text-align: right;">
          <div class="label">Consultor Ejecutivo</div>
          <div class="val">${deal.seller_name || "LimpioSur"}</div>
          <p style="margin:5px 0; color:#8E8E93; font-size:11px;">Vigencia: ${deal.offer_validity || '15 días'}</p>
        </div>
      </div>

      <div class="scope-card">
        <div class="scope-header">
          <div class="blue-bar"></div>
          <div style="font-size: 18px; font-weight: 800;">Alcance Técnico del Servicio</div>
        </div>
        <div class="scope-content">${technicalText}</div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th style="width: 70%">Descripción del Servicio</th>
            <th style="width: 30%; text-align: right">Inversión Neta</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight: 700; font-size: 14px; margin-bottom: 5px;">${deal.title}</div>
              <div style="color: #8E8E93; font-size: 11px;">Operación industrial especializada según estándar de calidad corporativo.</div>
            </td>
            <td style="text-align: right; font-weight: 600;">${formatter.format(neto)}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal Neto</span>
          <span style="font-weight: 600;">${formatter.format(neto)}</span>
        </div>
        <div class="total-row">
          <span>IVA (19%)</span>
          <span style="font-weight: 600;">${formatter.format(iva)}</span>
        </div>
        <div class="total-row grand-total">
          <span style="color: #1C1C1E; font-size: 14px;">TOTAL CLP</span>
          <span>${formatter.format(total)}</span>
        </div>
      </div>

      <div class="footer">
        Certificado de Auditoría Digital: Este documento fue aprobado por ${companyData?.razon_social} mediante firma electrónica simple.
        IP de Registro: ${deal.signature_ip || 'Auditada via Web'} &nbsp;|&nbsp; 
        Timestamp: ${deal.signature_date ? new Date(deal.signature_date).toLocaleString() : new Date().toLocaleString()}.
        <br/><br/>
        Ref Operacional: ${deal.id}
      </div>
    </div>
  `

  document.body.appendChild(container)

  try {
    // 3. Pequeña espera para asegurar carga de estilos y fuentes
    await new Promise(resolve => setTimeout(resolve, 800))

    // 4. Captura Manual con html2canvas
    const canvas = await html2canvas(container, {
      scale: 2, // Calidad Retina
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById('pdf-template-container');
        if (el) el.style.visibility = 'visible';
      }
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    
    // 5. Generar PDF Segmentado
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    
    const ratio = pdfWidth / imgWidth
    const pageImgHeight = imgHeight * ratio
    
    let heightLeft = pageImgHeight
    let position = 0

    // Primera Página
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pageImgHeight)
    heightLeft -= pdfHeight

    // Páginas Siguientes (si es necesario)
    while (heightLeft >= 0) {
      position = heightLeft - pageImgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pageImgHeight)
      heightLeft -= pdfHeight
    }

    pdf.save(`Propuesta_${(companyData?.razon_social || "Cliente").replace(/\s+/g, '_')}.pdf`)
    
  } catch (error) {
    console.error('Error generando PDF Plan B:', error)
    alert('Error al generar el documento. Por favor intente nuevamente.')
  } finally {
    document.body.removeChild(container)
  }
}



