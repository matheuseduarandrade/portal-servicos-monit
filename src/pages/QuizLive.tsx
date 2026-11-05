import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Archive, Check, CircleHelp, Copy, Plus, Radio, RefreshCw, Sparkles, Trash2, Trophy, Users, X } from 'lucide-react'
import { PageHeader, Button, Card, Badge, Input } from '@/components/ui/primitives'
import { fetchTrilhas } from '@/services/quiz'
import {
  listarSalasLive, listarBancoLive, criarPerguntaLive, arquivarPerguntaLive, criarSalaLive,
  type QuizLiveFonte, type QuizLiveQuestionInput, type QuizLiveRoomList,
} from '@/services/quizLive'

const statusLabel: Record<string, string> = { WAITING: 'Aguardando', QUESTION_ACTIVE: 'Em andamento', ANSWER_REVEALED: 'Resposta revelada', FINISHED: 'Finalizada', CLOSED: 'Encerrada' }
const statusClass: Record<string, string> = {
  WAITING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  QUESTION_ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  ANSWER_REVEALED: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  FINISHED: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
  CLOSED: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
}

export default function QuizLive() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [titulo, setTitulo] = useState('')
  const [fonte, setFonte] = useState<QuizLiveFonte>('existente')
  const [total, setTotal] = useState(20)
  const [trilhaIds, setTrilhaIds] = useState<string[]>([])
  const [customIds, setCustomIds] = useState<string[]>([])
  const [tab, setTab] = useState<'salas' | 'criar' | 'banco'>('salas')
  const [qTipo, setQTipo] = useState<'multipla' | 'vf'>('multipla')
  const [qTexto, setQTexto] = useState('')
  const [qOpcoes, setQOpcoes] = useState('')
  const [qCorreta, setQCorreta] = useState('0')
  const [qExplicacao, setQExplicacao] = useState('')
  const [feedback, setFeedback] = useState('')

  const rooms = useQuery({ queryKey: ['quizlive-salas'], queryFn: listarSalasLive, refetchInterval: 8000 })
  const trilhas = useQuery({ queryKey: ['quiz-trilhas-live'], queryFn: () => fetchTrilhas() })
  const banco = useQuery({ queryKey: ['quizlive-banco'], queryFn: listarBancoLive })
  const opcoes = useMemo(() => qTipo === 'vf' ? ['Verdadeiro', 'Falso'] : qOpcoes.split('\n').map(x => x.trim()).filter(Boolean), [qTipo, qOpcoes])

  const createRoom = useMutation({
    mutationFn: criarSalaLive,
    onSuccess: (room) => { qc.invalidateQueries({ queryKey: ['quizlive-salas'] }); navigate(`/quiz-live/sala/${room.id}`) },
    onError: (e) => setFeedback(e instanceof Error ? e.message : 'Não foi possível criar a sala.'),
  })
  const saveQuestion = useMutation({
    mutationFn: criarPerguntaLive,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quizlive-banco'] }); setQTexto(''); setQOpcoes(''); setQCorreta('0'); setQExplicacao(''); setFeedback('Pergunta adicionada ao banco exclusivo.') },
    onError: (e) => setFeedback(e instanceof Error ? e.message : 'Não foi possível salvar a pergunta.'),
  })
  const archiveQuestion = useMutation({ mutationFn: arquivarPerguntaLive, onSuccess: () => qc.invalidateQueries({ queryKey: ['quizlive-banco'] }) })

  function toggle(setter: (v: string[]) => void, current: string[], id: string) {
    setter(current.includes(id) ? current.filter(x => x !== id) : [...current, id])
  }
  function submitRoom() {
    setFeedback('')
    if (!titulo.trim()) return setFeedback('Informe o nome da partida.')
    if ((fonte === 'existente' || fonte === 'mista') && !trilhaIds.length) return setFeedback('Selecione pelo menos uma trilha.')
    if ((fonte === 'exclusiva' || fonte === 'mista') && !customIds.length) return setFeedback('Selecione perguntas do banco exclusivo.')
    createRoom.mutate({ titulo: titulo.trim(), fonte, total_questoes: total, trilha_ids: trilhaIds, questao_custom_ids: customIds })
  }
  function submitQuestion() {
    setFeedback('')
    if (!qTexto.trim()) return setFeedback('Escreva o enunciado da pergunta.')
    if (qTipo === 'multipla' && (opcoes.length < 2 || opcoes.length > 5)) return setFeedback('Informe de 2 a 5 alternativas, uma por linha.')
    const body: QuizLiveQuestionInput = { tipo: qTipo, enunciado: qTexto.trim(), opcoes, correta: Number(qCorreta), explicacao: qExplicacao.trim() }
    saveQuestion.mutate(body)
  }

  return <div className="space-y-6">
    <PageHeader title="Quiz Live" subtitle="Crie partidas ao vivo, aprove participantes e acompanhe as respostas em uma reunião." />
    <div className="rounded-2xl bg-gradient-to-r from-[#0b2a6b] via-[#123a8f] to-brand-700 p-6 text-white flex flex-wrap items-center justify-between gap-5">
      <div className="max-w-xl">
        <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider"><Radio size={15}/> Quiz ao vivo</div>
        <h2 className="text-2xl font-semibold mt-2">Transforme o treinamento em uma competição.</h2>
        <p className="text-sm text-white/75 mt-2">Até 11 participantes por sala, acesso por link e controle completo pelo administrador.</p>
      </div>
      <div className="flex gap-3 text-center">
        <div className="rounded-xl bg-white/10 px-4 py-3"><Users size={20} className="mx-auto mb-1"/><strong className="text-xl">11</strong><p className="text-[11px] text-white/70">participantes</p></div>
        <div className="rounded-xl bg-white/10 px-4 py-3"><CircleHelp size={20} className="mx-auto mb-1"/><strong className="text-xl">50</strong><p className="text-[11px] text-white/70">perguntas máx.</p></div>
      </div>
    </div>

    <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
      {([['salas', 'Salas'], ['criar', 'Criar partida'], ['banco', 'Banco exclusivo']] as const).map(([id, label]) => <button key={id} onClick={() => { setTab(id); setFeedback('') }} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? 'bg-brand-600 text-white' : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10'}`}>{label}</button>)}
    </div>

    {feedback && <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-200 px-4 py-3 text-sm">{feedback}</div>}

    {tab === 'salas' && <div className="space-y-3">
      <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-800 dark:text-white">Partidas criadas</h3><Button size="sm" variant="outline" onClick={() => rooms.refetch()}><RefreshCw size={14}/> Atualizar</Button></div>
      {rooms.isLoading ? <Card><p className="text-sm text-slate-400">Carregando salas...</p></Card> : rooms.data?.length ? <div className="grid md:grid-cols-2 gap-3">{rooms.data.map((room: QuizLiveRoomList) => <Card key={room.id} className="space-y-3">
        <div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold text-slate-800 dark:text-white">{room.titulo}</h4><p className="text-xs text-slate-400 mt-1">Código {room.codigo} · {room.total_questoes} perguntas</p></div><span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${statusClass[room.status]}`}>{statusLabel[room.status]}</span></div>
        <div className="flex items-center justify-between text-xs text-slate-500"><span className="flex items-center gap-1"><Users size={14}/> {room.participantes}/11 participantes</span><span>{room.criado_em ? new Date(room.criado_em).toLocaleDateString('pt-BR') : ''}</span></div>
        <Button size="sm" variant="outline" className="w-full justify-center" onClick={() => navigate(`/quiz-live/sala/${room.id}`)}>Abrir painel da sala</Button>
      </Card>)}</div> : <Card className="text-center py-10"><Activity size={30} className="mx-auto text-slate-300 mb-3"/><p className="font-medium text-slate-700 dark:text-slate-200">Nenhuma partida criada</p><p className="text-sm text-slate-400 mt-1">Crie sua primeira sala para começar.</p><Button className="mt-4" onClick={() => setTab('criar')}><Plus size={15}/> Criar partida</Button></Card>}
    </div>}

    {tab === 'criar' && <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
      <Card className="space-y-5">
        <div><h3 className="font-semibold text-slate-800 dark:text-white">Configurar partida</h3><p className="text-xs text-slate-400 mt-1">As perguntas serão copiadas para a sala; alterações posteriores nos bancos não afetam a partida.</p></div>
        <div><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nome da partida</label><Input className="mt-1" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Treinamento geral — equipe A" /></div>
        <div><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Origem das perguntas</label><div className="grid sm:grid-cols-3 gap-2 mt-2">{([['existente','Quiz tradicional','Utilizar perguntas das trilhas existentes.'],['exclusiva','Banco exclusivo','Utilizar perguntas criadas para o Quiz Live.'],['mista','Misto','Combinar os dois bancos.']] as const).map(([id, label, desc]) => <button key={id} onClick={() => setFonte(id)} className={`text-left border rounded-xl p-3 ${fonte === id ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-white/10'}`}><span className="block text-sm font-semibold text-slate-800 dark:text-white">{label}</span><span className="block text-[11px] text-slate-500 mt-1">{desc}</span></button>)}</div></div>
        {(fonte === 'existente' || fonte === 'mista') && <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Selecione as trilhas do Quiz tradicional</label>{trilhas.isLoading ? <p className="text-sm text-slate-400">Carregando trilhas...</p> : <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-auto">{(trilhas.data || []).map(t => <label key={t.id} className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer ${trilhaIds.includes(t.id) ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-white/10'}`}><input type="checkbox" checked={trilhaIds.includes(t.id)} onChange={() => toggle(setTrilhaIds, trilhaIds, t.id)} className="mt-0.5 accent-brand-600"/><span className="min-w-0"><span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t.titulo}</span><span className="text-[11px] text-slate-400">{t.categoria} · {t.niveis.reduce((n, x) => n + x.questoes, 0)} questões</span></span></label>)}</div>}</div>}
        {(fonte === 'exclusiva' || fonte === 'mista') && <div className="space-y-2"><div className="flex items-center justify-between"><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Selecione perguntas exclusivas</label><button onClick={() => setTab('banco')} className="text-xs text-brand-600 font-semibold">Gerenciar banco</button></div>{banco.data?.length ? <div className="max-h-64 overflow-auto space-y-2">{banco.data.map(q => <label key={q.id} className={`flex gap-2 border rounded-lg p-3 cursor-pointer ${customIds.includes(q.id) ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-white/10'}`}><input type="checkbox" checked={customIds.includes(q.id)} onChange={() => toggle(setCustomIds, customIds, q.id)} className="mt-1 accent-brand-600"/><span className="text-sm text-slate-700 dark:text-slate-200">{q.enunciado}<span className="block text-[11px] text-slate-400 mt-1">{q.tipo === 'vf' ? 'Verdadeiro ou falso' : `${q.opcoes.length} alternativas`}</span></span></label>)}</div> : <p className="text-sm text-slate-400">Seu banco exclusivo está vazio. Cadastre perguntas na aba Banco exclusivo.</p>}</div>}
        <div className="max-w-xs"><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Quantidade de perguntas</label><Input className="mt-1" type="number" min={1} max={50} value={total} onChange={e => setTotal(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} /><p className="text-[11px] text-slate-400 mt-1">Padrão: 20 perguntas. Máximo: 50.</p></div>
        <div className="flex flex-wrap gap-2"><Button onClick={submitRoom} disabled={createRoom.isPending}>{createRoom.isPending ? 'Criando sala...' : <><Plus size={15}/> Criar sala e sortear perguntas</>}</Button><Button variant="outline" onClick={() => setTab('salas')}>Cancelar</Button></div>
      </Card>
      <Card className="space-y-3"><h3 className="font-semibold text-slate-800 dark:text-white">Resumo da configuração</h3><div className="text-sm flex justify-between"><span className="text-slate-500">Participantes</span><strong>Até 11</strong></div><div className="text-sm flex justify-between"><span className="text-slate-500">Perguntas</span><strong>{total}</strong></div><div className="text-sm flex justify-between"><span className="text-slate-500">Revelação</span><strong>Manual</strong></div><div className="text-sm flex justify-between"><span className="text-slate-500">Controle</span><strong>Administrador</strong></div><div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3 text-xs text-slate-500">As questões são sorteadas sem repetição dentro da partida. O gabarito permanece no backend até você revelar cada resposta.</div></Card>
    </div>}

    {tab === 'banco' && <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
      <Card className="space-y-4"><div><h3 className="font-semibold text-slate-800 dark:text-white">Perguntas exclusivas do Quiz Live</h3><p className="text-xs text-slate-400 mt-1">Este banco é separado das questões do Quiz tradicional.</p></div>
        {banco.data?.length ? <div className="space-y-2">{banco.data.map(q => <div key={q.id} className="border border-slate-200 dark:border-white/10 rounded-xl p-3 flex items-start gap-3"><div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 dark:text-white">{q.enunciado}</p><p className="text-[11px] text-slate-400 mt-1">{q.tipo === 'vf' ? 'Verdadeiro ou falso' : q.opcoes.join(' · ')}</p></div><button title="Arquivar pergunta" onClick={() => archiveQuestion.mutate(q.id)} className="text-slate-400 hover:text-rose-500 p-1"><Archive size={16}/></button></div>)}</div> : <p className="text-sm text-slate-400 py-8 text-center">Nenhuma pergunta cadastrada.</p>}
      </Card>
      <Card className="space-y-3"><h3 className="font-semibold text-slate-800 dark:text-white">Nova pergunta</h3><div><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tipo</label><select value={qTipo} onChange={e => setQTipo(e.target.value as 'multipla' | 'vf')} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark px-3 py-2 text-sm"><option value="multipla">Múltipla escolha</option><option value="vf">Verdadeiro ou falso</option></select></div><div><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Enunciado</label><textarea value={qTexto} onChange={e => setQTexto(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark px-3 py-2 text-sm" placeholder="Digite a pergunta..."/></div>{qTipo === 'multipla' && <div><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Alternativas (uma por linha)</label><textarea value={qOpcoes} onChange={e => setQOpcoes(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark px-3 py-2 text-sm" placeholder={'Alternativa A\nAlternativa B\nAlternativa C\nAlternativa D'}/></div>}<div><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Resposta correta</label><select value={qCorreta} onChange={e => setQCorreta(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark px-3 py-2 text-sm">{opcoes.map((o, i) => <option key={i} value={i}>{String.fromCharCode(65 + i)} — {o}</option>)}</select></div><div><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Explicação (opcional)</label><textarea value={qExplicacao} onChange={e => setQExplicacao(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark px-3 py-2 text-sm" placeholder="Explique por que essa é a resposta correta..."/></div><Button className="w-full justify-center" onClick={submitQuestion} disabled={saveQuestion.isPending}>{saveQuestion.isPending ? 'Salvando...' : <><Plus size={15}/> Salvar no banco exclusivo</>}</Button></Card>
    </div>}
  </div>
}
