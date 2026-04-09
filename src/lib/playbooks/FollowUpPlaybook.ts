import { supabase } from '../supabase/client'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
    })
  })
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export async function checkStaleProposals(): Promise<void> {
  try {
    const apiKey = localStorage.getItem('crm_gemini_key')
    if (!apiKey) return

    // Deals en Etapa 4 (Propuesta) con más de 72 horas sin movimiento
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

    const { data: staleDeals, error } = await supabase
      .from('deals')
      .select('id, nombre_proyecto, nota_tecnica, cotizacion_detalles, valor_neto, proposal_status, companies(razon_social, contact_name, contact_email)')
      .eq('stage', 4)
      .is('follow_up_draft', null)
      .or('proposal_status.is.null,proposal_status.eq.DRAFT')
      .lt('stage_changed_at', cutoff)

    if (error || !staleDeals?.length) return

    for (const deal of staleDeals) {
      const empresa = (deal.companies as any)?.razon_social || 'Cliente'
      const contacto = (deal.companies as any)?.contact_name || 'Estimado/a'
      const proyecto = deal.nombre_proyecto || deal.nombre_proyecto || 'nuestra propuesta'
      const monto = deal.valor_neto
        ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(deal.valor_neto)
        : ''

      const prompt = `Eres un ejecutivo comercial B2B de una empresa de limpieza industrial premium en Chile. 
Redacta un correo de seguimiento breve, profesional y cálido (no agresivo) para hacer seguimiento a una propuesta enviada.

Datos del cliente:
- Empresa: ${empresa}
- Contacto: ${contacto}
- Proyecto/Propuesta: ${proyecto}
${monto ? `- Monto propuesto: ${monto}` : ''}

El correo debe:
1. Ser breve (máximo 5 líneas).
2. Mencionar que se envió una propuesta recientemente y preguntar si tienen consultas.
3. Ofrecer una reunión rápida para resolverlas.
4. Tono profesional pero cercano, en español de Chile.
5. Sin emojis. Sin saludos excesivos.

Devuelve SOLO el cuerpo del correo (sin asunto, sin firma).`

      try {
        const draft = await callGemini(prompt, apiKey)
        if (draft && draft.length > 20) {
          await supabase
            .from('deals')
            .update({ follow_up_draft: draft })
            .eq('id', deal.id)
        }
      } catch (e) {
        console.warn('[Playbook] Error generando borrador para deal', deal.id, e)
      }
    }
  } catch (e) {
    console.warn('[Playbook] Error en checkStaleProposals:', e)
  }
}
