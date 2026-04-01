import { GoogleGenerativeAI } from '@google/generative-ai';

// Clave API actualizada (Usuario Simon)
export const DEFAULT_GEMINI_KEY = "AIzaSyBuwPq8AuKpMbAHOCMYDIHKiVhXMXRiSOM";

// Modelo de última generación (más estable para evitar errores 404 en v1beta)
export const GEMINI_MODEL = "gemini-1.5-flash-latest";

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
  
  // 3. Fallback Final: Hardcoded
  return DEFAULT_GEMINI_KEY;
};

/**
 * Inicializa el modelo de IA con la configuración centralizada
 */
export const getAIModel = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
};
