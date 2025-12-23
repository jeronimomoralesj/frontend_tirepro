'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BotIcon, SendIcon, SparklesIcon, UserIcon, XIcon } from 'lucide-react';

// Mock LLM function - replace with your actual implementation
const callLLM = async (prompt: string): Promise<string> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Mock response based on prompt content
  if (prompt.toLowerCase().includes('depth') || prompt.toLowerCase().includes('profundidad')) {
    return "Based on your tire inventory, I can see you have tires with depths ranging from 2.5mm to 8.2mm. The average depth is 5.8mm. I recommend monitoring tires with depths below 3mm as they may need replacement soon.";
  } else if (prompt.toLowerCase().includes('brand') || prompt.toLowerCase().includes('marca')) {
    return "Your inventory includes several tire brands: Michelin (45 tires), Bridgestone (32 tires), Goodyear (28 tires), Continental (19 tires), and Pirelli (15 tires). Michelin makes up the largest portion of your inventory.";
  } else if (prompt.toLowerCase().includes('inspection') || prompt.toLowerCase().includes('inspección')) {
    return "Your tire inspection data shows 85% of your tires have been inspected in the last 30 days. I recommend scheduling inspections for the remaining 15% to maintain safety standards.";
  } else {
    return "I'm here to help with your tire inventory! You can ask me about tire depths, brands, inspections, conditions, or any specific tire-related questions. What would you like to know?";
  }
};

type Message = {
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
};

type Tire = {
  id: string;
  posicion: string;
  marca: string;
  medida: string;
  inspecciones?: Array<{
    profundidadInt: number;
    profundidadCen: number;
    profundidadExt: number;
    fecha: string;
  }>;
};

