'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Edit3, Trash2, X, Save, ChevronLeft, ChevronRight } from 'lucide-react'

interface SkuRow {
  id: string
  marca: string
  modelo: string
  dimension: string
  skuRef: string
  anchoMm: number | null
  perfil: string | null
  rin: string | null
  posicion: string | null
  ejeTirePro: string | null
  terreno: string | null
  pctPavimento: number
  pctDestapado: number
  rtdMm: number | null
  indiceCarga: string | null
  indiceVelocidad: string | null
  psiRecomendado: number | null
  pesoKg: number | null
  cinturones: string | null
  pr: string | null
  kmEstimadosReales: number | null
  kmEstimadosFabrica: number | null
  reencauchable: boolean
  vidasReencauche: number
  tipoBanda: string | null
  precioCop: number | null
  cpkEstimado: number | null
  categoria: string | null
  segmento: string | null
  tipo: string | null
  construccion: string | null
  notasColombia: string | null
  fuente: string | null
  url: string | null
  createdAt: string
  updatedAt: string
}

type EjeType = 'direccion' | 'traccion' | 'libre' | 'remolque' | 'repuesto'

const EJE_OPTIONS: EjeType[] = ['direccion', 'traccion', 'libre', 'remolque', 'repuesto']

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

interface Props {
  password: string
}

const EMPTY_SKU: Partial<SkuRow> = {
  marca: '',
  modelo: '',
  dimension: '',
  skuRef: '',
  categoria: 'nueva',
  pctPavimento: 100,
  pctDestapado: 0,
  reencauchable: false,
  vidasReencauche: 0,
}

