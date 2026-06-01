import React, { useState } from 'react';
import { X, Bot, Forward, Plus } from 'lucide-react';

const Addfloat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const toggleChat = () => setIsOpen(!isOpen);
  const handleSendMessage = () => {
    if (message.trim()) {
      // Future implementation for sending messages
      setMessage('');
    }
  };

  return (
    <div className="fixed bottom-6 left-10 z-50">
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="cursor-pointer transition-all duration-300 text-white
                     rounded-full p-4 hover:scale-110 transform"
          style={{ background: 'linear-gradient(135deg, #0A183A, #173D68)', boxShadow: '0 8px 32px -8px rgba(10,24,58,0.4)' }}
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div
          className="flex flex-col rounded-2xl w-96 h-[500px] max-h-[90vh] overflow-hidden"
          style={{ background: '#0A183A', boxShadow: '0 24px 60px -18px rgba(10,24,58,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Header */}
          <div
            className="text-white p-4 flex justify-between items-center rounded-t-2xl"
            style={{ background: 'linear-gradient(135deg, #0A183A 0%, #173D68 100%)' }}
          >
            <h3 className="text-lg font-bold">Soporte</h3>
            <button
              onClick={toggleChat}
              className="hover:bg-white/10 cursor-pointer rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message Area */}
          <div 
            className="flex-grow bg-[#0A183A] overflow-y-auto p-4 
                       space-y-3 scrollbar-thin scrollbar-thumb-[#1E76B6] 
                       scrollbar-track-[#173D68]"
          >
            {/* Placeholder for chat messages */}
            <div className="text-white text-center opacity-50 pt-20">
              <p>Habla con TirePro IA</p>
              <p><Bot/></p>
              
            </div>
          </div>

          {/* Input Area */}
          <div 
            className="bg-[#173D68] p-4 flex items-center space-x-2 
                       rounded-b-2xl"
          >
            <input 
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe..."
              className="flex-grow bg-[#0A183A] text-white 
                         rounded-full px-4 py-2 focus:outline-none 
                         focus:ring-2 focus:ring-[#1E76B6]"
            />
            <button 
              onClick={handleSendMessage}
              className="bg-[#1E76B6] hover:bg-[#348CCB] 
                         text-white rounded-full p-2 
                         transition-colors disabled:opacity-50"
              disabled={!message.trim()}
            >
              <Forward className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Addfloat;