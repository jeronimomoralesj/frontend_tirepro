import React, { useState } from 'react';
import { X, Wand, Bot, Mail, Forward, Plus } from 'lucide-react';

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
          className="bg-[#0A183A] hover:bg-[#348CCB] cursor-pointer transition-all duration-300 text-white 
                     rounded-full p-4 shadow-2xl hover:scale-110 transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div 
          className="flex flex-col bg-[#0A183A] rounded-2xl shadow-2xl 
                     w-96 h-[500px] max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div 
            className="bg-[#173D68] text-white p-4 flex justify-between 
                       items-center rounded-t-2xl"
          >
            <h3 className="text-lg font-semibold">Soporte</h3>
            <button 
              onClick={toggleChat} 
              className="hover:bg-[#1E76B6] cursor-pointer rounded-full p-1 transition-colors"
            >
              <X className="w-6 h-6" />
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