export default function ChatBot() {
  const [input, setInput] = useState('');
  const [visible, setVisible] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'bot', 
      text: 'Hola! Soy tu asistente especializado en llantas. Pregúntame sobre tu inventario, profundidades, marcas, inspecciones o cualquier consulta relacionada con tus llantas.',
      timestamp: new Date()
    }
  ]);
  const [tires, setTires] = useState<Tire[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  // Mock tire data - replace with actual API call
  const mockTires: Tire[] = [
    {
      id: '1',
      posicion: 'Delantero Izquierdo',
      marca: 'Michelin',
      medida: '225/60R16',
      inspecciones: [
        { profundidadInt: 6.5, profundidadCen: 6.2, profundidadExt: 6.8, fecha: '2024-01-15' }
      ]
    },
    {
      id: '2',
      posicion: 'Delantero Derecho',
      marca: 'Bridgestone',
      medida: '225/60R16',
      inspecciones: [
        { profundidadInt: 4.2, profundidadCen: 4.5, profundidadExt: 4.1, fecha: '2024-01-15' }
      ]
    },
    {
      id: '3',
      posicion: 'Trasero Izquierdo',
      marca: 'Goodyear',
      medida: '225/60R16',
      inspecciones: [
        { profundidadInt: 2.8, profundidadCen: 3.2, profundidadExt: 2.5, fecha: '2024-01-15' }
      ]
    }
  ];

  useEffect(() => {
    // Simulate fetching user data and tires
    const fetchUserData = async () => {
      setTires(mockTires);
    };

    fetchUserData();
  }, []);

  const prepareTiresContext = (): string => {
    if (!tires || tires.length === 0) {
      return "No hay datos de llantas disponibles.";
    }

    const sampleSize = Math.min(tires.length, 10);
    const sampleTires = tires.slice(0, sampleSize);
    
    let context = `Total de llantas en inventario: ${tires.length}\n\n`;
    
    // Add brand summary
    const brandCounts = tires.reduce((acc, tire) => {
      acc[tire.marca] = (acc[tire.marca] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topBrands = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand, count]) => `${brand}: ${count} llantas`)
      .join(', ');
    
    context += `Principales marcas: ${topBrands}\n\n`;
    
    // Add sample tire details
    context += `Detalles de llantas de muestra:\n`;
    sampleTires.forEach((tire, index) => {
      const lastInspection = tire.inspecciones?.slice(-1)[0];
      const minDepth = lastInspection ? 
        Math.min(lastInspection.profundidadInt, lastInspection.profundidadCen, lastInspection.profundidadExt) : 
        'N/A';
      
      context += `${index + 1}. Posición: ${tire.posicion}, Marca: ${tire.marca}, Medida: ${tire.medida}, Profundidad mínima: ${minDepth}mm\n`;
    });
    
    // Add depth analysis
    const tiresWithDepth = tires.filter(tire => tire.inspecciones && tire.inspecciones.length > 0);
    if (tiresWithDepth.length > 0) {
      const depths = tiresWithDepth.map(tire => {
        const last = tire.inspecciones!.slice(-1)[0];
        return Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
      });
      const avgDepth = (depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1);
      const minDepth = Math.min(...depths);
      const maxDepth = Math.max(...depths);
      
      context += `\nResumen de profundidades: Promedio: ${avgDepth}mm, Rango: ${minDepth}mm - ${maxDepth}mm`;
    }
    
    return context;
  };

  const handleAIResponse = async (userMessage: string): Promise<string> => {
    try {
      const tiresContext = prepareTiresContext();
      
      const prompt = `Eres un asistente experto en llantas. Tienes acceso a datos del inventario de llantas y debes ayudar a los usuarios con preguntas relacionadas con llantas.

Datos de llantas disponibles:
${tiresContext}

Pregunta del usuario: ${userMessage}

Por favor, proporciona una respuesta útil y precisa sobre el inventario de llantas. Si el usuario pregunta sobre datos específicos de llantas como marcas, profundidades, inspecciones o condiciones, usa los datos proporcionados. Si no puedes encontrar información específica en los datos, hazle saber cortésmente.

Mantén tu respuesta concisa y profesional. Responde en español.`;

      const response = await callLLM(prompt);
      return response || "Estoy aquí para ayudarte con preguntas sobre llantas. ¡Pregúntame sobre tu inventario, marcas, condiciones o inspecciones!";
    } catch (error) {
      console.error('Error getting AI response:', error);
      return "Lo siento, tengo problemas para procesar eso ahora. Por favor, intenta preguntar de nuevo.";
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { 
      role: 'user', 
      text: input, 
      timestamp: new Date() 
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const botText = await handleAIResponse(input);
      setMessages((prev) => [...prev, { 
        role: 'bot', 
        text: botText, 
        timestamp: new Date() 
      }]);
    } catch {
      setMessages((prev) => [...prev, { 
        role: 'bot', 
        text: 'Lo siento, hubo un error procesando tu consulta. Intenta de nuevo.', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const TypingIndicator = () => (
    <div className="flex items-center space-x-2 p-4">
      <div className="flex items-center space-x-1">
        <BotIcon className="w-4 h-4 text-blue-900" />
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-900 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-900 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-900 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
      <span className="text-sm text-gray-500">Escribiendo...</span>
    </div>
  );

  return (
    <>
      {/* Floating Button */}
      {!visible && (
        <button
          onClick={() => setVisible(true)}
          className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-br from-blue-900 to-blue-700 text-white shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 border-2 border-blue-800"
        >
          <SparklesIcon className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {visible && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] rounded-3xl shadow-2xl bg-white flex flex-col border border-gray-100 overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white flex items-center justify-between px-6 py-4 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-transparent"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <BotIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">Asistente TirePro</p>
                <p className="text-xs text-blue-100">Experto en llantas</p>
              </div>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="hover:bg-white/10 p-2 rounded-full transition-colors relative z-10"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'bot' && (
                  <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center mb-1">
                    <BotIcon className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm max-w-[85%] shadow-lg ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md'
                      : 'bg-white text-gray-900 border border-gray-100 rounded-bl-md'
                  }`}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                  <p className={`text-xs mt-2 ${
                    msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mb-1">
                    <UserIcon className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && <TypingIndicator />}
          </div>

          {/* Input */}
          <div className="flex items-center border-t border-gray-100 p-4 bg-white">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50 hover:bg-white transition-colors"
                placeholder="Pregúntame sobre tus llantas..."
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={`ml-3 p-3 rounded-full transition-all duration-200 ${
                input.trim() && !isTyping
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}