import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Trophy, Star, Target, Award, Loader2, Settings, Clock, HelpCircle, CheckCircle2, Lock, Play,
  Download, Mail, History, Flame, BarChart3,
} from 'lucide-react'
import { Card, Badge, Button } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { useAuth, canManage } from '@/contexts/AuthContext'
import { UserAvatar } from '@/components/forum/UserAvatar'
import { formatDate } from '@/lib/utils'
import {
  fetchTrilhas, fetchRanking, fetchResumo, fetchMeusCertificados, fetchMinhasTentativas,
  baixarCertificado, reenviarCertificado, CATEGORIAS_QUIZ,
  type Periodo, type Trilha,
} from '@/services/quiz'

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'dia', label: 'Hoje' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mês' },
  { id: 'geral', label: 'Geral' },
]
const MEDALHA = ['bg-amber-400 text-white', 'bg-slate-300 text-slate-700', 'bg-orange-400 text-white']
const fmt = (n: number) => n.toLocaleString('pt-BR')

export default function Quiz() {
  const { user } = useAuth()
  const admin = canManage(user)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const destaqueId = params.get('trilha')

  const [categoria, setCategoria] = useState('Todos')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [certsAberto, setCertsAberto] = useState(false)
  const [histAberto, setHistAberto] = useState(false)

  const { data: trilhas = [], isLoading, isError, error } = useQuery({ queryKey: ['quiz-trilhas'], queryFn: () => fetchTrilhas() })
  const { data: resumo } = useQuery({ queryKey: ['quiz-resumo'], queryFn: fetchResumo })
  const { data: ranking } = useQuery({ queryKey: ['quiz-ranking', periodo], queryFn: () => fetchRanking(periodo) })

  const filtradas = trilhas.filter((t) => categoria === 'Todos' || t.categoria === categoria)
  const nivel = resumo?.nivel
  const pctNivel = nivel && nivel.proximo_minimo
    ? Math.min(100, Math.round(((nivel.pontos - nivel.minimo) / (nivel.proximo_minimo - nivel.minimo)) * 100))
    : 100

  return (
    <div>
      {/* ── Banner ── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b2a6b] via-[#123a8f] to-brand-700 text-white p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <Trophy size={34} className="text-amber-300" />
              <h1 className="text-3xl font-semibold">Quiz</h1>
            </div>
            <p className="text-sm text-white/80 mt-2">Teste seus conhecimentos, acumule pontos, conquiste certificados e suba no ranking!</p>
            {admin && (
              <Button variant="outline" size="sm" className="mt-4 !border-white/40 !text-white hover:!bg-white/10" onClick={() => navigate('/quiz/admin')}>
                <Settings size={14} /> Gerenciar trilhas
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={<Trophy size={20} className="text-amber-300" />} valor={resumo ? fmt(resumo.certificados) : '–'} rotulo="Certificados conquistados" />
            <Stat icon={<Star size={20} className="text-sky-300" />} valor={resumo ? fmt(resumo.pontos_totais) : '–'} rotulo="Pontos totais" />
            <Stat icon={<Target size={20} className="text-rose-300" />} valor={resumo ? fmt(resumo.niveis_concluidos) : '–'} rotulo="Níveis concluídos" />
            <Stat icon={<Award size={20} className="text-amber-200" />} valor={resumo?.posicao_mes ? `${resumo.posicao_mes}º` : '–'} rotulo="Sua posição no mês" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* ── Trilhas ── */}
        <div>
          <div className="flex flex-wrap gap-2 mb-5">
            {['Todos', ...CATEGORIAS_QUIZ].map((c) => (
              <button key={c} onClick={() => setCategoria(c)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  categoria === c
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-brand-400'
                }`}>
                {c}
              </button>
            ))}
          </div>

          <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
            <Flame size={18} className="text-orange-500" /> Trilhas de conhecimento
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-16 text-slate-400"><Loader2 size={20} className="animate-spin mr-2" /> Carregando...</div>
          ) : isError ? (
            <div className="text-center py-12 text-sm">
              <p className="text-red-500 font-medium">Não foi possível carregar o quiz.</p>
              <p className="text-slate-400 mt-1 max-w-md mx-auto">{error instanceof Error ? error.message : ''}</p>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <HelpCircle size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma trilha disponível {categoria !== 'Todos' ? `em ${categoria}` : 'ainda'}.</p>
              {admin && <p className="text-xs mt-1 text-brand-500">Use "Gerenciar trilhas" para criar a primeira.</p>}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filtradas.map((t) => (
                <TrilhaCard key={t.id} t={t} destaque={t.id === destaqueId}
                  onIniciar={(n) => navigate(`/quiz/fazer/${t.id}/${encodeURIComponent(n)}`)}
                  onCertificados={() => setCertsAberto(true)} />
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-gradient-to-r from-[#0b2a6b] to-brand-700 text-white p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Award size={34} className="text-amber-300 shrink-0" />
              <div>
                <p className="font-semibold">Conquiste certificados!</p>
                <p className="text-xs text-white/75">Conclua os 3 níveis de uma trilha, acumule pontos e receba o certificado por e-mail.</p>
              </div>
            </div>
            <Button variant="outline" className="!border-white/40 !text-white hover:!bg-white/10" onClick={() => setCertsAberto(true)}>
              <Award size={15} /> Ver meus certificados
            </Button>
          </div>
        </div>

        {/* ── Coluna lateral ── */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm flex items-center gap-2"><Trophy size={15} className="text-amber-500" /> Ranking Geral</h3>
              <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}
                className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-1 text-xs">
                {PERIODOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>

            {!ranking ? (
              <div className="flex justify-center py-8 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
            ) : ranking.itens.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Ninguém pontuou neste período ainda. Seja o primeiro!</p>
            ) : (
              <div className="space-y-1">
                {ranking.itens.map((i) => <LinhaRanking key={i.usuario_id} i={i} />)}
                {ranking.eu && !ranking.itens.some((i) => i.sou_eu) && (
                  <>
                    <div className="text-center text-slate-300 text-xs">•••</div>
                    <LinhaRanking i={{ ...ranking.eu, sou_eu: true }} />
                  </>
                )}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="font-display font-semibold text-sm flex items-center gap-2 mb-3"><BarChart3 size={15} className="text-brand-600" /> Seu Desempenho</h3>
            {nivel && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-brand-700 dark:text-brand-300">Nível {nivel.numero} — {nivel.nome}</span>
                  <span className="text-slate-400">{fmt(nivel.pontos)}{nivel.proximo_minimo ? ` / ${fmt(nivel.proximo_minimo)} pts` : ' pts'}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pctNivel}%` }} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Mini valor={resumo ? fmt(resumo.niveis_concluidos) : '–'} rotulo="Níveis concluídos" />
              <Mini valor={resumo ? fmt(resumo.certificados) : '–'} rotulo="Certificados" />
              <Mini valor={resumo?.posicao_mes ? `${resumo.posicao_mes}º` : '–'} rotulo="Posição no mês" />
              <Mini valor={resumo ? `+${fmt(resumo.pontos_mes)}` : '–'} rotulo="Pontos no mês" />
            </div>
            <Button variant="outline" size="sm" className="w-full justify-center mt-3" onClick={() => setHistAberto(true)}>
              <History size={14} /> Meu histórico
            </Button>
          </Card>
        </div>
      </div>

      <CertificadosDialog open={certsAberto} onClose={() => setCertsAberto(false)} />
      <HistoricoDialog open={histAberto} onClose={() => setHistAberto(false)} />
    </div>
  )
}

function Stat({ icon, valor, rotulo }: { icon: React.ReactNode; valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 min-w-[120px]">
      {icon}
      <p className="text-2xl font-semibold mt-1">{valor}</p>
      <p className="text-[11px] text-white/70 leading-tight">{rotulo}</p>
    </div>
  )
}
function Mini({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-lg border border-slate-100 dark:border-white/10 px-3 py-2 text-center">
      <p className="text-lg font-semibold text-ink-900 dark:text-white">{valor}</p>
      <p className="text-[11px] text-slate-400">{rotulo}</p>
    </div>
  )
}

function LinhaRanking({ i }: { i: { posicao: number; nome: string; foto_url: string | null; pontos: number; certificados: number; sou_eu: boolean } }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg px-2 py-2 ${i.sou_eu ? 'bg-brand-50 dark:bg-brand-500/10' : ''}`}>
      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${MEDALHA[i.posicao - 1] ?? 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>{i.posicao}</span>
      <UserAvatar nome={i.nome} fotoUrl={i.foto_url} size={32} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${i.sou_eu ? 'font-semibold text-brand-700 dark:text-brand-300' : 'font-medium text-ink-900 dark:text-white'}`}>{i.nome}</p>
        <p className="text-[11px] text-slate-400">{i.certificados} {i.certificados === 1 ? 'certificado' : 'certificados'}</p>
      </div>
      <span className="text-sm font-semibold text-slate-600 dark:text-slate-200 shrink-0">{fmt(i.pontos)} pts</span>
    </div>
  )
}

