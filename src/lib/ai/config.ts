import { GoogleGenerativeAI } from '@google/generative-ai';

// Clave API actualizada (Usuario Simon)
export const DEFAULT_GEMINI_KEY = "AIzaSyBuwPq8AuKpMbAHOCMYDIHKiVhXMXRiSOM";

// Modelo base para máxima compatibilidad con v1beta
export const GEMINI_MODEL = "gemini-1.5-flash";

/**
 * Obtiene la API Key actual, con prioridad absoluta en localStorage (usuario)
 */
export const getGeminiKey = (): string => {
  // 1. PRIORIDAD: localStorage (Ajustes manuales del usuario)
  const stored = localStorage.getItem('gemini_api_key');
  if (stored && stored.trim() !== '' && stored !== 'undefined') {
    return stored.trim();
  }

  // 2. FALLBACK: Variable de entorno
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim() !== '') {
    return envKey.trim();
  }
  
  // 3. FALLBACK FINAL: Clave por defecto
  return DEFAULT_GEMINI_KEY;
};

/**
 * Inicializa el modelo de IA con la configuración centralizada
 */
export const getAIModel = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
};
