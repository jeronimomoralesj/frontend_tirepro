'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowUp, 
  ArrowDown, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal,
  Plus,
  Search,
  TrendingUp,
  Clock,
  Flame,
  Users,
  Eye,
  Award,
  X,
  Send,
  ArrowLeft,
  Paperclip,
  Smile,
  Type,
  AlignLeft,
} from 'lucide-react';

interface Chat {
  id: string;
  title: string;
  content: string;
  category: string;
  emoji: string;
  messageCount: number;
  createdAt: string;
  // Client-side only properties
  isBookmarked?: boolean;
  userVote?: 'up' | 'down' | null;
  upvotes?: number;
  downvotes?: number;
  views?: number;
  tags?: string[];
  author?: string;
  authorAvatar?: string;
  timeAgo?: string;
  isPinned?: boolean;
  messages?: Message[];
}

interface Message {
  id: string;
  author: {
    id: string;
    name: string;
  };
  content: string;
  createdAt: string;
  // Client-side properties
  authorAvatar?: string;
  timeAgo?: string;
  isCurrentUser?: boolean;
}

type ViewMode = 'community' | 'chat' | 'newPost';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  'Content-Type': 'application/json'
});

// Helper function to format time ago
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'reciente';
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d`;
  return date.toLocaleDateString();
};

// Helper function to extract tags from content
const extractTags = (content: string): string[] => {
  const hashtagRegex = /#(\w+)/g;
  const matches = content.match(hashtagRegex);
  return matches ? matches.map(tag => tag.substring(1)) : [];
};

export default function TireProCommunity() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('community');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // New post form state
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'Consulta',
    emoji: '💬'
  });

  const categories = ['todas', 'Consulta', 'Experiencia', 'Guía', 'Discusión', 'Análisis'];
  const postCategories = ['Consulta', 'Experiencia', 'Guía', 'Discusión', 'Análisis'];

  // Initialize user and fetch chats
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        fetchChats();
      } catch {
        setError("Error parsing user data");
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  // Fetch all chats
  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/chats`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }

const data = await response.json() as Chat[];

      // Transform backend data to frontend format
