import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2,
  MapPin, Users, Calendar, Clock, Cake,
} from 'lucide-react'
import { PageHeader, Card, Button, Input, Badge } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { useAuth, canManage } from '@/contexts/AuthContext'
import { fetchColaboradores } from '@/services/colaboradores'
import { fetchEventos as apiFetchEventos, criarEvento as apiCriarEvento, removerEvento as apiRemoverEvento } from '@/services/portal'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Evento {
  id: string
  titulo: string
  tipo: string
  inicio: string
  fim?: string | null
  area?: string | null
  local?: string | null
  colaboradores?: string | null
  descricao?: string | null
}

// ── Constantes ────────────────────────────────────────────────────────────────
const TIPOS = ['Reunião', 'Treinamento', 'Feriado', 'Evento']
const LOCAIS = ['Neo Room', 'Trix Room', 'Peter Work Pod', 'Bino Work Pod']
const AREAS  = ['Serviços', 'SCM', 'Projetos', 'Atendimento']

const TIPO_COLOR: Record<string, string> = {
  'Reunião':     'bg-blue-100 text-blue-700 border-blue-200',
  'Treinamento': 'bg-green-100 text-green-700 border-green-200',
  'Feriado':     'bg-red-100 text-red-700 border-red-200',
  'Evento':      'bg-purple-100 text-purple-700 border-purple-200',
  'Aniversário': 'bg-pink-100 text-pink-700 border-pink-200',
}

