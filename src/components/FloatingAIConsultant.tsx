import { useState, useRef, useEffect } from 'react'
import { Send, X, Bot, Lock, Key, Brain, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { getGeminiKey, getAIModel } from '../lib/ai/config'

// --- Componente de Renderizado de Mensajes (Markdown Simple) ---
function MessageRenderer({ content }: { content: string }) {
  // Procesamiento básico de Markdown
  const lines = content.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        // Horizontall Rule
        if (line.trim() === '---') return <hr key={i} className="my-4 border-border/30" />;
        
        // List Item
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2 items-start pl-1">
              <div className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
              <span>{processText(line.replace(/^(\*|-)\s+/, ''))}</span>
            </div>
          );
        }

        // Title/Header (Simple)
        if (line.trim().startsWith('### ')) {
          return <h4 key={i} className="font-black text-xs uppercase tracking-wider text-primary pt-2">{processText(line.replace('### ', ''))}</h4>;
        }

        return <p key={i} className="text-inherit">{processText(line)}</p>;
      })}
    </div>
  );
}

function processText(text: string) {
  // Bold: **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-black text-indigo-500/90 dark:text-indigo-400">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function FloatingAIConsultant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>(() => {
    const saved = localStorage.getItem('floating_ai_history')
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: '¡Hola! Soy tu **Consultor Estratégico CORE AI**. \n\nPuedo ayudarte con:\n*   **Análisis de Funnel**: Identificar cuellos de botella.\n*   **Estrategia de Ventas**: Redactar pitches de alto impacto.\n*   **Auditoría Industrial**: Sugerencias basadas en tus datos reales.\n\n¿En qué nos enfocaremos hoy?' }
    ]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [tempApiKey, setTempApiKey] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem('floating_ai_history', JSON.stringify(messages))
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const fetchCRMStats = async () => {
    const { count: dealsCount } = await supabase.from('deals').select('*', { count: 'exact', head: true })
    const { data: topDeals } = await supabase.from('deals').select('title, valor_neto, stage').order('valor_neto', { ascending: false }).limit(5)
    const { count: clientsCount } = await supabase.from('companies').select('*', { count: 'exact', head: true })
    const { data: recentActivities } = await supabase.from('activities').select('title, activity_type').order('created_at', { ascending: false }).limit(5)

    return {
      total_negocios: dealsCount || 0,
      negocios_top: topDeals || [],
      total_clientes: clientsCount || 0,
      actividades_recientes: recentActivities || []
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const stats = await fetchCRMStats()
      const apiKey = getGeminiKey()
      const model = getAIModel(apiKey)

      const prompt = `Actúa como el Consultor Senior de Estrategia para CRM Simon. 
Eres experto en el mercado industrial B2B chileno. 

ESTADÍSTICAS ACTUALES DEL CRM:
- Negocios abiertos: ${stats.total_negocios}
- Clientes totales: ${stats.total_clientes}
- Top 5 Negocios: ${JSON.stringify(stats.negocios_top)}
- Actividades recientes: ${JSON.stringify(stats.actividades_recientes)}

INSTRUCCIONES DE FORMATO:
1. Usa Markdown estándar (**negritas**, *cursivas*, listas con *, líneas horizontales ---).
2. Estructura tus respuestas con títulos cortos si es necesario.
3. Sé profesional, estratégico y utiliza terminología de alto nivel.
4. Si sugieres un pitch, utiliza una estructura clara.

Historial de conversación:
${messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n')}
Usuario: ${userMsg}
Asistente:`;

      const result = await model.generateContent(prompt)
      const aiResponse = result.response.text()

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }])
    } catch (err: any) {
      console.error("AI Error:", err)
      const errMsg = err.message || 'Error desconocido'
      setMessages(prev => [...prev, { role: 'assistant', content: `Lo siento, tuve un problema conectando: ${errMsg}. Revisa tu conexión o configura una API Key válida en el icono 🔒 de arriba.` }])
    } finally {
      setLoading(false)
    }
  }

  const saveKey = () => {
    if (tempApiKey.trim().startsWith('AIza')) {
      localStorage.setItem('gemini_api_key', tempApiKey.trim())
      setIsConfiguring(false)
      setTempApiKey('')
    } else {
      alert('La clave debe comenzar con "AIza"')
    }
  }

  return (
    <div className="fixed bottom-[100px] right-6 md:bottom-8 md:right-8 z-[9999] flex flex-col items-end pointer-events-none">
      {isOpen && (
        <div className="w-[320px] sm:w-[380px] h-[500px] bg-white dark:bg-[#1C1C1E] border border-border/40 rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-10 fade-in duration-300 pointer-events-auto">
          <div className="p-5 bg-foreground text-background flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-black text-xs uppercase tracking-widest leading-none">Consultor IA</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold opacity-60 uppercase">Estratega Activo</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsConfiguring(!isConfiguring)} 
                className={`h-8 w-8 rounded-full transition-colors ${isConfiguring ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-background'}`}
              >
                <Lock className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-full hover:bg-white/10 text-background">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth bg-slate-50/30 dark:bg-transparent">
            {isConfiguring ? (
              <div className="p-4 bg-white dark:bg-[#2C2C2E] rounded-3xl border border-primary/20 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center gap-2">
                   <div className="p-2 rounded-2xl bg-primary/10">
                     <Key className="h-6 w-6 text-primary" />
                   </div>
                   <h5 className="font-black text-xs uppercase dark:text-white">API Key de Gemini</h5>
                   <p className="text-[10px] text-muted-foreground leading-snug px-2">Ingresa tu llave para asegurar el funcionamiento. Se guarda solo en tu navegador.</p>
                </div>
                <input 
                  type="password"
                  placeholder="AIzaSy..."
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-black p-3 rounded-2xl text-[11px] font-mono border border-border/50 outline-none focus:border-primary transition-colors dark:text-white"
                />
                <div className="flex gap-2">
                  <Button onClick={saveKey} className="flex-1 rounded-2xl h-10 font-black text-[10px] uppercase tracking-wider">Guardar</Button>
                  <Button variant="ghost" onClick={() => setIsConfiguring(false)} className="rounded-2xl h-10 text-[10px] uppercase font-black">Cerrar</Button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} gap-1.5`}>
                    <div className={`max-w-[90%] p-4 rounded-[28px] text-[13.5px] leading-relaxed relative group/msg transition-all duration-300 ${
                      m.role === 'user' 
                        ? 'bg-gradient-to-br from-primary to-indigo-600 text-white rounded-tr-[4px] shadow-[0_10px_25px_-5px_rgba(var(--primary),0.3)]' 
                        : 'bg-white dark:bg-white/[0.04] backdrop-blur-xl text-foreground rounded-tl-[4px] border border-border/20 shadow-[0_5px_15px_-5px_rgba(0,0,0,0.05)]'
                    }`}>
                      <MessageRenderer content={m.content} />
                      
                      {m.role === 'assistant' && (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(m.content);
                            // Podríamos añadir un toast aquí si existiera
                          }}
                          className="absolute -right-10 top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full"
                          title="Copiar respuesta"
                        >
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    <span className="text-[9px] font-black uppercase opacity-20 px-2 tracking-tighter">
                      {m.role === 'user' ? 'Tú' : 'Kernel AI'}
                    </span>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/50 dark:bg-white/[0.04] backdrop-blur-xl p-4 rounded-[28px] rounded-tl-[4px] border border-border/20 flex items-center gap-3 shadow-sm animate-pulse">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                      </div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Analizando Kernel...</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {!isConfiguring && (
            <div className="p-4 bg-white dark:bg-[#1C1C1E] border-t border-border/10">
              <div className="relative flex items-center">
                <input 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Pregúntale a tu consultor..."
                  className="w-full h-12 pl-5 pr-12 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-[#3A3A3C] outline-none text-sm font-medium transition-all"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  className="absolute right-1 w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-auto">
        <Button 
          size="icon" 
          onClick={() => setIsOpen(!isOpen)}
          className={`h-16 w-16 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.3)] transition-all duration-500 relative group overflow-hidden ${
            isOpen ? 'bg-rose-500 hover:bg-rose-600 scale-90' : 'bg-foreground hover:scale-110 active:scale-95'
          }`}
        >
          {isOpen ? <X className="h-7 w-7 text-white" /> : (
            <>
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative z-10 flex items-center justify-center">
                <Bot className="h-7 w-7" />
              </div>
              <div className="absolute top-2 right-2 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full animate-pulse" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
