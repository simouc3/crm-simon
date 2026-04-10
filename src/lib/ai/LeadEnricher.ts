import { getGeminiKey, getAIModel } from './config';

export const LeadEnricher = {
  /**
   * Analiza el nombre de la empresa y sugiere un segmento industrial
   */
  async suggestSegment(companyName: string): Promise<string> {
    try {
      const apiKey = getGeminiKey();
      const model = getAIModel(apiKey);

      const prompt = `Analiza el nombre de esta empresa: "${companyName}".
Identifica a qué segmento pertenece de esta lista estricta:
"INDUSTRIAL", "CLINICO_HOSPITALARIO", "ALIMENTARIO", "LOGISTICO_BODEGAS", "EDIFICIO_CORPORATIVO", "MINERIA", "OTRO".

Responde ÚNICAMENTE con el nombre del segmento en mayúsculas, sin comentarios ni formato extra. 
Eje: Si es un Hospital, responde "CLINICO_HOSPITALARIO". Si es una planta de lácteos, responde "ALIMENTARIO".`;

      const result = await model.generateContent(prompt);
      const segment = result.response.text().trim().replace(/['"]/g, '');
      return segment;
    } catch (err) {
      console.error('Error in LeadEnricher:', err);
      return 'INDUSTRIAL'; // Default
    }
  },

  /**
   * Sugiere tareas iniciales basadas en el segmento
   */
  async suggestInitialTasks(companyName: string, segment: string): Promise<string[]> {
    try {
      const apiKey = getGeminiKey();
      const model = getAIModel(apiKey);

      const prompt = `Para una empresa del sector "${segment}" llamada "${companyName}", 
sugiere las 3 primeras tareas críticas de prospección comercial que un vendedor debería realizar.
Cada tarea debe ser corta y accionable (máximo 50 caracteres).
Eje: ["Verificar normas sanitarias", "Contactar jefe de mantenimiento", "Pedir plano de planta"]

Responde ÚNICAMENTE en formato JSON array.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (err) {
      return ['Contactar cliente', 'Agendar visita técnica', 'Revisar requisitos'];
    }
  },
  
  /**
   * Quantum Block Parser: Genera el reporte de inteligencia para la propuesta
   */
  async generateQuantumProposal(notaTecnica: string): Promise<{ title: string; pain_points: string[]; technical_scope: string }> {
    try {
      const apiKey = getGeminiKey();
      const model = getAIModel(apiKey);

      const systemPrompt = `Eres un Director Comercial Senior especializado en servicios industriales B2B en Chile. 
Redactas propuestas formales para corporaciones, clínicas, retailers e industria.

Analiza la Nota Técnica del ejecutivo y genera un reporte en JSON con este formato EXACTO:

{
  "title": "Título ejecutivo: máximo 7 palabras, profesional y específico. Ej: 'Mantención Integral de Áreas Críticas' o 'Contrato de Higiene Industrial Mensual'.",
  "pain_points": [
    "Problema de negocio concreto del cliente (no técnico). Máximo 12 palabras. Ej: 'Cumplimiento normativo sanitario con auditorías pendientes'",
    "Segundo problema. Máximo 12 palabras.",
    "Tercer problema. Máximo 12 palabras."
  ],
  "technical_scope": "Párrafo ejecutivo de 3-4 líneas máximo. Redacción formal, en tercera persona. Describe QUÉ se hará, DÓNDE y con qué ESTÁNDAR. NO uses viñetas, NO uses saltos de línea. Debe leerse como una cláusula de contrato profesional. Ejemplo de tono: 'El presente contrato contempla la prestación de servicios de aseo industrial y sanitización en las instalaciones de la organización, con frecuencia mensual y cobertura de todas las áreas operativas y de acceso público, bajo estrictos protocolos de seguridad y cumplimiento normativo vigente.'"
}

Nota Técnica del ejecutivo: "${notaTecnica}"

REGLAS ESTRICTAS:
- Solo JSON válido. Sin markdown, sin explicaciones.
- technical_scope: máximo 60 palabras, párrafo corrido, sin saltos de línea.
- Tono: formal, corporativo, no coloquial.
- Idioma: español formal de negocios Chile.`;

      const result = await model.generateContent(systemPrompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (err) {
      console.error('Error in Quantum Parser:', err);
      return {
        title: "Propuesta de Servicio Industrial",
        pain_points: ["Necesidad de mantención técnica", "Optimización de procesos", "Cumplimiento normativo"],
        technical_scope: "Servicio integral basado en requerimientos detectados en terreno."
      };
    }
  }
};
