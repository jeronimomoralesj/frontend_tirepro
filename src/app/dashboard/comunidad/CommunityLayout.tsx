'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Hash, Users, TrendingUp, MessageCircle } from 'lucide-react';
import GroupsList from './GroupsList';
import ChatWindow from './ChatWindow';
import CreateGroupModal from './CreateGroupModal';

interface User {
  name: string;
  role: string;
  companyId: string;
}

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

interface CommunityLayoutProps {
  user: User;
}

export default function CommunityLayout({ user }: CommunityLayoutProps) {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  // Mock data - replace with real API calls
  useEffect(() => {
    const mockGroups: Group[] = [
      {
        id: '1',
        name: 'Mantenimiento General',
        description: 'Consejos y trucos para el mantenimiento de vehículos',
        memberCount: 156,
        lastMessage: '¿Alguien sabe cómo cambiar el aceite de transmisión?',
        lastMessageTime: '2 min',
        category: 'Mantenimiento',
        isPrivate: false,
        avatar: '🔧'
      },
      {
        id: '2',
        name: 'Neumáticos y Llantas',
        description: 'Todo sobre neumáticos, presión, desgaste y recomendaciones',
        memberCount: 89,
        lastMessage: 'Nuevas ofertas en neumáticos Michelin',
        lastMessageTime: '5 min',
        category: 'Neumáticos',
        isPrivate: false,
        avatar: '🛞'
      },
      {
        id: '3',
        name: 'Conductores Pro',
        description: 'Grupo exclusivo para conductores profesionales',
        memberCount: 45,
        lastMessage: 'Consejos para rutas largas en carretera',
        lastMessageTime: '12 min',
        category: 'Profesional',
        isPrivate: true,
        avatar: '🚛'
      },
      {
        id: '4',
        name: 'Tecnología Automotriz',
        description: 'Últimas innovaciones en tecnología para vehículos',
        memberCount: 112,
        lastMessage: 'Nuevo sistema de diagnóstico OBD-III',
        lastMessageTime: '18 min',
        category: 'Tecnología',
        isPrivate: false,
        avatar: '💻'
      },
      {
        id: '5',
        name: 'Seguridad Vial',
        description: 'Consejos y normativas de seguridad en carretera',
        memberCount: 203,
        lastMessage: 'Nuevas regulaciones para transporte de carga',
        lastMessageTime: '25 min',
        category: 'Seguridad',
        isPrivate: false,
        avatar: '🚨'
      }
    ];

    setTimeout(() => {
      setGroups(mockGroups);
      setIsLoadingGroups(false);
    }, 1000);
  }, []);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGroup = (groupData: Omit<Group, 'id' | 'memberCount' | 'lastMessage' | 'lastMessageTime'>) => {
    const newGroup: Group = {
      ...groupData,
      id: Date.now().toString(),
      memberCount: 1,
      lastMessage: 'Grupo creado',
      lastMessageTime: 'ahora'
    };
    setGroups(prev => [newGroup, ...prev]);
    setShowCreateModal(false);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0A183A] to-[#173D68] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white/95 backdrop-blur-sm shadow-2xl border-r border-gray-200/50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Comunidad</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
            <input
              type="text"
              placeholder="Buscar grupos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-gray-200/50 bg-gradient-to-r from-[#348CCB]/10 to-[#1E76B6]/10">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/80 rounded-lg p-3">
              <div className="flex items-center justify-center mb-1">
                <Users className="h-4 w-4 text-[#0A183A]" />
              </div>
              <div className="text-xs font-semibold text-[#0A183A]">
                {groups.reduce((acc, group) => acc + group.memberCount, 0)}
              </div>
              <div className="text-xs text-gray-600">Miembros</div>
            </div>
            <div className="bg-white/80 rounded-lg p-3">
              <div className="flex items-center justify-center mb-1">
                <Hash className="h-4 w-4 text-[#1E76B6]" />
              </div>
              <div className="text-xs font-semibold text-[#1E76B6]">{groups.length}</div>
              <div className="text-xs text-gray-600">Grupos</div>
            </div>
            <div className="bg-white/80 rounded-lg p-3">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-[#348CCB]" />
              </div>
              <div className="text-xs font-semibold text-[#348CCB]">24</div>
              <div className="text-xs text-gray-600">Activos</div>
            </div>
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-hidden">
          <GroupsList
            groups={filteredGroups}
            selectedGroup={selectedGroup}
            onSelectGroup={setSelectedGroup}
            isLoading={isLoadingGroups}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedGroup ? (
          <ChatWindow group={selectedGroup} user={user} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#0A183A]/5 to-[#1E76B6]/5">
            <div className="text-center p-8 max-w-md">
              <div className="w-20 h-20 bg-gradient-to-br from-[#0A183A] to-[#1E76B6] rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Bienvenido a la Comunidad
              </h2>
              <p className="text-gray-600 mb-6">
                Selecciona un grupo para comenzar a chatear con otros miembros de la comunidad TirePro.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• Comparte conocimientos y experiencias</p>
                <p>• Resuelve dudas con la comunidad</p>
                <p>• Conecta con profesionales del sector</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}
    </div>
  );
}