'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft,
  Bookmark,
  Share2,
  Send,
  Paperclip,
  Smile
} from 'lucide-react';

interface Message {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  timeAgo: string;
  isCurrentUser?: boolean;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  authorAvatar?: string;
  timeAgo: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  views: number;
  tags: string[];
  isBookmarked: boolean;
  userVote?: 'up' | 'down' | null;
  category: string;
  isPinned?: boolean;
  messages?: Message[];
}

interface ChatViewProps {
  selectedPost: Post;
  onBack: () => void;
  onToggleBookmark: (postId: string) => void;
  onSendMessage: (postId: string, message: string) => void;
}

export default function ChatView({ 
  selectedPost, 
  onBack, 
  onToggleBookmark, 
  onSendMessage 
}: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(selectedPost.id, newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/80 via-white/40 to-blue-50/60 flex flex-col">
      {/* Chat Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-2xl border-b border-white/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center space-x-4 py-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-white/60 rounded-xl transition-colors duration-200"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {selectedPost.title}
              </h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{selectedPost.comments} respuestas</span>
                <span>•</span>
                <span>{selectedPost.views} vistas</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onToggleBookmark(selectedPost.id)}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  selectedPost.isBookmarked
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'hover:bg-white/60 text-gray-500 hover:text-yellow-600'
                }`}
              >
                <Bookmark className="h-5 w-5" />
              </button>
              <button className="p-2 hover:bg-white/60 rounded-xl transition-colors duration-200 text-gray-500 hover:text-blue-600">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 overflow-y-auto">
        {(selectedPost.messages || []).map((message) => (
          <div key={message.id} className={`flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl ${message.isCurrentUser ? 'order-2' : 'order-1'}`}>
              <div className={`flex items-start space-x-3 ${message.isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#0A183A]/20 to-[#1E76B6]/20 
                              border border-white/40 flex items-center justify-center font-semibold text-gray-700 flex-shrink-0">
                  {message.authorAvatar || message.author[0].toUpperCase()}
                </div>
                
                <div className={`flex-1 ${message.isCurrentUser ? 'text-right' : ''}`}>
                  <div className={`flex items-center space-x-2 mb-1 ${message.isCurrentUser ? 'justify-end' : ''}`}>
                    <span className="font-semibold text-gray-900 text-sm">{message.author}</span>
                    <span className="text-xs text-gray-500">{message.timeAgo}</span>
                  </div>
                  
                  <div className={`inline-block p-4 rounded-2xl shadow-sm border ${
                    message.isCurrentUser 
                      ? 'bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white border-blue-200'
                      : 'bg-white/80 backdrop-blur-xl text-gray-900 border-white/40'
                  }`}>
                    <p className="text-sm sm:text-base leading-relaxed">{message.content}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-2xl border-t border-white/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <div className="relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  className="w-full p-4 pr-12 bg-white/80 backdrop-blur-xl border border-white/40 
                           rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/50 
                           focus:border-transparent transition-all duration-300 resize-none min-h-[3rem] max-h-32"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                  <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                    <Paperclip className="h-4 w-4 text-gray-400" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                    <Smile className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="p-3 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white 
                       rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 
                       hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}