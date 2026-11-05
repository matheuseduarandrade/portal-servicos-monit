import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight, Megaphone, FolderKanban, Boxes,
  CalendarDays, Sun, Cake, Wrench, MapPin,
  AlertTriangle, Info, AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, Badge, Kpi } from '@/components/ui/primitives'
import { formatDate } from '@/lib/utils'
import { fetchProjetos } from '@/services/projetos'
import { fetchColaboradores } from '@/services/colaboradores'
import { fetchTecnicos } from '@/services/tecnicos'
import { fetchSistemas } from '@/services/sistemas'
import { fetchComunicados, fetchEventos } from '@/services/portal'

// ── Lidos localmente ─────────────────────────────────────────────────────────
const LIDOS_KEY = 'portal:comunicados-lidos'
function getLidos(): string[] {
  try { return JSON.parse(localStorage.getItem(LIDOS_KEY) ?? '[]') } catch { return [] }
}
function marcarLido(id: string) {
  const lidos = getLidos()
  if (!lidos.includes(id)) localStorage.setItem(LIDOS_KEY, JSON.stringify([...lidos, id]))
}

// ── Cores de prioridade ───────────────────────────────────────────────────────
const PRIO_ICON: Record<string, any>    = { Urgente: AlertTriangle, Importante: AlertCircle, Informativo: Info }
const PRIO_COLOR: Record<string, string> = {
  Urgente:     'text-red-500',
  Importante:  'text-amber-500',
  Informativo: 'text-blue-500',
}
const PRIO_BADGE: Record<string, 'danger' | 'warning' | 'info'> = {
  Urgente: 'danger', Importante: 'warning', Informativo: 'info',
}

// ── Tipo evento ───────────────────────────────────────────────────────────────
const TIPO_DOT: Record<string, string> = {
  'Reunião':     'bg-blue-500',
  'Treinamento': 'bg-green-500',
  'Feriado':     'bg-red-500',
  'Evento':      'bg-purple-500',
}

