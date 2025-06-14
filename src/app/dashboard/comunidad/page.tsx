'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

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
}

// Mock data for demonstration
const mockPosts: Post[] = [
  {
    id: '1',
    title: '¿Cuál es la mejor presión de neumáticos para condiciones de lluvia?',
    content: 'He estado experimentando con diferentes presiones en mis neumáticos durante la temporada de lluvias. ¿Alguien tiene experiencia con esto?',
    author: 'CarlosM',
    timeAgo: '2h',
    upvotes: 24,
    downvotes: 2,
    comments: 8,
    views: 156,
    tags: ['neumáticos', 'lluvia', 'seguridad'],
    isBookmarked: false,
    category: 'Consulta',
    isPinned: true
  },
  {
    id: '2',
    title: 'Nueva tecnología de sensores TPMS - Experiencias',
    content: 'Acabo de instalar el nuevo sistema de monitoreo. Los resultados han sido impresionantes. Comparto mi experiencia completa.',
    author: 'TechDriver',
    authorAvatar: '👨‍💻',
    timeAgo: '4h',
    upvotes: 45,
    downvotes: 1,
    comments: 15,
    views: 289,
    tags: ['TPMS', 'tecnología', 'innovación'],
    isBookmarked: true,
    category: 'Experiencia'
  },
  {
    id: '3',
    title: 'Mantenimiento preventivo: Mi rutina mensual',
    content: 'Después de 5 años gestionando flotas, esta es la rutina que mejor me ha funcionado para mantener los neumáticos en óptimas condiciones.',
    author: 'FleetMaster',
    timeAgo: '6h',
    upvotes: 67,
    downvotes: 3,
    comments: 23,
    views: 445,
    tags: ['mantenimiento', 'flotillas', 'tips'],
    isBookmarked: false,
    category: 'Guía'
  },
  {
    id: '4',
    title: '¿Alguien más ha notado cambios en el desgaste con las altas temperaturas?',
    content: 'Con el calor extremo de este verano, he observado patrones de desgaste diferentes. ¿Es normal?',
    author: 'SummerDriver',
    timeAgo: '8h',
    upvotes: 12,
    downvotes: 0,
    comments: 6,
    views: 98,
    tags: ['desgaste', 'calor', 'verano'],
    isBookmarked: false,
    category: 'Discusión'
  },
  {
    id: '5',
    title: 'Comparativa: Neumáticos premium vs económicos - Análisis de 6 meses',
    content: 'He estado probando ambos tipos durante 6 meses en condiciones similares. Los resultados pueden sorprenderte.',
    author: 'DataAnalyst',
    authorAvatar: '📊',
    timeAgo: '12h',
    upvotes: 89,
    downvotes: 5,
    comments: 34,
    views: 567,
    tags: ['comparativa', 'análisis', 'presupuesto'],
    isBookmarked: true,
    category: 'Análisis'
  }
];

