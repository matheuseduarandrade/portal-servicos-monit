import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Pencil, Loader2, UserCheck, UserX, Shield } from 'lucide-react'
import { PageHeader, Card, Kpi, Input, Button, Badge } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { useAuth, isDeveloper } from '@/contexts/AuthContext'
import { fetchUsuarios, atualizarUsuario, alternarStatusUsuario } from '@/services/portal'

interface Usuario {
  id: string
  email: string
  nome: string
  cargo?: string | null
  area?: string | null
  perfil?: string | null
  status?: string | null
}

const PERFIL_LABEL: Record<string, string> = {
  admin:       'Administrador',
  supervisor:  'Supervisor',
  colaborador: 'Colaborador',
}

const PERFIL_STYLE: Record<string, string> = {
  admin:       'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20',
  supervisor:  'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
  colaborador: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10',
}

export default function Usuarios() {
  const { user } = useAuth()
  const dev = isDeveloper(user)
  const qc = useQueryClient()

  const [busca, setBusca] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('Todos')
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [formEdit, setFormEdit] = useState({ perfil: '', status: '' })

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => fetchUsuarios() as unknown as Promise<Usuario[]>,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['usuarios'] })

  const mutEditar = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => atualizarUsuario(id, body),
    onSuccess: () => { invalidate(); setEditando(null) },
  })

  const mutToggleStatus = useMutation({
    mutationFn: (id: string) => alternarStatusUsuario(id),
    onSuccess: invalidate,
  })

  // KPIs
  const ativos       = usuarios.filter(u => u.status === 'ativo')
  const admins       = usuarios.filter(u => u.perfil === 'admin')
  const supervisores = usuarios.filter(u => u.perfil === 'supervisor')
  const colabors     = usuarios.filter(u => u.perfil === 'colaborador')

  const filtrados = useMemo(() =>
    usuarios.filter(u => {
      const matchBusca = `${u.nome} ${u.email} ${u.cargo}`.toLowerCase().includes(busca.toLowerCase())
      const matchPerfil = filtroPerfil === 'Todos' || u.perfil === filtroPerfil
      return matchBusca && matchPerfil
    }),
    [usuarios, busca, filtroPerfil]
  )

  // Bloquear acesso para não-devs
  if (!dev) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <Shield size={40} className="mb-3 opacity-30" />
        <p className="font-medium">Acesso restrito</p>
        <p className="text-xs mt-1">Esta aba é exclusiva para o desenvolvedor do sistema.</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Usuários" subtitle="Gerencie todos os usuários e permissões do Portal de Serviços." />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Ativos"          value={ativos.length} />
        <Kpi label="Administradores" value={admins.length} />
        <Kpi label="Supervisores"    value={supervisores.length} />
        <Kpi label="Colaboradores"   value={colabors.length} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar por nome, e-mail ou cargo..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <select value={filtroPerfil} onChange={e => setFiltroPerfil(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
          <option value="Todos">Todos os perfis</option>
          <option value="admin">Administradores</option>
          <option value="supervisor">Supervisores</option>
          <option value="colaborador">Colaboradores</option>
        </select>
      </div>

      {/* Tabela */}
      <Card className="overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-12 text-slate-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-black/5 dark:border-white/10">
                <th className="py-2 pr-4 font-medium">Colaborador</th>
                <th className="py-2 pr-4 font-medium">E-mail</th>
                <th className="py-2 pr-4 font-medium">Cargo</th>
                <th className="py-2 pr-4 font-medium">Área</th>
                <th className="py-2 pr-4 font-medium">Perfil</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(u => (
                <tr key={u.id} className={`border-b border-black/5 dark:border-white/5 last:border-0 group ${u.status === 'inativo' ? 'opacity-50' : ''}`}>
                  <td className="py-2.5 pr-4 font-medium text-ink-900 dark:text-white">{u.nome}</td>
                  <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400 text-xs">{u.email}</td>
                  <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{u.cargo || '—'}</td>
                  <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{u.area || '—'}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${PERFIL_STYLE[u.perfil ?? 'colaborador']}`}>
                      {PERFIL_LABEL[u.perfil ?? 'colaborador'] ?? u.perfil}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                      u.status === 'ativo'
                        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20'
                        : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20'
                    }`}>
                      {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditando(u); setFormEdit({ perfil: u.perfil ?? 'colaborador', status: u.status ?? 'ativo' }) }}
                        className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 text-slate-400 hover:text-brand-600 shadow-sm"
                        title="Editar perfil"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => mutToggleStatus.mutate(u.id)}
                        className={`p-1.5 rounded-lg border border-black/10 dark:border-white/10 shadow-sm ${
                          u.status === 'ativo'
                            ? 'text-slate-400 hover:text-red-500'
                            : 'text-slate-400 hover:text-green-600'
                        }`}
                        title={u.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      >
                        {u.status === 'ativo' ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal editar perfil */}
      <Dialog open={!!editando} onOpenChange={o => !o && setEditando(null)}
        title={`Editar perfil — ${editando?.nome}`} size="sm">
        {editando && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg text-sm text-slate-500">
              <p className="text-xs text-slate-400 mb-0.5">E-mail (não editável)</p>
              <p className="font-medium text-ink-900 dark:text-white">{editando.email}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Perfil de permissão</label>
              <select value={formEdit.perfil} onChange={e => setFormEdit(f => ({ ...f, perfil: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
                <option value="colaborador">Colaborador</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Alterar o perfil muda imediatamente o que o usuário pode visualizar e editar no portal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select value={formEdit.status} onChange={e => setFormEdit(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => mutEditar.mutate({ id: editando.id, body: formEdit })}
                disabled={mutEditar.isPending}
              >
                {mutEditar.isPending && <Loader2 size={14} className="animate-spin" />}
                Salvar alterações
              </Button>
              <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
