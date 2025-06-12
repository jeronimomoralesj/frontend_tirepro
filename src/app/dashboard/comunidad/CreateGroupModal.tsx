'use client';

import { useState } from 'react';
import { X, Lock, Globe, Hash } from 'lucide-react';

interface Group {
  name: string;
  description: string;
  category: string;
  isPrivate: boolean;
  avatar: string;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (group: Group) => void;
}

const categories = [
  'Mantenimiento',
  'Neumáticos',
  'Tecnología',
  'Seguridad',
  'Profesional',
  'General'
];

const avatarOptions = ['🔧', '🛞', '💻', '🚨', '🚛', '⚡', '🛠️', '🔩', '⚙️', '🚗', '🏁', '💡'];

export default function CreateGroupModal({ isOpen, onClose, onCreateGroup }: CreateGroupModalProps) {
  const [formData, setFormData] = useState<Group>({
    name: '',
    description: '',
    category: 'General',
    isPrivate: false,
    avatar: '🔧'
  });
  const [errors, setErrors] = useState<Partial<Group>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Partial<Group> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del grupo es requerido';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onCreateGroup(formData);
    setFormData({
      name: '',
      description: '',
      category: 'General',
      isPrivate: false,
      avatar: '🔧'
    });
    setErrors({});
  };

  const handleInputChange = (field: keyof Group, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white rounded-t-2xl">
          <h2 className="text-xl font-bold">Crear Nuevo Grupo</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Avatar Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Icono del Grupo
            </label>
            <div className="grid grid-cols-6 gap-2">
              {avatarOptions.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => handleInputChange('avatar', avatar)}
                  className={`
                    w-12 h-12 text-2xl rounded-xl border-2 transition-all
                    ${formData.avatar === avatar
                      ? 'border-[#1E76B6] bg-[#1E76B6]/10 shadow-md'
                      : 'border-gray-200 hover:border-[#348CCB] hover:bg-gray-50'
                    }
                  `}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          {/* Group Name */}
          <div>
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Grupo *
            </label>
            <input
              id="groupName"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ej: Expertos en Neumáticos"
              className={`
                w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all
                ${errors.name
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-[#1E76B6] focus:border-[#1E76B6]'
                }
              `}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe de qué trata este grupo..."
              rows={3}
              className={`
                w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all resize-none
                ${errors.description
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-[#1E76B6] focus:border-[#1E76B6]'
                }
              `}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E76B6] focus:border-[#1E76B6] transition-all"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Privacy Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Configuración de Privacidad
            </label>
            <div className="space-y-3">
              <div
                onClick={() => handleInputChange('isPrivate', false)}
                className={`
                  flex items-center p-4 border rounded-xl cursor-pointer transition-all
                  ${!formData.isPrivate
                    ? 'border-[#1E76B6] bg-[#1E76B6]/5'
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <Globe className={`h-5 w-5 mr-3 ${!formData.isPrivate ? 'text-[#1E76B6]' : 'text-gray-500'}`} />
                <div>
                  <div className={`font-medium ${!formData.isPrivate ? 'text-[#1E76B6]' : 'text-gray-700'}`}>
                    Público
                  </div>
                  <div className="text-sm text-gray-600">
                    Cualquiera puede unirse al grupo
                  </div>
                </div>
              </div>
              
              <div
                onClick={() => handleInputChange('isPrivate', true)}
                className={`
                  flex items-center p-4 border rounded-xl cursor-pointer transition-all
                  ${formData.isPrivate
                    ? 'border-[#1E76B6] bg-[#1E76B6]/5'
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <Lock className={`h-5 w-5 mr-3 ${formData.isPrivate ? 'text-[#1E76B6]' : 'text-gray-500'}`} />
                <div>
                  <div className={`font-medium ${formData.isPrivate ? 'text-[#1E76B6]' : 'text-gray-700'}`}>
                    Privado
                  </div>
                  <div className="text-sm text-gray-600">
                    Solo miembros invitados pueden unirse
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white rounded-xl hover:shadow-lg transition-all font-medium"
            >
              Crear Grupo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}