export default function Home() {
  const { user } = useAuth()
  const [lidosState, setLidosState] = useState<string[]>(getLidos)

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = (user?.nome ?? '').split(' ')[0]

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos'],
    queryFn: fetchProjetos,
  })

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos-all'],
    queryFn: () => fetchTecnicos(),
  })

  const { data: comunicados = [] } = useQuery({
    queryKey: ['comunicados'],
    queryFn: fetchComunicados,
  })

  const { data: eventos = [] } = useQuery({
    queryKey: ['eventos'],
    queryFn: fetchEventos,
  })

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => fetchColaboradores(),
  })

  const { data: sistemas = [] } = useQuery({
    queryKey: ['sistemas'],
    queryFn: fetchSistemas,
  })

  // ── Sistemas mais acessados ───────────────────────────────────────────────
  const ACESSOS_KEY = 'portal:sistemas-acessos'
  function getAcessos(): Record<string, number> {
    try { return JSON.parse(localStorage.getItem(ACESSOS_KEY) ?? '{}') } catch { return {} }
  }

  const sistemasMaisAcessados = useMemo(() => {
    const acessos = getAcessos()
    return [...sistemas]
      .sort((a, b) => (acessos[b.id] ?? 0) - (acessos[a.id] ?? 0))
      .slice(0, 4)
  }, [sistemas])

  // ── Aniversariantes do mês ────────────────────────────────────────────────
  const mesAtual = new Date().getMonth() + 1
  const aniversariantesMes = useMemo(() =>
    colaboradores.filter(c => {
      if (!c.data_nascimento) return false
      const partes = c.data_nascimento.split('/')
      return partes.length >= 2 && Number(partes[1]) === mesAtual
    }).sort((a, b) => {
      const da = Number(a.data_nascimento?.split('/')[0] ?? 0)
      const db = Number(b.data_nascimento?.split('/')[0] ?? 0)
      return da - db
    }),
    [colaboradores, mesAtual]
  )

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const projetosAtivos  = projetos.filter((p: any) => p.status === 'Em andamento')
  const tecnicosAtivos  = tecnicos.filter((t: any) => t.ativo)
  const estadosTecnicos = new Set(tecnicosAtivos.map((t: any) => t.estado)).size

  // Comunicados não lidos
  const comunicadosNaoLidos = comunicados.filter((c: any) => !lidosState.includes(c.id))
  const urgentesNaoLidos    = comunicadosNaoLidos.filter((c: any) => c.prioridade === 'Urgente')

  // Eventos desta semana
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const fimSemana = new Date(hoje); fimSemana.setDate(hoje.getDate() + 7)
  const eventosSemana = eventos.filter((e: any) => {
    const d = new Date(e.inicio)
    return d >= hoje && d <= fimSemana
  })

  // Próximos 4 eventos
  const proximosEventos = [...eventos]
    .filter((e: any) => new Date(e.inicio) >= hoje)
    .sort((a: any, b: any) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    .slice(0, 4)

  function handleLerComunicado(id: string) {
    marcarLido(id)
    setLidosState(getLidos())
  }

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
          <Sun size={15} /> {saudacao}, {primeiroNome}
        </div>
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-white">
          Visão geral — Time de Operações
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Projetos ativos"
          value={projetosAtivos.length}
        />
        <Kpi
          label="Técnicos credenciados"
          value={tecnicosAtivos.length}
          hint={`${estadosTecnicos} estados`}
        />
        <Kpi
          label="Comunicados ativos"
          value={comunicadosNaoLidos.length}
          hint={urgentesNaoLidos.length ? `${urgentesNaoLidos.length} urgentes` : undefined}
          tone={urgentesNaoLidos.length ? 'warning' : 'default'}
        />
        <Kpi
          label="Eventos esta semana"
          value={eventosSemana.length}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Comunicados recentes */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base flex items-center gap-2">
                <Megaphone size={17} className="text-brand-600" /> Comunicados recentes
              </h2>
              <Link to="/comunicados" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                Ver todos <ArrowUpRight size={13} />
              </Link>
            </div>
            <div className="space-y-1">
              {comunicados.slice(0, 5).map((c: any) => {
                const lido = lidosState.includes(c.id)
                const Icon = PRIO_ICON[c.prioridade] ?? Info
                return (
                  <button
                    key={c.id}
                    onClick={() => handleLerComunicado(c.id)}
                    className={`w-full text-left flex items-start justify-between gap-3 py-2.5 px-2 rounded-lg border-b border-black/5 dark:border-white/5 last:border-0 transition-colors ${lido ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <Icon size={15} className={`flex-shrink-0 mt-0.5 ${PRIO_COLOR[c.prioridade]}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${lido ? 'text-slate-400' : 'text-ink-900 dark:text-white'}`}>
                          {c.titulo}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{c.autor} · {c.data ? formatDate(c.data) : ''} · {c.categoria}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge tone={PRIO_BADGE[c.prioridade]}>{c.prioridade}</Badge>
                      {lido && <span className="text-[10px] text-slate-400">lido</span>}
                    </div>
                  </button>
                )
              })}
              {comunicados.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Nenhum comunicado publicado.</p>
              )}
            </div>
          </Card>

          {/* Projetos em andamento */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base flex items-center gap-2">
                <FolderKanban size={17} className="text-brand-600" /> Projetos em andamento
              </h2>
              <Link to="/projetos" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                Ver dashboard <ArrowUpRight size={13} />
              </Link>
            </div>
            <div className="space-y-4">
              {projetosAtivos.slice(0, 5).map((p: any) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-ink-900 dark:text-white truncate pr-4">{p.nome}</span>
                    <span className="text-xs text-slate-500 flex-shrink-0">{Math.round(p.percentual)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${Math.min(p.percentual, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {projetosAtivos.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Nenhum projeto em andamento.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">

          {/* Aniversariantes do mês */}
          <Card>
            <h2 className="font-display font-semibold text-base flex items-center gap-2 mb-4">
              <Cake size={17} className="text-brand-600" /> Aniversariantes do mês
            </h2>
            <div className="space-y-2.5">
              {aniversariantesMes.slice(0, 5).map(c => {
                const dia = c.data_nascimento?.split('/')[0]
                const initials = (c.nome_completo || c.nome).split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase()
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-500/10 flex items-center justify-center text-pink-700 dark:text-pink-300 text-xs font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-900 dark:text-white truncate">{c.nome_completo || c.nome}</p>
                      <p className="text-xs text-slate-400">{c.cargo || c.setor || ''}</p>
                    </div>
                    <span className="text-xs font-mono text-pink-500 flex-shrink-0">dia {dia}</span>
                  </div>
                )
              })}
              {aniversariantesMes.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Nenhum aniversariante este mês.</p>
              )}
            </div>
          </Card>

          {/* Sistemas mais acessados */}
          <Card>
            <h2 className="font-display font-semibold text-base flex items-center gap-2 mb-4">
              <Boxes size={17} className="text-brand-600" /> Sistemas mais acessados
            </h2>
            <div className="space-y-1">
              {sistemasMaisAcessados.map((s: any) => (
                <Link
                  key={s.id}
                  to={s.tem_manual && s.manual ? `/biblioteca/${s.manual}` : '/sistemas'}
                  onClick={() => {
                    const acessos = getAcessos()
                    acessos[s.id] = (acessos[s.id] ?? 0) + 1
                    localStorage.setItem(ACESSOS_KEY, JSON.stringify(acessos))
                  }}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="text-ink-900 dark:text-white font-medium">{s.nome}</span>
                  <ArrowUpRight size={14} className="text-slate-400" />
                </Link>
              ))}
              {sistemasMaisAcessados.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Nenhum sistema cadastrado.</p>
              )}
            </div>
            <Link to="/sistemas" className="mt-3 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
              Ver todos os sistemas <ArrowUpRight size={13} />
            </Link>
          </Card>

          {/* Próximos eventos */}
          <Card>
            <h2 className="font-display font-semibold text-base flex items-center gap-2 mb-4">
              <CalendarDays size={17} className="text-brand-600" /> Próximos eventos
            </h2>
            <div className="space-y-3">
              {proximosEventos.map((ev: any) => (
                <div key={ev.id} className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${TIPO_DOT[ev.tipo] ?? 'bg-slate-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-ink-900 dark:text-white">{ev.titulo}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(ev.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      {ev.local && <> · <MapPin size={10} className="inline" /> {ev.local}</>}
                    </p>
                  </div>
                </div>
              ))}
              {proximosEventos.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Nenhum evento próximo.</p>
              )}
            </div>
            <Link to="/calendario" className="mt-3 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
              Abrir calendário <ArrowUpRight size={13} />
            </Link>
          </Card>

        </div>
      </div>
    </div>
  )
}
