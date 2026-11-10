import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, Pencil, Trash2, Boxes, Loader2, MessageSquare } from 'lucide-react'
import { PageHeader, Card, Badge, Button, Input } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { useAuth, canManage } from '@/contexts/AuthContext'
import { fetchSistemas, criarSistema, atualizarSistema, removerSistema } from '@/services/sistemas'
import { fetchManuais } from '@/services/biblioteca'
import type { SistemaInterno } from '@/types'

const NOVO: SistemaInterno = { id: 'novo', nome: '', descricao: '', finalidade: '', manual: '', tem_manual: false }

export default function Sistemas() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const admin = canManage(user)

  const [selected, setSelected] = useState<SistemaInterno | null>(null)
  const [editando, setEditando] = useState<SistemaInterno | null>(null)
  const [adicionando, setAdicionando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<SistemaInterno | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const { data: sistemas = [], isLoading, isError } = useQuery({ queryKey: ['sistemas'], queryFn: fetchSistemas })

  // vindo da busca: abre o sistema indicado
  const [params] = useSearchParams()
  const abriu = useRef<string | null>(null)
  useEffect(() => {
    const alvo = params.get('abrir')
    if (alvo && abriu.current !== alvo && sistemas.length) {
      const s = sistemas.find((x) => x.id === alvo)
      if (s) { abriu.current = alvo; setSelected(s) }
    }
  }, [params, sistemas])
  const { data: manuais = [] } = useQuery({
    queryKey: ['biblioteca-manuais-todos'],
    queryFn: () => fetchManuais(),
    enabled: admin,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['sistemas'] })
  const fechar = () => { setEditando(null); setAdicionando(false); setErro(null) }
  const onError = (e: unknown) => setErro(e instanceof Error ? e.message : 'Erro ao salvar.')

  const mutCriar = useMutation({ mutationFn: criarSistema, onSuccess: () => { invalidate(); fechar() }, onError })
  const mutAtualizar = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Omit<SistemaInterno, 'id'> }) => atualizarSistema(id, payload),
    onSuccess: () => { invalidate(); fechar() },
    onError,
  })
  const mutRemover = useMutation({ mutationFn: removerSistema, onSuccess: invalidate })

  function salvar(dados: SistemaInterno) {
    setErro(null)
    const { id, ...payload } = dados
    if (adicionando) mutCriar.mutate(payload)
    else if (editando) mutAtualizar.mutate({ id: editando.id, payload })
  }

  function excluir(id: string) {
    mutRemover.mutate(id, {
      onSuccess: () => {
        setConfirmDelete(null)
        if (selected?.id === id) setSelected(null)
      },
    })
  }

  const manualDe = (s: SistemaInterno) => manuais.find((m) => m.id === s.manual)

  if (isLoading) {
    return <div className="flex items-center justify-center py-32 text-slate-400"><Loader2 size={24} className="animate-spin mr-2" /> Carregando sistemas…</div>
  }
  if (isError) {
    return <div className="flex items-center justify-center py-32 text-red-400">Erro ao carregar sistemas.</div>
  }

  return (
    <div>
      <PageHeader
        title="Sistemas"
        subtitle="Todos os sistemas utilizados pela equipe de Serviços, em um só lugar."
        action={admin && (
          <Button onClick={() => { setEditando({ ...NOVO }); setAdicionando(true); setErro(null) }}>
            <Plus size={15} /> Cadastrar sistema
          </Button>
        )}
      />

      {sistemas.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Boxes size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum sistema cadastrado.</p>
          {admin && <p className="text-xs mt-1 text-brand-500">Clique em "Cadastrar sistema" para começar.</p>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sistemas.map((s) => (
            <div key={s.id} className="relative group">
              <button onClick={() => setSelected(s)} className="w-full text-left">
                <Card className="h-full hover:-translate-y-0.5 hover:shadow-popover transition-all">
                  <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-300">
                    <Boxes size={18} />
                  </div>
                  <h3 className="font-display font-semibold text-base text-ink-900 dark:text-white mt-3">{s.nome}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{s.descricao}</p>
                  {s.tem_manual && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-brand-500">
                      <BookOpen size={12} /> Manual e fórum disponíveis
                    </div>
                  )}
                </Card>
              </button>
              {admin && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setEditando(s); setAdicionando(false); setErro(null) }} title="Editar"
                    className="p-1.5 rounded-lg bg-white dark:bg-surface-darkCard border border-black/10 dark:border-white/10 text-slate-500 hover:text-brand-600 shadow-sm">
                    <Pencil size={13} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(s) }} title="Excluir"
                    className="p-1.5 rounded-lg bg-white dark:bg-surface-darkCard border border-black/10 dark:border-white/10 text-slate-500 hover:text-red-500 shadow-sm">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Detalhe do sistema ── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={selected?.nome ?? ''} description={selected?.descricao}>
        {selected && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Finalidade</p>
              <p className="text-sm text-ink-900 dark:text-white whitespace-pre-wrap">{selected.finalidade}</p>
            </div>

            {selected.tem_manual && selected.manual ? (
              <div className="rounded-lg border border-brand-100 dark:border-brand-500/20 p-3 bg-brand-50 dark:bg-brand-500/5">
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-brand-600" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Manual e fórum</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">Leia o manual e tire dúvidas com a equipe.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 dark:border-white/10 p-3 text-center">
                <p className="text-xs text-slate-400">Este sistema ainda não tem manual cadastrado.</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {selected.tem_manual && selected.manual && (
                <Button onClick={() => navigate(`/biblioteca/${selected.manual}`)}>
                  <MessageSquare size={15} /> Abrir manual e fórum
                </Button>
              )}
              {admin && (
                <Button variant="outline" onClick={() => { setEditando(selected); setAdicionando(false); setSelected(null); setErro(null) }}>
                  <Pencil size={15} /> Editar
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Cadastro / edição ── */}
      <Dialog
        open={!!editando}
        onOpenChange={(o) => !o && fechar()}
        title={adicionando ? 'Cadastrar sistema' : `Editar — ${editando?.nome}`}
        size="md"
      >
        {editando && (
          <SistemaForm
            initial={editando}
            manuais={manuais.map((m) => ({ id: m.id, titulo: m.titulo }))}
            nomeManualAtual={manualDe(editando)?.titulo}
            loading={mutCriar.isPending || mutAtualizar.isPending}
            erro={erro}
            onSave={salvar}
            onCancel={fechar}
          />
        )}
      </Dialog>

      {/* ── Confirmação de exclusão ── */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)} title="Excluir sistema" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Tem certeza que deseja remover <strong>{confirmDelete?.nome}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={mutRemover.isPending}
            onClick={() => confirmDelete && excluir(confirmDelete.id)}>
            {mutRemover.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

// ── Formulário: nome, descrição rápida, finalidade e "tem manual/fórum" ─────
function SistemaForm({ initial, manuais, nomeManualAtual, loading, erro, onSave, onCancel }: {
  initial: SistemaInterno
  manuais: { id: string; titulo: string }[]
  nomeManualAtual?: string
  loading: boolean
  erro: string | null
  onSave: (d: SistemaInterno) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<SistemaInterno>({ ...initial, tem_manual: !!initial.tem_manual })
  const valido = form.nome.trim() && form.descricao.trim() && form.finalidade.trim()
  const semManuais = manuais.length === 0

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Nome</label>
        <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Trix" />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Descrição rápida</label>
        <Input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Uma frase sobre o sistema" />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Finalidade</label>
        <textarea
          value={form.finalidade}
          onChange={(e) => setForm((f) => ({ ...f, finalidade: e.target.value }))}
          rows={3}
          className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm"
          placeholder="Para que o sistema é usado"
        />
      </div>

      <div className="rounded-lg border border-brand-100 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-500/5 p-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.tem_manual}
            onChange={(e) => setForm((f) => ({ ...f, tem_manual: e.target.checked, manual: e.target.checked ? f.manual : '' }))}
            className="h-4 w-4 accent-brand-600"
          />
          <span className="text-sm font-medium text-ink-900 dark:text-white">Possui manual/fórum cadastrado</span>
        </label>

        {form.tem_manual && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Manual do Fórum</label>
            <select
              value={form.manual}
              onChange={(e) => setForm((f) => ({ ...f, manual: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm"
            >
              <option value="">{semManuais ? 'Nenhum manual publicado ainda' : 'Selecione o manual...'}</option>
              {manuais.map((m) => <option key={m.id} value={m.id}>{m.titulo}</option>)}
              {form.manual && !manuais.some((m) => m.id === form.manual) && (
                <option value={form.manual}>{nomeManualAtual ?? 'Manual atual'}</option>
              )}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">
              Publique o manual antes na aba Biblioteca (Fórum) para poder vinculá-lo aqui.
            </p>
          </div>
        )}
      </div>

      {erro && <p className="text-xs text-red-500">{erro}</p>}

      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave({ ...form, nome: form.nome.trim(), descricao: form.descricao.trim(), finalidade: form.finalidade.trim() })} disabled={loading || !valido}>
          {loading && <Loader2 size={14} className="animate-spin" />} Salvar
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
      </div>
    </div>
  )
}