const TIPO_DOT: Record<string, string> = {
  'Reunião':     'bg-blue-500',
  'Treinamento': 'bg-green-500',
  'Feriado':     'bg-red-500',
  'Evento':      'bg-purple-500',
  'Aniversário': 'bg-pink-500',
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

// ── API ───────────────────────────────────────────────────────────────────────
const fetchEventos = (): Promise<Evento[]> => apiFetchEventos()
const criarEvento = (body: Partial<Evento>): Promise<Evento> => apiCriarEvento(body)
const removerEvento = (id: string): Promise<void> => apiRemoverEvento(id)

// ── Formulário de evento ──────────────────────────────────────────────────────
function EventoForm({ colaboradores, loading, onSave, onCancel }: {
  colaboradores: any[]
  loading: boolean
  onSave: (d: Partial<Evento>) => void
  onCancel: () => void
}) {
  const hoje = new Date().toISOString().slice(0, 16)
  const [form, setForm] = useState({
    titulo: '', tipo: 'Reunião', inicio: hoje, fim: hoje,
    area: '', local: '', descricao: '', colaboradores: [] as string[],
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const isFeriado = form.tipo === 'Feriado'

  function toggleColab(nome: string) {
    setForm(f => ({
      ...f,
      colaboradores: f.colaboradores.includes(nome)
        ? f.colaboradores.filter(c => c !== nome)
        : [...f.colaboradores, nome],
    }))
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-500 mb-1">Título do evento</label>
          <Input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Reunião de planejamento" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
          <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        {!isFeriado && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Área (opcional)</label>
            <select value={form.area} onChange={e => set('area', e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
              <option value="">Todas as áreas</option>
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Data de início</label>
          <Input type={isFeriado ? 'date' : 'datetime-local'} value={isFeriado ? form.inicio.slice(0,10) : form.inicio}
            onChange={e => set('inicio', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Data de fim</label>
          <Input type={isFeriado ? 'date' : 'datetime-local'} value={isFeriado ? (form.fim || '').slice(0,10) : form.fim}
            onChange={e => set('fim', e.target.value)} />
        </div>

        {!isFeriado && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Local</label>
              <select value={form.local} onChange={e => set('local', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
                <option value="">Selecione o local</option>
                {LOCAIS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Descrição (opcional)</label>
              <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={2}
                className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Colaboradores envolvidos ({form.colaboradores.length} selecionado{form.colaboradores.length !== 1 ? 's' : ''})
              </label>
              <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-lg p-2 space-y-1">
                {colaboradores.map(c => {
                  const nome = c.nome_completo || c.nome
                  const sel = form.colaboradores.includes(nome)
                  return (
                    <label key={c.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${sel ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                      <input type="checkbox" checked={sel} onChange={() => toggleColab(nome)} className="rounded" />
                      <span>{nome}</span>
                      {c.setor && <span className="text-xs text-slate-400">— {c.setor}</span>}
                    </label>
                  )
                })}
                {colaboradores.length === 0 && <p className="text-xs text-slate-400 px-2">Nenhum colaborador cadastrado.</p>}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          onClick={() => onSave({
            ...form,
            colaboradores: form.colaboradores.length ? JSON.stringify(form.colaboradores) : null,
          })}
          disabled={loading || !form.titulo}
        >
          {loading && <Loader2 size={14} className="animate-spin" />} Salvar evento
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}

// ── Modal de detalhes do evento ───────────────────────────────────────────────
function EventoDetalhe({ evento, admin, onDelete, onClose }: {
  evento: Evento; admin: boolean; onDelete: () => void; onClose: () => void
}) {
  const colabs: string[] = evento.colaboradores ? JSON.parse(evento.colaboradores) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TIPO_COLOR[evento.tipo] ?? TIPO_COLOR['Evento']}`}>
          {evento.tipo}
        </span>
        {evento.area && <span className="text-xs text-slate-400">{evento.area}</span>}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Clock size={14} className="text-slate-400" />
          <span>{new Date(evento.inicio).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</span>
          {evento.fim && <><span className="text-slate-400">→</span><span>{new Date(evento.fim).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</span></>}
        </div>

        {evento.local && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <MapPin size={14} className="text-slate-400" />
            <span>{evento.local}</span>
          </div>
        )}

        {colabs.length > 0 && (
          <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Users size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex flex-wrap gap-1">
              {colabs.map(c => (
                <span key={c} className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded-full">{c}</span>
              ))}
            </div>
          </div>
        )}

        {evento.descricao && (
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 rounded-lg p-3">
            {evento.descricao}
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        {admin && (
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onDelete}>
            Remover evento
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Calendario() {
  const { user } = useAuth()
  const admin = canManage(user)
  const qc = useQueryClient()

  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [novoEvento, setNovoEvento] = useState(false)
  const [eventoAberto, setEventoAberto] = useState<any | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ['eventos'],
    queryFn: fetchEventos,
  })

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => fetchColaboradores(),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['eventos'] })
  const mutCriar   = useMutation({ mutationFn: criarEvento, onSuccess: () => { invalidate(); setNovoEvento(false) } })
  const mutRemover = useMutation({ mutationFn: removerEvento, onSuccess: () => { invalidate(); setConfirmDelete(null); setEventoAberto(null) } })

  // Aniversariantes no mês
  const aniversariantesPorDia = useMemo(() => {
    const map: Record<number, string[]> = {}
    colaboradores.forEach(c => {
      if (!c.data_nascimento) return
      const [d, m] = c.data_nascimento.split('/')
      if (Number(m) - 1 === mes) {
        const dia = Number(d)
        if (!map[dia]) map[dia] = []
        map[dia].push(c.nome_completo || c.nome)
      }
    })
    return map
  }, [colaboradores, mes])

  // Eventos por dia
  const eventosPorDia = useMemo(() => {
    const map: Record<string, Evento[]> = {}
    eventos.forEach(e => {
      const d = e.inicio.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(e)
    })
    return map
  }, [eventos])

  // Dias do mês
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const totalDias   = new Date(ano, mes + 1, 0).getDate()
  const celulas     = Array.from({ length: primeiroDia + totalDias }, (_, i) =>
    i < primeiroDia ? null : i - primeiroDia + 1
  )

  function navMes(dir: number) {
    const d = new Date(ano, mes + dir, 1)
    setMes(d.getMonth())
    setAno(d.getFullYear())
  }

  function dataStr(dia: number) {
    return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  // vindo da busca: vai ao mês do evento e abre os detalhes
  const [params] = useSearchParams()
  const abriu = useRef<string | null>(null)
  useEffect(() => {
    const alvo = params.get('evento')
    if (!alvo || abriu.current === alvo) return
    const ev = eventos.find((e) => e.id === alvo)
    if (!ev) return
    abriu.current = alvo
    const [a, m] = ev.inicio.slice(0, 10).split('-').map(Number)
    if (a && m) { setAno(a); setMes(m - 1) }
    setEventoAberto(ev)
  }, [params, eventos])

  const isHoje = (dia: number) =>
    dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()

  return (
    <div>
      <PageHeader
        title="Calendário"
        subtitle="Eventos, reuniões, treinamentos e aniversariantes da equipe."
        action={admin && (
          <Button onClick={() => setNovoEvento(true)}>
            <Plus size={15} /> Novo evento
          </Button>
        )}
      />

      {/* Navegação */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navMes(-1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-display font-semibold text-lg text-ink-900 dark:text-white min-w-[180px] text-center">
            {MESES[mes]} {ano}
          </h2>
          <button onClick={() => navMes(1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
        <button onClick={() => { setMes(hoje.getMonth()); setAno(hoje.getFullYear()) }}
          className="text-xs text-brand-600 hover:underline font-medium">
          Hoje
        </button>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[...TIPOS, 'Aniversário'].map(t => (
          <div key={t} className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className={`w-2 h-2 rounded-full ${TIPO_DOT[t]}`} />
            {t}
          </div>
        ))}
      </div>

      {/* Grade do calendário */}
      <Card className="overflow-hidden p-0">
        {/* Cabeçalho dias da semana */}
        <div className="grid grid-cols-7 border-b border-black/5 dark:border-white/10">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Células */}
        {isLoading ? (
          <div className="flex justify-center py-20 text-slate-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {celulas.map((dia, i) => {
              const ds = dia ? dataStr(dia) : ''
              const evsDia = ds ? (eventosPorDia[ds] ?? []) : []
              const anivsDia = dia ? (aniversariantesPorDia[dia] ?? []) : []
              const temAlgo = evsDia.length > 0 || anivsDia.length > 0

              return (
                <div key={i}
                  className={`min-h-[90px] p-1.5 border-b border-r border-black/5 dark:border-white/5 ${!dia ? 'bg-slate-50 dark:bg-white/2' : ''} ${isHoje(dia!) ? 'bg-brand-50 dark:bg-brand-500/5' : ''}`}
                >
                  {dia && (
                    <>
                      <p className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isHoje(dia) ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                        {dia}
                      </p>
                      <div className="space-y-0.5">
                        {/* Aniversariantes */}
                        {anivsDia.length > 0 && (
                          <button
                            onClick={() => setEventoAberto({ _aniversario: true, dia, nomes: anivsDia })}
                            className="w-full text-left"
                          >
                            <div className="flex items-center gap-1 px-1 py-0.5 rounded bg-pink-100 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 text-[10px] font-medium truncate">
                              <Cake size={9} /> {anivsDia.length === 1 ? anivsDia[0].split(' ')[0] : `${anivsDia.length} aniversários`}
                            </div>
                          </button>
                        )}
                        {/* Eventos */}
                        {evsDia.slice(0, 2).map(ev => (
                          <button key={ev.id} onClick={() => setEventoAberto(ev)} className="w-full text-left">
                            <div className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium truncate ${TIPO_COLOR[ev.tipo] ?? TIPO_COLOR['Evento']}`}>
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TIPO_DOT[ev.tipo]}`} />
                              {ev.titulo}
                            </div>
                          </button>
                        ))}
                        {evsDia.length > 2 && (
                          <p className="text-[10px] text-slate-400 px-1">+{evsDia.length - 2} mais</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Modal novo evento */}
      <Dialog open={novoEvento} onOpenChange={o => !o && setNovoEvento(false)} title="Novo evento" size="md">
        <EventoForm
          colaboradores={colaboradores}
          loading={mutCriar.isPending}
          onSave={dados => mutCriar.mutate(dados as any)}
          onCancel={() => setNovoEvento(false)}
        />
      </Dialog>

      {/* Modal detalhe aniversariantes */}
      {eventoAberto?._aniversario && (
        <Dialog open onOpenChange={() => setEventoAberto(null)} title={`🎂 Aniversariantes — dia ${eventoAberto.dia}`} size="sm">
          <div className="space-y-3">
            {eventoAberto.nomes.map((nome: string) => (
              <div key={nome} className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-pink-500/10 rounded-lg">
                <Cake size={16} className="text-pink-500" />
                <p className="text-sm font-medium text-ink-900 dark:text-white">{nome}</p>
              </div>
            ))}
            <Button variant="outline" onClick={() => setEventoAberto(null)} className="w-full">Fechar</Button>
          </div>
        </Dialog>
      )}

      {/* Modal detalhe evento */}
      {eventoAberto && !eventoAberto._aniversario && (
        <Dialog open onOpenChange={() => setEventoAberto(null)} title={eventoAberto.titulo} size="sm">
          <EventoDetalhe
            evento={eventoAberto}
            admin={admin}
            onDelete={() => setConfirmDelete(eventoAberto.id)}
            onClose={() => setEventoAberto(null)}
          />
        </Dialog>
      )}

      {/* Confirmação de remoção */}
      <Dialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)} title="Remover evento" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Tem certeza que deseja remover este evento? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={mutRemover.isPending}
            onClick={() => confirmDelete && mutRemover.mutate(confirmDelete)}>
            {mutRemover.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Remover
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