export default function SkusAdminPanel({ password }: Props) {
  const [items, setItems] = useState<SkuRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [query, setQuery] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState<'' | 'nueva' | 'reencauche'>('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Partial<SkuRow> | null>(null)
  const [isNew, setIsNew] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const fetchPage = useCallback(
    async (p: number, q: string, cat: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(pageSize),
        })
        if (q.trim()) params.set('q', q.trim())
        if (cat) params.set('categoria', cat)
        const res = await adminFetch(password, `/catalog/admin/skus?${params.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setItems(data.items ?? [])
        setTotal(data.total ?? 0)
      } catch (err) {
        console.error(err)
        alert('Error cargando SKUs')
      } finally {
        setLoading(false)
      }
    },
    [password, pageSize],
  )

  useEffect(() => {
    fetchPage(page, query, categoriaFilter)
  }, [page, categoriaFilter, fetchPage])

  const onSearch = () => {
    setPage(1)
    fetchPage(1, query, categoriaFilter)
  }

  const openCreate = () => {
    setEditing({ ...EMPTY_SKU })
    setIsNew(true)
  }

  const openEdit = (row: SkuRow) => {
    setEditing({ ...row })
    setIsNew(false)
  }

  const save = async () => {
    if (!editing) return
    try {
      const endpoint = isNew ? '/catalog/admin/skus' : `/catalog/admin/skus/${editing.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await adminFetch(password, endpoint, {
        method,
        body: JSON.stringify(editing),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      setEditing(null)
      fetchPage(page, query, categoriaFilter)
    } catch (err: any) {
      console.error(err)
      alert(`Error al guardar: ${err.message ?? err}`)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta SKU? Esta acción no se puede deshacer.')) return
    try {
      const res = await adminFetch(password, `/catalog/admin/skus/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      fetchPage(page, query, categoriaFilter)
    } catch (err) {
      console.error(err)
      alert('Error al eliminar')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestión de SKUs</h1>
          <p className="text-gray-400">
            Edita cualquier campo del catálogo maestro · {total.toLocaleString('es-CO')} SKUs
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-all"
        >
          <Plus size={16} />
          <span>Nueva SKU</span>
        </button>
      </div>

      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[280px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Buscar por marca, modelo, dimensión o skuRef"
            className="w-full pl-10 pr-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] transition-colors"
          />
        </div>
        <select
          value={categoriaFilter}
          onChange={(e) => {
            setPage(1)
            setCategoriaFilter(e.target.value as '' | 'nueva' | 'reencauche')
          }}
          className="px-3 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors text-sm"
        >
          <option value="" className="bg-[#030712]">Todas las categorías</option>
          <option value="nueva" className="bg-[#030712]">Nueva</option>
          <option value="reencauche" className="bg-[#030712]">Reencauche</option>
        </select>
        <button
          onClick={onSearch}
          className="px-4 py-3 bg-[#348CCB] text-white rounded-lg hover:bg-[#1E76B6] transition-colors"
        >
          Buscar
        </button>
      </div>

      <div className="bg-gradient-to-br from-[#0A183A]/40 to-[#173D68]/20 rounded-2xl border border-[#173D68]/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0A183A]/60 text-gray-300 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Marca</th>
                <th className="px-4 py-3 text-left">Modelo</th>
                <th className="px-4 py-3 text-left">Dimensión</th>
                <th className="px-4 py-3 text-left">SKU Ref</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-left">Eje</th>
                <th className="px-4 py-3 text-right">Precio COP</th>
                <th className="px-4 py-3 text-right">Km est.</th>
                <th className="px-4 py-3 text-left">Fuente</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Cargando...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Sin resultados
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((row) => (
                  <tr key={row.id} className="border-t border-[#173D68]/30 hover:bg-[#173D68]/20">
                    <td className="px-4 py-3 font-semibold capitalize">{row.marca}</td>
                    <td className="px-4 py-3 capitalize">{row.modelo}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.dimension}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{row.skuRef}</td>
                    <td className="px-4 py-3">
                      {row.categoria ? (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                          row.categoria.toLowerCase() === 'reencauche'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {row.categoria}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{row.ejeTirePro ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {row.precioCop != null ? `$${row.precioCop.toLocaleString('es-CO')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.kmEstimadosReales != null
                        ? row.kmEstimadosReales.toLocaleString('es-CO')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{row.fuente ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(row)}
                          className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => remove(row.id)}
                          className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#173D68]/30 text-sm text-gray-400">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-[#173D68]/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg hover:bg-[#173D68]/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <SkuEditModal
          sku={editing}
          isNew={isNew}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  )
}

function SkuEditModal({
  sku,
  isNew,
  onChange,
  onClose,
  onSave,
}: {
  sku: Partial<SkuRow>
  isNew: boolean
  onChange: (s: Partial<SkuRow>) => void
  onClose: () => void
  onSave: () => void
}) {
  const set = <K extends keyof SkuRow>(k: K, v: SkuRow[K] | null) => onChange({ ...sku, [k]: v })

  const num = (v: string): number | null => {
    if (v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#030712] rounded-2xl border border-[#173D68]/30 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#030712] border-b border-[#173D68]/30 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{isNew ? 'Nueva SKU' : 'Editar SKU'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#173D68]/30 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <Section title="Identidad">
            <Grid>
              <Field label="Marca *">
                <Input value={sku.marca ?? ''} onChange={(v) => set('marca', v)} />
              </Field>
              <Field label="Modelo / Diseño *">
                <Input value={sku.modelo ?? ''} onChange={(v) => set('modelo', v)} />
              </Field>
              <Field label="Dimensión *">
                <Input
                  value={sku.dimension ?? ''}
                  onChange={(v) => set('dimension', v)}
                  placeholder="295/80R22.5"
                />
              </Field>
              <Field label="SKU Ref *">
                <Input value={sku.skuRef ?? ''} onChange={(v) => set('skuRef', v)} />
              </Field>
            </Grid>
          </Section>

          <Section title="Dimensiones">
            <Grid>
              <Field label="Ancho (mm)">
                <Input
                  type="number"
                  value={sku.anchoMm ?? ''}
                  onChange={(v) => set('anchoMm', num(v))}
                />
              </Field>
              <Field label="Perfil">
                <Input value={sku.perfil ?? ''} onChange={(v) => set('perfil', v)} />
              </Field>
              <Field label="Rin">
                <Input value={sku.rin ?? ''} onChange={(v) => set('rin', v)} />
              </Field>
            </Grid>
          </Section>

          <Section title="Aplicación">
            <Grid>
              <Field label="Posición">
                <Input
                  value={sku.posicion ?? ''}
                  onChange={(v) => set('posicion', v)}
                  placeholder="D / T / AP / R"
                />
              </Field>
              <Field label="Eje TirePro">
                <Select
                  value={(sku.ejeTirePro as string) ?? ''}
                  onChange={(v) => set('ejeTirePro', (v || null) as any)}
                  options={[{ value: '', label: '—' }, ...EJE_OPTIONS.map((o) => ({ value: o, label: o }))]}
                />
              </Field>
              <Field label="Terreno">
                <Input
                  value={sku.terreno ?? ''}
                  onChange={(v) => set('terreno', v)}
                  placeholder="Carretera / Mixto / Urbano"
                />
              </Field>
              <Field label="% Pavimento">
                <Input
                  type="number"
                  value={sku.pctPavimento ?? 100}
                  onChange={(v) => set('pctPavimento', num(v) ?? 100)}
                />
              </Field>
              <Field label="% Destapado">
                <Input
                  type="number"
                  value={sku.pctDestapado ?? 0}
                  onChange={(v) => set('pctDestapado', num(v) ?? 0)}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Desempeño">
            <Grid>
              <Field label="RTD (mm)">
                <Input
                  type="number"
                  step="0.1"
                  value={sku.rtdMm ?? ''}
                  onChange={(v) => set('rtdMm', num(v))}
                />
              </Field>
              <Field label="Índice de carga">
                <Input value={sku.indiceCarga ?? ''} onChange={(v) => set('indiceCarga', v)} />
              </Field>
              <Field label="Índice de velocidad">
                <Input
                  value={sku.indiceVelocidad ?? ''}
                  onChange={(v) => set('indiceVelocidad', v)}
                />
              </Field>
              <Field label="PSI recomendado">
                <Input
                  type="number"
                  value={sku.psiRecomendado ?? ''}
                  onChange={(v) => set('psiRecomendado', num(v))}
                />
              </Field>
              <Field label="Peso (kg)">
                <Input
                  type="number"
                  step="0.1"
                  value={sku.pesoKg ?? ''}
                  onChange={(v) => set('pesoKg', num(v))}
                />
              </Field>
              <Field label="Cinturones">
                <Input
                  type="text"
                  placeholder="Ej: 4B+2N"
                  value={sku.cinturones ?? ''}
                  onChange={(v) => set('cinturones', v)}
                />
              </Field>
              <Field label="PR (ply rating)">
                <Input
                  type="text"
                  placeholder="Ej: 16, 18PR"
                  value={sku.pr ?? ''}
                  onChange={(v) => set('pr', v)}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Vida útil & Reencauche">
            <Grid>
              <Field label="Km estimados (reales)">
                <Input
                  type="number"
                  value={sku.kmEstimadosReales ?? ''}
                  onChange={(v) => set('kmEstimadosReales', num(v))}
                />
              </Field>
              <Field label="Km estimados (fábrica)">
                <Input
                  type="number"
                  value={sku.kmEstimadosFabrica ?? ''}
                  onChange={(v) => set('kmEstimadosFabrica', num(v))}
                />
              </Field>
              <Field label="Reencauchable">
                <Select
                  value={sku.reencauchable ? 'true' : 'false'}
                  onChange={(v) => set('reencauchable', v === 'true')}
                  options={[
                    { value: 'false', label: 'No' },
                    { value: 'true', label: 'Sí' },
                  ]}
                />
              </Field>
              <Field label="Vidas de reencauche">
                <Input
                  type="number"
                  value={sku.vidasReencauche ?? 0}
                  onChange={(v) => set('vidasReencauche', num(v) ?? 0)}
                />
              </Field>
              <Field label="Tipo de banda">
                <Input
                  type="text"
                  placeholder="Ej: Bandag BDR-HT"
                  value={sku.tipoBanda ?? ''}
                  onChange={(v) => set('tipoBanda', v)}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Financiero">
            <Grid>
              <Field label="Precio (COP)">
                <Input
                  type="number"
                  value={sku.precioCop ?? ''}
                  onChange={(v) => set('precioCop', num(v))}
                />
              </Field>
              <Field label="CPK estimado">
                <Input
                  type="number"
                  step="0.01"
                  value={sku.cpkEstimado ?? ''}
                  onChange={(v) => set('cpkEstimado', num(v))}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Clasificación & notas">
            <Grid>
              <Field label="Categoría">
                <Select
                  value={sku.categoria ?? ''}
                  onChange={(v) => set('categoria', (v || null) as any)}
                  options={[
                    { value: '', label: '—' },
                    { value: 'nueva', label: 'Nueva' },
                    { value: 'reencauche', label: 'Reencauche' },
                  ]}
                />
              </Field>
              <Field label="Segmento">
                <Input value={sku.segmento ?? ''} onChange={(v) => set('segmento', v)} />
              </Field>
              <Field label="Tipo">
                <Input
                  value={sku.tipo ?? ''}
                  onChange={(v) => set('tipo', v)}
                  placeholder="Radial / Convencional"
                />
              </Field>
              <Field label="Construcción">
                <Input
                  value={sku.construccion ?? ''}
                  onChange={(v) => set('construccion', v)}
                  placeholder="Acero / Nylon"
                />
              </Field>
              <Field label="Fuente">
                <Input value={sku.fuente ?? ''} onChange={(v) => set('fuente', v)} />
              </Field>
              <Field label="URL" full>
                <Input value={sku.url ?? ''} onChange={(v) => set('url', v)} />
              </Field>
              <Field label="Notas Colombia" full>
                <textarea
                  value={sku.notasColombia ?? ''}
                  onChange={(e) => set('notasColombia', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0A183A]/40 border border-[#173D68]/30 rounded-lg text-white focus:outline-none focus:border-[#348CCB] transition-colors resize-none"
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
              {isNew ? 'Crear SKU' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
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
  return <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'md:col-span-2 lg:col-span-3' : ''}>
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
  step,
}: {
  value: string | number
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  step?: string
}) {
  return (
    <input
      type={type}
      step={step}
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