const transformedChats = data.map((chat: Chat) => ({
          ...chat,
        // Add client-side properties with defaults
        isBookmarked: false,
        userVote: null,
        upvotes: Math.floor(Math.random() * 50) + 1, // Temporary random values
        downvotes: Math.floor(Math.random() * 5),
        views: Math.floor(Math.random() * 300) + 50,
        tags: extractTags(chat.content),
        author: 'Usuario', // Will be replaced when user system is implemented
        authorAvatar: chat.emoji || '👤',
        timeAgo: formatTimeAgo(chat.createdAt),
        isPinned: false,
        messages: []
      }));

      setChats(transformedChats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching chats');
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific chat
const fetchMessages = async (chatId: string) => {
  try {
    const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    const data = await res.json() as Message[];
    return data.map((message: Message) => ({
      ...message,
      authorAvatar: '👤',
      timeAgo: formatTimeAgo(message.createdAt),
      isCurrentUser: message.author?.id === currentUser?.id
    }));
  } catch (err) {
    console.error('Error fetching messages:', err);
    return [];
  }
};


  // Create new chat
const createNewPost = async () => {
  if (!newPost.title.trim() || !newPost.content.trim()) return;

  try {
    const response = await fetch(`${API_BASE}/chats`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: newPost.title.trim(),
        category: newPost.category,
        content: newPost.content.trim(),
        emoji: newPost.emoji
      }),
    });

    if (!response.ok) {
      // try to parse a JSON error payload, otherwise log the text
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errJson = await response.json();
        console.error('Create chat error (JSON):', errJson);
      } else {
        const errText = await response.text();
        console.error('Create chat error (text):', errText);
      }
      throw new Error(`Failed to create chat (status ${response.status})`);
    }
  } catch (err) {
    console.error(err);
    setError(err instanceof Error ? err.message : 'Unknown error');
  }
};


  // Send message to chat
  const sendMessage = async () => {
    if (newMessage.trim() && selectedChat && currentUser) {
      try {
        const response = await fetch(`${API_BASE}/chats/${selectedChat.id}/messages`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            content: newMessage.trim(),
            authorId: currentUser.id,
            authorName: currentUser.name,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const createdMessage = await response.json();
        
        // Transform message
        const transformedMessage = {
          ...createdMessage,
          author: {
            id: currentUser.id,
            name: currentUser.name || 'Tú'
          },
          authorAvatar: '👤',
          timeAgo: 'ahora',
          isCurrentUser: true
        };

        // Update selected chat messages
        const updatedChat = {
          ...selectedChat,
          messages: [...(selectedChat.messages || []), transformedMessage],
          messageCount: selectedChat.messageCount + 1
        };

        setSelectedChat(updatedChat);
        
        // Update chat in main list
        setChats(chats.map(c => c.id === selectedChat.id ? updatedChat : c));
        setNewMessage('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error sending message');
      }
    }
  };

  // Open chat and fetch messages
  const openChat = async (chat: Chat) => {
    const messages = await fetchMessages(chat.id);
    const chatWithMessages = {
      ...chat,
      messages: messages
    };
    setSelectedChat(chatWithMessages);
    setViewMode('chat');
  };

  // Client-side only functions (these would need backend support for persistence)
  const handleVote = (chatId: string, voteType: 'up' | 'down') => {
    setChats(chats.map(chat => {
      if (chat.id === chatId) {
        const currentVote = chat.userVote;
        let newUpvotes = chat.upvotes || 0;
        let newDownvotes = chat.downvotes || 0;
        let newUserVote: 'up' | 'down' | null = voteType;

        if (currentVote === 'up') newUpvotes -= 1;
        if (currentVote === 'down') newDownvotes -= 1;

        if (currentVote === voteType) {
          newUserVote = null;
        } else {
          if (voteType === 'up') newUpvotes += 1;
          if (voteType === 'down') newDownvotes += 1;
        }

        return {
          ...chat,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          userVote: newUserVote
        };
      }
      return chat;
    }));
  };

  const toggleBookmark = (chatId: string) => {
    setChats(chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, isBookmarked: !chat.isBookmarked }
        : chat
    ));
  };

  // Filter and sort chats
  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chat.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (chat.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'todas' || chat.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const sortedChats = [...filteredChats].sort((a, b) => {
    switch (sortBy) {
      case 'hot':
        return ((b.upvotes || 0) - (b.downvotes || 0) + (b.messageCount || 0) * 0.5) - 
               ((a.upvotes || 0) - (a.downvotes || 0) + (a.messageCount || 0) * 0.5);
      case 'new':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'top':
        return ((b.upvotes || 0) - (b.downvotes || 0)) - ((a.upvotes || 0) - (a.downvotes || 0));
      default:
        return 0;
    }
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50/80 via-white/40 to-blue-50/60 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E76B6] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando comunidad...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50/80 via-white/40 to-blue-50/60 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <X className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              fetchChats();
            }}
            className="px-4 py-2 bg-[#1E76B6] text-white rounded-lg hover:bg-[#155a8a] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Chat View
  if (viewMode === 'chat' && selectedChat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50/80 via-white/40 to-blue-50/60 flex flex-col">
        {/* Chat Header */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-2xl border-b border-white/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="flex items-center space-x-4 py-4">
              <button 
                onClick={() => setViewMode('community')}
                className="p-2 hover:bg-white/60 rounded-xl transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {selectedChat.title}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>{selectedChat.messageCount} respuestas</span>
                  <span>•</span>
                  <span>{selectedChat.views || 0} vistas</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleBookmark(selectedChat.id)}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    selectedChat.isBookmarked
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
          {/* Original post */}
          <div className="flex justify-start">
            <div className="max-w-2xl">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#0A183A]/20 to-[#1E76B6]/20 
                              border border-white/40 flex items-center justify-center font-semibold text-gray-700 flex-shrink-0">
                  {selectedChat.authorAvatar || selectedChat.emoji}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{selectedChat.author || 'Usuario'}</span>
                    <span className="text-xs text-gray-500">{selectedChat.timeAgo}</span>
                    <span className="px-2 py-1 bg-blue-100/60 text-blue-700 rounded-lg text-xs">
                      {selectedChat.category}
                    </span>
                  </div>
                  
                  <div className="bg-white/80 backdrop-blur-xl text-gray-900 border border-white/40 p-4 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-base mb-2">{selectedChat.title}</h3>
                    <p className="text-sm leading-relaxed">{selectedChat.content}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {(selectedChat.messages || []).map((message) => (
            <div key={message.id} className={`flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl ${message.isCurrentUser ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-start space-x-3 ${message.isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#0A183A]/20 to-[#1E76B6]/20 
                                border border-white/40 flex items-center justify-center font-semibold text-gray-700 flex-shrink-0">
                    {message.authorAvatar || message.author.name[0].toUpperCase()}
                  </div>
                  
                  <div className={`flex-1 ${message.isCurrentUser ? 'text-right' : ''}`}>
                    <div className={`flex items-center space-x-2 mb-1 ${message.isCurrentUser ? 'justify-end' : ''}`}>
                      <span className="font-semibold text-gray-900 text-sm">{message.authorName}</span>
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

  // New Post Modal
  if (viewMode === 'newPost') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50/80 via-white/40 to-blue-50/60">
        {/* Modal Overlay */}
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setViewMode('community')} />
        
        {/* Modal */}
        <div className="fixed inset-4 sm:inset-8 lg:inset-16 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/40 z-50 flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/30">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Nueva Publicación</h2>
            <button 
              onClick={() => setViewMode('community')}
              className="p-2 hover:bg-white/60 rounded-xl transition-colors duration-200"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {postCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setNewPost({...newPost, category})}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        newPost.category === category
                          ? 'bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white shadow-lg'
                          : 'bg-white/60 text-gray-700 border border-white/40 hover:bg-white/80'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {['💬', '❓', '💡', '🔧', '📊', '🚗', '⚡', '🎯'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setNewPost({...newPost, emoji})}
                      className={`p-3 text-2xl rounded-xl transition-all duration-300 ${
                        newPost.emoji === emoji
                          ? 'bg-[#1E76B6]/20 border-2 border-[#1E76B6]/50'
                          : 'bg-white/60 border border-white/40 hover:bg-white/80'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Título</label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                    placeholder="Escribe un título descriptivo..."
                    className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-xl border border-white/40 
                             rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/50 
                             focus:border-transparent transition-all duration-300"
                    maxLength={100}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right">{newPost.title.length}/100</div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Contenido</label>
                <div className="relative">
                  <AlignLeft className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    placeholder="Comparte tu pregunta, experiencia o conocimiento... Usa #hashtags para etiquetar"
                    className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-xl border border-white/40 
                             rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/50 
                             focus:border-transparent transition-all duration-300 resize-none"
                    rows={8}
                    maxLength={1000}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right">{newPost.content.length}/1000</div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-white/30">
            <button 
              onClick={() => setViewMode('community')}
              className="px-6 py-3 text-gray-700 hover:bg-white/60 rounded-2xl transition-colors duration-200 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={createNewPost}
              disabled={!newPost.title.trim() || !newPost.content.trim()}
              className="px-8 py-3 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white 
                       rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 
                       hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Publicar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Community View
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/80 via-white/40 to-blue-50/60">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-white/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col space-y-3 py-4 sm:py-6">
            <div className="flex items-start justify-between ml-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight truncate">
                  Comunidad TirePro
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Conecta, aprende y comparte
                </p>
              </div>
              
              <button 
                onClick={() => setViewMode('newPost')}
                className="flex items-center justify-center space-x-1.5 px-3 py-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-3 
                         bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white 
                         rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 
                         hover:scale-105 font-medium text-sm sm:text-base whitespace-nowrap ml-3"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Nueva publicación</span>
                <span className="sm:hidden">Nuevo</span>
              </button>
            </div>

            <div className="flex items-center space-x-4 text-xs sm:text-sm text-gray-600 ml-3">
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>1.2k miembros</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Filters and Search */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-6 shadow-lg border border-white/30 mb-4 sm:mb-6 lg:mb-8">
              <div className="space-y-3 sm:space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-black" />
                  <input
                    type="text"
                    placeholder="Buscar en la comunidad..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-white/60 backdrop-blur-xl border border-white/40 
                             rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/50 
                             focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                  />
                </div>

                <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-1">
                  {[
                    { key: 'hot', label: 'Populares', icon: Flame },
                    { key: 'new', label: 'Nuevos', icon: Clock },
                    { key: 'top', label: 'Mejores', icon: TrendingUp }
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setSortBy(key as 'hot' | 'new' | 'top')}
                      className={`flex items-center space-x-1.5 px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl font-medium 
                                transition-all duration-300 text-sm whitespace-nowrap ${
                        sortBy === key
                          ? 'bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white shadow-lg'
                          : 'bg-white/60 text-gray-700 hover:bg-white/80 hover:shadow-md'
                      }`}
                    >
                      <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{label.slice(0, 3)}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2 sm:pt-4 border-t border-white/30">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
                        selectedCategory === category
                          ? 'bg-[#1E76B6]/20 text-[#1E76B6] border border-[#1E76B6]/30'
                          : 'bg-white/60 text-gray-600 border border-white/40 hover:bg-white/80'
                      }`}
                    >
                      {category === 'todas' ? 'Todas' : category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Posts */}
            <div className="space-y-4 sm:space-y-6">
{sortedChats.map((post) => (                <article key={post.id} 
                        className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-lg 
                                 border border-white/30 hover:shadow-xl transition-all duration-300 
                                 hover:-translate-y-1 overflow-hidden cursor-pointer"
                        onClick={() => openChat(post)}>
                  <div className="p-3 sm:p-4 lg:p-6 pb-3 sm:pb-4">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0A183A]/20 to-[#1E76B6]/20 
                                      border border-white/40 flex items-center justify-center font-semibold text-gray-700 text-sm sm:text-base flex-shrink-0">
                          {post.authorAvatar || post.author[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            {post.isPinned && (
                              <div className="flex items-center space-x-1 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-amber-100/60 
                                            text-amber-700 rounded-md sm:rounded-lg text-xs font-medium whitespace-nowrap">
                                <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                <span>Fijado</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500 mt-0.5 flex-wrap">
                            <span>{post.timeAgo}</span>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-100/60 text-blue-700 rounded-md sm:rounded-lg text-xs">
                              {post.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        className="p-1.5 sm:p-2 hover:bg-white/60 rounded-lg sm:rounded-xl transition-colors duration-200 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      </button>
                    </div>

                    <div className="mb-3 sm:mb-4">
                      <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">
                        {post.title}
                      </h2>
                      <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                        {post.content}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                      {post.tags.map((tag) => (
                        <span key={tag} 
                              className="px-2 py-1 sm:px-3 sm:py-1 bg-gray-100/60 text-gray-600 rounded-lg sm:rounded-xl text-xs font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 bg-white/40 border-t border-white/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-6">
                        <div className="flex items-center space-x-0.5 sm:space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVote(post.id, 'up');
                            }}
                            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 ${
                              post.userVote === 'up'
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'hover:bg-white/60 text-gray-500 hover:text-green-600'
                            }`}
                          >
                            <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <span className="font-semibold text-gray-700 min-w-[1.5rem] sm:min-w-[2rem] text-center text-sm sm:text-base">
                            {post.upvotes - post.downvotes}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVote(post.id, 'down');
                            }}
                            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 ${
                              post.userVote === 'down'
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'hover:bg-white/60 text-gray-500 hover:text-red-600'
                            }`}
                          >
                            <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </div>
                        <button className="flex items-center space-x-1.5 sm:space-x-2 px-2 py-1.5 sm:px-3 sm:py-2 hover:bg-white/60 
                                         rounded-lg sm:rounded-xl transition-colors duration-200 text-gray-600 hover:text-blue-600">
                          <p>{post.messageCount}</p>
                          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="font-medium text-sm sm:text-base">{post.comments}</span>
                        </button>

                        <div className="flex items-center space-x-1 sm:space-x-2 text-gray-500 text-xs sm:text-sm">
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{post.views}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(post.id);
                          }}
                          className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 ${
                            post.isBookmarked
                              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                              : 'hover:bg-white/60 text-gray-500 hover:text-yellow-600'
                          }`}
                        >
                          <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>

                        <button 
                          className="p-1.5 sm:p-2 hover:bg-white/60 rounded-lg sm:rounded-xl transition-colors duration-200 
                                   text-gray-500 hover:text-blue-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-4 sm:space-y-6">

            {/* Community Rules */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-white/30">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Reglas de la comunidad</h3>
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="font-semibold text-[#1E76B6] mt-0.5 flex-shrink-0">1.</span>
                  <span>Mantén el respeto y la cortesía en todas las interacciones</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold text-[#1E76B6] mt-0.5 flex-shrink-0">2.</span>
                  <span>Usa títulos descriptivos para tus publicaciones</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold text-[#1E76B6] mt-0.5 flex-shrink-0">3.</span>
                  <span>No spam ni contenido promocional excesivo</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold text-[#1E76B6] mt-0.5 flex-shrink-0">4.</span>
                  <span>Comparte experiencias constructivas y útiles</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-white/30">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Acciones rápidas</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setViewMode('newPost')}
                  className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-[#0A183A]/10 to-[#1E76B6]/10 
                           text-[#1E76B6] rounded-xl hover:from-[#0A183A]/20 hover:to-[#1E76B6]/20 
                           transition-all duration-300 font-medium text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nueva publicación</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 bg-gray-50/60 text-gray-700 
                                 rounded-xl hover:bg-gray-100/60 transition-all duration-300 font-medium text-sm">
                  <Search className="h-4 w-4" />
                  <span>Buscar expertos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}