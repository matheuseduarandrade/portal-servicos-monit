import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Award, CheckCircle2, Clock, Download, Loader2, Mail, RotateCcw, Send, Trophy, XCircle, AlertTriangle } from 'lucide-react'
import { Card, Button } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import {
  iniciarQuiz, finalizarQuiz, baixarCertificado,
  type CertificadoNovo, type NivelQuiz, type ResultadoQuiz, type TentativaIniciada,
} from '@/services/quiz'

const LETRAS = ['A', 'B', 'C', 'D', 'E']
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function QuizRealizar() {
  const { trilhaId = '', nivel: nivelParam = '' } = useParams()
  const nivel = decodeURIComponent(nivelParam) as NivelQuiz
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [rodada, setRodada] = useState(0)
  const [resultado, setResultado] = useState<ResultadoQuiz | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['quiz-iniciar', trilhaId, nivel, rodada],
    queryFn: () => iniciarQuiz(trilhaId, nivel),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  function aoFinalizar(r: ResultadoQuiz) {
    setResultado(r)
    ;['quiz-trilhas', 'quiz-resumo', 'quiz-ranking', 'quiz-meus-certificados', 'quiz-minhas-tentativas'].forEach(
      (k) => qc.invalidateQueries({ queryKey: [k] }),
    )
  }
  function tentarNovamente() {
    setResultado(null)
    setRodada((r) => r + 1)
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-32 text-slate-400"><Loader2 size={24} className="animate-spin mr-2" /> Preparando o quiz…</div>
  }
  if (isError || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-24">
        <AlertTriangle size={34} className="mx-auto mb-3 text-amber-500" />
        <p className="font-medium text-ink-900 dark:text-white">Não foi possível iniciar o quiz.</p>
        <p className="text-sm text-slate-500 mt-1">{error instanceof Error ? error.message : ''}</p>
        <Button className="mt-5" onClick={() => navigate('/quiz')}><ArrowLeft size={14} /> Voltar ao Quiz</Button>
      </div>
    )
  }

  if (resultado) {
    return <Resultado r={resultado} titulo={data.trilha.titulo} onNovamente={tentarNovamente} onVoltar={() => navigate('/quiz')} />
  }
  return <Fazendo key={data.tentativa_id} data={data} onFinalizado={aoFinalizar} onSair={() => navigate('/quiz')} />
}

