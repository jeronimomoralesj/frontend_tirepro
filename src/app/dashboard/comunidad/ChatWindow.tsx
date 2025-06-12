'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, MoreVertical, Users, Info, Search, Phone, Video } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  lastMessage: string;
  lastMessageTime: string;
  category: string;
  isPrivate: boolean;
  avatar: string;
}

interface User {
  name: string;
  role: string;
  companyId: string;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  isOwn: boolean;
  avatar?: string;
}

interface ChatWindowProps {
  group: Group;
  user: User;
}

export default function ChatWindow({ group, user }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock messages - replace with real data
  useEffect(() => {
    const mockMessages: Message[] = [
      {
        id: '1',
        text: '¡Hola a todos! ¿Alguien ha probado los nuevos neumáticos Michelin?',
        sender: 'Carlos Mendoza',
        timestamp: '10:30',
        isOwn: false,
        avatar: '👨‍🔧'
      },
      {
        id: '2',
        text: 'Sí, los probé la semana pasada. Excelente tracción en mojado.',
        sender: 'Ana García',
        timestamp: '10:32',
        isOwn: false,
        avatar: '👩‍💼'
      },
      {
        id: '3',
        text: '¿Qué precio tienen aproximadamente?',
        sender: user.name,
        timestamp: '10:35',
        isOwn: true
      },
      {
        id: '4',
        text: 'Depende del tamaño, pero están entre $150-$300 por neumático',
        sender: 'Luis Rodriguez',
        timestamp: '10:36',
        isOwn: false,
        avatar: '🚛'
      },
      {
        id: '5',
        text: 'Gracias por la info. ¿Dónde los compraste?',
        sender: user.name,
        timestamp: '10:37',
        isOwn: true
      }
    ];

    setMessages(mockMessages);
  }, [group.id, user.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: user.name,
      timestamp: new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      isOwn: true
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
              {group.avatar}
            </div>
            <div>
              <h2 className="font-semibold text-lg">{group.name}</h2>
              <p className="text-white/80 text-sm flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {group.memberCount} miembros • {group.category}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
              <Search className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
              <Phone className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
              <Video className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
              <Info className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50/50 to-white/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${msg.isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {!msg.isOwn && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#348CCB] to-[#1E76B6] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {msg.avatar || msg.sender.charAt(0)}
                </div>
              )}
              
              <div className={`
                px-4 py-2 rounded-2xl shadow-sm
                ${msg.isOwn
                  ? 'bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                }
              `}>
                {!msg.isOwn && (
                  <p className="text-xs font-semibold text-[#1E76B6] mb-1">
                    {msg.sender}
                  </p>
                )}
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className={`
                  text-xs mt-1
                  ${msg.isOwn ? 'text-white/70' : 'text-gray-500'}
                `}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
            <Paperclip className="h-5 w-5" />
          </button>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Mensaje a ${group.name}...`}
              className="w-full px-4 py-3 bg-gray-100 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/50 transition-all"
            />
            
            <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 transition-colors text-gray-500">
              <Smile className="h-5 w-5" />
            </button>
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className={`
              p-3 rounded-full transition-all
              ${message.trim()
                ? 'bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white hover:shadow-lg transform hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        
        {/* Typing indicator placeholder */}
        <div className="mt-2 text-xs text-gray-500 h-4">
          {/* This would show typing indicators */}
        </div>
      </div>
    </div>
  );
}