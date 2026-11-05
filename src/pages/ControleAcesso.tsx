import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCheck, UserX, Loader2, Clock, Mail } from 'lucide-react'
import { PageHeader, Card, Button, Input } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { fetchSolicitacoes, aprovarSolicitacao, rejeitarSolicitacao } from '@/services/portal'
import { fetchColaboradores } from '@/services/colaboradores'

interface Solicitacao {
  id: string; email: string; nome: string; foto_url?: string | null; solicitado_em: string
}
interface Colaborador {
  id: string; nome: string; nome_completo?: string | null; nivel?: string | null
}

const AREAS = ['Serviços', 'SCM', 'Projetos', 'Atendimento']
const SETORES_POR_AREA: Record<string, string[]> = {
  'Serviços':    ['Credenciamento/Planejamento', 'Monitoramento', 'Operação de Campo'],
  'SCM':         ['Logística Reversa/Expedição', 'Produção/Manutenção'],
  'Projetos':    ['Projetos'],
  'Atendimento': ['Atendimento'],
}
const TIPO_GESTOR = ['Gestor de Área', 'Gestor de Setor']

const NIVEL_MAP: Record<string, string> = {
  'Colaborador':      'colaborador',
  'Gestor de Setor':  'gestor',
  'Gestor de Área':   'supervisor',
  'admin':            'admin',
}

export default function ControleAcesso() {
  const qc = useQueryClient()
  const [aprovando, setAprovando]   = useState<Solicitacao | null>(null)
  const [rejeitando, setRejeitando] = useState<Solicitacao | null>(null)
  const [motivo, setMotivo]         = useState('')
  const [form, setForm] = useState({
    nome: '', cargo: '', area: '', setor: '',
    perfil_tipo: 'Colaborador', // Colaborador | Gestor
    tipo_gestor: 'Gestor de Setor',
    gestor_direto_id: '', gestor_area_id: '',
  })

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes'],
    queryFn: () => fetchSolicitacoes() as Promise<Solicitacao[]>,
    refetchInterval: 30_000,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['solicitacoes'] })
    qc.invalidateQueries({ queryKey: ['colaboradores'] })
    qc.invalidateQueries({ queryKey: ['usuarios'] })
  }

  const mutAprovar = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => aprovarSolicitacao(id, body),
    onSuccess: () => { invalidate(); setAprovando(null) },
  })

  const mutRejeitar = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => rejeitarSolicitacao(id, motivo),
    onSuccess: () => { invalidate(); setRejeitando(null); setMotivo('') },
  })

  function iniciarAprovacao(sol: Solicitacao) {
    setForm({ nome: sol.nome, cargo: '', area: '', setor: '', perfil_tipo: 'Colaborador', tipo_gestor: 'Gestor de Setor', gestor_direto_id: '', gestor_area_id: '' })
    setAprovando(sol)
  }

  function confirmarAprovacao() {
    if (!aprovando) return
    const isGestor = form.perfil_tipo === 'Gestor'
    const nivel    = isGestor ? form.tipo_gestor : 'Colaborador'
    const perfil   = NIVEL_MAP[nivel] ?? 'colaborador'
    mutAprovar.mutate({
      id: aprovando.id,
      body: {
        nome:             form.nome,
        cargo:            form.cargo,
        area:             form.area,
        perfil,
        nivel,
      },
    })
  }

  const setoresDisponiveis = SETORES_POR_AREA[form.area] ?? []

  return (
    <div>
      <PageHeader title="Controle de Acesso" subtitle="Aprove quem pode entrar no portal. O cadastro como colaborador é feito depois, na aba Colaboradores." />

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="flex items-center gap-4 p-4">
          <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink-900 dark:text-white">{solicitacoes.length}</p>
            <p className="text-xs text-slate-500">Pendentes de aprovação</p>
          </div>
        </Card>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 size={20} className="animate-spin mr-2" /> Carregando...</div>
      ) : solicitacoes.length === 0 ? (
        <Card className="text-center py-16">
          <UserCheck size={40} className="mx-auto mb-3 text-green-500 opacity-60" />
          <p className="text-slate-500 font-medium">Nenhuma solicitação pendente</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {solicitacoes.map(sol => (
            <Card key={sol.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {sol.foto_url
                  ? <img src={sol.foto_url} alt={sol.nome} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-700 font-bold flex-shrink-0">{sol.nome.slice(0,2).toUpperCase()}</div>
                }
                <div>
                  <p className="font-semibold text-ink-900 dark:text-white">{sol.nome}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1"><Mail size={12} /> {sol.email}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock size={11} /> {sol.solicitado_em ? new Date(sol.solicitado_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button onClick={() => iniciarAprovacao(sol)}><UserCheck size={14} /> Aprovar</Button>
                <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
                  onClick={() => { setRejeitando(sol); setMotivo('') }}>
                  <UserX size={14} /> Rejeitar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal aprovação */}
      <Dialog open={!!aprovando} onOpenChange={o => !o && setAprovando(null)}
        title={`Aprovar acesso — ${aprovando?.nome}`} size="sm">
        {aprovando && (
          <div className="space-y-4">
            {/* Email (não editável) */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
              <Mail size={14} className="text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-300">{aprovando.email}</span>
            </div>

            {/* Nome completo */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nome completo</label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>

            {/* Cargo */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cargo</label>
              <Input value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                placeholder="Ex: Técnico em Monitoramento" />
            </div>

            {/* Área */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Área</label>
              <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value, setor: '' }))}
                className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
                <option value="">Selecione a área...</option>
                {AREAS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>

            {/* Perfil de acesso */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Perfil de acesso</label>
              <div className="flex gap-2">
                {['Colaborador', 'Gestor'].map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, perfil_tipo: p }))}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.perfil_tipo === p
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-brand-400'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de gestor (só aparece se Gestor) */}
            {form.perfil_tipo === 'Gestor' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de gestor</label>
                <select value={form.tipo_gestor} onChange={e => setForm(f => ({ ...f, tipo_gestor: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
                  {TIPO_GESTOR.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={confirmarAprovacao} disabled={mutAprovar.isPending || !form.nome || !form.area}>
                {mutAprovar.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                Confirmar aprovação
              </Button>
              <Button variant="outline" onClick={() => setAprovando(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Modal rejeição */}
      <Dialog open={!!rejeitando} onOpenChange={o => !o && setRejeitando(null)}
        title={`Rejeitar acesso — ${rejeitando?.nome}`} size="sm">
        {rejeitando && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-100 dark:border-red-500/20">
              <UserX size={14} className="text-red-500" />
              <span className="text-sm">{rejeitando.email}</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Motivo da rejeição</label>
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
                placeholder="Informe o motivo..."
                className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3">
              <Button className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => mutRejeitar.mutate({ id: rejeitando.id, motivo })} disabled={mutRejeitar.isPending}>
                {mutRejeitar.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />} Rejeitar
              </Button>
              <Button variant="outline" onClick={() => setRejeitando(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
