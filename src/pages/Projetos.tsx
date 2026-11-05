import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronUp, FolderKanban } from 'lucide-react'
import { PageHeader, Card, Badge, Kpi, Button, Input } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { useAuth, canManage } from '@/contexts/AuthContext'
import { fetchColaboradores } from '@/services/colaboradores'
import {
  fetchProjetos, criarProjeto, atualizarProjeto, removerProjeto,
  STATUS_PROJETO, type Projeto, type ProjetoInput, type StatusProjeto,
} from '@/services/projetos'

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  'Planejado':    'default',
  'Em andamento': 'info',
  'Concluído':    'success',
  'Atrasado':     'danger',
}

const VAZIO: ProjetoInput = {
  nome: '', responsavel_planejamento: '', responsavel_monitoramento: '', status: 'Planejado', percentual: 0,
}

export default function Projetos() {
  const { user } = useAuth()
  const admin = canManage(user)
  const qc = useQueryClient()

  const [editando, setEditando] = useState<Projeto | null>(null)
  const [adicionando, setAdicionando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Projeto | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const { data: projetos = [], isLoading, isError, error } = useQuery({ queryKey: ['projetos'], queryFn: fetchProjetos })
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores'], queryFn: () => fetchColaboradores(), enabled: admin })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['projetos'] })
  const fechar = () => { setEditando(null); setAdicionando(false); setErro(null) }
  const onError = (e: unknown) => setErro(e instanceof Error ? e.message : 'Erro ao salvar.')

  const mutCriar = useMutation({ mutationFn: criarProjeto, onSuccess: () => { invalidate(); fechar() }, onError })
  const mutAtualizar = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ProjetoInput> }) => atualizarProjeto(id, body),
    onSuccess: () => { invalidate(); fechar() },
    onError,
  })
  const mutRemover = useMutation({ mutationFn: removerProjeto, onSuccess: () => { invalidate(); setConfirmDelete(null) } })

  function salvar(dados: ProjetoInput) {
    setErro(null)
    if (adicionando) mutCriar.mutate(dados)
    else if (editando) mutAtualizar.mutate({ id: editando.id, body: dados })
  }

  const total = projetos.length
  const emAndamento = projetos.filter((p) => p.status === 'Em andamento').length
  const concluidos = projetos.filter((p) => p.status === 'Concluído').length
  const taxaConclusao = total ? Math.round(projetos.reduce((acc, p) => acc + p.percentual, 0) / total) : 0

  const ordenados = useMemo(
    () => [...projetos].sort((a, b) => (sortAsc ? a.percentual - b.percentual : b.percentual - a.percentual)),
    [projetos, sortAsc],
  )

  const nomesColaboradores = useMemo(
    () => [...new Set(colaboradores.filter((c) => c.aprovado).map((c) => c.nome_completo || c.nome))].sort(),
    [colaboradores],
  )

  if (isLoading) {
    return <div className="flex items-center justify-center py-32 text-slate-400"><Loader2 size={24} className="animate-spin mr-2" /> Carregando projetos…</div>
  }

  return (
    <div>
      <PageHeader
        title="Projetos"
        subtitle="Acompanhamento dos projetos da equipe de Serviços."
        action={admin && (
          <Button onClick={() => { setAdicionando(true); setEditando(null); setErro(null) }}>
            <Plus size={15} /> Cadastrar projeto
          </Button>
        )}
      />

      {isError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20 p-4 text-sm">
          <p className="font-medium text-red-600">Não foi possível carregar os projetos.</p>
          <p className="text-red-500/80 mt-1">{error instanceof Error ? error.message : ''}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Total de projetos" value={total} />
        <Kpi label="Em andamento" value={emAndamento} />
        <Kpi label="Concluídos" value={concluidos} tone="success" />
        <Kpi label="Média de conclusão" value={`${taxaConclusao}%`} />
      </div>

      <Card className="overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-sm">Todos os projetos</h3>
        </div>

        {total === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <FolderKanban size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum projeto cadastrado.</p>
            {admin && <p className="text-xs mt-1 text-brand-500">Clique em "Cadastrar projeto" para começar.</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-black/5 dark:border-white/10">
                <th className="py-2 pr-4 font-medium">Projeto</th>
                <th className="py-2 pr-4 font-medium">Resp. Planejamento</th>
                <th className="py-2 pr-4 font-medium">Resp. Monitoramento</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">
                  <button className="flex items-center gap-1 hover:text-brand-600 transition-colors" onClick={() => setSortAsc((v) => !v)}>
                    % Concluído {sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </th>
                {admin && <th className="py-2 font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {ordenados.map((p) => (
                <tr key={p.id} className="border-b border-black/5 dark:border-white/5 last:border-0 group">
                  <td className="py-2.5 pr-4 font-medium text-ink-900 dark:text-white">{p.nome}</td>
                  <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                    {p.responsavel_planejamento || <span className="text-slate-300 dark:text-slate-600 italic text-xs">não definido</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                    {p.responsavel_monitoramento || <span className="text-slate-300 dark:text-slate-600 italic text-xs">não definido</span>}
                  </td>
                  <td className="py-2.5 pr-4"><Badge tone={STATUS_TONE[p.status] ?? 'default'}>{p.status}</Badge></td>
                  <td className="py-2.5 pr-4 w-40">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(p.percentual, 100)}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 w-9 text-right">{Math.round(p.percentual)}%</span>
                    </div>
                  </td>
                  {admin && (
                    <td className="py-2.5 pl-2">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditando(p); setAdicionando(false); setErro(null) }} title="Editar"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete(p)} title="Excluir"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Cadastro / edição */}
      <Dialog
        open={adicionando || !!editando}
        onOpenChange={(o) => !o && fechar()}
        title={adicionando ? 'Cadastrar projeto' : `Editar — ${editando?.nome}`}
        size="md"
      >
        {(adicionando || editando) && (
          <ProjetoForm
            initial={editando ? {
              nome: editando.nome,
              responsavel_planejamento: editando.responsavel_planejamento ?? '',
              responsavel_monitoramento: editando.responsavel_monitoramento ?? '',
              status: editando.status,
              percentual: editando.percentual,
            } : VAZIO}
            nomes={nomesColaboradores}
            loading={mutCriar.isPending || mutAtualizar.isPending}
            erro={erro}
            onSave={salvar}
            onCancel={fechar}
          />
        )}
      </Dialog>

      {/* Exclusão */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)} title="Excluir projeto" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Tem certeza que deseja remover <strong>{confirmDelete?.nome}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={mutRemover.isPending}
            onClick={() => confirmDelete && mutRemover.mutate(confirmDelete.id)}>
            {mutRemover.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function ProjetoForm({ initial, nomes, loading, erro, onSave, onCancel }: {
  initial: ProjetoInput
  nomes: string[]
  loading: boolean
  erro: string | null
  onSave: (d: ProjetoInput) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<ProjetoInput>(initial)
  const set = <K extends keyof ProjetoInput>(k: K, v: ProjetoInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const pct = Math.max(0, Math.min(100, Number(form.percentual) || 0))

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Nome do projeto</label>
        <Input value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex: Migração do Trix" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Resp. Planejamento</label>
          <Input list="lista-resp" value={form.responsavel_planejamento ?? ''} onChange={(e) => set('responsavel_planejamento', e.target.value)} placeholder="Nome do responsável" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Resp. Monitoramento</label>
          <Input list="lista-resp" value={form.responsavel_monitoramento ?? ''} onChange={(e) => set('responsavel_monitoramento', e.target.value)} placeholder="Nome do responsável" />
        </div>
        <datalist id="lista-resp">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
      </div>
      <p className="text-xs text-slate-400 -mt-2">Pode escolher da lista de colaboradores ou digitar. Para mais de uma pessoa, separe os nomes com " | ".</p>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
        <select
          value={form.status}
          onChange={(e) => set('status', e.target.value as StatusProjeto)}
          className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm"
        >
          {STATUS_PROJETO.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Porcentagem concluída</label>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => set('percentual', Number(e.target.value))} className="flex-1 accent-brand-600" />
          <div className="flex items-center gap-1 w-24">
            <Input type="number" min={0} max={100} value={pct} onChange={(e) => set('percentual', Number(e.target.value))} />
            <span className="text-sm text-slate-400">%</span>
          </div>
        </div>
      </div>

      {erro && <p className="text-xs text-red-500">{erro}</p>}

      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave({ ...form, nome: form.nome.trim(), percentual: pct })} disabled={loading || !form.nome.trim()}>
          {loading && <Loader2 size={14} className="animate-spin" />} Salvar
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
      </div>
    </div>
  )
}
