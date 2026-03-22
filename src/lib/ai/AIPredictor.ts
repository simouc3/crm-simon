import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabase/client';
import { type Company } from '../../types/database';

export class AIPredictor {
  private static getApiKey() {
    return localStorage.getItem('gemini_api_key') || "AIzaSyAF4O7kEc1Vj2LuWbbgB6uvUEPy1TrwjD0";
  }

  static async scoreCompany(company: Company): Promise<{ score: number; analysis: string } | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

  static async analyzeActivityRisk(dealId: string, notes: string): Promise<{ isRisk: boolean; reason: string } | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `Analiza el tono y contenido de esta nota de reunión/contacto comercial:
"${notes}"

¿Detectas riesgo de pérdida del negocio, fricción con el cliente o insatisfacción grave?
Devuelve una respuesta estrictamente en JSON:
{
  "is_risk": boolean,
  "reason": "Si es riesgo, explica por qué brevemente. Si no, dejar vacío."
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, '').trim();
      const data = JSON.parse(text);

      if (data.is_risk) {
        await supabase.from('deals').update({
          is_risk: true,
          risk_reason: data.reason
        }).eq('id', dealId);
        
        // Aquí se podría disparar una notificación local
        console.warn('RISK DETECTED:', data.reason);
      }

      return { isRisk: data.is_risk, reason: data.reason };
    } catch (error) {
      console.error('Error in analyzeActivityRisk:', error);
      return null;
    }
  }
}
