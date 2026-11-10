import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Loader2, AlertTriangle, Info, AlertCircle, Megaphone } from 'lucide-react'
import { PageHeader, Card, Button, Input, Badge } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { useAuth, canManage } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'
import { fetchComunicados, criarComunicado, removerComunicado } from '@/services/portal'

interface Comunicado {
  id: string
  titulo: string
  descricao: string
  categoria: string
  prioridade: string
  autor: string
  data: string
}

const PRIORIDADES = ['Informativo', 'Importante', 'Urgente']
const CATEGORIAS  = ['Atualizações', 'Firmware', 'Configurações', 'Diretoria', 'Administrativo', 'Operacional']

const PRIO_STYLE: Record<string, { bg: string; badge: string; icon: any; label: string }> = {
  'Urgente':     { bg: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-500/5',    badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',    icon: AlertTriangle, label: 'Urgente' },
  'Importante':  { bg: 'border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-500/5', badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20', icon: AlertCircle,   label: 'Importante' },
  'Informativo': { bg: 'border-l-4 border-blue-400 bg-blue-50/50 dark:bg-blue-500/5',  badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',   icon: Info,          label: 'Informativo' },
}

export default function Comunicados() {
  const { user } = useAuth()
  const admin = canManage(user)
  const qc = useQueryClient()

  const [novoAberto, setNovoAberto] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Comunicado | null>(null)
  const [filtro, setFiltro] = useState<string>('Todos')
  const [form, setForm] = useState({ titulo: '', descricao: '', categoria: 'Operacional', prioridade: 'Informativo' })

  const { data: comunicados = [], isLoading } = useQuery({
    queryKey: ['comunicados'],
    queryFn: fetchComunicados as () => Promise<Comunicado[]>,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['comunicados'] })

  const mutCriar = useMutation({
    mutationFn: (body: object) => criarComunicado(body),
    onSuccess: () => { invalidate(); setNovoAberto(false); setForm({ titulo: '', descricao: '', categoria: 'Operacional', prioridade: 'Informativo' }) },
  })

  const mutRemover = useMutation({
    mutationFn: (id: string) => removerComunicado(id),
    onSuccess: () => { invalidate(); setConfirmDelete(null) },
  })

  const filtrados = comunicados.filter(c => filtro === 'Todos' || c.prioridade === filtro)

  // Ordenar: Urgente primeiro, depois Importante, depois Informativo
  const ordenados = [...filtrados].sort((a, b) => {
    const ordem: Record<string, number> = { Urgente: 0, Importante: 1, Informativo: 2 }
    return (ordem[a.prioridade] ?? 3) - (ordem[b.prioridade] ?? 3)
  })

  // vindo da busca: rola até o comunicado e o destaca
  const [params] = useSearchParams()
  const [pisca, setPisca] = useState<string | null>(null)
  const feito = useRef<string | null>(null)
  useEffect(() => {
    const alvo = params.get('destaque')
    if (!alvo || feito.current === alvo || !comunicados.some((c) => c.id === alvo)) return
    feito.current = alvo
    setPisca(alvo)
    setTimeout(() => document.getElementById('com-' + alvo)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 200)
    setTimeout(() => setPisca(null), 5000)
  }, [params, comunicados])

  return (
    <div>
      <PageHeader
        title="Comunicados"
        subtitle="Informativos, avisos e comunicados da equipe de operações."
        action={admin && (
          <Button onClick={() => setNovoAberto(true)}>
            <Plus size={15} /> Novo comunicado
          </Button>
        )}
      />

      {/* Filtro por prioridade */}
      <div className="flex gap-2 mb-5">
        {['Todos', ...PRIORIDADES].map(p => (
          <button
            key={p}
            onClick={() => setFiltro(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtro === p
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-brand-400'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Carregando...
        </div>
      ) : ordenados.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum comunicado publicado.</p>
          {admin && <p className="text-xs mt-1 text-brand-500">Clique em "Novo comunicado" para publicar.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {ordenados.map(c => {
            const meta = PRIO_STYLE[c.prioridade] ?? PRIO_STYLE['Informativo']
            const Icon = meta.icon
            return (
              <div key={c.id} id={`com-${c.id}`} className={`relative rounded-xl p-4 ${meta.bg} group transition-all ${pisca === c.id ? 'ring-2 ring-yellow-400' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      <Icon size={18} className={
                        c.prioridade === 'Urgente' ? 'text-red-500' :
                        c.prioridade === 'Importante' ? 'text-amber-500' : 'text-blue-500'
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-display font-semibold text-sm text-ink-900 dark:text-white">{c.titulo}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${meta.badge}`}>
                          {c.prioridade}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 border border-slate-200 dark:border-white/10">
                          {c.categoria}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {c.descricao}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        Publicado por <strong className="text-slate-500 dark:text-slate-300">{c.autor}</strong> · {c.data ? formatDate(c.data) : '—'}
                      </p>
                    </div>
                  </div>

                  {admin && (
                    <button
                      onClick={() => setConfirmDelete(c)}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                      title="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal novo comunicado */}
      <Dialog open={novoAberto} onOpenChange={o => !o && setNovoAberto(false)} title="Novo comunicado" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Título</label>
            <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título do comunicado" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descrição completa</label>
            <textarea
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={5}
              placeholder="Descreva o comunicado em detalhes..."
              className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Prioridade</label>
              <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
                {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Preview da prioridade selecionada */}
          {form.prioridade && (
            <div className={`rounded-lg p-3 ${PRIO_STYLE[form.prioridade]?.bg}`}>
              <p className="text-xs text-slate-500">
                {form.prioridade === 'Urgente' && '🔴 Urgente — será destacado no topo com atenção imediata'}
                {form.prioridade === 'Importante' && '🟡 Importante — informação relevante que requer atenção'}
                {form.prioridade === 'Informativo' && '🔵 Informativo — comunicado geral sem urgência'}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => mutCriar.mutate({ ...form, autor: user?.nome || user?.email || 'Sistema' })}
              disabled={mutCriar.isPending || !form.titulo || !form.descricao}
            >
              {mutCriar.isPending && <Loader2 size={14} className="animate-spin" />}
              Publicar comunicado
            </Button>
            <Button variant="outline" onClick={() => setNovoAberto(false)}>Cancelar</Button>
          </div>
        </div>
      </Dialog>

      {/* Confirmação de remoção */}
      <Dialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)} title="Remover comunicado" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Tem certeza que deseja remover o comunicado <strong>"{confirmDelete?.titulo}"</strong>?
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={mutRemover.isPending}
            onClick={() => confirmDelete && mutRemover.mutate(confirmDelete.id)}>
            {mutRemover.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Remover
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