export default function ComunidadPage() {
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');

  const categories = ['todas', 'Consulta', 'Experiencia', 'Guía', 'Discusión', 'Análisis'];

  const handleVote = (postId: string, voteType: 'up' | 'down') => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const currentVote = post.userVote;
        let newUpvotes = post.upvotes;
        let newDownvotes = post.downvotes;
        let newUserVote: 'up' | 'down' | null = voteType;

        // Remove previous vote
        if (currentVote === 'up') newUpvotes -= 1;
        if (currentVote === 'down') newDownvotes -= 1;

        // Add new vote or toggle off
        if (currentVote === voteType) {
          newUserVote = null; // Toggle off
        } else {
          if (voteType === 'up') newUpvotes += 1;
          if (voteType === 'down') newDownvotes += 1;
        }

        return {
          ...post,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          userVote: newUserVote
        };
      }
      return post;
    }));
  };

  const toggleBookmark = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, isBookmarked: !post.isBookmarked }
        : post
    ));
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'todas' || post.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortBy) {
      case 'hot':
        return (b.upvotes - b.downvotes + b.comments * 0.5) - (a.upvotes - a.downvotes + a.comments * 0.5);
      case 'new':
        return new Date(b.timeAgo).getTime() - new Date(a.timeAgo).getTime();
      case 'top':
        return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/80 via-white/40 to-blue-50/60">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-white/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col space-y-3 py-4 sm:py-6">
            {/* Title and Action Button Row */}
            <div className="flex items-start justify-between ml-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight truncate">
                  Comunidad TirePro
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Conecta, aprende y comparte
                </p>
              </div>
              
              <button className="flex items-center justify-center space-x-1.5 px-3 py-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-3 
                               bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white 
                               rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 
                               hover:scale-105 font-medium text-sm sm:text-base whitespace-nowrap ml-3">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Nueva publicación</span>
                <span className="sm:hidden">Nuevo</span>
              </button>
            </div>

            {/* Stats Row */}
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
                {/* Search */}
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

                {/* Sort Buttons */}
                <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-1">
                  {[
                    { key: 'hot', label: 'Populares', icon: Flame },
                    { key: 'new', label: 'Nuevos', icon: Clock },
                    { key: 'top', label: 'Mejores', icon: TrendingUp }
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setSortBy(key as any)}
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

                {/* Categories */}
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
              {sortedPosts.map((post) => (
                <article key={post.id} 
                        className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-lg 
                                 border border-white/30 hover:shadow-xl transition-all duration-300 
                                 hover:-translate-y-1 overflow-hidden">
                  {/* Post Header */}
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
                      
                      <button className="p-1.5 sm:p-2 hover:bg-white/60 rounded-lg sm:rounded-xl transition-colors duration-200 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      </button>
                    </div>

                    {/* Post Content */}
                    <div className="mb-3 sm:mb-4">
                      <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">
                        {post.title}
                      </h2>
                      <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                        {post.content}
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                      {post.tags.map((tag) => (
                        <span key={tag} 
                              className="px-2 py-1 sm:px-3 sm:py-1 bg-gray-100/60 text-gray-600 rounded-lg sm:rounded-xl text-xs font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Post Actions */}
                  <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 bg-white/40 border-t border-white/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-6">
                        {/* Vote buttons */}
                        <div className="flex items-center space-x-0.5 sm:space-x-1">
                          <button
                            onClick={() => handleVote(post.id, 'up')}
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
                            onClick={() => handleVote(post.id, 'down')}
                            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 ${
                              post.userVote === 'down'
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'hover:bg-white/60 text-gray-500 hover:text-red-600'
                            }`}
                          >
                            <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </div>

                        {/* Comments */}
                        <button className="flex items-center space-x-1.5 sm:space-x-2 px-2 py-1.5 sm:px-3 sm:py-2 hover:bg-white/60 
                                         rounded-lg sm:rounded-xl transition-colors duration-200 text-gray-600 hover:text-blue-600">
                          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="font-medium text-sm sm:text-base">{post.comments}</span>
                        </button>

                        {/* Views */}
                        <div className="flex items-center space-x-1 sm:space-x-2 text-gray-500 text-xs sm:text-sm">
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{post.views}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 sm:space-x-2">
                        {/* Bookmark */}
                        <button
                          onClick={() => toggleBookmark(post.id)}
                          className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 ${
                            post.isBookmarked
                              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                              : 'hover:bg-white/60 text-gray-500 hover:text-yellow-600'
                          }`}
                        >
                          <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>

                        {/* Share */}
                        <button className="p-1.5 sm:p-2 hover:bg-white/60 rounded-lg sm:rounded-xl transition-colors duration-200 
                                         text-gray-500 hover:text-blue-600">
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
            {/* Community Stats */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-white/30">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Estadísticas de la comunidad</h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm sm:text-base">Miembros totales</span>
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">1,234</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm sm:text-base">Publicaciones hoy</span>
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">12</span>
                </div>
              </div>
            </div>

            {/* Top Contributors */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-white/30">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Colaboradores destacados</h3>
              <div className="space-y-2 sm:space-y-3">
                {[
                  { name: 'TechDriver', points: 245, avatar: '👨‍💻' },
                  { name: 'FleetMaster', points: 189, avatar: '🚛' },
                  { name: 'DataAnalyst', points: 156, avatar: '📊' }
                ].map((user, index) => (
                  <div key={user.name} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 hover:bg-white/60 rounded-xl sm:rounded-2xl transition-colors duration-200">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#0A183A]/20 to-[#1E76B6]/20 
                                  flex items-center justify-center text-xs sm:text-sm">
                      {user.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{user.name}</div>
                      <div className="text-xs sm:text-sm text-gray-500">{user.points} puntos</div>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-[#1E76B6]">#{index + 1}</div>
                  </div>
                ))}
              </div>
            </div>

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
                  <span>Comparte contenido relevante sobre neumáticos y mantenimiento</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold text-[#1E76B6] mt-0.5 flex-shrink-0">3.</span>
                  <span>Usa títulos descriptivos para tus publicaciones</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold text-[#1E76B6] mt-0.5 flex-shrink-0">4.</span>
                  <span>No spam ni contenido promocional excesivo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}