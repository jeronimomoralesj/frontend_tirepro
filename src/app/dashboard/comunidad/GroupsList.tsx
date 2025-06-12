'use client';

import { Lock, Users, Clock, Hash } from 'lucide-react';

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

interface GroupsListProps {
  groups: Group[];
  selectedGroup: Group | null;
  onSelectGroup: (group: Group) => void;
  isLoading: boolean;
}

export default function GroupsList({ groups, selectedGroup, onSelectGroup, isLoading }: GroupsListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
              <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'Mantenimiento': 'bg-green-100 text-green-800',
      'Neumáticos': 'bg-blue-100 text-blue-800',
      'Profesional': 'bg-purple-100 text-purple-800',
      'Tecnología': 'bg-indigo-100 text-indigo-800',
      'Seguridad': 'bg-red-100 text-red-800',
      'General': 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.General;
  };

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full">
        <Hash className="h-12 w-12 text-gray-400 mb-3" />
        <p className="text-gray-600 font-medium">No se encontraron grupos</p>
        <p className="text-gray-500 text-sm mt-1">
          Prueba con una búsqueda diferente
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <div className="p-4 space-y-2">
        {groups.map((group) => (
          <div
            key={group.id}
            onClick={() => onSelectGroup(group)}
            className={`
              relative p-4 rounded-xl cursor-pointer transition-all duration-200 group
              ${selectedGroup?.id === group.id
                ? 'bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white shadow-lg transform scale-105'
                : 'bg-white hover:bg-gray-50 border border-gray-200 hover:shadow-md hover:border-[#348CCB]/30'
              }
            `}
          >
            <div className="flex items-start space-x-3">
              {/* Avatar */}
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold
                ${selectedGroup?.id === group.id
                  ? 'bg-white/20 backdrop-blur-sm'
                  : 'bg-gradient-to-br from-[#348CCB]/20 to-[#1E76B6]/20'
                }
              `}>
                {group.avatar}
              </div>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`
                    font-semibold text-sm truncate
                    ${selectedGroup?.id === group.id
                      ? 'text-white'
                      : 'text-gray-900 group-hover:text-[#0A183A]'
                    }
                  `}>
                    {group.name}
                  </h3>
                  
                  <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                    {group.isPrivate && (
                      <Lock className={`
                        h-3 w-3
                        ${selectedGroup?.id === group.id ? 'text-white/80' : 'text-gray-400'}
                      `} />
                    )}
                    <span className={`
                      text-xs flex items-center
                      ${selectedGroup?.id === group.id ? 'text-white/80' : 'text-gray-500'}
                    `}>
                      <Clock className="h-3 w-3 mr-1" />
                      {group.lastMessageTime}
                    </span>
                  </div>
                </div>

                {/* Category Badge */}
                <div className="mb-2">
                  <span className={`
                    inline-block px-2 py-1 rounded-full text-xs font-medium
                    ${selectedGroup?.id === group.id
                      ? 'bg-white/20 text-white/90'
                      : getCategoryColor(group.category)
                    }
                  `}>
                    {group.category}
                  </span>
                </div>

                {/* Last Message */}
                <p className={`
                  text-xs line-clamp-2 mb-2
                  ${selectedGroup?.id === group.id
                    ? 'text-white/80'
                    : 'text-gray-600'
                  }
                `}>
                  {group.lastMessage}
                </p>

                {/* Members Count */}
                <div className={`
                  flex items-center text-xs
                  ${selectedGroup?.id === group.id
                    ? 'text-white/70'
                    : 'text-gray-500'
                  }
                `}>
                  <Users className="h-3 w-3 mr-1" />
                  {group.memberCount} miembros
                </div>
              </div>
            </div>

            {/* Active Indicator */}
            {selectedGroup?.id === group.id && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}