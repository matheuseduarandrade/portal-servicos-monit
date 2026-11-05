import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Clipboard, Copy, Crown, ExternalLink, Eye, Lock, Play, Radio, Square, Users, X } from 'lucide-react'
import { Button, Card, PageHeader } from '@/components/ui/primitives'
import { acaoSalaLive, painelSalaLive, type QuizLiveHostPanel } from '@/services/quizLive'

const statusText: Record<string, string> = { WAITING: 'Aguardando participantes', QUESTION_ACTIVE: 'Pergunta em andamento', ANSWER_REVEALED: 'Resposta revelada', FINISHED: 'Partida finalizada', CLOSED: 'Sala encerrada' }

export default function QuizLiveHost() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const panel = useQuery({ queryKey: ['quizlive-sala', id], queryFn: () => painelSalaLive(id), refetchInterval: 2500, enabled: !!id })
  const action = useMutation({
    mutationFn: ({ acao, participante_id }: { acao: string; participante_id?: string }) => acaoSalaLive(id, acao, participante_id),
    onSuccess: () => { setError(''); qc.invalidateQueries({ queryKey: ['quizlive-sala', id] }); qc.invalidateQueries({ queryKey: ['quizlive-salas'] }) },
    onError: e => setError(e instanceof Error ? e.message : 'Não foi possível executar a ação.'),
  })
  const data = panel.data as QuizLiveHostPanel | undefined
  const room = data?.sala
  const link = room ? `${window.location.origin}/quiz-live/participar/${room.codigo}` : ''
  const waiting = data?.participantes.filter(p => p.status === 'PENDING') || []

  async function copyLink() {
    try { await navigator.clipboard.writeText(link); setError('Link copiado. Envie para os participantes.') }
    catch { setError(`Copie o link: ${link}`) }
  }
  function run(acao: string, participante_id?: string) {
    if (acao === 'encerrar' && !window.confirm('Deseja encerrar esta sala? O link deixará de permitir acesso à partida.')) return
    action.mutate({ acao, participante_id })
  }

  if (panel.isLoading) return <div className="py-20 text-center text-sm text-slate-400">Carregando painel da sala...</div>
  if (panel.isError || !data || !room) return <Card><p className="text-sm text-rose-500">{panel.error instanceof Error ? panel.error.message : 'Não foi possível carregar esta sala.'}</p><Button className="mt-4" variant="outline" onClick={() => navigate('/quiz-live')}>Voltar</Button></Card>

  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3"><Button variant="ghost" size="sm" onClick={() => navigate('/quiz-live')}><ArrowLeft size={15}/> Quiz Live</Button><span className={`text-xs font-semibold rounded-full px-3 py-1.5 ${room.status === 'CLOSED' ? 'bg-rose-100 text-rose-700' : room.status === 'FINISHED' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>{statusText[room.status]}</span></div>
    <PageHeader title={room.titulo} subtitle={`Código ${room.codigo} · ${room.total_questoes} perguntas · até 11 participantes`} />
    {error && <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-200 px-4 py-3 text-sm">{error}</div>}
    <div className="grid md:grid-cols-3 gap-3">
      <Card><p className="text-xs text-slate-500">Participantes aprovados</p><p className="text-2xl font-semibold mt-1">{data.aprovados}<span className="text-sm text-slate-400"> / 11</span></p></Card>
      <Card><p className="text-xs text-slate-500">Solicitações pendentes</p><p className="text-2xl font-semibold mt-1">{data.pendentes}</p></Card>
      <Card><p className="text-xs text-slate-500">Pergunta atual</p><p className="text-2xl font-semibold mt-1">{room.status === 'WAITING' ? '—' : `${room.questao_atual + 1} / ${room.total_questoes}`}</p></Card>
    </div>
    {room.status === 'WAITING' && <Card className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-800 dark:text-white">Link de participação</h3><p className="text-xs text-slate-400 mt-1">Compartilhe com o time. Todos precisarão ser aprovados.</p></div><Button size="sm" onClick={copyLink}><Copy size={14}/> Copiar link</Button></div><div className="rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-3 text-sm break-all text-slate-600 dark:text-slate-300">{link}</div></Card>}

    {room.status === 'WAITING' && <Card className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2"><Users size={17}/> Solicitações de entrada</h3><span className="text-xs text-slate-400">{waiting.length} pendente(s)</span></div>{waiting.length ? <div className="space-y-2">{waiting.map(p => <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-white/10 p-3"><div><p className="text-sm font-medium text-slate-800 dark:text-white">{p.nome}</p><p className="text-xs text-amber-600">Aguardando aprovação</p></div><div className="flex gap-2"><Button size="sm" onClick={() => run('aprovar', p.id)} disabled={action.isPending}><Check size={14}/> Aprovar</Button><Button size="sm" variant="outline" onClick={() => run('recusar', p.id)} disabled={action.isPending}><X size={14}/> Recusar</Button></div></div>)}</div> : <p className="text-sm text-slate-400 py-3 text-center">Compartilhe o link para receber participantes.</p>}{data.participantes.some(p => p.status === 'APPROVED') && <div className="border-t border-slate-200 dark:border-white/10 pt-3"><p className="text-xs font-semibold text-slate-500 mb-2">Participantes aprovados</p><div className="flex flex-wrap gap-2">{data.participantes.filter(p => p.status === 'APPROVED').map(p => <span key={p.id} className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 py-1 text-xs">{p.nome}</span>)}</div></div>}<div className="flex justify-end pt-2"><Button onClick={() => run('iniciar')} disabled={action.isPending || data.aprovados === 0}><Play size={15}/> Iniciar partida</Button></div></Card>}

    {(room.status === 'QUESTION_ACTIVE' || room.status === 'ANSWER_REVEALED') && data.pergunta && <Card className="space-y-5">
      <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-brand-600">Pergunta {room.questao_atual + 1} de {room.total_questoes}</span><span className="text-xs text-slate-500">{data.total_respostas} de {data.aprovados} respostas</span></div>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{data.pergunta.enunciado}</h2>
      <div className="grid sm:grid-cols-2 gap-3">{data.distribuicao.map((d, i) => <div key={d.alternativa} className={`rounded-xl p-4 border ${room.status === 'ANSWER_REVEALED' && data.pergunta?.correta === d.alternativa ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'}`}><div className="flex items-center justify-between gap-2"><span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{String.fromCharCode(65 + i)} · {d.label}</span><strong className="text-lg">{d.total}</strong></div><div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 mt-3 overflow-hidden"><div className="h-full bg-brand-500 rounded-full" style={{ width: `${data.aprovados ? d.total / data.aprovados * 100 : 0}%` }}/></div>{room.status === 'ANSWER_REVEALED' && data.pergunta?.correta === d.alternativa && <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2 font-semibold flex items-center gap-1"><Check size={13}/> Resposta correta</p>}</div>)}</div>
      {room.status === 'ANSWER_REVEALED' && data.pergunta.explicacao && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-3 text-sm text-emerald-900 dark:text-emerald-200">{data.pergunta.explicacao}</div>}
      <div className="border-t border-slate-200 dark:border-white/10 pt-4"><h3 className="font-semibold text-sm mb-3">Respostas recebidas</h3>{data.respostas.length ? <div className="grid sm:grid-cols-2 gap-2">{data.respostas.map(r => <div key={r.participante_id} className="flex items-center justify-between gap-2 text-sm rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2"><span className="truncate text-slate-700 dark:text-slate-200">{r.nome}</span><span className="font-semibold">{String.fromCharCode(65 + r.alternativa)} {r.acertou === true ? '✓' : r.acertou === false ? '✕' : ''}</span></div>)}</div> : <p className="text-sm text-slate-400">Nenhuma resposta recebida ainda.</p>}</div>
      {room.status === 'QUESTION_ACTIVE' ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Você controla o momento da revelação.</p><Button onClick={() => run('revelar')} disabled={action.isPending}><Eye size={15}/> Revelar resposta</Button></div> : <div className="flex justify-end"><Button onClick={() => run('proxima')} disabled={action.isPending}><Play size={15}/>{room.questao_atual + 1 >= room.total_questoes ? 'Concluir partida' : 'Próxima pergunta'}</Button></div>}
    </Card>}

    {room.status === 'FINISHED' && <Card className="space-y-4"><div className="text-center"><Crown size={32} className="mx-auto text-amber-500"/><h2 className="text-xl font-semibold mt-2">Partida concluída!</h2><p className="text-sm text-slate-500">Confira o ranking final da equipe.</p></div><div className="divide-y divide-slate-100 dark:divide-white/10">{data.ranking.map(r => <div key={r.posicao} className="flex items-center justify-between py-3"><div className="flex items-center gap-3"><span className="w-7 text-center font-bold text-slate-400">{r.posicao}º</span><span className="text-sm font-medium text-slate-800 dark:text-white">{r.nome}</span></div><div className="text-right"><strong className="text-sm">{r.pontos} pts</strong><p className="text-[11px] text-slate-400">{r.acertos} acertos · {r.erros} erros</p></div></div>)}</div></Card>}

    {room.status !== 'CLOSED' && <div className="flex justify-end"><Button variant="outline" onClick={() => run('encerrar')} disabled={action.isPending}><Lock size={14}/> Encerrar sala</Button></div>}
    {room.status === 'CLOSED' && <Card className="text-center py-8"><Lock size={30} className="mx-auto text-slate-400 mb-2"/><h3 className="font-semibold">Sala encerrada</h3><p className="text-sm text-slate-500 mt-1">O link de participação não permite mais entrar ou responder.</p></Card>}
  </div>
}
