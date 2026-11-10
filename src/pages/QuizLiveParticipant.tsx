import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, LockKeyhole, Radio, Trophy, Users, XCircle } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui/primitives'
import { entrarSalaLive, estadoParticipanteLive, responderSalaLive } from '@/services/quizLive'

export default function QuizLiveParticipant() {
  const { codigo: codigoUrl = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  // A senha de acesso é o código da sala: vem pronta se o link a trouxer; senão o participante digita.
  const [senha, setSenha] = useState(codigoUrl.toUpperCase())
  const [codigoSala, setCodigoSala] = useState(codigoUrl.toUpperCase())
  const codigo = codigoUrl ? codigoUrl.toUpperCase() : codigoSala
  const storageKey = `portal-quizlive:${codigo}`
  const [nome, setNome] = useState('')
  const [token, setToken] = useState('')
  const [erro, setErro] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { setToken(localStorage.getItem(storageKey) || '') }, [storageKey])
  const state = useQuery({ queryKey: ['quizlive-participante', codigo, token], queryFn: () => estadoParticipanteLive(codigo, token), enabled: !!token, refetchInterval: 2500, retry: false })
  const join = useMutation({
    mutationFn: () => entrarSalaLive(senha.trim().toUpperCase(), nome.trim().replace(/\s+/g, ' ')),
    onSuccess: result => {
      const sala = senha.trim().toUpperCase()
      localStorage.setItem(`portal-quizlive:${sala}`, result.token)
      setCodigoSala(sala); setToken(result.token); setErro('')
      if (!codigoUrl) navigate(`/quiz-live/participar/${sala}`, { replace: true })   // o link passa a identificar a sala (atualizar a página não pede tudo de novo)
      qc.invalidateQueries({ queryKey: ['quizlive-participante', sala] })
    },
    onError: e => setErro(e instanceof Error ? e.message : 'Não foi possível entrar na sala.'),
  })
  const answer = useMutation({
    mutationFn: ({ questionId, option }: { questionId: string; option: number }) => responderSalaLive(codigo, token, questionId, option),
    onSuccess: () => { setSubmitting(false); qc.invalidateQueries({ queryKey: ['quizlive-participante', codigo, token] }) },
    onError: e => { setSubmitting(false); setErro(e instanceof Error ? e.message : 'Não foi possível enviar a resposta.') },
  })
  const data = state.data
  const errorCode = (state.error as { code?: string } | null)?.code
  const closed = errorCode === 'ROOM_CLOSED'
  const denied = errorCode === 'FORBIDDEN'
  const invalid = state.isError && ['UNAUTHENTICATED', 'NOT_FOUND'].includes(errorCode || '')

  function solicitarEntrada() {
    const nomeLimpo = nome.trim().replace(/\s+/g, ' ')
    const senhaLimpa = senha.trim().toUpperCase()
    if (nomeLimpo.length < 2) { setErro('Digite o seu nome.'); return }
    if (!senhaLimpa) { setErro('Digite a senha de acesso.'); return }
    if (nomeLimpo.toUpperCase() === senhaLimpa) { setErro('Digite o seu nome no campo "Seu nome". A senha de acesso vai no outro campo.'); return }
    setErro('')
    join.mutate()
  }

  function submitAnswer(option: number) {
    if (!data?.pergunta || data.minha_resposta || submitting) return
    setSubmitting(true)
    answer.mutate({ questionId: data.pergunta.id, option })
  }

  if (state.isError && !closed && !denied && !invalid) return <Shell><XCircle className="mx-auto text-rose-500" size={38}/><h1 className="text-xl font-semibold mt-3">Falha na conexão</h1><p className="text-sm text-slate-500 mt-2">{state.error instanceof Error ? state.error.message : 'Não foi possível atualizar a sala.'}</p><Button className="w-full justify-center mt-4" onClick={() => state.refetch()}>Tentar novamente</Button></Shell>
  if (closed) return <Shell><LockKeyhole className="mx-auto text-slate-400" size={38}/><h1 className="text-xl font-semibold mt-3">Sala encerrada</h1><p className="text-sm text-slate-500 mt-2">Esta partida foi encerrada pelo administrador. O link não está mais ativo.</p></Shell>
  if (denied) return <Shell><XCircle className="mx-auto text-rose-500" size={38}/><h1 className="text-xl font-semibold mt-3">Acesso não aprovado</h1><p className="text-sm text-slate-500 mt-2">Sua solicitação foi recusada ou seu acesso foi bloqueado.</p></Shell>
  if (!token || invalid) return <Shell><Radio size={34} className="mx-auto text-brand-600"/><h1 className="text-xl font-semibold mt-3">Entrar no Quiz Live</h1><p className="text-sm text-slate-500 mt-1">Informe seu nome e a senha de acesso da sala.</p>{invalid && <p className="text-sm text-rose-500 mt-3">{state.error instanceof Error ? state.error.message : 'Não foi possível validar seu acesso.'}</p>}<form className="mt-5 space-y-3 text-left" onSubmit={e => { e.preventDefault(); solicitarEntrada() }}><div><label className="block text-xs font-medium text-slate-500 mb-1">Seu nome</label><Input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Digite seu nome" maxLength={60} autoComplete="name"/></div><div><label className="block text-xs font-medium text-slate-500 mb-1">Senha de acesso</label><Input value={senha} onChange={e => setSenha(e.target.value.toUpperCase())} placeholder="Senha informada pelo administrador" maxLength={16} autoComplete="off" autoCapitalize="characters" spellCheck={false}/></div><Button className="w-full justify-center" type="submit" disabled={!nome.trim() || !senha.trim() || join.isPending}>{join.isPending ? 'Solicitando entrada...' : 'Solicitar entrada'}</Button></form>{erro && <p className="text-sm text-rose-500 mt-3">{erro}</p>}<p className="text-[11px] text-slate-400 mt-4">Você precisará aguardar a aprovação do administrador.</p></Shell>
  if (state.isLoading || !data) return <Shell><div className="animate-pulse text-sm text-slate-400">Conectando à sala...</div></Shell>

  const status = data.sala.status
  const participantStatus = data.participante.status
  if (status === 'CLOSED') return <Shell><LockKeyhole className="mx-auto text-slate-400" size={38}/><h1 className="text-xl font-semibold mt-3">Sala encerrada</h1><p className="text-sm text-slate-500 mt-2">Esta partida foi encerrada pelo administrador.</p></Shell>

  return <main className="min-h-screen bg-slate-950 text-white px-4 py-6 flex justify-center"><div className="w-full max-w-xl space-y-4">
    <div className="text-center py-3"><div className="inline-flex items-center gap-2 text-xs text-sky-300 uppercase tracking-widest"><Radio size={14}/> Quiz Live</div><h1 className="text-xl font-semibold mt-2">{data.sala.titulo}</h1><p className="text-xs text-slate-400 mt-1">Olá, {data.participante.nome}</p></div>
    {participantStatus === 'PENDING' ? <Card className="text-center py-10"><Clock3 size={38} className="mx-auto text-amber-500"/><h2 className="font-semibold text-slate-800 dark:text-white mt-3">Aguardando aprovação</h2><p className="text-sm text-slate-500 mt-2">Sua solicitação foi enviada. Assim que o administrador aprovar, a partida aparecerá aqui.</p></Card> : <>
      {status === 'WAITING' && <Card className="text-center py-10"><Users size={38} className="mx-auto text-brand-500"/><h2 className="font-semibold text-slate-800 dark:text-white mt-3">Você está na sala!</h2><p className="text-sm text-slate-500 mt-2">Aguarde o administrador iniciar a partida.</p></Card>}
      {status === 'QUESTION_ACTIVE' && data.pergunta && <Card className="space-y-4"><div className="flex items-center justify-between text-xs text-slate-500"><span>PERGUNTA {data.sala.questao_atual + 1}/{data.sala.total_questoes}</span><span>{data.participante.pontos} pontos</span></div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">{data.pergunta.enunciado}</h2>{data.minha_resposta ? <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-5 text-center"><CheckCircle2 size={30} className="mx-auto text-emerald-600"/><p className="font-semibold text-emerald-800 dark:text-emerald-200 mt-2">Resposta enviada!</p><p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">Aguarde o administrador revelar o resultado.</p></div> : <div className="grid grid-cols-1 gap-3">{data.pergunta.opcoes.map((option, i) => <button key={i} onClick={() => submitAnswer(i)} disabled={answer.isPending || submitting} className="flex items-center gap-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-500/20 text-left text-slate-800 dark:text-white p-4 border-2 border-transparent hover:border-brand-500 disabled:opacity-60"><span className="w-9 h-9 shrink-0 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">{String.fromCharCode(65 + i)}</span><span className="font-medium text-sm">{option}</span></button>)}</div>}{erro && <p className="text-sm text-rose-500">{erro}</p>}</Card>}
      {status === 'ANSWER_REVEALED' && data.pergunta && <Card className="space-y-4"><div className="text-xs text-slate-500">PERGUNTA {data.sala.questao_atual + 1}/{data.sala.total_questoes}</div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">{data.pergunta.enunciado}</h2><div className="rounded-xl p-4 text-center bg-emerald-50 dark:bg-emerald-500/10"><CheckCircle2 size={30} className="mx-auto text-emerald-600"/><p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mt-2">Resposta correta: {String.fromCharCode(65 + (data.pergunta.correta || 0))} — {data.pergunta.opcoes[data.pergunta.correta || 0]}</p>{data.minha_resposta && <p className={`text-sm mt-2 font-semibold ${data.minha_resposta.acertou ? 'text-emerald-700' : 'text-rose-600'}`}>{data.minha_resposta.acertou ? 'Você acertou! +100 pontos' : 'Você não acertou desta vez.'}</p>}{!data.minha_resposta && <p className="text-sm text-slate-500 mt-2">Você não respondeu esta pergunta.</p>}</div>{data.pergunta.explicacao && <p className="text-sm text-slate-600 dark:text-slate-300">{data.pergunta.explicacao}</p>}<p className="text-center text-xs text-slate-400">Aguarde a próxima pergunta.</p></Card>}
      {status === 'FINISHED' && <Card className="text-center py-6 space-y-3"><Trophy size={38} className="mx-auto text-amber-500"/><h2 className="text-xl font-semibold text-slate-900 dark:text-white">Partida concluída!</h2><p className="text-sm text-slate-500">Você terminou com {data.participante.pontos} pontos · {data.participante.acertos} acertos · {data.participante.erros} erros.</p><div className="text-left border-t border-slate-200 dark:border-white/10 pt-3">{data.ranking.map(r => <div key={r.posicao} className="flex justify-between py-2 text-sm"><span className="text-slate-700 dark:text-slate-200">{r.posicao}º · {r.nome}</span><strong className="text-slate-900 dark:text-white">{r.pontos} pts</strong></div>)}</div></Card>}
    </>}
    <p className="text-center text-[10px] text-slate-500">Portal de Serviços · Quiz Live</p>
  </div></main>
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8"><div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 text-center p-7 shadow-xl">{children}<p className="text-[10px] text-slate-400 mt-6">Portal de Serviços · Quiz Live</p></div></main>
}