// ── Respondendo ──────────────────────────────────────────────────────────────
function Fazendo({ data, onFinalizado, onSair }: { data: TentativaIniciada; onFinalizado: (r: ResultadoQuiz) => void; onSair: () => void }) {
  const [idx, setIdx] = useState(0)
  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [confirmar, setConfirmar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const respRef = useRef(respostas)
  respRef.current = respostas

  const prazo = useRef<number | null>(data.restante_seg !== null ? Date.now() + data.restante_seg * 1000 : null)
  const [restante, setRestante] = useState<number | null>(data.restante_seg)
  const enviado = useRef(false)

  const mut = useMutation({
    mutationFn: () => finalizarQuiz(data.tentativa_id, respRef.current),
    onSuccess: onFinalizado,
    onError: (e: unknown) => { enviado.current = false; setErro(e instanceof Error ? e.message : 'Erro ao enviar as respostas.') },
  })
  const enviar = () => {
    if (enviado.current) return
    enviado.current = true
    setConfirmar(false)
    mut.mutate()
  }

  useEffect(() => {
    if (prazo.current === null) return
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((prazo.current! - Date.now()) / 1000))
      setRestante(s)
      if (s === 0) { clearInterval(t); enviar() }
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const q = data.questoes[idx]
  const total = data.questoes.length
  const respondidas = Object.keys(respostas).length
  const ultima = idx === total - 1

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-400">{data.trilha.titulo} • Nível {data.nivel} • Tentativa {data.numero}</p>
          <h1 className="text-lg font-semibold text-ink-900 dark:text-white">Questão {idx + 1} de {total}</h1>
        </div>
        {restante !== null && (
          <div className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold border ${
            restante <= 60 ? 'text-red-600 border-red-200 bg-red-50' : 'text-slate-600 dark:text-slate-200 border-slate-200 dark:border-white/10'
          }`}>
            <Clock size={14} /> {mmss(restante)}
          </div>
        )}
      </div>

      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden mb-5">
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${(respondidas / total) * 100}%` }} />
      </div>

      <Card>
        <p className="text-base font-medium text-ink-900 dark:text-white whitespace-pre-wrap">{q.enunciado}</p>
        <div className="mt-4 space-y-2">
          {q.opcoes.map((o, i) => {
            const marcada = respostas[q.id] === i
            return (
              <button key={i} onClick={() => setRespostas((r) => ({ ...r, [q.id]: i }))}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  marcada
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-800 dark:text-brand-200'
                    : 'border-slate-200 dark:border-white/10 hover:border-brand-300 text-slate-700 dark:text-slate-200'
                }`}>
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${marcada ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                  {q.tipo === 'vf' ? (i === 0 ? 'V' : 'F') : LETRAS[i]}
                </span>
                {o}
              </button>
            )
          })}
        </div>
      </Card>

      {erro && <p className="text-sm text-red-500 mt-3">{erro}</p>}

      <div className="flex items-center justify-between mt-5">
        <Button variant="outline" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0 || mut.isPending}>
          <ArrowLeft size={14} /> Anterior
        </Button>
        <div className="flex gap-1.5">
          {data.questoes.map((x, i) => (
            <button key={x.id} onClick={() => setIdx(i)} title={`Questão ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${i === idx ? 'bg-brand-600' : respostas[x.id] !== undefined ? 'bg-brand-300' : 'bg-slate-200 dark:bg-white/15'}`} />
          ))}
        </div>
        {ultima ? (
          <Button onClick={() => (respondidas < total ? setConfirmar(true) : enviar())} disabled={mut.isPending}>
            {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Finalizar
          </Button>
        ) : (
          <Button onClick={() => setIdx((i) => i + 1)}>Próxima <ArrowRight size={14} /></Button>
        )}
      </div>

      <div className="text-center mt-6">
        <button onClick={onSair} className="text-xs text-slate-400 hover:text-slate-600">Sair (a tentativa continua aberta)</button>
      </div>

      <Dialog open={confirmar} onOpenChange={setConfirmar} title="Finalizar o quiz?" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Você respondeu {respondidas} de {total} questões. As questões em branco contam como erro.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setConfirmar(false)}>Voltar</Button>
          <Button onClick={enviar}><Send size={14} /> Finalizar mesmo assim</Button>
        </div>
      </Dialog>
    </div>
  )
}

// ── Resultado ────────────────────────────────────────────────────────────────
function Resultado({ r, titulo, onNovamente, onVoltar }: { r: ResultadoQuiz; titulo: string; onNovamente: () => void; onVoltar: () => void }) {
  const t = r.tentativa
  const [celebrar, setCelebrar] = useState(!!r.certificado)
  const tom = r.expirada ? 'amber' : t.aprovado ? 'emerald' : 'red'
  const cores: Record<string, string> = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="text-center">
        <p className="text-xs text-slate-400">{titulo} • Nível {t.nivel} • Tentativa {t.numero}</p>
        <div className={`mx-auto mt-4 h-28 w-28 rounded-full border-4 flex flex-col items-center justify-center ${cores[tom]}`}>
          <span className="text-3xl font-bold">{t.percentual}%</span>
          <span className="text-[11px]">{t.acertos}/{t.total} acertos</span>
        </div>
        <h2 className="text-xl font-semibold mt-4 text-ink-900 dark:text-white">
          {r.expirada ? 'Tempo esgotado' : t.aprovado ? 'Você foi aprovado!' : 'Ainda não foi dessa vez'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {r.expirada
            ? 'O tempo acabou antes do envio, então esta tentativa não pontuou. Você pode tentar de novo.'
            : t.aprovado
              ? `Você conquistou ${t.pontos} pontos neste nível.`
              : `Você fez ${t.pontos} pontos. Para ser aprovado é preciso pelo menos ${t.nota_minima}%.`}
        </p>
        <p className="text-xs text-slate-400 mt-1">Registrado em {t.data?.split('-').reverse().join('/')} às {t.hora}</p>
        <div className="flex flex-wrap justify-center gap-3 mt-5">
          <Button onClick={onNovamente}><RotateCcw size={14} /> Tentar novamente</Button>
          <Button variant="outline" onClick={onVoltar}><ArrowLeft size={14} /> Voltar ao Quiz</Button>
        </div>
      </Card>

      {r.revisao.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-display font-semibold text-sm text-slate-500">Revisão das respostas</h3>
          {r.revisao.map((q, n) => (
            <Card key={q.id}>
              <div className="flex items-start gap-2">
                {q.acertou ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" /> : <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900 dark:text-white"><span className="text-slate-400">{n + 1}.</span> {q.enunciado}</p>
                  <p className="text-xs mt-1.5">
                    <span className="text-slate-400">Sua resposta: </span>
                    <span className={q.acertou ? 'text-emerald-600' : 'text-red-500'}>{q.resposta === null ? 'em branco' : q.opcoes[q.resposta]}</span>
                  </p>
                  {!q.acertou && (
                    <p className="text-xs mt-0.5"><span className="text-slate-400">Correta: </span><span className="text-emerald-600">{q.opcoes[q.correta]}</span></p>
                  )}
                  {q.explicacao && <p className="text-xs text-slate-500 mt-1.5 italic">{q.explicacao}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {r.certificado && celebrar && <Celebracao c={r.certificado} onFechar={() => setCelebrar(false)} />}
    </div>
  )
}

// ── Tela de comemoração ──────────────────────────────────────────────────────
const CORES = ['#f59e0b', '#2563eb', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

function Celebracao({ c, onFechar }: { c: CertificadoNovo; onFechar: () => void }) {
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confete] = useState(() =>
    Array.from({ length: 46 }, (_, i) => ({
      left: Math.random() * 100, delay: Math.random() * 1.8, dur: 2.6 + Math.random() * 2.2,
      cor: CORES[i % CORES.length], rot: Math.random() * 360, w: 6 + Math.random() * 6,
    })),
  )

  async function baixar() {
    setBaixando(true); setErro(null)
    try { await baixarCertificado(c.id) } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao baixar.') }
    setBaixando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-hidden">
      <style>{`
        @keyframes qz-fall { 0% { transform: translateY(-12vh) rotate(0deg); opacity: 1 } 100% { transform: translateY(110vh) rotate(720deg); opacity: .9 } }
        @keyframes qz-pop { 0% { transform: scale(.6); opacity: 0 } 70% { transform: scale(1.05) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes qz-bounce { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
      `}</style>
      {confete.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', top: 0, left: `${p.left}%`, width: p.w, height: p.w * 1.6, background: p.cor,
          transform: `rotate(${p.rot}deg)`, animation: `qz-fall ${p.dur}s ${p.delay}s linear infinite`, borderRadius: 2,
        }} />
      ))}

      <div className="relative bg-white dark:bg-surface-darkCard rounded-2xl shadow-popover max-w-md w-full p-8 text-center" style={{ animation: 'qz-pop .5s ease-out' }}>
        <div className="mx-auto h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center" style={{ animation: 'qz-bounce 1.4s ease-in-out infinite' }}>
          <Trophy size={40} className="text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold mt-4 text-ink-900 dark:text-white">Parabéns!</h2>
        <p className="text-sm text-slate-500 mt-2">Você concluiu a trilha</p>
        <p className="text-lg font-semibold text-brand-700 dark:text-brand-300">{c.titulo}</p>
        <div className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 px-3 py-1 text-sm font-semibold">
          <Award size={14} /> {c.pontos} pontos • {c.percentual}% de aproveitamento
        </div>

        <div className={`mt-4 rounded-lg px-3 py-2 text-xs flex items-start gap-2 text-left ${c.email_enviado ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <Mail size={14} className="shrink-0 mt-0.5" />
          <span>
            {c.email_enviado
              ? <>Enviamos o seu certificado para <b>{c.email}</b>.</>
              : <>Seu certificado foi emitido, mas o e-mail não pôde ser enviado agora. Você pode baixar o PDF ou reenviar em <b>Quiz › Meus certificados</b>.</>}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Código de validação: {c.codigo}</p>

        {erro && <p className="text-xs text-red-500 mt-2">{erro}</p>}
        <div className="flex gap-3 justify-center mt-5">
          <Button onClick={baixar} disabled={baixando}>
            {baixando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Baixar certificado
          </Button>
          <Button variant="outline" onClick={onFechar}>Fechar</Button>
        </div>
      </div>
    </div>
  )
}
