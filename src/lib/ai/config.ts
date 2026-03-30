import { GoogleGenerativeAI } from '@google/generative-ai';
export const DEFAULT_GEMINI_KEY = "AIzaSyDlkjep9LYBmCbrcfOekAx85RypShBRS2M";

// Modelo estable (pro es más robusto ante errores de ruteo de región)
export const GEMINI_MODEL = "gemini-pro";

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
  // El SDK v0.24.1 maneja internamente la mejor versión (v1)
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
};
