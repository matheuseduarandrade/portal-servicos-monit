import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2, ListChecks, Archive, ArchiveRestore, Download, Mail, Search, HelpCircle, Check,
} from 'lucide-react'
import { PageHeader, Card, Badge, Button, Input } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { fetchManuais } from '@/services/biblioteca'
import { formatDate } from '@/lib/utils'
import {
  fetchTrilhas, criarTrilha, atualizarTrilha, fetchQuestoes, criarQuestao, atualizarQuestao, removerQuestao,
  fetchTodasTentativas, fetchTodosCertificados, baixarCertificado, reenviarCertificado,
  CATEGORIAS_QUIZ, NIVEIS_QUIZ, type NivelQuiz, type QuestaoAdmin, type Trilha, type TrilhaInput,
} from '@/services/quiz'

const SELECT = 'w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm'
type Aba = 'trilhas' | 'tentativas' | 'certificados'

export default function QuizAdmin() {
  const navigate = useNavigate()
  const [aba, setAba] = useState<Aba>('trilhas')

  return (
    <div>
      <PageHeader
        title="Gerenciar Quiz"
        subtitle="Trilhas, banco de questões, histórico de tentativas e certificados."
        action={<Button variant="outline" onClick={() => navigate('/quiz')}><ArrowLeft size={14} /> Voltar ao Quiz</Button>}
      />
      <div className="flex gap-2 mb-6">
        {([['trilhas', 'Trilhas e questões'], ['tentativas', 'Tentativas'], ['certificados', 'Certificados']] as [Aba, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              aba === id ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-brand-400'}`}>
            {label}
          </button>
        ))}
      </div>
      {aba === 'trilhas' && <TrilhasTab />}
      {aba === 'tentativas' && <TentativasTab />}
      {aba === 'certificados' && <CertificadosTab />}
    </div>
  )
}

