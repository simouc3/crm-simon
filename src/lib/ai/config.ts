import { GoogleGenerativeAI } from '@google/generative-ai';

// API Key de respaldo (proporcionada por el usuario para asegurar funcionamiento)
export const DEFAULT_GEMINI_KEY = "AIzaSyDlkjep9LYBmCbrcfOekAx85RypShBRS2M";

// Modelo robusto y actualizado
export const GEMINI_MODEL = "gemini-1.5-flash-latest";

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
