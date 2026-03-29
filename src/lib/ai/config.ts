import { GoogleGenerativeAI } from '@google/generative-ai';

// API Key de respaldo (puede ser revocada o limitada por Google si se abusa)
export const DEFAULT_GEMINI_KEY = "AIzaSyAF4O7kEc1Vj2LuWbbgB6uvUEPy1TrwjD0";

// Modelo recomendado para máxima compatibilidad
export const GEMINI_MODEL = "gemini-pro";

/**
 * Obtiene la API Key actual, priorizando localStorage (usuario) 
 * y cayendo en la defaultKey si no hay ninguna.
 */
export const getGeminiKey = (): string => {
  const stored = localStorage.getItem('gemini_api_key');
  if (stored && stored.trim() !== '' && stored !== 'undefined') {
    return stored.trim();
  }
  return DEFAULT_GEMINI_KEY;
};

/**
 * Inicializa el modelo de IA con la configuración centralizada
 */
export const getAIModel = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
};