function TrilhaCard({ t, destaque, onIniciar, onCertificados }: {
  t: Trilha; destaque: boolean; onIniciar: (n: string) => void; onCertificados: () => void
}) {
  const aprovados = t.niveis.filter((n) => n.aprovado).length
  return (
    <Card className={`flex flex-col ${destaque ? 'ring-2 ring-brand-500' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 shrink-0">
          <Trophy size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-semibold text-sm text-ink-900 dark:text-white">{t.titulo}</h3>
            <Badge tone="info">{t.categoria}</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{t.descricao}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1"><HelpCircle size={12} /> {t.questoes_por_nivel} questões por nível</span>
        {t.tempo_min > 0 && <span className="inline-flex items-center gap-1"><Clock size={12} /> {t.tempo_min} min</span>}
        <span className="inline-flex items-center gap-1"><Star size={12} /> até +{t.pontos_max} pts</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {t.niveis.map((n) => (
          <button key={n.nivel} disabled={!n.disponivel} onClick={() => onIniciar(n.nivel)}
            title={!n.disponivel ? 'Nível em preparação' : `Melhor resultado: ${n.melhor_percentual}%`}
            className={`rounded-lg border px-2 py-2 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              n.aprovado
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
                : 'border-slate-200 dark:border-white/10 hover:border-brand-400 text-slate-700 dark:text-slate-200'
            }`}>
            <span className="flex items-center justify-center gap-1 text-xs font-semibold">
              {n.aprovado ? <CheckCircle2 size={13} /> : n.disponivel ? <Play size={12} /> : <Lock size={12} />} {n.nivel}
            </span>
            <span className="block text-[11px] mt-0.5 opacity-80">
              {n.tentativas > 0 ? `${n.melhor_pontos} pts` : n.disponivel ? 'Iniciar' : 'Em breve'}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-400">{aprovados}/3 níveis aprovados • nota mínima {t.nota_minima}%</span>
        {t.certificado && (
          <button onClick={onCertificados} className="inline-flex items-center gap-1 text-emerald-600 font-medium hover:underline">
            <Award size={13} /> Certificado conquistado
          </button>
        )}
      </div>
    </Card>
  )
}

function CertificadosDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data = [], isLoading } = useQuery({ queryKey: ['quiz-meus-certificados'], queryFn: fetchMeusCertificados, enabled: open })
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function baixar(id: string) {
    setOcupado(id); setMsg(null)
    try { await baixarCertificado(id) } catch (e) { setMsg(e instanceof Error ? e.message : 'Erro ao baixar o certificado.') }
    setOcupado(null)
  }
  async function reenviar(id: string) {
    setOcupado(id); setMsg(null)
    try {
      const r = await reenviarCertificado(id)
      setMsg(r.email_enviado ? `Certificado enviado para ${r.email}.` : (r.erro ?? 'Não foi possível enviar o e-mail.'))
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Erro ao reenviar.') }
    setOcupado(null)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Meus certificados" size="md">
      {isLoading ? (
        <div className="flex justify-center py-10 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Award size={34} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Você ainda não conquistou certificados.</p>
          <p className="text-xs mt-1">Seja aprovado nos 3 níveis de uma trilha para receber o seu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-ink-900 dark:text-white">{c.titulo}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Concluído em {formatDate(c.data_conclusao)} • {c.pontos} pontos • código {c.codigo}</p>
                  <p className={`text-xs mt-1 ${c.email_enviado ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {c.email_enviado ? 'Enviado por e-mail' : 'E-mail ainda não enviado'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => baixar(c.id)} disabled={ocupado === c.id}>
                    {ocupado === c.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reenviar(c.id)} disabled={ocupado === c.id}>
                    <Mail size={13} /> Reenviar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {msg && <p className="text-xs text-slate-500 mt-3">{msg}</p>}
    </Dialog>
  )
}

function HistoricoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data = [], isLoading } = useQuery({ queryKey: ['quiz-minhas-tentativas'], queryFn: fetchMinhasTentativas, enabled: open })
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Meu histórico" description="Todas as tentativas, com data e horário." size="lg">
      {isLoading ? (
        <div className="flex justify-center py-10 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">Você ainda não fez nenhuma tentativa.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-black/5 dark:border-white/10">
                <th className="py-2 pr-3 font-medium">Data</th><th className="py-2 pr-3 font-medium">Trilha</th>
                <th className="py-2 pr-3 font-medium">Nível</th><th className="py-2 pr-3 font-medium">Acertos</th>
                <th className="py-2 pr-3 font-medium">Pontos</th><th className="py-2 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="border-b border-black/5 dark:border-white/5 last:border-0">
                  <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{t.data?.split('-').reverse().join('/')} {t.hora}</td>
                  <td className="py-2 pr-3">{t.trilha_titulo}</td>
                  <td className="py-2 pr-3">{t.nivel} <span className="text-xs text-slate-400">#{t.numero}</span></td>
                  <td className="py-2 pr-3">{t.acertos}/{t.total}</td>
                  <td className="py-2 pr-3 font-medium">{t.pontos}</td>
                  <td className="py-2">
                    <Badge tone={t.status === 'expirada' ? 'warning' : t.aprovado ? 'success' : 'danger'}>
                      {t.status === 'expirada' ? 'Tempo esgotado' : t.aprovado ? 'Aprovado' : 'Reprovado'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  )
}