// ── Trilhas ─────────────────────────────────────────────────────────────────
function TrilhasTab() {
  const qc = useQueryClient()
  const [novaAberta, setNovaAberta] = useState(false)
  const [editando, setEditando] = useState<Trilha | null>(null)
  const [questoesDe, setQuestoesDe] = useState<Trilha | null>(null)

  const { data: trilhas = [], isLoading } = useQuery({ queryKey: ['quiz-trilhas-admin'], queryFn: () => fetchTrilhas({ incluirArquivadas: true }) })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['quiz-trilhas-admin'] })
    qc.invalidateQueries({ queryKey: ['quiz-trilhas'] })
    qc.invalidateQueries({ queryKey: ['forum'] })
  }
  const mutArquivar = useMutation({ mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => atualizarTrilha(id, { ativo }), onSuccess: refresh })

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setNovaAberta(true)}><Plus size={15} /> Nova trilha</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : trilhas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <HelpCircle size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma trilha criada.</p>
          <p className="text-xs mt-1 text-brand-500">Cada manual do Fórum pode ter uma trilha com 3 níveis.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trilhas.map((t) => (
            <Card key={t.id} className={t.ativo ? '' : 'opacity-60'}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink-900 dark:text-white">{t.titulo}</h3>
                    <Badge tone="info">{t.categoria}</Badge>
                    {!t.ativo && <Badge tone="warning">Arquivada</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Manual: {t.manual_titulo ?? '—'} • nota mínima {t.nota_minima}% • {t.tempo_min ? `${t.tempo_min} min por nível` : 'sem limite de tempo'}
                    {t.carga_horaria ? ` • ${t.carga_horaria}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {t.niveis.map((n) => (
                      <span key={n.nivel} className={`text-xs rounded-full px-2.5 py-1 border ${
                        n.disponivel ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                        {n.nivel}: {n.questoes}/{t.questoes_por_nivel}{n.disponivel ? ' ✓' : ' (faltam ' + (t.questoes_por_nivel - n.questoes) + ')'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setQuestoesDe(t)}><ListChecks size={14} /> Questões</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditando(t)}><Pencil size={14} /> Editar</Button>
                  <Button size="sm" variant="outline" disabled={mutArquivar.isPending} onClick={() => mutArquivar.mutate({ id: t.id, ativo: !t.ativo })}>
                    {t.ativo ? <><Archive size={14} /> Arquivar</> : <><ArchiveRestore size={14} /> Restaurar</>}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TrilhaDialog open={novaAberta} trilha={null} existentes={trilhas.map((t) => t.manual_id)} onClose={() => setNovaAberta(false)} onSaved={refresh} />
      <TrilhaDialog open={!!editando} trilha={editando} existentes={[]} onClose={() => setEditando(null)} onSaved={refresh} />
      {questoesDe && <QuestoesDialog trilha={questoesDe} onClose={() => { setQuestoesDe(null); refresh() }} />}
    </div>
  )
}

function TrilhaDialog({ open, trilha, existentes, onClose, onSaved }: {
  open: boolean; trilha: Trilha | null; existentes: string[]; onClose: () => void; onSaved: () => void
}) {
  const novo = !trilha
  const { data: manuais = [] } = useQuery({ queryKey: ['biblioteca-manuais-todos'], queryFn: () => fetchManuais(), enabled: open && novo })
  const [form, setForm] = useState<TrilhaInput & { manual_id: string }>({ manual_id: '', titulo: '', categoria: 'Sistemas', nota_minima: 70, tempo_min: 15, carga_horaria: '' })
  const [erro, setErro] = useState<string | null>(null)
  const [chave, setChave] = useState('')

  // reinicia o formulário a cada abertura
  const id = open ? (trilha?.id ?? 'nova') : ''
  if (id !== chave) {
    setChave(id)
    setErro(null)
    setForm(trilha
      ? { manual_id: trilha.manual_id, titulo: trilha.titulo, categoria: trilha.categoria, nota_minima: trilha.nota_minima, tempo_min: trilha.tempo_min, carga_horaria: trilha.carga_horaria ?? '' }
      : { manual_id: '', titulo: '', categoria: 'Sistemas', nota_minima: 70, tempo_min: 15, carga_horaria: '' })
  }

  const disponiveis = manuais.filter((m) => !existentes.includes(m.id))
  const mut = useMutation({
    mutationFn: () => {
      const corpo: TrilhaInput = {
        titulo: form.titulo?.trim() || undefined, categoria: form.categoria, nota_minima: Number(form.nota_minima),
        tempo_min: Number(form.tempo_min), carga_horaria: form.carga_horaria?.toString().trim() || null,
      }
      return novo ? criarTrilha({ ...corpo, manual_id: form.manual_id }) : atualizarTrilha(trilha!.id, corpo)
    },
    onSuccess: () => { onSaved(); onClose() },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : 'Erro ao salvar.'),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title={novo ? 'Nova trilha' : `Editar — ${trilha?.titulo}`} size="md">
      <div className="space-y-4">
        {novo && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Manual do Fórum</label>
            <select value={form.manual_id} onChange={(e) => setForm((f) => ({ ...f, manual_id: e.target.value }))} className={SELECT}>
              <option value="">{disponiveis.length ? 'Selecione...' : 'Todos os manuais já têm trilha'}</option>
              {disponiveis.map((m) => <option key={m.id} value={m.id}>{m.titulo}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Título {novo && <span className="text-slate-300">(opcional — usa o nome do manual)</span>}</label>
          <Input value={form.titulo ?? ''} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
            <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} className={SELECT}>
              {CATEGORIAS_QUIZ.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Carga horária <span className="text-slate-300">(opcional)</span></label>
            <Input value={form.carga_horaria ?? ''} onChange={(e) => setForm((f) => ({ ...f, carga_horaria: e.target.value }))} placeholder="Ex: 4 horas" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nota mínima por nível (%)</label>
            <Input type="number" min={1} max={100} value={form.nota_minima} onChange={(e) => setForm((f) => ({ ...f, nota_minima: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tempo por nível (min, 0 = sem limite)</label>
            <Input type="number" min={0} max={180} value={form.tempo_min} onChange={(e) => setForm((f) => ({ ...f, tempo_min: Number(e.target.value) }))} />
          </div>
        </div>
        <p className="text-xs text-slate-400">Cada nível sorteia 10 questões do banco e vale até 100 pontos. O certificado sai ao ser aprovado nos 3 níveis.</p>
        {erro && <p className="text-xs text-red-500">{erro}</p>}
        <div className="flex gap-3 pt-1">
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || (novo && !form.manual_id)}>
            {mut.isPending && <Loader2 size={14} className="animate-spin" />} Salvar
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </Dialog>
  )
}

// ── Banco de questões ───────────────────────────────────────────────────────
function QuestoesDialog({ trilha, onClose }: { trilha: Trilha; onClose: () => void }) {
  const qc = useQueryClient()
  const [nivel, setNivel] = useState<NivelQuiz>('Fácil')
  const [editando, setEditando] = useState<QuestaoAdmin | 'nova' | null>(null)

  const { data: todas = [], isLoading } = useQuery({ queryKey: ['quiz-questoes', trilha.id], queryFn: () => fetchQuestoes(trilha.id) })
  const refresh = () => qc.invalidateQueries({ queryKey: ['quiz-questoes', trilha.id] })
  const mutRemover = useMutation({ mutationFn: removerQuestao, onSuccess: refresh })

  const doNivel = todas.filter((q) => q.nivel === nivel)
  const cont = (n: NivelQuiz) => todas.filter((q) => q.nivel === n).length

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Questões — ${trilha.titulo}`} description="Cada nível precisa de pelo menos 10 questões ativas. Cada tentativa sorteia 10." size="lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          {NIVEIS_QUIZ.map((n) => (
            <button key={n} onClick={() => { setNivel(n); setEditando(null) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                nivel === n ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-brand-400'}`}>
              {n} <span className="opacity-70">({cont(n)})</span>
            </button>
          ))}
        </div>
        {!editando && <Button size="sm" onClick={() => setEditando('nova')}><Plus size={14} /> Nova questão</Button>}
      </div>

      {editando ? (
        <QuestaoForm trilhaId={trilha.id} nivel={nivel} inicial={editando === 'nova' ? null : editando}
          onCancel={() => setEditando(null)} onSaved={() => { refresh(); setEditando(null) }} />
      ) : isLoading ? (
        <div className="flex justify-center py-10 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : doNivel.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">Nenhuma questão no nível {nivel} ainda.</p>
      ) : (
        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {doNivel.map((q, i) => (
            <div key={q.id} className="rounded-lg border border-slate-200 dark:border-white/10 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900 dark:text-white"><span className="text-slate-400">{i + 1}.</span> {q.enunciado}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {q.opcoes.map((o, k) => (
                      <li key={k} className={`text-xs flex items-center gap-1.5 ${k === q.correta ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                        {k === q.correta ? <Check size={11} /> : <span className="w-[11px]" />} {o}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditando(q)} title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm('Arquivar esta questão? Ela deixa de ser sorteada (o histórico é preservado).')) mutRemover.mutate(q.id) }}
                    title="Arquivar" className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  )
}

function QuestaoForm({ trilhaId, nivel, inicial, onCancel, onSaved }: {
  trilhaId: string; nivel: NivelQuiz; inicial: QuestaoAdmin | null; onCancel: () => void; onSaved: () => void
}) {
  const [tipo, setTipo] = useState<'multipla' | 'vf'>(inicial?.tipo ?? 'multipla')
  const [enunciado, setEnunciado] = useState(inicial?.enunciado ?? '')
  const [opcoes, setOpcoes] = useState<string[]>(inicial && inicial.tipo === 'multipla' ? inicial.opcoes : ['', '', '', ''])
  const [correta, setCorreta] = useState<number>(inicial?.correta ?? 0)
  const [explicacao, setExplicacao] = useState(inicial?.explicacao ?? '')
  const [erro, setErro] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () => {
      const corpo = {
        tipo, enunciado: enunciado.trim(), correta,
        opcoes: tipo === 'vf' ? ['Verdadeiro', 'Falso'] : opcoes.map((o) => o.trim()),
        explicacao: explicacao.trim(),
      }
      return inicial ? atualizarQuestao(inicial.id, { ...corpo, nivel }) : criarQuestao({ ...corpo, trilha_id: trilhaId, nivel })
    },
    onSuccess: onSaved,
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : 'Erro ao salvar.'),
  })

  const opcoesValidas = tipo === 'vf' || (opcoes.length >= 2 && opcoes.every((o) => o.trim()))
  const trocarTipo = (t: 'multipla' | 'vf') => { setTipo(t); setCorreta(0) }

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-sm">
        {([['multipla', 'Múltipla escolha'], ['vf', 'Verdadeiro ou falso']] as const).map(([v, l]) => (
          <label key={v} className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={tipo === v} onChange={() => trocarTipo(v)} className="accent-brand-600" /> {l}
          </label>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Enunciado ({nivel})</label>
        <textarea value={enunciado} onChange={(e) => setEnunciado(e.target.value)} rows={2} className={SELECT} />
      </div>

      {tipo === 'vf' ? (
        <div className="flex gap-6 text-sm">
          {['Verdadeiro', 'Falso'].map((l, i) => (
            <label key={l} className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={correta === i} onChange={() => setCorreta(i)} className="accent-emerald-600" /> {l} <span className="text-xs text-slate-400">{correta === i ? '(correta)' : ''}</span>
            </label>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">Alternativas (marque a correta)</label>
          {opcoes.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" checked={correta === i} onChange={() => setCorreta(i)} className="accent-emerald-600" title="Alternativa correta" />
              <Input value={o} onChange={(e) => setOpcoes((arr) => arr.map((x, k) => (k === i ? e.target.value : x)))} placeholder={`Alternativa ${i + 1}`} />
              {opcoes.length > 2 && (
                <button onClick={() => { setOpcoes((arr) => arr.filter((_, k) => k !== i)); setCorreta((c) => (c === i ? 0 : c > i ? c - 1 : c)) }}
                  className="p-1 text-slate-400 hover:text-red-500" title="Remover alternativa"><Trash2 size={14} /></button>
              )}
            </div>
          ))}
          {opcoes.length < 5 && (
            <button onClick={() => setOpcoes((a) => [...a, ''])} className="text-xs text-brand-600 hover:underline">+ Adicionar alternativa</button>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Explicação <span className="text-slate-300">(opcional — aparece na revisão)</span></label>
        <textarea value={explicacao} onChange={(e) => setExplicacao(e.target.value)} rows={2} className={SELECT} />
      </div>

      {erro && <p className="text-xs text-red-500">{erro}</p>}
      <div className="flex gap-3 pt-1">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || !enunciado.trim() || !opcoesValidas}>
          {mut.isPending && <Loader2 size={14} className="animate-spin" />} Salvar questão
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}

// ── Tentativas ──────────────────────────────────────────────────────────────
function TentativasTab() {
  const [q, setQ] = useState('')
  const [trilhaId, setTrilhaId] = useState('')
  const [busca, setBusca] = useState('')

  const { data: trilhas = [] } = useQuery({ queryKey: ['quiz-trilhas-admin'], queryFn: () => fetchTrilhas({ incluirArquivadas: true }) })
  const { data = [], isLoading } = useQuery({
    queryKey: ['quiz-tentativas-admin', busca, trilhaId],
    queryFn: () => fetchTodasTentativas({ q: busca || undefined, trilha_id: trilhaId || undefined }),
  })

  return (
    <Card>
      <form className="flex flex-wrap gap-3 mb-4" onSubmit={(e) => { e.preventDefault(); setBusca(q) }}>
        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar colaborador..." className="pl-9" />
        </div>
        <select value={trilhaId} onChange={(e) => setTrilhaId(e.target.value)} className={SELECT + ' !w-56'}>
          <option value="">Todas as trilhas</option>
          {trilhas.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
        </select>
        <Button type="submit" variant="outline">Filtrar</Button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-10 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">Nenhuma tentativa encontrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-black/5 dark:border-white/10">
                {['Data e hora', 'Colaborador', 'Trilha', 'Nível', 'Acertos', 'Erros', 'Pontos', 'Resultado'].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="border-b border-black/5 dark:border-white/5 last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap text-slate-500">{t.data?.split('-').reverse().join('/')} {t.hora}</td>
                  <td className="py-2 pr-3">{t.usuario?.nome ?? '—'}{t.usuario?.excluido && <span className="text-xs text-slate-400"> (arquivado)</span>}</td>
                  <td className="py-2 pr-3">{t.trilha_titulo}</td>
                  <td className="py-2 pr-3">{t.nivel} <span className="text-xs text-slate-400">#{t.numero}</span></td>
                  <td className="py-2 pr-3">{t.acertos}</td>
                  <td className="py-2 pr-3">{t.erros}</td>
                  <td className="py-2 pr-3 font-medium">{t.pontos}</td>
                  <td className="py-2"><Badge tone={t.status === 'expirada' ? 'warning' : t.aprovado ? 'success' : 'danger'}>{t.status === 'expirada' ? 'Tempo esgotado' : t.aprovado ? 'Aprovado' : 'Reprovado'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 mt-3">Mostrando as {data.length} tentativas mais recentes.</p>
        </div>
      )}
    </Card>
  )
}

// ── Certificados ────────────────────────────────────────────────────────────
function CertificadosTab() {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({ queryKey: ['quiz-certificados-admin'], queryFn: fetchTodosCertificados })
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const sorted = useMemo(() => data, [data])

  async function acao(id: string, tipo: 'baixar' | 'reenviar') {
    setOcupado(id); setMsg(null)
    try {
      if (tipo === 'baixar') await baixarCertificado(id)
      else {
        const r = await reenviarCertificado(id)
        setMsg(r.email_enviado ? `Enviado para ${r.email}.` : (r.erro ?? 'Falha no envio.'))
        qc.invalidateQueries({ queryKey: ['quiz-certificados-admin'] })
      }
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Erro.') }
    setOcupado(null)
  }

  return (
    <Card>
      {isLoading ? (
        <div className="flex justify-center py-10 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">Nenhum certificado emitido ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-black/5 dark:border-white/10">
                {['Data', 'Colaborador', 'Trilha', 'Pontos', 'Código', 'E-mail', ''].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id} className="border-b border-black/5 dark:border-white/5 last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap text-slate-500">{formatDate(c.data_conclusao)}</td>
                  <td className="py-2 pr-3">{c.usuario?.nome ?? c.nome}</td>
                  <td className="py-2 pr-3">{c.titulo}</td>
                  <td className="py-2 pr-3 font-medium">{c.pontos}</td>
                  <td className="py-2 pr-3 text-xs text-slate-400">{c.codigo}</td>
                  <td className="py-2 pr-3"><Badge tone={c.email_enviado ? 'success' : 'warning'}>{c.email_enviado ? 'Enviado' : 'Pendente'}</Badge></td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" disabled={ocupado === c.id} onClick={() => acao(c.id, 'baixar')}><Download size={13} /></Button>
                      <Button size="sm" variant="outline" disabled={ocupado === c.id} onClick={() => acao(c.id, 'reenviar')}><Mail size={13} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {msg && <p className="text-xs text-slate-500 mt-3">{msg}</p>}
    </Card>
  )
}
