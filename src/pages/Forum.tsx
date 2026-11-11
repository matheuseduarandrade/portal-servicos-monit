import { useMemo, useState } from 'react'

import { useNavigate, useSearchParams } from 'react-router-dom'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { Search, Plus, Pencil, Trash2, Loader2, FileText, MessageSquare, BookOpen, ChevronRight, BookMarked, Trophy, ExternalLink } from 'lucide-react'

import { PageHeader, Card, Badge, Input, Button } from '@/components/ui/primitives'

import { Dialog } from '@/components/ui/dialog'

import { useAuth, canManage } from '@/contexts/AuthContext'

import { formatDate, timeAgo } from '@/lib/utils'

import { UserAvatar } from '@/components/forum/UserAvatar'

import { ManualEditorDialog } from '@/components/biblioteca/ManualEditorDialog'

import { linkDoManual } from '@/lib/drive'

import { excluirManual } from '@/services/biblioteca'

import { fetchForum, fetchContribuidores, type ManualForum } from '@/services/forum'

const ABAS = [

  { id: 'Todos',            label: 'Todos os Manuais' },

  { id: 'Manuais Sistemas', label: 'Sistemas' },

  { id: 'Manuais Gerais',   label: 'Gerais' },

  { id: 'Configurações',    label: 'Configurações' },

  { id: 'Comandos',         label: 'Comandos' },

  { id: 'Homologações',     label: 'Homologações' },
  { id: 'Procedimentos',    label: 'Procedimentos' },

]

const tagsDe = (m: ManualForum) => {

  const t = (m.tags ?? '').split(',').map((x) => x.trim()).filter(Boolean)

  return t.length ? t : [m.categoria]

}

