'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  X,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Calendar,
  Tag,
  ImageIcon,
  Save,
  ArrowLeft,
  Mail,
  Shield
} from 'lucide-react'
import logo from "../../../../public/logo_text.png"
import logoTire from "../../../../public/logo_tire.png"

interface Article {
  id: number
  title: string
  subtitle: string
  content: string
  coverImage: string
  category: string
  hashtags: string[]
  createdAt: string
  updatedAt: string
}

interface NewArticle {
  title: string
  subtitle: string
  content: string
  coverImage: string
  category: string
  hashtags: string[]
}

const BlogAdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false)
  const [passwordGenerated, setPasswordGenerated] = useState(false)

  // API URLs with fallback
  const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : null
  const FALLBACK_API_URL = 'http://localhost:6001/api'

  const [newArticle, setNewArticle] = useState<NewArticle>({
    title: '',
    subtitle: '',
    content: '',
    coverImage: '',
    category: 'mantenimiento',
    hashtags: []
  })

  const categories = [
    'mantenimiento',
    'seguridad',
    'tecnologia',
    'negocios'
  ]

  // Helper function to make API requests with fallback
  const makeApiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const urls = PRIMARY_API_URL ? [PRIMARY_API_URL, FALLBACK_API_URL] : [FALLBACK_API_URL]
    
    for (const baseUrl of urls) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, options)
        if (response.ok || response.status < 500) {
          return response
        }
      } catch (error) {
        console.warn(`Failed to connect to ${baseUrl}:`, error)
        // Continue to next URL
      }
    }
    
    throw new Error('All API endpoints failed')
  }

  const generatePassword = async () => {
    setIsGeneratingPassword(true)
    try {
      const response = await makeApiRequest('/auth/generate-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json()

      if (data.success) {
        setPasswordGenerated(true)
        alert('Contraseña generada y enviada a info@tirepro.com.co')
      } else {
        alert(data.message || 'Error al generar la contraseña')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al generar la contraseña')
    } finally {
      setIsGeneratingPassword(false)
    }
  }

  const authenticate = async () => {
    setIsLoading(true)
    try {
      const response = await makeApiRequest('/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json()

      if (data.success) {
        setIsAuthenticated(true)
        fetchArticles()
      } else {
        alert(data.message || 'Contraseña incorrecta')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error de autenticación')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchArticles = async () => {
    try {
      const response = await makeApiRequest('/blog')
      if (response.ok) {
        const data = await response.json()
        setArticles(data)
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
    }
  }

  const createArticle = async () => {
    try {
      const response = await makeApiRequest('/blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newArticle),
      })

      if (response.ok) {
        setShowCreateForm(false)
        setNewArticle({
          title: '',
          subtitle: '',
          content: '',
          coverImage: '',
          category: 'mantenimiento',
          hashtags: []
        })
        fetchArticles()
        alert('Artículo creado exitosamente')
      } else {
        alert('Error al crear el artículo')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear el artículo')
    }
  }

  const updateArticle = async () => {
    if (!editingArticle) return

    try {
      const response = await makeApiRequest(`/blog/${editingArticle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingArticle),
      })

      if (response.ok) {
        setEditingArticle(null)
        fetchArticles()
        alert('Artículo actualizado exitosamente')
      } else {
        alert('Error al actualizar el artículo')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar el artículo')
    }
  }

  const deleteArticle = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este artículo?')) return

    try {
      const response = await makeApiRequest(`/blog/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchArticles()
        alert('Artículo eliminado exitosamente')
      } else {
        alert('Error al eliminar el artículo')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar el artículo')
    }
  }

  const handleHashtagsChange = (value: string, isEditing = false) => {
    const hashtags = value.split(',').map(tag => tag.trim()).filter(tag => tag)
    
    if (isEditing && editingArticle) {
      setEditingArticle({ ...editingArticle, hashtags })
    } else {
      setNewArticle({ ...newArticle, hashtags })
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-[#030712] text-white min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gradient-to-br from-[#0A183A]/60 to-[#173D68]/40 rounded-2xl p-8 border border-[#173D68]/30">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-2 mb-6">
                <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-2 filter brightness-0 invert'/>
                <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
              </div>
              <h1 className="text-2xl font-bold mb-2">Admin del Blog</h1>
              <p className="text-gray-400">Ingresa la contraseña para continuar</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] transition-colors"
                  placeholder="Ingresa la contraseña"
                  onKeyPress={(e) => e.key === 'Enter' && authenticate()}
                />
              </div>

              <button
                onClick={authenticate}
                disabled={isLoading || !password}
                className="w-full px-4 py-3 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verificando...' : 'Ingresar'}
              </button>

              <div className="text-center">
                <p className="text-gray-400 text-sm mb-4">¿No tienes la contraseña?</p>
                <button
                  onClick={generatePassword}
                  disabled={isGeneratingPassword}
                  className="inline-flex items-center space-x-2 px-4 py-2 border border-[#348CCB] text-[#348CCB] rounded-lg hover:bg-[#348CCB] hover:text-white transition-all text-sm disabled:opacity-50"
                >
                  <Mail size={16} />
                  <span>
                    {isGeneratingPassword ? 'Generando...' : 'Generar Contraseña'}
                  </span>
                </button>
                {passwordGenerated && (
                  <p className="text-green-400 text-sm mt-2">
                    ✓ Contraseña enviada a info@tirepro.com.co
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#030712] text-white min-h-screen">
      {/* Header */}
      <div className="border-b border-[#173D68]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Image src={logoTire} alt="TirePro" width={24} height={24} className='filter brightness-0 invert'/>
                <Image src={logo} alt="TirePro" width={100} height={24} className="filter brightness-0 invert"/>
              </div>
              <div className="flex items-center space-x-2 text-[#348CCB]">
                <Shield size={16} />
                <span className="text-sm font-medium">Admin Panel</span>
              </div>
            </div>

            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-all"
            >
              <Plus size={16} />
              <span>Nuevo Artículo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gestión de Artículos</h1>
          <p className="text-gray-400">Administra el contenido del blog</p>
        </div>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-gradient-to-br from-[#0A183A]/40 to-[#173D68]/20 rounded-2xl overflow-hidden border border-[#173D68]/30"
            >
              <div className="relative h-40">
                <img 
                  src={article.coverImage} 
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs px-2 py-1 bg-[#348CCB]/20 text-[#348CCB] rounded-full capitalize">
                    {article.category}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(article.createdAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
                
                <h3 className="font-bold mb-2 line-clamp-2 text-sm">
                  {article.title}
                </h3>
                
                <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                  {article.subtitle}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingArticle(article)}
                      className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deleteArticle(article.id)}
                      className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {article.hashtags.slice(0, 2).map((tag, index) => (
                      <span key={index} className="text-xs text-[#348CCB]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {articles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No hay artículos publicados</p>
          </div>
        )}
      </div>

      {/* Create Article Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030712] rounded-2xl border border-[#173D68]/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#030712] border-b border-[#173D68]/30 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Crear Nuevo Artículo</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-2 hover:bg-[#173D68]/30 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Título</label>
                  <input
                    type="text"
                    value={newArticle.title}
                    onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors"
                    placeholder="Título del artículo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Categoría</label>
                  <select
                    value={newArticle.category}
                    onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#030712]">
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Subtítulo</label>
                <input
                  type="text"
                  value={newArticle.subtitle}
                  onChange={(e) => setNewArticle({ ...newArticle, subtitle: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors"
                  placeholder="Subtítulo del artículo"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">URL de Imagen de Portada</label>
                <input
                  type="url"
                  value={newArticle.coverImage}
                  onChange={(e) => setNewArticle({ ...newArticle, coverImage: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Hashtags (separados por comas)</label>
                <input
                  type="text"
                  value={newArticle.hashtags.join(', ')}
                  onChange={(e) => handleHashtagsChange(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors"
                  placeholder="mantenimiento, tips, seguridad"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Contenido</label>
                <textarea
                  value={newArticle.content}
                  onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors resize-none"
                  placeholder="Contenido del artículo en Markdown..."
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 border border-[#173D68] text-gray-300 rounded-lg hover:bg-[#173D68]/20 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={createArticle}
                  className="px-6 py-3 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-colors"
                >
                  Crear Artículo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Article Modal */}
      {editingArticle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030712] rounded-2xl border border-[#173D68]/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#030712] border-b border-[#173D68]/30 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Editar Artículo</h2>
                <button
                  onClick={() => setEditingArticle(null)}
                  className="p-2 hover:bg-[#173D68]/30 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Título</label>
                  <input
                    type="text"
                    value={editingArticle.title}
                    onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Categoría</label>
                  <select
                    value={editingArticle.category}
                    onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#030712]">
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Subtítulo</label>
                <input
                  type="text"
                  value={editingArticle.subtitle}
                  onChange={(e) => setEditingArticle({ ...editingArticle, subtitle: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">URL de Imagen de Portada</label>
                <input
                  type="url"
                  value={editingArticle.coverImage}
                  onChange={(e) => setEditingArticle({ ...editingArticle, coverImage: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Hashtags (separados por comas)</label>
                <input
                  type="text"
                  value={editingArticle.hashtags.join(', ')}
                  onChange={(e) => handleHashtagsChange(e.target.value, true)}
                  className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Contenido</label>
                <textarea
                  value={editingArticle.content}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors resize-none"
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setEditingArticle(null)}
                  className="px-6 py-3 border border-[#173D68] text-gray-300 rounded-lg hover:bg-[#173D68]/20 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={updateArticle}
                  className="px-6 py-3 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BlogAdminPage