import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Plus, Pencil, Trash2, Loader2, ExternalLink, FileText, Car, X,
} from 'lucide-react'
import { Card, Badge, Input, Button } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { useAuth, canManage } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'
import {
  fetchHomologacoes, criarHomologacao, atualizarHomologacao, excluirHomologacao,
  type DocBiblioteca,
} from '@/services/biblioteca'

// ── Categorias ────────────────────────────────────────────────────────────────
export const CATS_MANUAIS = ['Manuais Sistemas', 'Manuais Gerais', 'Configurações', 'Comandos']
export const CATS_HOMOLOGACAO = ['Caminhões', 'Ônibus', 'Máquinas', 'Veículos Leves', 'Equipamentos Especiais']

const TONE: Record<string, string> = {
  'Manuais Sistemas': 'info',
  'Manuais Gerais':   'default',
  'Configurações':    'warning',
  'Comandos':         'danger',
  'Homologações':     'success',
}

// ── Visualizador de PDF ───────────────────────────────────────────────────────
export function VisualizadorPDF({ doc, onClose }: { doc: DocBiblioteca; onClose: () => void }) {
  const driveId = doc.drive_file_id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-surface-darkCard rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-black/5 dark:border-white/10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge tone={TONE[doc.categoria] as any}>{doc.categoria}</Badge>
            </div>
            <h2 className="font-display font-semibold text-lg text-ink-900 dark:text-white truncate">{doc.titulo}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{doc.descricao}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-400">
              {doc.autor && <span>Autor: <strong className="text-slate-600 dark:text-slate-300">{doc.autor}</strong></span>}
              {doc.atualizado_em && <span>Atualizado em: <strong className="text-slate-600 dark:text-slate-300">{formatDate(doc.atualizado_em)}</strong></span>}
              {doc.marca && <span>Veículo: <strong className="text-slate-600 dark:text-slate-300">{doc.marca} {doc.modelo} {doc.ano}</strong></span>}
              {doc.sistema_nome && <span>Sistema: <strong className="text-slate-600 dark:text-slate-300">{doc.sistema_nome}</strong></span>}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {driveId && (
              <a
                href={`https://drive.google.com/file/d/${driveId}/view`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <ExternalLink size={13} /> Abrir no Drive
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Visualizador */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-900 min-h-[400px]">
          {driveId ? (
            <iframe
              src={`https://drive.google.com/file/d/${driveId}/preview`}
              className="w-full h-full min-h-[400px] border-0"
              allow="autoplay"
              title={doc.titulo}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400 gap-3">
              <FileText size={40} className="opacity-40" />
              <p className="text-sm">Nenhum PDF vinculado a este documento.</p>
              <p className="text-xs text-slate-400">Edite o documento e informe o ID do arquivo no Drive.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ── Card de documento ─────────────────────────────────────────────────────────
function DocCard({
  doc, admin, onOpen, onEdit, onDelete,
}: {
  doc: DocBiblioteca
  admin: boolean
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="relative group">
      <button onClick={onOpen} className="w-full text-left">
        <Card className="h-full hover:-translate-y-0.5 hover:shadow-popover transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="h-9 w-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600">
              <FileText size={16} />
            </div>
            <Badge tone={TONE[doc.categoria] as any}>{doc.categoria}</Badge>
          </div>
          <h3 className="font-display font-semibold text-sm text-ink-900 dark:text-white line-clamp-2">{doc.titulo}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{doc.descricao}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5 text-xs text-slate-400">
            <span>{doc.autor}</span>
            <span>{doc.atualizado_em ? formatDate(doc.atualizado_em) : ''}</span>
          </div>
          {doc.drive_file_id && (
            <div className="mt-2 flex items-center gap-1 text-xs text-brand-500">
              <FileText size={11} /> PDF vinculado
            </div>
          )}
          {doc.sistema_nome && (
            <div className="mt-1 text-xs text-slate-400">Sistema: {doc.sistema_nome}</div>
          )}
        </Card>
      </button>
      {admin && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="p-1.5 rounded-lg bg-white dark:bg-surface-darkCard border border-black/10 dark:border-white/10 text-slate-500 hover:text-brand-600 shadow-sm"
            title="Editar">
            <Pencil size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-lg bg-white dark:bg-surface-darkCard border border-black/10 dark:border-white/10 text-slate-500 hover:text-red-500 shadow-sm"
            title="Excluir">
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Formulário de documento ───────────────────────────────────────────────────
export function DocForm({
  initial, categorias, loading, onSave, onCancel,
}: {
  initial: Partial<DocBiblioteca>
  categorias: string[]
  loading: boolean
  onSave: (d: Partial<DocBiblioteca>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({ ...initial })
  const set = (k: keyof DocBiblioteca, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Título</label>
        <Input value={form.titulo ?? ''} onChange={e => set('titulo', e.target.value)} placeholder="Título do documento" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
        <textarea value={form.descricao ?? ''} onChange={e => set('descricao', e.target.value)} rows={2}
          className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
          <select value={form.categoria ?? categorias[0]} onChange={e => set('categoria', e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
            {categorias.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Autor</label>
          <Input value={form.autor ?? ''} onChange={e => set('autor', e.target.value)} placeholder="Nome do autor" />
        </div>
      </div>

      {/* Tags (só manuais do Fórum) */}
      {categorias[0] !== CATS_HOMOLOGACAO[0] && (
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tags <span className="text-slate-300">(separe por vírgula)</span></label>
          <Input value={form.tags ?? ''} onChange={e => set('tags', e.target.value)} placeholder="Ex: Sistemas, Atendimentos" />
        </div>
      )}

      {/* Campos extra para Homologações */}
      {categorias[0] === CATS_HOMOLOGACAO[0] && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Marca</label>
            <Input value={(form as any).marca ?? ''} onChange={e => set('marca' as any, e.target.value)} placeholder="Ex: Volvo" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Modelo</label>
            <Input value={(form as any).modelo ?? ''} onChange={e => set('modelo' as any, e.target.value)} placeholder="Ex: FH 540" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Ano</label>
            <Input type="number" value={(form as any).ano ?? new Date().getFullYear()} onChange={e => set('ano' as any, Number(e.target.value))} />
          </div>
        </div>
      )}

      {/* Drive File ID */}
      <div className="rounded-lg border border-brand-100 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-brand-600" />
          <p className="text-xs font-semibold text-brand-700 dark:text-brand-400 uppercase tracking-wide">PDF no Google Drive</p>
        </div>
        <Input
          value={form.drive_file_id ?? ''}
          onChange={e => set('drive_file_id', e.target.value)}
          placeholder="ID do arquivo no Drive (ex: 1BxiMVs0XRA5n...)"
        />
        <p className="text-xs text-slate-400">
          URL do Drive: drive.google.com/file/d/<strong className="text-brand-600">ID_AQUI</strong>/view
        </p>
        {form.drive_file_id && (
          <a href={`https://drive.google.com/file/d/${form.drive_file_id}/view`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
            <ExternalLink size={11} /> Verificar arquivo
          </a>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)} disabled={loading}>
          {loading && <Loader2 size={14} className="animate-spin" />} Salvar
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
      </div>
    </div>
  )
}

// ── Tab de Homologações ───────────────────────────────────────────────────────
export function HomologacoesTab({ buscaInicial = '' }: { buscaInicial?: string }) {
  const { user } = useAuth()
  const admin = canManage(user)
  const qc = useQueryClient()

  const [busca, setBusca] = useState(buscaInicial)
  const [catFiltro, setCatFiltro] = useState('Todos')
  const [aberto, setAberto] = useState<DocBiblioteca | null>(null)
  const [editando, setEditando] = useState<Partial<DocBiblioteca> | null>(null)
  const [adicionando, setAdicionando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<DocBiblioteca | null>(null)

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['biblioteca-homologacoes'],
    queryFn: () => fetchHomologacoes(),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['biblioteca-homologacoes'] })
  const mutCriar    = useMutation({ mutationFn: criarHomologacao, onSuccess: invalidate })
  const mutAtualizar = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Partial<DocBiblioteca> }) => atualizarHomologacao(id, payload), onSuccess: invalidate })
  const mutExcluir  = useMutation({ mutationFn: excluirHomologacao, onSuccess: invalidate })

  const filtrados = useMemo(() =>
    docs.filter(d => {
      const matchBusca = `${d.titulo} ${d.marca} ${d.modelo}`.toLowerCase().includes(busca.toLowerCase())
      const matchCat = catFiltro === 'Todos' || d.categoria === catFiltro
      return matchBusca && matchCat
    }),
    [docs, busca, catFiltro]
  )

  const agrupados = useMemo(() => {
    const grp: Record<string, DocBiblioteca[]> = {}
    filtrados.forEach(d => { if (!grp[d.categoria]) grp[d.categoria] = []; grp[d.categoria].push(d) })
    return grp
  }, [filtrados])

  function salvar(dados: Partial<DocBiblioteca>) {
    const payload = { ...dados, descricao: dados.descricao ?? '', atualizado_em: new Date().toISOString().split('T')[0] }
    if (adicionando) {
      mutCriar.mutate(payload as any, { onSuccess: () => { setAdicionando(false); setEditando(null) } })
    } else if (editando?.id) {
      mutAtualizar.mutate({ id: editando.id as string, payload }, { onSuccess: () => { setAdicionando(false); setEditando(null) } })
    }
  }

  const novoDoc: Partial<DocBiblioteca> = { titulo: '', descricao: '', categoria: CATS_HOMOLOGACAO[0], autor: 'Queonetics', drive_file_id: '', marca: '', modelo: '', ano: new Date().getFullYear() }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Pesquisar marca, modelo..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
          <option value="Todos">Todas as categorias</option>
          {CATS_HOMOLOGACAO.map(c => <option key={c}>{c}</option>)}
        </select>
        {admin && (
          <Button onClick={() => { setAdicionando(true); setEditando(novoDoc) }}>
            <Plus size={15} /> Publicar documento
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 size={20} className="animate-spin mr-2" /> Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Car size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma homologação publicada.</p>
        </div>
      ) : (
        Object.entries(agrupados).map(([cat, items]) => (
          <div key={cat} className="mb-8">
            <h3 className="font-display font-semibold text-sm text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-black/5 dark:bg-white/10" />
              {cat} ({items.length})
              <span className="h-px flex-1 bg-black/5 dark:bg-white/10" />
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map(doc => (
                <DocCard key={doc.id} doc={doc} admin={admin}
                  onOpen={() => setAberto(doc)}
                  onEdit={() => { setEditando(doc); setAdicionando(false) }}
                  onDelete={() => setConfirmDelete(doc)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {aberto && <VisualizadorPDF doc={aberto} onClose={() => setAberto(null)} />}

      <Dialog open={!!editando} onOpenChange={o => !o && (setEditando(null), setAdicionando(false))}
        title={adicionando ? 'Publicar Homologação' : `Editar — ${editando?.titulo}`} size="md">
        {editando && (
          <DocForm initial={editando} categorias={CATS_HOMOLOGACAO}
            loading={mutCriar.isPending || mutAtualizar.isPending}
            onSave={salvar} onCancel={() => { setEditando(null); setAdicionando(false) }} />
        )}
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)} title="Excluir homologação" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Tem certeza que deseja excluir <strong>{confirmDelete?.titulo}</strong>?
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={mutExcluir.isPending}
            onClick={() => confirmDelete && mutExcluir.mutate(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) })}>
            {mutExcluir.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

