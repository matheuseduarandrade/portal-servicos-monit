import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, Loader2, UserCheck, UserX } from 'lucide-react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { PageHeader, Card, Kpi, Input, Select, Button, Badge } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { useAuth, canManage } from '@/contexts/AuthContext'
import { fetchTecnicos, fetchKpis, criarTecnico, atualizarTecnico, excluirTecnico } from '@/services/tecnicos'
import type { Tecnico } from '@/types'

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

const UF_TO_NOME: Record<string, string> = {
  AC:'Acre', AL:'Alagoas', AP:'Amapá', AM:'Amazonas', BA:'Bahia', CE:'Ceará',
  DF:'Distrito Federal', ES:'Espírito Santo', GO:'Goiás', MA:'Maranhão',
  MT:'Mato Grosso', MS:'Mato Grosso do Sul', MG:'Minas Gerais', PA:'Pará',
  PB:'Paraíba', PR:'Paraná', PE:'Pernambuco', PI:'Piauí', RJ:'Rio de Janeiro',
  RN:'Rio Grande do Norte', RS:'Rio Grande do Sul', RO:'Rondônia', RR:'Roraima',
  SC:'Santa Catarina', SP:'São Paulo', SE:'Sergipe', TO:'Tocantins',
}

export default function Tecnicos() {
  const { user } = useAuth()
  const admin = canManage(user)
  const qc = useQueryClient()

  const [busca, setBusca] = useState('')
  const [estado, setEstado] = useState('Todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos')
  const [geoData, setGeoData] = useState<any>(null)
  const [editando, setEditando] = useState<Tecnico | null>(null)
  const [adicionando, setAdicionando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Tecnico | null>(null)

  useEffect(() => {
    fetch('/brazil-states.geojson').then(r => r.json()).then(setGeoData).catch(console.error)
  }, [])

  // ── Busca todos (ativos + inativos) e filtra no frontend
  const { data: todosTecnicos = [], isLoading } = useQuery({
    queryKey: ['tecnicos-all'],
    queryFn: () => fetchTecnicos(),
  })

  const { data: kpis } = useQuery({
    queryKey: ['tecnicos-kpis'],
    queryFn: fetchKpis,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tecnicos-all'] })
    qc.invalidateQueries({ queryKey: ['tecnicos-kpis'] })
  }

  const mutCriar    = useMutation({ mutationFn: criarTecnico, onSuccess: invalidate })
  const mutAtualizar = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<Tecnico, 'id'>> }) =>
      atualizarTecnico(id, payload),
    onSuccess: invalidate,
  })
  const mutExcluir  = useMutation({ mutationFn: excluirTecnico, onSuccess: invalidate })

  // ── Filtros
  const filtrados = useMemo(() => {
    return todosTecnicos.filter((t) => {
      const matchBusca = `${t.nome} ${t.empresa} ${t.estado} ${t.regiao}`.toLowerCase().includes(busca.toLowerCase())
      const matchEstado = estado === 'Todos' || t.estado === estado
      const matchStatus = filtroStatus === 'todos' || (filtroStatus === 'ativos' ? t.ativo : !t.ativo)
      return matchBusca && matchEstado && matchStatus
    })
  }, [todosTecnicos, busca, estado, filtroStatus])

  const ativos   = todosTecnicos.filter(t => t.ativo)
  const inativos = todosTecnicos.filter(t => !t.ativo)

  const porEstadoMap = useMemo(() => {
    const map: Record<string, number> = {}
    ativos.forEach((t) => (map[t.estado] = (map[t.estado] ?? 0) + 1))
    return map
  }, [ativos])

  const maxTecnicos = useMemo(() => Math.max(...Object.values(porEstadoMap), 1), [porEstadoMap])

  const getCorEstado = (uf: string) => {
    const q = porEstadoMap[uf] ?? 0
    if (q === 0) return '#E2E8F0'
    return `rgba(242, 121, 15, ${0.2 + (q / maxTecnicos) * 0.8})`
  }

  const estados = useMemo(() => ['Todos', ...ESTADOS_BR.filter(uf => porEstadoMap[uf])], [porEstadoMap])

  function toggleAtivo(t: Tecnico) {
    mutAtualizar.mutate({ id: t.id, payload: { ativo: !t.ativo } })
  }

  function salvar(dados: Omit<Tecnico, 'id'>) {
    if (adicionando) {
      mutCriar.mutate(dados, { onSuccess: () => { setAdicionando(false); setEditando(null) } })
    } else if (editando) {
      mutAtualizar.mutate({ id: editando.id, payload: dados }, {
        onSuccess: () => { setAdicionando(false); setEditando(null) },
      })
    }
  }

  return (
    <div>
      <PageHeader
        title="Técnicos"
        subtitle="Base nacional de técnicos credenciados."
        action={admin && (
          <Button onClick={() => { setAdicionando(true); setEditando({ id: '', nome: '', empresa: '', estado: 'SP', regiao: 'São Paulo', ativo: true }) }}>
            <Plus size={15} /> Adicionar técnico
          </Button>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Kpi label="Total ativos"         value={kpis?.total_ativos   ?? ativos.length} />
        <Kpi label="Inativos"             value={inativos.length}      tone={inativos.length ? 'warning' : 'default'} />
        <Kpi label="Empresas credenciadas" value={kpis?.total_empresas ?? 0} />
        <Kpi label="Estados atendidos"    value={kpis?.total_estados   ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 flex flex-col items-center p-4">
          <div className="w-full">
            <h3 className="font-display font-semibold text-sm mb-1">Cobertura nacional por estado</h3>
            <p className="text-xs text-slate-400 mb-4">Clique no estado para filtrar.</p>
          </div>
          <div className="w-full max-w-[450px] aspect-square flex items-center justify-center">
            {!geoData ? (
              <p className="text-xs text-slate-400 animate-pulse">Carregando mapa...</p>
            ) : (
              <ComposableMap projection="geoMercator" projectionConfig={{ scale: 1100, center: [-55, -15] }} style={{ width: '100%', height: '100%' }}>
                <Geographies geography={geoData}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies.map((geo: any) => {
                      const uf = geo.properties?.sigla || geo.properties?.UF_05 || geo.id
                      const isSelected = estado === uf
                      return (
                        <Geography
                          key={geo.rsmKey || geo.id}
                          geography={geo}
                          onClick={() => setEstado(estado === uf ? 'Todos' : uf)}
                          style={{
                            default: { fill: isSelected ? '#C25900' : getCorEstado(uf), stroke: '#fbfbfb', strokeWidth: 0.8, outline: 'none', transition: 'all 200ms' },
                            hover:   { fill: '#D26905', stroke: '#FFF', strokeWidth: 1.2, outline: 'none', cursor: 'pointer' },
                            pressed: { fill: '#A24900', outline: 'none' },
                          }}
                        />
                      )
                    })
                  }
                </Geographies>
              </ComposableMap>
            )}
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="font-display font-semibold text-sm mb-4">Distribuição por estado</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {Object.entries(porEstadoMap).sort((a, b) => b[1] - a[1]).map(([uf, qtd]) => (
                <div
                  key={uf}
                  onClick={() => setEstado(estado === uf ? 'Todos' : uf)}
                  className={`flex justify-between items-center text-xs p-2 rounded cursor-pointer transition-colors ${
                    estado === uf ? 'bg-orange-50 text-orange-700 font-semibold border border-orange-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: getCorEstado(uf) }} />
                    {UF_TO_NOME[uf] ?? uf}
                  </span>
                  <span className="text-slate-500 font-medium">{qtd} {qtd === 1 ? 'técnico' : 'técnicos'}</span>
                </div>
              ))}
            </div>
          </div>
          {estado !== 'Todos' && (
            <button onClick={() => setEstado('Todos')} className="mt-4 text-xs text-orange-600 font-medium hover:underline text-left">
              ✕ Limpar filtro ({UF_TO_NOME[estado] ?? estado})
            </button>
          )}
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Buscar por técnico, empresa, estado..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as 'todos' | 'ativos' | 'inativos')}
            className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm"
          >
            <option value="todos">Todos os status</option>
            <option value="ativos">Somente ativos</option>
            <option value="inativos">Somente inativos</option>
          </select>
          <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
            {estados.map((uf) => <option key={uf} value={uf}>{uf === 'Todos' ? 'Todos os estados' : `${uf} — ${UF_TO_NOME[uf] ?? uf}`}</option>)}
          </Select>

        </div>

        {isLoading ? (
          <div className="flex justify-center py-12 text-slate-400"><Loader2 size={20} className="animate-spin mr-2" /> Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-black/5 dark:border-white/10">
                  <th className="py-2 pr-4 font-medium">Empresa</th>
                  <th className="py-2 pr-4 font-medium">Técnico</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                  <th className="py-2 pr-4 font-medium">Região</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  {admin && <th className="py-2 font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((t) => (
                  <tr key={t.id} className={`border-b border-black/5 dark:border-white/5 last:border-0 group ${!t.ativo ? 'opacity-50' : ''}`}>
                    <td className="py-2.5 pr-4 text-ink-900 dark:text-white">{t.empresa}</td>
                    <td className="py-2.5 pr-4 font-medium text-ink-900 dark:text-white">{t.nome}</td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{UF_TO_NOME[t.estado] ?? t.estado}</td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{t.regiao}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={t.ativo ? 'success' : 'danger'}>{t.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    {admin && (
                      <td className="py-2.5">
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <button
                            onClick={() => toggleAtivo(t)}
                            className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 text-slate-400 hover:text-brand-600 shadow-sm"
                            title={t.ativo ? 'Desativar' : 'Ativar'}
                          >
                            {t.ativo ? <UserX size={13} /> : <UserCheck size={13} />}
                          </button>
                          <button
                            onClick={() => { setEditando(t); setAdicionando(false) }}
                            className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 text-slate-400 hover:text-brand-600 shadow-sm"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(t)}
                            className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 text-slate-400 hover:text-red-500 shadow-sm"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">Nenhum técnico encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal editar/adicionar */}
      <Dialog
        open={!!editando}
        onOpenChange={(o) => !o && (setEditando(null), setAdicionando(false))}
        title={adicionando ? 'Adicionar técnico' : `Editar — ${editando?.nome}`}
        size="sm"
      >
        {editando && (
          <TecnicoForm
            initial={editando}
            loading={mutCriar.isPending || mutAtualizar.isPending}
            onSave={salvar}
            onCancel={() => { setEditando(null); setAdicionando(false) }}
          />
        )}
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)} title="Excluir técnico" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Tem certeza que deseja excluir <strong>{confirmDelete?.nome}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={mutExcluir.isPending}
            onClick={() => confirmDelete && mutExcluir.mutate(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) })}
          >
            {mutExcluir.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function TecnicoForm({ initial, loading, onSave, onCancel }: {
  initial: Tecnico
  loading: boolean
  onSave: (d: Omit<Tecnico, 'id'>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({ ...initial })
  const set = (k: keyof Tecnico, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Nome do técnico</label>
        <Input value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Nome completo" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Empresa / Auto elétrica</label>
        <Input value={form.empresa} onChange={(e) => set('empresa', e.target.value)} placeholder="Nome da empresa" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Estado (UF)</label>
          <select value={form.estado} onChange={(e) => {
            set('estado', e.target.value)
            set('regiao', UF_TO_NOME[e.target.value] ?? e.target.value)
          }} className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
            {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
              <option key={uf} value={uf}>{uf} — {UF_TO_NOME[uf]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select value={form.ativo ? 'ativo' : 'inativo'} onChange={(e) => set('ativo', e.target.value === 'ativo')} className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave({ nome: form.nome, empresa: form.empresa, estado: form.estado, regiao: form.regiao, ativo: form.ativo })} disabled={loading}>
          {loading && <Loader2 size={14} className="animate-spin" />} Salvar
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
      </div>
    </div>
  )
}

