import { GoogleGenerativeAI } from '@google/generative-ai';
export const DEFAULT_GEMINI_KEY = "AIzaSyDlkjep9LYBmCbrcfOekAx85RypShBRS2M";

// Modelo estándar y compatible
export const GEMINI_MODEL = "gemini-1.5-flash";

/**
 * Obtiene la API Key actual, priorizando localStorage (usuario) 
 * y cayendo en la defaultKey si no hay ninguna.
 */
export const getGeminiKey = (): string => {
  // 1. Prioridad: Variable de entorno (Segurizada)
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim() !== '') {
    return envKey.trim();
  }

  // 2. Fallback: localStorage (Persistencia de usuario)
  const stored = localStorage.getItem('gemini_api_key');
  if (stored && stored.trim() !== '' && stored !== 'undefined') {
    return stored.trim();
  }
  
  // 3. Fallback Final: Hardcoded (Solo para pruebas rápidas)
  return DEFAULT_GEMINI_KEY;
};

/**
 * Inicializa el modelo de IA con la configuración centralizada
 */
export const getAIModel = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  // Usar default del SDK (v1beta) que es más compatible con Flash modelos nuevos
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
};
