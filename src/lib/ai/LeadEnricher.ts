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

      const systemPrompt = `Eres un Asistente Comercial B2B experto en servicios industriales. 
Analiza la siguiente 'Nota Técnica' grabada en terreno y genera un 'Intelligence Report' corporativo de alto nivel.

La salida debe ser estrictamente un objeto JSON con:
1. "title": Un título comercial dinámico, corto y corporativo (ej: "Optimización de Climatización Clínica Alemana").
2. "pain_points": Un array de máximo 3 viñetas breves que resuman el dolor principal del cliente.
3. "technical_scope": Un desglose detallado (unas 5-10 líneas) de los servicios y alcances técnicos propuestos.

Nota Técnica: "${notaTecnica}"

Responde ÚNICAMENTE en formato JSON.`;

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
