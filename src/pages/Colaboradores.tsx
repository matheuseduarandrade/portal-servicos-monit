import React, { useState, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Tabs from '@radix-ui/react-tabs'
import {
  Users, GitBranch, Search, Pencil, X,
  Loader2, Phone, Mail, MapPin, User, Shield,
  ChevronDown, ChevronUp, UserCheck, UserX, Plus,
} from 'lucide-react'
import { PageHeader, Card, Input, Button, Kpi } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { useAuth, canManage } from '@/contexts/AuthContext'
import {
  fetchColaboradores, fetchConfig, aprovarColaborador,
  atualizarFicha, removerColaborador, fetchCandidatos, cadastrarColaborador,
  type Colaborador, type CandidatoColaborador,
} from '@/services/colaboradores'

// ── Ordem e Cores de Nível Hierárquico ──────────────────────────────────────
const NIVEL_ORDER: Record<string, number> = {
  'Diretor de Operações': 1,
  'Gestor de Área':       2,
  'Gestor de Setor':      3,
  'Colaborador':          4,
}

const NIVEL_TONE: Record<string, string> = {
  'Diretor de Operações': 'bg-purple-100 text-purple-700 border-purple-200',
  'Gestor de Área':       'bg-blue-100 text-blue-700 border-blue-200',
  'Gestor de Setor':      'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Colaborador':          'bg-slate-100 text-slate-600 border-slate-200',
}

// ── Avatar Genérico ──────────────────────────────────────────────────────────
function Avatar({ colaborador, size = 10, borderColor = 'border-white dark:border-slate-800' }: { colaborador: Colaborador; size?: number; borderColor?: string }) {
  const initials = (colaborador.nome_completo || colaborador.nome || '')
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  const sizeCss = `w-${size} h-${size}`

  if (colaborador.foto_url) {
    return (
      <img
        src={colaborador.foto_url}
        alt={colaborador.nome}
        className={`${sizeCss} rounded-full object-cover border-2 ${borderColor} shadow-sm shrink-0`}
      />
    )
  }
  return (
    <div className={`${sizeCss} rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs border-2 ${borderColor} shadow-sm shrink-0`}>
      {initials}
    </div>
  )
}

// ── Modal de Equipe (Estilo do Print) ─────────────────────────────────────────
function ModalEquipe({
  lider,
  todasPessoas,
  onClose,
  onSelectColaborador,
}: {
  lider: Colaborador
  todasPessoas: Colaborador[]
  onClose: () => void
  onSelectColaborador: (c: Colaborador) => void
}) {
  const [busca, setBusca] = useState('')

  // Obter todos os colaboradores subordinados a este líder
  const membros = useMemo(() => {
    return todasPessoas.filter(c => c.gestor_direto_id === lider.id || c.gestor_area_id === lider.id)
  }, [todasPessoas, lider])

  // Lista combinada (Líder no topo + Membros da equipe)
  const equipeCompleta = useMemo(() => {
    const lista = [lider, ...membros.filter(m => m.id !== lider.id)]
    if (!busca) return lista

    return lista.filter(c =>
      `${c.nome_completo || c.nome} ${c.cargo} ${c.email}`.toLowerCase().includes(busca.toLowerCase())
    )
  }, [lider, membros, busca])

  const nomeSetorOuArea = (lider.setor || lider.area || 'MONITORAMENTO').toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#252b42] text-slate-100 w-full max-w-md rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="p-5 pb-3 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-black text-orange-500 tracking-wide">
              #{nomeSetorOuArea} ({membros.length + 1})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Input de Pesquisa do Modal */}
        <div className="px-5 pb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador na equipe..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-[#1b2030] text-sm text-slate-200 placeholder-slate-500 rounded-lg pl-9 pr-3 py-2 border border-slate-700/60 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {/* Lista de Colaboradores */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4 custom-scrollbar">
          {equipeCompleta.map(c => {
            const isLider = c.id === lider.id

            return (
              <div
                key={c.id}
                className="flex items-start gap-3.5 p-2 rounded-xl hover:bg-slate-700/30 transition-colors"
              >
                {/* Avatar com Borda Laranja em Destaque */}
                <Avatar
                  colaborador={c}
                  size={11}
                  borderColor={isLider ? 'border-orange-500' : 'border-amber-400'}
                />

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-orange-400 transition-colors truncate">
                    {c.nome_completo || c.nome}
                  </h4>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {c.cargo || 'Cargo não informado'}
                  </p>
                  <p className="text-xs text-indigo-400/90 truncate mt-0.5">
                    {c.email || 'sem-email@empresa.com'}
                  </p>

                  {/* Badge de Função (Líder / Membro Direto) */}
                  <span className={`inline-block mt-1 text-[10px] font-extrabold tracking-wider ${
                    isLider ? 'text-orange-500' : 'text-amber-400'
                  }`}>
                    {isLider ? 'Líder' : 'Membro Direto'}
                  </span>
                </div>
              </div>
            )
          })}

          {equipeCompleta.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              Nenhum colaborador encontrado nesta equipe.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Card do Nó do Organograma ─────────────────────────────────────────────────
function OrgCard({
  colab,
  totalSubordinados,
  onOpenEquipe,
}: {
  colab: Colaborador
  totalSubordinados: number
  onOpenEquipe: (c: Colaborador) => void
}) {
  return (
    <div className="relative group flex flex-col items-center">
      <button
        onClick={() => onOpenEquipe(colab)}
        className="w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center relative z-10 cursor-pointer"
      >
        {/* Avatar Superior */}
        <div className="-mt-1 mb-1.5">
          <Avatar colaborador={colab} size={11} />
        </div>

        {/* Nome */}
        <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight line-clamp-1 w-full">
          {colab.nome_completo || colab.nome}
        </h4>

        {/* Cargo */}
        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 w-full mt-0.5">
          {colab.cargo || 'Cargo não informado'}
        </p>

        {/* Setor / Área */}
        <span className="mt-2 text-[9px] font-extrabold text-red-500 dark:text-red-400 uppercase tracking-wider line-clamp-1 w-full">
          {colab.setor || colab.area || 'GERAL'}
        </span>

        {/* Badge com total de membros abaixo do Gestor */}
        {totalSubordinados > 0 && (
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-white dark:border-slate-800 shadow-sm flex items-center gap-1">
            <Users size={10} />
            {totalSubordinados}
          </div>
        )}
      </button>
    </div>
  )
}

// ── Nó do Organograma (Filtrado apenas para Estrutura de Liderança) ───────────
function OrgTreeNode({
  colab,
  todasPessoas,
  onOpenEquipe,
}: {
  colab: Colaborador
  todasPessoas: Colaborador[]
  onOpenEquipe: (c: Colaborador) => void
}) {
  const [expanded, setExpanded] = useState(true)

  // Subordinados DIRETOS totais deste colaborador
  const todosSubordinados = todasPessoas.filter(c => {
    if (c.gestor_direto_id) return c.gestor_direto_id === colab.id
    return c.gestor_area_id === colab.id
  })

  // 🎯 FILTRO DE LIDERANÇA: Na árvore, renderizamos apenas quem também é LÍDER / GESTOR
  const gestoresSubordinados = todosSubordinados.filter(child => {
    const temSubordinados = todasPessoas.some(
      sub => sub.gestor_direto_id === child.id || sub.gestor_area_id === child.id
    )
    const eGestorPorNivel = child.nivel && child.nivel !== 'Colaborador'
    return temSubordinados || eGestorPorNivel
  })

  const hasChildren = gestoresSubordinados.length > 0

  return (
    <div className="flex flex-col items-center select-none">
      {/* Card do Gestor */}
      <OrgCard
        colab={colab}
        totalSubordinados={todosSubordinados.length}
        onOpenEquipe={onOpenEquipe}
      />

      {/* Botão de Expandir / Recolher Filhos Gestores */}
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
          className="mt-3 z-10 w-5 h-5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-sm transition-colors cursor-pointer"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}

      {/* Linha Vertical de Saída */}
      {hasChildren && expanded && (
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />
      )}

      {/* Árvore Recursiva de Liderança */}
      {hasChildren && expanded && (
        <div className="flex">
          {gestoresSubordinados.map((child, index) => {
            const isFirst = index === 0
            const isLast = index === gestoresSubordinados.length - 1
            const isSingle = gestoresSubordinados.length === 1

            return (
              <div key={child.id} className="flex flex-col items-center relative px-3">
                {/* Linha Horizontal Conectora */}
                {!isSingle && (
                  <div
                    className={`absolute top-0 h-px bg-slate-300 dark:bg-slate-600 ${
                      isFirst
                        ? 'left-1/2 right-0'
                        : isLast
                        ? 'left-0 right-1/2'
                        : 'left-0 right-0'
                    }`}
                  />
                )}

                {/* Linha Vertical de Entrada */}
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />

                {/* Nó Recursivo */}
                <OrgTreeNode
                  colab={child}
                  todasPessoas={todasPessoas}
                  onOpenEquipe={onOpenEquipe}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Renderização do Organograma com Pan/Drag ──────────────────────────────────
function Organograma({
  colaboradores,
  onOpenEquipe,
}: {
  colaboradores: Colaborador[]
  onOpenEquipe: (c: Colaborador) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  const aprovados = colaboradores.filter(c => c.aprovado)

  // Raízes Principais (Diretores / Altas Lideranças sem gestor na lista)
  const raizes = aprovados.filter(c => {
    if (!c.gestor_direto_id && !c.gestor_area_id) return true
    const temGestorDireto = aprovados.some(g => g.id === c.gestor_direto_id)
    const temGestorArea = aprovados.some(g => g.id === c.gestor_area_id)
    return !temGestorDireto && !temGestorArea
  })

  raizes.sort((a, b) => (NIVEL_ORDER[a.nivel || ''] ?? 99) - (NIVEL_ORDER[b.nivel || ''] ?? 99))

  // 🖱️ Arrasto da Tela (Click & Drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - containerRef.current.offsetLeft)
    setStartY(e.pageY - containerRef.current.offsetTop)
    setScrollLeft(containerRef.current.scrollLeft)
    setScrollTop(containerRef.current.scrollTop)
  }

  const handleMouseLeave = () => setIsDragging(false)
  const handleMouseUp = () => setIsDragging(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    e.preventDefault()
    const x = e.pageX - containerRef.current.offsetLeft
    const y = e.pageY - containerRef.current.offsetTop
    const walkX = (x - startX) * 1.5
    const walkY = (y - startY) * 1.5
    containerRef.current.scrollLeft = scrollLeft - walkX
    containerRef.current.scrollTop = scrollTop - walkY
  }

  if (aprovados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <GitBranch size={40} className="mb-3 opacity-30" />
        <p className="text-sm">Nenhum colaborador aprovado para exibição.</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      className={`overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-12 px-8 max-h-[75vh] min-h-[500px] select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      <div className="flex justify-center items-start gap-16 min-w-max mx-auto pointer-events-auto">
        {raizes.map(raiz => (
          <OrgTreeNode
            key={raiz.id}
            colab={raiz}
            todasPessoas={aprovados}
            onOpenEquipe={onOpenEquipe}
          />
        ))}
      </div>
    </div>
  )
}

// ── Ficha Cadastral (Visualização de Detalhes do Colaborador) ─────────────────
function FichaModal({ colab, onClose, onEdit }: { colab: Colaborador; onClose: () => void; onEdit?: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar colaborador={colab} size={16} />
        <div>
          <h3 className="font-display font-bold text-lg text-ink-900 dark:text-white">
            {colab.nome_completo || colab.nome}
          </h3>
          <p className="text-sm text-slate-500">{colab.cargo || 'Cargo não informado'}</p>
          {colab.nivel && (
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border font-medium ${NIVEL_TONE[colab.nivel] ?? NIVEL_TONE['Colaborador']}`}>
              {colab.nivel}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoItem icon={Mail} label="E-mail corporativo" value={colab.email} />
        <InfoItem icon={Mail} label="E-mail de contato" value={colab.email_contato} />
        <InfoItem icon={Phone} label="Telefone" value={colab.telefone} />
        <InfoItem icon={Phone} label="Tel. emergência" value={colab.telefone_emergencia} />
        <InfoItem icon={User} label="Contato de emergência" value={colab.contato_emergencia_nome} />
        <InfoItem icon={Mail} label="E-mail emergência" value={colab.email_emergencia} />
        <InfoItem icon={MapPin} label="Endereço" value={colab.endereco} />
        <InfoItem icon={User} label="Data de nascimento" value={colab.data_nascimento} />
      </div>

      <div className="border-t border-black/5 dark:border-white/10 pt-4 grid grid-cols-2 gap-4">
        <InfoItem icon={Shield} label="Área" value={colab.area} />
        <InfoItem icon={Shield} label="Setor" value={colab.setor} />
        <InfoItem icon={User} label="Gestor direto" value={colab.gestor_direto_nome} />
        <InfoItem icon={User} label="Gestor de área" value={colab.gestor_area_nome} />
      </div>

      <div className="flex gap-3 pt-2">
        {onEdit && <Button variant="outline" onClick={onEdit}><Pencil size={14} /> Editar ficha</Button>}
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-0.5">
        <Icon size={11} /> {label}
      </p>
      <p className="text-sm text-ink-900 dark:text-white">
        {value || <span className="text-slate-300 dark:text-slate-600 italic">Não informado</span>}
      </p>
    </div>
  )
}

// ── Form Ficha Cadastral ──────────────────────────────────────────────────────
function FichaForm({ colab, onSave, onCancel, loading }: {
  colab: Colaborador; onSave: (d: object) => void; onCancel: () => void; loading: boolean
}) {
  const [form, setForm] = useState({
    nome_completo:           colab.nome_completo ?? '',
    data_nascimento:         colab.data_nascimento ?? '',
    endereco:                colab.endereco ?? '',
    telefone:                colab.telefone ?? '',
    telefone_emergencia:     colab.telefone_emergencia ?? '',
    contato_emergencia_nome: colab.contato_emergencia_nome ?? '',
    email_contato:           colab.email_contato ?? '',
    email_emergencia:        colab.email_emergencia ?? '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const fields = [
    { key: 'nome_completo',           label: 'Nome completo',           placeholder: 'Nome completo' },
    { key: 'data_nascimento',         label: 'Data de nascimento',      placeholder: 'DD/MM/AAAA' },
    { key: 'endereco',                label: 'Endereço',                placeholder: 'Rua, número, cidade' },
    { key: 'telefone',                label: 'Telefone',                placeholder: '(85) 99999-9999' },
    { key: 'email_contato',           label: 'E-mail de contato',       placeholder: 'email@exemplo.com' },
    { key: 'contato_emergencia_nome', label: 'Nome contato emergência', placeholder: 'Nome do familiar' },
    { key: 'telefone_emergencia',     label: 'Telefone emergência',     placeholder: '(85) 99999-9999' },
    { key: 'email_emergencia',        label: 'E-mail emergência',       placeholder: 'familiar@email.com' },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
            <Input value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} />
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)} disabled={loading}>
          {loading && <Loader2 size={14} className="animate-spin" />} Salvar
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}

// ── Form Aprovação ────────────────────────────────────────────────────────────
function AprovacaoForm({ colab, config, colaboradores, onSave, onCancel, loading }: {
  colab: Colaborador
  config: { areas: string[]; setores: string[]; niveis: string[]; setores_por_area?: Record<string, string[]> }
  colaboradores: Colaborador[]
  onSave: (d: object) => void
  onCancel: () => void
  loading: boolean
}) {
  const [form, setForm] = useState({
    nivel:            colab.nivel ?? 'Colaborador',
    area:             colab.area ?? '',
    setor:            colab.setor ?? '',
    cargo:            colab.cargo ?? '',
    gestor_direto_id: colab.gestor_direto_id ?? '',
    gestor_area_id:   colab.gestor_area_id ?? '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const gestores = colaboradores.filter(c => c.aprovado && c.id !== colab.id)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Nível hierárquico</label>
          <select value={form.nivel} onChange={e => set('nivel', e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
            {config.niveis.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Cargo</label>
          <Input value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Ex: Analista de Monitoramento" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Área</label>
          <select value={form.area} onChange={e => { set('area', e.target.value); set('setor', '') }}
            className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
            <option value="">Selecione...</option>
            {config.areas.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Setor</label>
          <select value={form.setor} onChange={e => set('setor', e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
            <option value="">Selecione...</option>
            {config.setores.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Gestor direto</label>
          <select value={form.gestor_direto_id} onChange={e => set('gestor_direto_id', e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
            <option value="">Nenhum</option>
            {gestores.map(g => <option key={g.id} value={g.id}>{g.nome_completo || g.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Gestor de área</label>
          <select value={form.gestor_area_id} onChange={e => set('gestor_area_id', e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm">
            <option value="">Nenhum</option>
            {gestores.map(g => <option key={g.id} value={g.id}>{g.nome_completo || g.nome}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)} disabled={loading}>
          {loading && <Loader2 size={14} className="animate-spin" />}
          <UserCheck size={14} /> Aprovar colaborador
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}

// ── Cadastro de colaborador (somente a partir de usuários que já acessaram) ─────
function CadastroColaboradorForm({ candidatos, config, colaboradores, onSave, onCancel, loading, erro }: {
  candidatos: CandidatoColaborador[]
  config: { areas: string[]; setores: string[]; niveis: string[]; setores_por_area?: Record<string, string[]> }
  colaboradores: Colaborador[]
  onSave: (d: Parameters<typeof cadastrarColaborador>[0]) => void
  onCancel: () => void
  loading: boolean
  erro: string | null
}) {
  const [usuarioId, setUsuarioId] = useState('')
  const [form, setForm] = useState({ nivel: 'Colaborador', area: '', setor: '', cargo: '', gestor_direto_id: '', gestor_area_id: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const gestores = colaboradores.filter(c => c.aprovado)
  const selecionado = candidatos.find(c => c.id === usuarioId)
  const setores = form.area ? (config.setores_por_area?.[form.area] ?? config.setores) : config.setores
  const selectCls = 'w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm'

  function escolher(id: string) {
    setUsuarioId(id)
    const u = candidatos.find(c => c.id === id)
    if (u) setForm(f => ({ ...f, cargo: u.cargo ?? '', area: config.areas.includes(u.area ?? '') ? (u.area ?? '') : '' }))
  }

  if (candidatos.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-white/10 p-5 text-center">
          <Users size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-500">Não há usuários disponíveis para cadastro.</p>
          <p className="text-xs text-slate-400 mt-1">
            Só é possível cadastrar usuários que já acessaram o portal e ainda não são colaboradores.
            Aprove o acesso em Controle de Acesso e peça para a pessoa entrar.
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>Fechar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Usuário (que já acessou o portal)</label>
        <select value={usuarioId} onChange={e => escolher(e.target.value)} className={selectCls}>
          <option value="">Selecione...</option>
          {candidatos.map(c => <option key={c.id} value={c.id}>{c.nome} — {c.email}</option>)}
        </select>
      </div>

      {selecionado && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nível hierárquico</label>
            <select value={form.nivel} onChange={e => set('nivel', e.target.value)} className={selectCls}>
              {config.niveis.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Cargo</label>
            <Input value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Ex: Analista de Monitoramento" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Área</label>
            <select value={form.area} onChange={e => { set('area', e.target.value); set('setor', '') }} className={selectCls}>
              <option value="">Selecione...</option>
              {config.areas.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Setor</label>
            <select value={form.setor} onChange={e => set('setor', e.target.value)} className={selectCls}>
              <option value="">Selecione...</option>
              {setores.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Gestor direto</label>
            <select value={form.gestor_direto_id} onChange={e => set('gestor_direto_id', e.target.value)} className={selectCls}>
              <option value="">Nenhum</option>
              {gestores.map(g => <option key={g.id} value={g.id}>{g.nome_completo || g.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Gestor de área</label>
            <select value={form.gestor_area_id} onChange={e => set('gestor_area_id', e.target.value)} className={selectCls}>
              <option value="">Nenhum</option>
              {gestores.map(g => <option key={g.id} value={g.id}>{g.nome_completo || g.nome}</option>)}
            </select>
          </div>
        </div>
      )}

      {erro && <p className="text-xs text-red-500">{erro}</p>}

      <div className="flex gap-3 pt-2">
        <Button disabled={!selecionado || loading}
          onClick={() => onSave({
            usuario_id: usuarioId, nivel: form.nivel, area: form.area, setor: form.setor, cargo: form.cargo,
            gestor_direto_id: form.gestor_direto_id || null, gestor_area_id: form.gestor_area_id || null,
          })}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />} Cadastrar colaborador
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function Colaboradores() {
  const { user } = useAuth()
  const admin = canManage(user)
  const qc = useQueryClient()

  const [params] = useSearchParams()
  const [busca, setBusca] = useState(params.get('q') ?? '')
  const [equipeAberta, setEquipeAberta] = useState<Colaborador | null>(null) // Controla o Modal da Equipe
  const [fichaAberta, setFichaAberta] = useState<Colaborador | null>(null)
  const [editandoFicha, setEditandoFicha] = useState<Colaborador | null>(null)
  const [aprovando, setAprovando] = useState<Colaborador | null>(null)
  const [cadastrando, setCadastrando] = useState(false)
  const [erroCadastro, setErroCadastro] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Colaborador | null>(null)

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => fetchColaboradores(),
  })

  const { data: config = { areas: [], setores: [], niveis: [], setores_por_area: {} } } = useQuery({
    queryKey: ['colaboradores-config'],
    queryFn: fetchConfig,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['colaboradores'] })

  const { data: candidatos = [] } = useQuery({
    queryKey: ['colaboradores-candidatos'],
    queryFn: fetchCandidatos,
    enabled: admin && cadastrando,
  })
  const mutCadastrar = useMutation({
    mutationFn: cadastrarColaborador,
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['colaboradores-candidatos'] })
      setCadastrando(false)
      setErroCadastro(null)
    },
    onError: (e: unknown) => setErroCadastro(e instanceof Error ? e.message : 'Erro ao cadastrar.'),
  })

  const mutAprovar  = useMutation({ mutationFn: ({ id, body }: { id: string; body: object }) => aprovarColaborador(id, body), onSuccess: invalidate })
  const mutFicha    = useMutation({ mutationFn: ({ id, body }: { id: string; body: object }) => atualizarFicha(id, body), onSuccess: invalidate })
  const mutRemover  = useMutation({ mutationFn: removerColaborador, onSuccess: invalidate })

  const pendentes = colaboradores.filter(c => !c.aprovado)
  const aprovados = colaboradores.filter(c => c.aprovado)

  const isDev    = user?.email === 'matheus.eduardo@queonetics.com' || user?.perfil === 'admin'
  const isGestor = user?.perfil === 'supervisor'

  const fichasVisiveis = useMemo(() => {
    if (isDev) return aprovados
    if (isGestor) {
      const eu = aprovados.find(c => c.email === user?.email)
      if (!eu) return []
      return aprovados.filter(c =>
        c.gestor_direto_id === eu.id || c.gestor_area_id === eu.id || c.id === eu.id
      )
    }
    return []
  }, [aprovados, isDev, isGestor, user])

  const filtrados = useMemo(() =>
    fichasVisiveis.filter(c =>
      `${c.nome} ${c.nome_completo} ${c.cargo} ${c.area} ${c.setor}`.toLowerCase().includes(busca.toLowerCase())
    ),
    [fichasVisiveis, busca]
  )

  return (
    <div>
      <PageHeader
        title="Colaboradores"
        subtitle="Organograma e fichas cadastrais da equipe."
        action={admin && (
          <Button onClick={() => { setCadastrando(true); setErroCadastro(null) }}>
            <Plus size={15} /> Cadastrar colaborador
          </Button>
        )}
      />

      {/* Indicadores / KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Total de colaboradores" value={aprovados.length} />
        <Kpi label="Gestores" value={aprovados.filter(c => c.nivel && c.nivel !== 'Colaborador').length} />
        <Kpi label="Áreas" value={[...new Set(aprovados.map(c => c.area).filter(Boolean))].length} />
        <Kpi label="Setores" value={[...new Set(aprovados.map(c => c.setor).filter(Boolean))].length} />
      </div>

      {/* Solicitações Pendentes */}
      {admin && pendentes.length > 0 && (
        <Card className="mb-6 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5">
          <h3 className="font-display font-semibold text-sm text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
            <UserCheck size={16} /> {pendentes.length} solicitação(ões) pendente(s) de aprovação
          </h3>
          <div className="space-y-2">
            {pendentes.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-white dark:bg-surface-darkCard rounded-lg border border-amber-100 dark:border-amber-500/20">
                <div className="flex items-center gap-3">
                  <Avatar colaborador={c} size={8} />
                  <div>
                    <p className="text-sm font-medium text-ink-900 dark:text-white">{c.nome}</p>
                    <p className="text-xs text-slate-400">{c.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setAprovando(c)}>
                    <UserCheck size={14} /> Aprovar
                  </Button>
                  <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => setConfirmDelete(c)}>
                    <UserX size={14} /> Recusar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Abas */}
      <Tabs.Root defaultValue="organograma">
        <Tabs.List className="flex gap-1 border-b border-black/5 dark:border-white/10 mb-6">
          <Tabs.Trigger value="organograma"
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 data-[state=active]:text-brand-600 data-[state=active]:border-b-2 data-[state=active]:border-brand-600 -mb-px transition-colors cursor-pointer">
            <GitBranch size={14} /> Organograma
          </Tabs.Trigger>
          <Tabs.Trigger value="fichas"
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 data-[state=active]:text-brand-600 data-[state=active]:border-b-2 data-[state=active]:border-brand-600 -mb-px transition-colors cursor-pointer">
            <Users size={14} /> Fichas Cadastrais
          </Tabs.Trigger>
        </Tabs.List>

        {/* Aba Organograma */}
        <Tabs.Content value="organograma">
          <Card className="p-0 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
            <Organograma
              colaboradores={colaboradores}
              onOpenEquipe={c => setEquipeAberta(c)}
            />
          </Card>
        </Tabs.Content>

        {/* Aba Fichas Cadastrais */}
        <Tabs.Content value="fichas">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Buscar colaborador..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16 text-slate-400"><Loader2 size={20} className="animate-spin mr-2" /> Carregando...</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtrados.map(c => (
                <button key={c.id} onClick={() => setFichaAberta(c)} className="text-left group cursor-pointer">
                  <Card className="h-full hover:-translate-y-0.5 hover:shadow-popover transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar colaborador={c} size={10} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-ink-900 dark:text-white truncate">
                          {c.nome_completo || c.nome}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{c.cargo || 'Cargo não definido'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.nivel && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${NIVEL_TONE[c.nivel] ?? NIVEL_TONE['Colaborador']}`}>
                          {c.nivel}
                        </span>
                      )}
                      {c.area && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500">{c.area}</span>}
                      {c.setor && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500">{c.setor}</span>}
                    </div>
                    {c.telefone && (
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Phone size={10} /> {c.telefone}
                      </p>
                    )}
                  </Card>
                </button>
              ))}
              {filtrados.length === 0 && (
                <div className="col-span-3 text-center py-16 text-slate-400">
                  <Users size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum colaborador encontrado.</p>
                </div>
              )}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {/* Modal Estilo Print: Equipe do Gestor */}
      {equipeAberta && (
        <ModalEquipe
          lider={equipeAberta}
          todasPessoas={colaboradores.filter(c => c.aprovado)}
          onClose={() => setEquipeAberta(null)}
          onSelectColaborador={colab => {
            setFichaAberta(colab)
          }}
        />
      )}

      {/* Modal Ficha Cadastral do Colaborador */}
      <Dialog open={!!fichaAberta && !editandoFicha} onOpenChange={o => !o && setFichaAberta(null)}
        title="Ficha Cadastral" size="md">
        {fichaAberta && (
          <FichaModal colab={fichaAberta} onClose={() => setFichaAberta(null)}
            onEdit={admin ? () => setEditandoFicha(fichaAberta) : undefined} />
        )}
      </Dialog>

      {/* Modal Editar Ficha */}
      <Dialog open={!!editandoFicha} onOpenChange={o => !o && setEditandoFicha(null)}
        title={`Editar ficha — ${editandoFicha?.nome}`} size="md">
        {editandoFicha && (
          <FichaForm colab={editandoFicha} loading={mutFicha.isPending}
            onSave={body => mutFicha.mutate({ id: editandoFicha.id, body }, {
              onSuccess: () => { setEditandoFicha(null); setFichaAberta(null) }
            })}
            onCancel={() => setEditandoFicha(null)} />
        )}
      </Dialog>

      {/* Modal Cadastrar colaborador */}
      <Dialog open={cadastrando} onOpenChange={o => { if (!o) { setCadastrando(false); setErroCadastro(null) } }}
        title="Cadastrar colaborador" description="Escolha um usuário que já acessou o portal e defina a posição dele na equipe." size="md">
        {cadastrando && (
          <CadastroColaboradorForm
            candidatos={candidatos}
            config={config}
            colaboradores={colaboradores}
            loading={mutCadastrar.isPending}
            erro={erroCadastro}
            onSave={body => mutCadastrar.mutate(body)}
            onCancel={() => { setCadastrando(false); setErroCadastro(null) }}
          />
        )}
      </Dialog>

      {/* Modal Aprovação */}
      <Dialog open={!!aprovando} onOpenChange={o => !o && setAprovando(null)}
        title={`Aprovar — ${aprovando?.nome}`} size="md">
        {aprovando && (
          <AprovacaoForm colab={aprovando} config={config} colaboradores={colaboradores} loading={mutAprovar.isPending}
            onSave={body => mutAprovar.mutate({ id: aprovando.id, body }, { onSuccess: () => setAprovando(null) })}
            onCancel={() => setAprovando(null)} />
        )}
      </Dialog>

      {/* Modal Recusar Acesso */}
      <Dialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)} title="Recusar acesso" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Tem certeza que deseja recusar e remover <strong>{confirmDelete?.nome}</strong>?
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={mutRemover.isPending}
            onClick={() => confirmDelete && mutRemover.mutate(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) })}>
            {mutRemover.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />} Recusar
          </Button>
        </div>
      </Dialog>
    </div>
  )
}