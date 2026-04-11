import { supabase } from './supabase/client'

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY

export async function sendDeploymentNotification(dealId: string) {
  try {
    // 1. Fetch deal data with company info
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*, companies(*)')
      .eq('id', dealId)
      .single()

    if (dealError || !deal) throw new Error('No se encontró el negocio o hubo un error.')

    // 2. Fetch operations email from app_settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('operations_email, company_name')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()

    const toEmail = settings?.operations_email || 'operaciones@crmsimon.com' // Fallback
    const companySender = settings?.company_name || 'CRM Simon'

    // 3. Prepare Email Template
    const subject = `🟢 [NUEVO DESPLIEGUE] - ${deal.companies?.razon_social} - SLA ${deal.contract_duration || 'Por definir'}`
    
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333 text-align: center;">Dossier de Traspaso a Operaciones</h2>
        <p style="color: #666; font-size: 14px; text-align: center;">Se ha confirmado un nuevo negocio. A continuación los detalles para el despliegue logístico.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #007AFF; font-size: 16px;">🏢 Información del Cliente</h3>
          <p><strong>Razón Social:</strong> ${deal.companies?.razon_social}</p>
          <p><strong>RUT:</strong> ${deal.companies?.rut || 'N/A'}</p>
          <p><strong>Dirección:</strong> ${deal.companies?.direccion || ''}, ${deal.companies?.comuna || ''}</p>
        </div>

        <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
          <h3 style="color: #34C759; font-size: 16px;">💰 Detalles del Contrato</h3>
          <p><strong>Proyecto:</strong> ${deal.title}</p>
          <p><strong>Monto Neto:</strong> ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(deal.valor_neto || 0)}</p>
          <p><strong>SLA de Pago:</strong> ${deal.payment_terms?.replace('_', ' ') || '30 días'}</p>
          <p><strong>Duración:</strong> ${deal.contract_duration || '12 meses'}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #AF52DE; font-size: 16px;">⚙️ Alcance Técnico (IA Report)</h3>
          <div style="font-size: 13px; color: #444; line-height: 1.6; padding: 12px; border-left: 4px solid #AF52DE; background: #fafafa;">
            ${deal.ia_proposal_report?.replace(/\n/g, '<br>') || 'No hay reporte técnico detallado.'}
          </div>
        </div>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${window.location.origin}/proposal/${deal.public_token}" 
             style="background-color: #000; color: #fff; padding: 12px 24px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 14px;">
            Ver Propuesta Firmada (PDF/Safe Link)
          </a>
        </div>
        
        <p style="margin-top: 40px; font-size: 11px; color: #999; text-align: center;">
          Este es un correo automático generado por ${companySender} CRM.
        </p>
      </div>
    `

    // 4. Send via Resend API
    if (!RESEND_API_KEY) {
      console.warn('VITE_RESEND_API_KEY no encontrada. Simulando envío en entorno local.')
      await new Promise(r => setTimeout(r, 1500)) // Simulación
    } else {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: `${companySender} CRM <onboarding@resend.dev>`,
          to: [toEmail],
          subject: subject,
          html: htmlContent
        })
      })

      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(`Resend Error: ${err.message}`)
      }
    }

    // 5. Update Deal status in DB
    const { error: updateError } = await supabase
      .from('deals')
      .update({ 
        is_deployed: true, 
        deployed_at: new Date().toISOString() 
      })
      .eq('id', dealId)

    if (updateError) throw updateError

    return { success: true }
  } catch (error: any) {
    console.error('Error notificando despliegue:', error)
    return { success: false, error: error.message }
  }
}
