'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Edit3, Trash2, X, Save, Palette, ExternalLink } from 'lucide-react'

interface Brand {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  country: string | null
  headquarters: string | null
  foundedYear: number | null
  website: string | null
  description: string | null
  parentCompany: string | null
  tier: 'premium' | 'mid' | 'value' | null
  primaryColor: string | null
  accentColor: string | null
  heroImageUrl: string | null
  tagline: string | null
  published: boolean
  sourceUrl: string | null
  createdAt: string
  updatedAt: string
}

const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : null
const FALLBACK_API_URL = 'http://localhost:6001/api'

async function adminFetch(password: string, endpoint: string, options: RequestInit = {}) {
  const urls = PRIMARY_API_URL ? [PRIMARY_API_URL, FALLBACK_API_URL] : [FALLBACK_API_URL]
  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': password,
    ...(options.headers ?? {}),
  }
  let lastErr: any
  for (const base of urls) {
    try {
      const res = await fetch(`${base}${endpoint}`, { ...options, headers })
      return res
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr ?? new Error('All API endpoints failed')
}

const EMPTY: Partial<Brand> = {
  name: '',
  slug: '',
  logoUrl: '',
  description: '',
  primaryColor: '#1E76B6',
  accentColor: '#348CCB',
  tier: 'mid',
  published: true,
}

export default function BrandsAdminPanel({ password }: { password: string }) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Partial<Brand> | null>(null)
  const [isNew, setIsNew] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch(password, '/marketplace/admin/brands')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setBrands(data)
    } catch (err) {
      console.error(err)
      alert('Error cargando marcas')
    } finally {
      setLoading(false)
    }
  }, [password])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const openCreate = () => {
    setEditing({ ...EMPTY })
    setIsNew(true)
  }

  const openEdit = (b: Brand) => {
    setEditing({ ...b })
    setIsNew(false)
  }

  const save = async () => {
    if (!editing) return
    try {
      const endpoint = isNew ? '/marketplace/admin/brands' : `/marketplace/admin/brands/${editing.id}`
      const method = isNew ? 'POST' : 'PATCH'
      const res = await adminFetch(password, endpoint, {
        method,
        body: JSON.stringify(editing),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      setEditing(null)
      fetchAll()
    } catch (err: any) {
      console.error(err)
      alert(`Error al guardar: ${err.message ?? err}`)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta marca?')) return
    try {
      const res = await adminFetch(password, `/marketplace/admin/brands/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      fetchAll()
    } catch (err) {
      console.error(err)
      alert('Error al eliminar')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Páginas de Marca</h1>
          <p className="text-gray-400">
            Personaliza cada marca del marketplace — logo, descripción, colores y más
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-all"
        >
          <Plus size={16} />
          <span>Nueva marca</span>
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Cargando...</p>
      ) : brands.length === 0 ? (
        <p className="text-gray-400 text-center py-12">Sin marcas registradas</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {brands.map((b) => (
            <div
              key={b.id}
              className="bg-gradient-to-br from-[#0A183A]/40 to-[#173D68]/20 rounded-2xl border border-[#173D68]/30 overflow-hidden"
            >
              <div
                className="h-24 flex items-center justify-center relative"
                style={{
                  background: b.primaryColor
                    ? `linear-gradient(135deg, ${b.primaryColor}, ${b.accentColor ?? b.primaryColor})`
                    : 'linear-gradient(135deg,#0A183A,#1E76B6)',
                }}
              >
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt={b.name} className="max-h-14 max-w-[70%] object-contain" />
                ) : (
                  <span className="text-2xl font-black text-white/80">{b.name}</span>
                )}
                {!b.published && (
                  <span className="absolute top-2 right-2 text-[10px] uppercase font-black bg-black/60 text-white px-2 py-1 rounded-full">
                    Oculta
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold truncate">{b.name}</h3>
                  <p className="text-xs text-gray-400 font-mono truncate">/{b.slug}</p>
                </div>
                {b.tagline && <p className="text-xs text-gray-300 line-clamp-2">{b.tagline}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-[#173D68]/30">
                  <Link
                    href={`/marketplace/brand/${b.slug}`}
                    target="_blank"
                    className="text-xs text-[#348CCB] hover:underline inline-flex items-center gap-1"
                  >
                    Ver página <ExternalLink size={10} />
                  </Link>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(b)}
                      className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => remove(b.id)}
                      className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <BrandEditModal
          brand={editing}
          isNew={isNew}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  )
}

function BrandEditModal({
  brand,
  isNew,
  onChange,
  onClose,
  onSave,
}: {
  brand: Partial<Brand>
  isNew: boolean
  onChange: (b: Partial<Brand>) => void
  onClose: () => void
  onSave: () => void
}) {
  const set = <K extends keyof Brand>(k: K, v: Brand[K] | null) => onChange({ ...brand, [k]: v })

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#030712] rounded-2xl border border-[#173D68]/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#030712] border-b border-[#173D68]/30 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{isNew ? 'Nueva marca' : `Editar: ${brand.name ?? ''}`}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#173D68]/30 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Live preview */}
          <div
            className="rounded-2xl overflow-hidden border border-[#173D68]/30"
            style={{
              background: brand.heroImageUrl
                ? `url(${brand.heroImageUrl}) center/cover`
                : brand.primaryColor
                ? `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor ?? brand.primaryColor})`
                : 'linear-gradient(135deg,#0A183A,#1E76B6)',
            }}
          >
            <div className="bg-black/30 backdrop-blur-sm p-6 flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center p-3 flex-shrink-0">
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-2xl font-black text-[#0A183A]">
                    {brand.name?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-2xl font-black text-white truncate">{brand.name || 'Nombre de marca'}</h3>
                {brand.tagline && <p className="text-sm text-white/80 mt-1">{brand.tagline}</p>}
              </div>
            </div>
          </div>

          <Section title="Identidad">
            <Grid>
              <Field label="Nombre *">
                <Input
                  value={brand.name ?? ''}
                  onChange={(v) => {
                    const next = { ...brand, name: v }
                    if (isNew && (!brand.slug || brand.slug === slugify(brand.name ?? ''))) {
                      next.slug = slugify(v)
                    }
                    onChange(next)
                  }}
                />
              </Field>
              <Field label="Slug *">
                <Input value={brand.slug ?? ''} onChange={(v) => set('slug', slugify(v))} />
              </Field>
              <Field label="Tagline" full>
                <Input
                  value={brand.tagline ?? ''}
                  onChange={(v) => set('tagline', v)}
                  placeholder="Línea corta bajo el nombre"
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Identidad visual">
            <Grid>
              <Field label="URL del logo" full>
                <Input
                  value={brand.logoUrl ?? ''}
                  onChange={(v) => set('logoUrl', v)}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Imagen hero (fondo)" full>
                <Input
                  value={brand.heroImageUrl ?? ''}
                  onChange={(v) => set('heroImageUrl', v)}
                  placeholder="https://... (opcional)"
                />
              </Field>
              <Field label="Color primario">
                <ColorInput
                  value={brand.primaryColor ?? '#1E76B6'}
                  onChange={(v) => set('primaryColor', v)}
                />
              </Field>
              <Field label="Color de acento">
                <ColorInput
                  value={brand.accentColor ?? '#348CCB'}
                  onChange={(v) => set('accentColor', v)}
                />
              </Field>
              <Field label="Gama">
                <Select
                  value={brand.tier ?? ''}
                  onChange={(v) => set('tier', (v || null) as any)}
                  options={[
                    { value: '', label: '—' },
                    { value: 'premium', label: 'Premium' },
                    { value: 'mid', label: 'Intermedia' },
                    { value: 'value', label: 'Económica' },
                  ]}
                />
              </Field>
              <Field label="Publicada">
                <Select
                  value={brand.published === false ? 'false' : 'true'}
                  onChange={(v) => set('published', v === 'true')}
                  options={[
                    { value: 'true', label: 'Sí — visible en el marketplace' },
                    { value: 'false', label: 'No — oculta' },
                  ]}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Datos editoriales">
            <Grid>
              <Field label="País">
                <Input value={brand.country ?? ''} onChange={(v) => set('country', v)} />
              </Field>
              <Field label="Sede">
                <Input value={brand.headquarters ?? ''} onChange={(v) => set('headquarters', v)} />
              </Field>
              <Field label="Año de fundación">
                <Input
                  type="number"
                  value={brand.foundedYear ?? ''}
                  onChange={(v) => set('foundedYear', v === '' ? null : Number(v))}
                />
              </Field>
              <Field label="Empresa matriz">
                <Input value={brand.parentCompany ?? ''} onChange={(v) => set('parentCompany', v)} />
              </Field>
              <Field label="Sitio web" full>
                <Input value={brand.website ?? ''} onChange={(v) => set('website', v)} />
              </Field>
              <Field label="Descripción" full>
                <textarea
                  value={brand.description ?? ''}
                  onChange={(e) => set('description', e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors resize-none text-sm"
                  placeholder="Historia, valores, mercados..."
                />
              </Field>
            </Grid>
          </Section>

          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-[#173D68] text-gray-300 rounded-lg hover:bg-[#173D68]/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-colors"
            >
              <Save size={16} />
              {isNew ? 'Crear marca' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value.startsWith('#') ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 rounded-lg bg-transparent border border-[#173D68]/30 cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] text-sm font-mono"
      />
      <Palette size={16} className="text-gray-400" />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-[#348CCB] mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-2 gap-4">{children}</div>
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-medium mb-1.5 text-gray-300">{label}</label>
      {children}
    </div>
  )
}

function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string | number
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value as any}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#348CCB] transition-colors text-sm"
    />
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#030712]">
          {o.label}
        </option>
      ))}
    </select>
  )
}
