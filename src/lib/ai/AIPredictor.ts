import { getGeminiKey, getAIModel } from './config';
import { supabase } from '../supabase/client';
import { type Company } from '../../types/database';

export class AIPredictor {
  private static getApiKey() {
    return getGeminiKey();
  }

  static async scoreCompany(company: Company): Promise<{ score: number; analysis: string } | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const apiKey = this.getApiKey();
      const model = getAIModel(apiKey);

      const prompt = `Actúa como un experto Consultor Comercial B2B. 
Evalúa el potencial de este Lead para una empresa de servicios de limpieza industrial:
- Razón Social: ${company.razon_social}
- Industria/Segmento: ${company.segmento}
- Metros Cuadrados: ${company.m2_estimados}
- Comuna: ${company.comuna}
- Cargo del Contacto: ${company.cargo}

Devuelve una respuesta estrictamente en JSON con este formato:
{
  "score": (número del 1 al 100),
  "analysis": "Breve explicación de 15 palabras sobre por qué tiene ese score"
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, '').trim();
      const data = JSON.parse(text);

      // Guardar en Supabase
      await supabase.from('companies').update({
        lead_score: data.score,
        lead_score_analysis: data.analysis
      }).eq('id', company.id);

      return data;
    } catch (error) {
      console.error('Error in scoreCompany:', error);
      return null;
    }
  }

  static async calculateClosingProbability(deal: any, activities: any[]): Promise<number> {
    const apiKey = this.getApiKey();
    if (!apiKey) return 0;

    try {
      const model = getAIModel(apiKey);
      const prompt = `Analiza la probabilidad de cierre (0-100%) para este negocio:
Negocio: ${deal.title}
Valor: ${deal.valor_neto}
Etapa actual: ${deal.stage} / 6
Historial de contactos: ${activities.length} interacciones.

Actividades:
${activities.slice(0, 10).map(a => `- ${a.title}: ${a.notes || ''}`).join('\n')}

Responde ÚNICAMENTE con el número entero del 0 al 100 indicando la probabilidad estadística de cierre.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      return parseInt(text) || 0;
    } catch (error) {
      // Fallback por etapa si falla la IA
      const stageMap: any = { '1': 10, '2': 25, '3': 50, '4': 70, '5': 90, '6': 100, '7': 0 };
      return stageMap[String(deal.stage)] || 0;
    }
  }

  static async analyzeFullDealRisk(dealId: string): Promise<{ isRisk: boolean; reason: string }> {
    try {
      const { data: deal } = await supabase.from('deals').select('*, companies(*)').eq('id', dealId).single();
      const { data: activities } = await supabase.from('activities').select('*').eq('deal_id', dealId).order('created_at', { ascending: false }).limit(5);

      if (!deal) return { isRisk: false, reason: '' };

      const apiKey = this.getApiKey();
      const model = getAIModel(apiKey);

      const prompt = `AUDITORÍA DE RIESGO COMERCIAL:
Negocio: ${deal.title}
Empresa: ${deal.companies?.razon_social} (Lead Score: ${deal.companies?.lead_score})
Etapa: ${deal.stage}
Últimas Actividades:
${activities?.map(a => `- ${a.title}: ${a.notes || ''}`).join('\n')}

¿Existe riesgo real de perder esta oportunidad?
Devuelve estrictamente un JSON:
{
  "is_risk": boolean,
  "reason": "Explicación de 10 palabras si hay riesgo"
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, '').trim();
      const data = JSON.parse(text);

      await supabase.from('deals').update({
        is_risk: data.is_risk,
        risk_reason: data.reason
      }).eq('id', dealId);

      return { isRisk: data.is_risk, reason: data.reason };
    } catch (error) {
      console.error(error);
      return { isRisk: false, reason: '' };
    }
  }
}
