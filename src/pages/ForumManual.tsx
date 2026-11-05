import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, ExternalLink, FileText, Heart, ListTree, Loader2, MessageSquare, Pencil, Reply, Trash2, Send, Trophy } from 'lucide-react'
import { Card, Badge, Button } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { UserAvatar } from '@/components/forum/UserAvatar'
import { Markdown, scrollParaId } from '@/components/markdown/Markdown'
import { ManualEditorDialog } from '@/components/biblioteca/ManualEditorDialog'
import { useAuth, canManage } from '@/contexts/AuthContext'
import { formatDate, timeAgo } from '@/lib/utils'
import { linkDoManual } from '@/lib/drive'
import { parseMarkdown, extractToc } from '@/lib/markdown'
import {
  fetchManualForum, fetchConteudoManual, fetchComentarios, comentar, curtir, excluirComentario,
  type ComentarioForum, type OrdemComentarios,
} from '@/services/forum'

const MAX = 2000

export default function ForumManual() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const admin = canManage(user)
  const qc = useQueryClient()

  const [ordem, setOrdem] = useState<OrdemComentarios>('recentes')
  const [texto, setTexto] = useState('')
  const [respondendo, setRespondendo] = useState<string | null>(null)
  const [textoResposta, setTextoResposta] = useState('')
  const [editorAberto, setEditorAberto] = useState(false)
  const [excluindo, setExcluindo] = useState<ComentarioForum | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const { data: manual, isLoading, isError } = useQuery({ queryKey: ['forum-manual', id], queryFn: () => fetchManualForum(id) })
  const { data: conteudo, isLoading: carregandoConteudo } = useQuery({
    queryKey: ['forum-conteudo', id],
    queryFn: () => fetchConteudoManual(id),
    enabled: !!manual?.tem_conteudo,
    staleTime: 60_000,
  })
  const blocos = useMemo(() => parseMarkdown(conteudo?.conteudo_md ?? ''), [conteudo?.conteudo_md])
  const toc = useMemo(() => extractToc(blocos), [blocos])
  const { data: topicos = [], isLoading: carregandoCom } = useQuery({
    queryKey: ['forum-comentarios', id, ordem],
    queryFn: () => fetchComentarios(id, ordem),
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['forum-comentarios', id] })
    qc.invalidateQueries({ queryKey: ['forum-manual', id] })
    qc.invalidateQueries({ queryKey: ['forum'] })
    qc.invalidateQueries({ queryKey: ['forum-contribuidores'] })
  }
  const onError = (e: unknown) => setErro(e instanceof Error ? e.message : 'Erro ao concluir a ação.')

  const mutComentar = useMutation({
    mutationFn: ({ t, parent }: { t: string; parent?: string }) => comentar(id, t, parent),
    onSuccess: (_d, v) => {
      setErro(null)
      if (v.parent) { setRespondendo(null); setTextoResposta('') } else setTexto('')
      refresh()
    },
    onError,
  })
  const mutCurtir = useMutation({ mutationFn: curtir, onSuccess: refresh, onError })
  const mutExcluir = useMutation({
    mutationFn: excluirComentario,
    onSuccess: () => { setExcluindo(null); refresh() },
    onError,
  })

  if (isLoading) {
    return <div className="flex items-center justify-center py-32 text-slate-400"><Loader2 size={24} className="animate-spin mr-2" /> Carregando…</div>
  }
  if (isError || !manual) {
    return (
      <div className="text-center py-24 text-slate-400">
        <p className="mb-4">Manual não encontrado.</p>
        <Link to="/biblioteca" className="text-brand-600 hover:underline text-sm">Voltar ao Fórum</Link>
      </div>
    )
  }

  const linkDrive = linkDoManual(manual)
  const tags = (manual.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean)

  return (
    <div className="max-w-4xl">
      <Link to="/biblioteca" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 mb-4">
        <ArrowLeft size={15} /> Voltar ao Fórum
      </Link>

      {/* Cabeçalho do manual */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 shrink-0">
            <FileText size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-ink-900 dark:text-white">{manual.titulo}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{manual.descricao}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge tone="info">{manual.categoria}</Badge>
              {tags.map((t) => <Badge key={t}>{t}</Badge>)}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-slate-400">
              {manual.autor && <span>Responsável: <strong className="text-slate-600 dark:text-slate-300">{manual.autor}</strong></span>}
              {manual.atualizado_em && <span>Atualizado em: <strong className="text-slate-600 dark:text-slate-300">{formatDate(manual.atualizado_em)}</strong></span>}
              <span>{manual.topicos} {manual.topicos === 1 ? 'tópico' : 'tópicos'} • {manual.respostas} {manual.respostas === 1 ? 'resposta' : 'respostas'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-[190px]">
            <Button onClick={() => linkDrive && window.open(linkDrive, '_blank', 'noopener,noreferrer')} disabled={!linkDrive}
              title={linkDrive ? 'Abre o manual no Google Drive' : 'Nenhum arquivo do Drive vinculado'}>
              <ExternalLink size={15} /> {linkDrive ? 'Ver manual completo' : 'Sem arquivo no Drive'}
            </Button>
            {manual.quiz_disponivel && (
              <Button variant="outline" onClick={() => navigate(`/quiz?trilha=${manual.trilha_id}`)}>
                <Trophy size={15} /> Fazer Quiz
              </Button>
            )}
            {admin && (
              <Button variant="ghost" onClick={() => setEditorAberto(true)}>
                <Pencil size={15} /> Editar manual
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Conteúdo do manual (Markdown) */}
      {manual.tem_conteudo ? (
        <Card className="mb-6">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2 mb-4">
            <BookOpen size={15} className="text-brand-600" /> Conteúdo do manual
          </h2>
          {carregandoConteudo ? (
            <div className="flex justify-center py-12 text-slate-400"><Loader2 size={20} className="animate-spin mr-2" /> Carregando o manual…</div>
          ) : (
            <div className={toc.length >= 2 ? 'grid lg:grid-cols-[210px_1fr] gap-8' : ''}>
              {toc.length >= 2 && (
                <>
                  <nav className="hidden lg:block">
                    <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1.5"><ListTree size={13} /> Índice</p>
                      <ul className="space-y-1 border-l border-slate-200 dark:border-white/10">
                        {toc.map((t) => (
                          <li key={t.id} style={{ paddingLeft: 10 + (t.level - 1) * 12 }}>
                            <button onClick={() => scrollParaId(t.id)} className="text-left text-[13px] leading-snug text-slate-500 hover:text-brand-600 dark:text-slate-400 py-0.5">
                              {t.text}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </nav>
                  <details className="lg:hidden rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 -mt-1">
                    <summary className="text-sm font-medium cursor-pointer flex items-center gap-1.5"><ListTree size={14} /> Índice</summary>
                    <ul className="mt-2 space-y-1">
                      {toc.map((t) => (
                        <li key={t.id} style={{ paddingLeft: (t.level - 1) * 12 }}>
                          <button onClick={() => scrollParaId(t.id)} className="text-left text-sm text-brand-600 py-0.5">{t.text}</button>
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              )}
              <div className="min-w-0 -mt-4"><Markdown blocks={blocos} /></div>
            </div>
          )}
        </Card>
      ) : admin ? (
        <Card className="mb-6 border-dashed text-center">
          <p className="text-sm text-slate-500">Este manual ainda não tem conteúdo na tela.</p>
          <Button className="mt-3" variant="outline" onClick={() => setEditorAberto(true)}><Pencil size={14} /> Colar o manual em Markdown</Button>
        </Card>
      ) : null}

      {/* Novo tópico */}
      <Card className="mb-6">
        <h2 className="font-display font-semibold text-sm flex items-center gap-2 mb-3">
          <MessageSquare size={15} className="text-brand-600" /> Dúvidas e discussões
        </h2>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, MAX))}
          rows={3}
          placeholder="Faça uma pergunta ou compartilhe uma experiência sobre este manual..."
          className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-400">{texto.length}/{MAX}</span>
          <Button disabled={!texto.trim() || mutComentar.isPending} onClick={() => mutComentar.mutate({ t: texto })}>
            {mutComentar.isPending && !respondendo ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publicar
          </Button>
        </div>
        {erro && <p className="text-xs text-red-500 mt-2">{erro}</p>}
      </Card>

      {/* Ordenação */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-500">{topicos.length} {topicos.length === 1 ? 'tópico' : 'tópicos'}</h3>
        <select
          value={ordem}
          onChange={(e) => setOrdem(e.target.value as OrdemComentarios)}
          className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm"
        >
          <option value="recentes">Mais recentes</option>
          <option value="curtidos">Mais curtidos</option>
        </select>
      </div>

      {carregandoCom ? (
        <div className="flex justify-center py-12 text-slate-400"><Loader2 size={20} className="animate-spin mr-2" /> Carregando…</div>
      ) : topicos.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <MessageSquare size={34} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Ninguém comentou ainda. Faça a primeira pergunta!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topicos.map((t) => (
            <Card key={t.id}>
              <Comentario c={t} onCurtir={() => mutCurtir.mutate(t.id)} onExcluir={() => setExcluindo(t)}
                onResponder={() => { setRespondendo(respondendo === t.id ? null : t.id); setTextoResposta('') }} />

              {(t.respostas?.length ?? 0) > 0 && (
                <div className="mt-3 ml-5 pl-4 border-l-2 border-slate-100 dark:border-white/10 space-y-4">
                  {t.respostas!.map((r) => (
                    <Comentario key={r.id} c={r} reply onCurtir={() => mutCurtir.mutate(r.id)} onExcluir={() => setExcluindo(r)}
                      onResponder={() => { setRespondendo(t.id); setTextoResposta(`@${r.autor.nome.split(' ')[0]} `) }} />
                  ))}
                </div>
              )}

              {respondendo === t.id && (
                <div className="mt-3 ml-5 pl-4 border-l-2 border-brand-200">
                  <textarea
                    autoFocus
                    value={textoResposta}
                    onChange={(e) => setTextoResposta(e.target.value.slice(0, MAX))}
                    rows={2}
                    placeholder="Escreva sua resposta..."
                    className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" disabled={!textoResposta.trim() || mutComentar.isPending}
                      onClick={() => mutComentar.mutate({ t: textoResposta, parent: t.id })}>
                      {mutComentar.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Responder
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRespondendo(null)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {admin && <ManualEditorDialog open={editorAberto} manual={manual} onClose={() => setEditorAberto(false)} />}

      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)} title="Excluir comentário" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Tem certeza que deseja excluir este comentário?</p>
        {excluindo && !excluindo.parent_id && (excluindo.respostas?.length ?? 0) > 0 && (
          <p className="text-xs text-amber-600 mb-2">As respostas deste tópico também deixarão de ser exibidas.</p>
        )}
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={mutExcluir.isPending}
            onClick={() => excluindo && mutExcluir.mutate(excluindo.id)}>
            {mutExcluir.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function Comentario({ c, reply, onCurtir, onExcluir, onResponder }: {
  c: ComentarioForum
  reply?: boolean
  onCurtir: () => void
  onExcluir: () => void
  onResponder: () => void
}) {
  return (
    <div className="flex items-start gap-3">
      <UserAvatar nome={c.autor.nome} fotoUrl={c.autor.foto_url} size={reply ? 30 : 38} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-ink-900 dark:text-white">{c.autor.nome}</span>
          <span className="text-xs text-slate-400" title={new Date(c.criado_em).toLocaleString('pt-BR')}>{timeAgo(c.criado_em)}</span>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 whitespace-pre-wrap break-words">{c.texto}</p>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <button onClick={onCurtir}
            className={`inline-flex items-center gap-1 transition-colors ${c.curtido_por_mim ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
            title={c.curtido_por_mim ? 'Remover curtida' : 'Curtir'}>
            <Heart size={14} className={c.curtido_por_mim ? 'fill-current' : ''} /> {c.curtidas}
          </button>
          <button onClick={onResponder} className="inline-flex items-center gap-1 text-slate-400 hover:text-brand-600 transition-colors">
            <Reply size={14} /> Responder
          </button>
          {c.pode_excluir && (
            <button onClick={onExcluir} className="inline-flex items-center gap-1 text-slate-400 hover:text-red-500 transition-colors" title="Excluir">
              <Trash2 size={13} /> Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