export default function Forum() {

  const { user } = useAuth()

  const admin = canManage(user)

  const navigate = useNavigate()

  const qc = useQueryClient()

  const [params] = useSearchParams()

  const [aba, setAba] = useState(params.get('aba') ?? 'Todos')

  const [busca, setBusca] = useState(params.get('q') ?? '')

  const [editando, setEditando] = useState<ManualForum | null>(null)

  const [adicionando, setAdicionando] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<ManualForum | null>(null)

  const { data: manuais = [], isLoading, isError, error } = useQuery({ queryKey: ['forum'], queryFn: () => fetchForum() })

  const { data: contribuidores = [] } = useQuery({ queryKey: ['forum-contribuidores'], queryFn: fetchContribuidores })

  const invalidate = () => {

    qc.invalidateQueries({ queryKey: ['forum'] })

    qc.invalidateQueries({ queryKey: ['forum-manual'] })

  }

  const mutExcluir = useMutation({ mutationFn: excluirManual, onSuccess: invalidate })

  const filtrados = useMemo(() => {

    const q = busca.trim().toLowerCase()

    return manuais.filter((m) => {

      if (aba !== 'Todos' && m.categoria !== aba) return false

      if (!q) return true

      return `${m.titulo} ${m.descricao} ${m.tags ?? ''}`.toLowerCase().includes(q)

    })

  }, [manuais, aba, busca])

  const destaque = useMemo(() => {

    const daAba = aba === 'Todos'
      ? manuais
      : manuais.filter((m) => m.categoria === aba)

    return [...daAba].sort(
      (a, b) => (b.topicos + b.respostas) - (a.topicos + a.respostas),
    )[0]

  }, [manuais, aba])

  return (

    <div>

      <PageHeader

        title="Fórum da Biblioteca"

        subtitle="Tire dúvidas, compartilhe experiências e acesse os manuais de forma colaborativa."

        action={

          <div className="flex flex-wrap items-center gap-3">

            <div className="relative w-64">

              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <Input placeholder="Pesquisar manuais..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />

            </div>

            {admin && (

              <Button onClick={() => { setEditando(null); setAdicionando(true) }}>

                <Plus size={15} /> Publicar manual

              </Button>

            )}

          </div>

        }

      />

      {/* Abas por categoria */}

      <div className="flex flex-wrap gap-2 mb-6">

        {ABAS.map((a) => (

          <button

            key={a.id}

            onClick={() => setAba(a.id)}

            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${

              aba === a.id

                ? 'bg-brand-600 text-white border-brand-600'

                : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-brand-400'

            }`}

          >

            {a.label}

          </button>

        ))}

      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* ── Lista de manuais ── */}

          <div>

            {isLoading ? (

              <div className="flex justify-center py-16 text-slate-400"><Loader2 size={20} className="animate-spin mr-2" /> Carregando...</div>

            ) : isError ? (

              <div className="text-center py-16 text-sm">

                <p className="text-red-500 font-medium">Não foi possível carregar o fórum.</p>

                <p className="text-slate-400 mt-1 max-w-md mx-auto">{error instanceof Error ? error.message : ''}</p>

              </div>

            ) : filtrados.length === 0 ? (

              <div className="text-center py-16 text-slate-400">

                <FileText size={36} className="mx-auto mb-3 opacity-30" />

                <p className="text-sm">Nenhum manual encontrado.</p>

                {admin && <p className="text-xs mt-1 text-brand-500">Clique em "Publicar manual" para adicionar.</p>}

              </div>

            ) : (

              <div className="grid md:grid-cols-2 gap-4">

                {filtrados.map((m) => (

                  <div key={m.id} className="relative group">

                    <Card className="h-full flex flex-col hover:shadow-popover transition-shadow">

                      <div className="flex items-start gap-3">

                        <div className="h-11 w-11 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 shrink-0">

                          <FileText size={20} />

                        </div>

                        <div className="min-w-0 flex-1">

                          <button onClick={() => navigate(`/biblioteca/${m.id}`)} className="text-left">

                            <h3 className="font-display font-semibold text-sm text-ink-900 dark:text-white hover:text-brand-600 line-clamp-1">{m.titulo}</h3>

                          </button>

                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{m.descricao}</p>

                          <div className="flex flex-wrap gap-1.5 mt-2">

                            {tagsDe(m).map((t) => <Badge key={t} tone="info">{t}</Badge>)}

                            {m.quiz_disponivel && <Badge tone="success">Quiz disponível</Badge>}

                          </div>

                        </div>

                      </div>

                      <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">

                        <MessageSquare size={12} />

                        <span>{m.topicos} {m.topicos === 1 ? 'tópico' : 'tópicos'}</span>

                        <span>•</span>

                        <span>Última atividade: {formatDate(m.ultima_atividade)}</span>

                      </div>

                      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex-1 min-h-[52px]">

                        {m.ultimo_comentario ? (

                          <div className="flex items-start gap-2">

                            <UserAvatar nome={m.ultimo_comentario.autor.nome} fotoUrl={m.ultimo_comentario.autor.foto_url} size={26} />

                            <div className="min-w-0 flex-1">

                              <div className="flex items-center justify-between gap-2">

                                <span className="text-xs font-semibold text-ink-900 dark:text-white truncate">{m.ultimo_comentario.autor.nome}</span>

                                <span className="text-[11px] text-slate-400 shrink-0">{timeAgo(m.ultimo_comentario.criado_em)}</span>

                              </div>

                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{m.ultimo_comentario.texto}</p>

                            </div>

                          </div>

                        ) : (

                          <p className="text-xs text-slate-400 italic">Nenhuma discussão ainda. Seja o primeiro a perguntar!</p>

                        )}

                      </div>

                      <div className="mt-3 flex gap-2">

                        {m.quiz_disponivel && (

                          <Button size="sm" className="flex-1 justify-center" onClick={() => navigate(`/quiz?trilha=${m.trilha_id}`)}>

                            <Trophy size={14} /> Quiz

                          </Button>

                        )}

                        <Button variant="outline" size="sm" className="flex-1 justify-center" onClick={() => navigate(`/biblioteca/${m.id}`)}>

                          <MessageSquare size={14} /> Ver Fórum

                        </Button>

                      </div>

                    </Card>

                    {admin && (

                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">

                        <button onClick={() => { setEditando(m); setAdicionando(false) }} title="Editar"

                          className="p-1.5 rounded-lg bg-white dark:bg-surface-darkCard border border-black/10 dark:border-white/10 text-slate-500 hover:text-brand-600 shadow-sm">

                          <Pencil size={12} />

                        </button>

                        <button onClick={() => setConfirmDelete(m)} title="Excluir"

                          className="p-1.5 rounded-lg bg-white dark:bg-surface-darkCard border border-black/10 dark:border-white/10 text-slate-500 hover:text-red-500 shadow-sm">

                          <Trash2 size={12} />

                        </button>

                      </div>

                    )}

                  </div>

                ))}

              </div>

            )}

          </div>

          {/* ── Coluna lateral ── */}

          <div className="space-y-6">

            {destaque && (

              <Card>

                <h3 className="font-display font-semibold text-sm flex items-center gap-2 mb-3">

                  <BookMarked size={15} className="text-brand-600" /> Manual em Destaque

                </h3>

                <div className="rounded-xl bg-brand-600 text-white p-4">

                  <p className="font-semibold text-sm">{destaque.titulo}</p>

                  <p className="text-xs text-white/80 mt-1 line-clamp-2">{destaque.descricao}</p>

                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">

                  {destaque.topicos} {destaque.topicos === 1 ? 'tópico' : 'tópicos'} e {destaque.respostas} {destaque.respostas === 1 ? 'resposta' : 'respostas'} na discussão.

                </p>

                <div className="space-y-2 mt-3">

                  <Button className="w-full justify-center" onClick={() => navigate(`/biblioteca/${destaque.id}`)}>

                    <BookOpen size={14} /> Ler o manual

                  </Button>

                  {linkDoManual(destaque) && (

                    <Button variant="outline" className="w-full justify-center" onClick={() => window.open(linkDoManual(destaque)!, '_blank', 'noopener,noreferrer')}>

                      <ExternalLink size={14} /> Ver Manual Completo

                    </Button>

                  )}

                  {destaque.quiz_disponivel && (

                    <Button variant="outline" className="w-full justify-center" onClick={() => navigate(`/quiz?trilha=${destaque.trilha_id}`)}>

                      <Trophy size={14} /> Fazer Quiz

                    </Button>

                  )}

                </div>

              </Card>

            )}

            <Card>

              <h3 className="font-display font-semibold text-sm mb-3">Top Contribuidores</h3>

              {contribuidores.length === 0 ? (

                <p className="text-xs text-slate-400">Ainda não há participações.</p>

              ) : (

                <div className="space-y-1">

                  {contribuidores.map((c) => (

                    <div key={c.id} className="flex items-center gap-3 rounded-lg px-1.5 py-2">

                      <UserAvatar nome={c.nome} fotoUrl={c.foto_url} size={34} />

                      <div className="min-w-0 flex-1">

                        <p className="text-sm font-medium text-ink-900 dark:text-white truncate">{c.nome}</p>

                        <p className="text-xs text-slate-400">{c.total} {c.total === 1 ? 'participação' : 'participações'}</p>

                      </div>

                      <ChevronRight size={14} className="text-slate-300" />

                    </div>

                  ))}

                </div>

              )}

            </Card>

          </div>

        </div>

      {/* Publicar / editar manual (admin) */}

      <ManualEditorDialog

        open={adicionando || !!editando}

        manual={editando}

        onClose={() => { setEditando(null); setAdicionando(false) }}

      />

      {/* Confirmação de exclusão */}

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)} title="Excluir manual" size="sm">

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">

          Tem certeza que deseja excluir <strong>{confirmDelete?.titulo}</strong>? Os comentários deste manual deixam de ser exibidos.

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
