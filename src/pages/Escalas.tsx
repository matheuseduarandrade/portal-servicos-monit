import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Calendar, Users, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'
import { PageHeader, Card, Badge, Button, Input, Select } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { useAuth, isDeveloper } from '@/contexts/AuthContext'
import { ESCALAS as SEED, PLANTOES as PLANTAO_SEED } from '@/data/mockData'
import type { Escala } from '@/types'

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const TURNOS = ['08h às 18h', '10h às 20h', '12h às 22h', '14h às 00h']

export default function Escalas() {
  const { user } = useAuth()
  const dev = isDeveloper(user)

  const [escalas, setEscalas] = useState<Escala[]>(SEED)
  const [plantoes, setPlantoes] = useState(PLANTAO_SEED)
  const [aba, setAba] = useState<'dia' | 'semana' | 'mes' | 'plantao'>('dia')

  // Seletor de data
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())
  const [dia, setDia] = useState(hoje.getDate())

  // Modais admin
  const [editandoEscala, setEditandoEscala] = useState<Escala | null>(null)
  const [novaEscala, setNovaEscala] = useState(false)
  const [editandoPlantao, setEditandoPlantao] = useState<typeof PLANTAO_SEED[0] | null>(null)
  const [novoPlantao, setNovoPlantao] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function salvarEscala(dados: Escala) {
    if (dados.id === 'novo') {
      setEscalas((p) => [...p, { ...dados, id: `e${Date.now()}` }])
    } else {
      setEscalas((p) => p.map((e) => e.id === dados.id ? dados : e))
    }
    setEditandoEscala(null)
    setNovaEscala(false)
  }

  function excluirEscala(id: string) {
    setEscalas((p) => p.filter((e) => e.id !== id))
    setConfirmDelete(null)
  }

  function salvarPlantao(dados: typeof PLANTAO_SEED[0]) {
    if (dados.id === 'novo') {
      setPlantoes((p) => [...p, { ...dados, id: `pl${Date.now()}` }])
    } else {
      setPlantoes((p) => p.map((pl) => pl.id === dados.id ? dados : pl))
    }
    setEditandoPlantao(null)
    setNovoPlantao(false)
  }

  function navMes(dir: number) {
    const d = new Date(ano, mes + dir, 1)
    setAno(d.getFullYear())
    setMes(d.getMonth())
  }

  const datasComPlantao = new Set(plantoes.map((p) => p.data))

  return (
    <div>
      <PageHeader
        title="Escalas"
        subtitle="Turnos e plantões do setor de Monitoramento."
        action={dev && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setNovoPlantao(true); setEditandoPlantao({ id: 'novo', data: '', operadorFixo1: '', operadorFixo2: '', operadorExtra: '', observacao: '' }) }}>
              <ClipboardList size={14} /> Lançar plantão
            </Button>
            <Button onClick={() => { setNovaEscala(true); setEditandoEscala({ id: 'novo', colaborador: '', area: 'Monitoramento', dias: '', turno: '08h às 18h', fixoSabado: false }) }}>
              <Plus size={14} /> Nova escala
            </Button>
          </div>
        )}
      />

      {/* Abas */}
      <div className="flex gap-1 border-b border-black/5 dark:border-white/10 mb-6">
        {(['dia','semana','mes','plantao'] as const).map((v) => (
          <button key={v} onClick={() => setAba(v)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors -mb-px ${aba === v ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
          >
            {v === 'plantao' ? 'Plantões' : v === 'mes' ? 'Mês' : v}
          </button>
        ))}
      </div>

      {/* Navegação de mês */}
      {(aba === 'semana' || aba === 'mes') && (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navMes(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><ChevronLeft size={16} /></button>
          <span className="font-medium text-ink-900 dark:text-white">{MESES_PT[mes]} {ano}</span>
          <button onClick={() => navMes(1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"><ChevronRight size={16} /></button>
        </div>
      )}

      {/* Seletor dia */}
      {aba === 'dia' && (
        <div className="flex items-center gap-3 mb-5">
          <Input type="date" value={`${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`}
            onChange={(e) => { const d = new Date(e.target.value); setAno(d.getFullYear()); setMes(d.getMonth()); setDia(d.getDate()) }}
            className="max-w-[180px]"
          />
          <span className="text-sm text-slate-500">{DIAS_SEMANA[new Date(ano, mes, dia).getDay() - 1] ?? 'Domingo'} · {String(dia).padStart(2,'0')}/{String(mes+1).padStart(2,'0')}/{ano}</span>
        </div>
      )}

      {aba === 'dia' && <VisaoDia escalas={escalas} dia={dia} mes={mes} ano={ano} dev={dev} onEdit={setEditandoEscala} onDelete={(id) => setConfirmDelete(id)} />}
      {aba === 'semana' && <VisaoSemana escalas={escalas} ano={ano} mes={mes} dev={dev} onEdit={setEditandoEscala} />}
      {aba === 'mes' && <VisaoMes ano={ano} mes={mes} dia={dia} onDia={(d) => { setDia(d); setAba('dia') }} escalas={escalas} datasComPlantao={datasComPlantao} />}
      {aba === 'plantao' && <VisaoPlantoes plantoes={plantoes} dev={dev} onEdit={setEditandoPlantao} onDelete={(id) => setPlantoes((p) => p.filter((pl) => pl.id !== id))} />}

      {/* Modal escala */}
      <Dialog open={!!editandoEscala} onOpenChange={(o) => !o && (setEditandoEscala(null), setNovaEscala(false))} title={novaEscala ? 'Nova escala' : 'Editar escala'} size="md">
        {editandoEscala && <EscalaForm initial={editandoEscala} onSave={salvarEscala} onCancel={() => { setEditandoEscala(null); setNovaEscala(false) }} />}
      </Dialog>

      {/* Modal plantão */}
      <Dialog open={!!editandoPlantao} onOpenChange={(o) => !o && (setEditandoPlantao(null), setNovoPlantao(false))} title={novoPlantao ? 'Lançar plantão' : 'Editar plantão'} size="md">
        {editandoPlantao && <PlantaoForm initial={editandoPlantao} onSave={salvarPlantao} onCancel={() => { setEditandoPlantao(null); setNovoPlantao(false) }} />}
      </Dialog>

      {/* Confirmação exclusão */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)} title="Excluir escala" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">Tem certeza que deseja remover esta escala?</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => confirmDelete && excluirEscala(confirmDelete)}>
            <Trash2 size={14} /> Excluir
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function VisaoDia({ escalas, dia, mes, ano, dev, onEdit, onDelete }: {
  escalas: Escala[], dia: number, mes: number, ano: number,
  dev: boolean, onEdit: (e: Escala) => void, onDelete: (id: string) => void
}) {
  const data = new Date(ano, mes, dia)
  const diaSemana = data.getDay() // 0=dom 6=sab
  const isSabado = diaSemana === 6
  const isDomingo = diaSemana === 0

  if (isDomingo) {
    return (
      <Card className="text-center py-12">
        <p className="text-2xl mb-2">🏖️</p>
        <p className="font-medium text-ink-900 dark:text-white">Domingo — sem operação</p>
        <p className="text-sm text-slate-400 mt-1">Não há escalas programadas aos domingos.</p>
      </Card>
    )
  }

  const trabalhando = escalas.filter((e) => {
    if (isSabado) return e.fixoSabado
    const folga = e.folga
    const nomeDia = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta'][diaSemana]
    if (folga && nomeDia === folga) return false
    if (e.dias.includes('Segunda a Sexta') && diaSemana >= 1 && diaSemana <= 5) return true
    if (e.dias.includes('Terça a Sexta') && diaSemana >= 2 && diaSemana <= 5) return true
    if (e.dias.includes('Segunda a Sábado') && diaSemana >= 1 && diaSemana <= 6) return true
    return false
  })

  const grupoPorTurno: Record<string, Escala[]> = {}
  trabalhando.forEach((e) => { if (!grupoPorTurno[e.turno]) grupoPorTurno[e.turno] = []; grupoPorTurno[e.turno].push(e) })

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {isSabado && (
        <Card className="md:col-span-full bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">🗓 Sábado — Somente fixos de sábado</p>
        </Card>
      )}
      {Object.entries(grupoPorTurno).map(([turno, ops]) => (
        <Card key={turno}>
          <p className="font-mono text-xs font-bold text-brand-600 mb-3">{turno}</p>
          <div className="space-y-2.5">
            {ops.map((e) => (
              <div key={e.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-900 dark:text-white">{e.colaborador}</p>
                  <p className="text-xs text-slate-400">{e.area}{e.folga ? ` · folga ${e.folga}` : ''}</p>
                </div>
                {dev && (
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(e)} className="p-1 rounded text-slate-400 hover:text-brand-600"><Pencil size={12} /></button>
                    <button onClick={() => onDelete(e.id)} className="p-1 rounded text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
      {trabalhando.length === 0 && (
        <Card className="md:col-span-full text-center py-8">
          <p className="text-slate-400">Nenhum colaborador escalado para este dia.</p>
        </Card>
      )}
    </div>
  )
}

function VisaoSemana({ escalas, ano, mes, dev, onEdit }: { escalas: Escala[], ano: number, mes: number, dev: boolean, onEdit: (e: Escala) => void }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-black/5 dark:border-white/10">
            <th className="py-2 pr-4 font-medium w-44">Colaborador</th>
            {DIAS_SEMANA.map((d) => <th key={d} className="py-2 pr-3 font-medium">{d.slice(0,3)}</th>)}
            {dev && <th className="py-2 font-medium"></th>}
          </tr>
        </thead>
        <tbody>
          {escalas.map((e) => (
            <tr key={e.id} className="border-b border-black/5 dark:border-white/5 last:border-0">
              <td className="py-2.5 pr-4 font-medium text-ink-900 dark:text-white">{e.colaborador}</td>
              {DIAS_SEMANA.map((d, idx) => {
                const isSab = idx === 5
                const trabalha = isSab ? e.fixoSabado : (!e.folga || e.folga !== d) && (e.dias.includes('Segunda') || e.dias.includes('Terça'))
                return (
                  <td key={d} className="py-2.5 pr-3">
                    {trabalha
                      ? <Badge tone="info" key={d}>{e.turno.slice(0,5)}</Badge>
                      : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                    }
                  </td>
                )
              })}
              {dev && <td className="py-2.5"><button onClick={() => onEdit(e)} className="p-1 rounded text-slate-400 hover:text-brand-600"><Pencil size={13} /></button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function VisaoMes({ ano, mes, dia: diaAtual, onDia, escalas, datasComPlantao }: {
  ano: number, mes: number, dia: number, onDia: (d: number) => void,
  escalas: Escala[], datasComPlantao: Set<string>
}) {
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const primeiroDia = new Date(ano, mes, 1).getDay()

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">{MESES_PT[mes]} {ano}</h3>
        <span className="flex items-center gap-1 text-xs text-slate-400"><Users size={13} /> {escalas.length} operadores</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-1 font-medium">
        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: primeiroDia }).map((_, i) => <div key={`pad-${i}`} />)}
        {Array.from({ length: diasNoMes }).map((_, i) => {
          const d = i + 1
          const data = new Date(ano, mes, d)
          const isDom = data.getDay() === 0
          const isSab = data.getDay() === 6
          const isHoje = d === diaAtual && mes === new Date().getMonth() && ano === new Date().getFullYear()
          const dateStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          const temPlantao = datasComPlantao.has(dateStr)
          return (
            <button key={d} onClick={() => !isDom && onDia(d)}
              className={`rounded-lg p-1.5 min-h-[52px] text-xs border transition-all text-left
                ${isDom ? 'opacity-30 cursor-default' : 'cursor-pointer hover:border-brand-400'}
                ${isHoje ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-black/5 dark:border-white/10'}
                ${isSab ? 'bg-amber-50/50 dark:bg-amber-500/5' : ''}
              `}
            >
              <p className={`font-medium ${isHoje ? 'text-brand-600' : 'text-ink-900 dark:text-white'}`}>{d}</p>
              {isSab && <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">Plantão</p>}
              {temPlantao && <div className="h-1 w-1 rounded-full bg-brand-500 mt-0.5" />}
            </button>
          )
        })}
      </div>
      <div className="flex gap-4 mt-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-200 dark:bg-amber-500/30" /> Sábado</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-500" /> Plantão lançado</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded border-2 border-brand-500" /> Hoje</span>
      </div>
    </Card>
  )
}

function VisaoPlantoes({ plantoes, dev, onEdit, onDelete }: {
  plantoes: typeof PLANTAO_SEED, dev: boolean,
  onEdit: (pl: typeof PLANTAO_SEED[0]) => void, onDelete: (id: string) => void
}) {
  const ordenados = [...plantoes].sort((a, b) => a.data.localeCompare(b.data))
  return (
    <div className="space-y-3">
      {ordenados.length === 0 && <Card className="text-center py-8 text-slate-400">Nenhum plantão lançado.</Card>}
      {ordenados.map((pl) => {
        const data = new Date(pl.data + 'T12:00:00')
        const passado = data < new Date()
        return (
          <Card key={pl.id} className={passado ? 'opacity-60' : ''}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} className="text-brand-600" />
                  <span className="font-semibold text-ink-900 dark:text-white">
                    {data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                  {passado && <Badge>Histórico</Badge>}
                  {!passado && <Badge tone="success">Agendado</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><p className="text-xs text-slate-400 uppercase tracking-wide">Fixo 1</p><p className="font-medium text-ink-900 dark:text-white mt-0.5">{pl.operadorFixo1}</p></div>
                  <div><p className="text-xs text-slate-400 uppercase tracking-wide">Fixo 2</p><p className="font-medium text-ink-900 dark:text-white mt-0.5">{pl.operadorFixo2}</p></div>
                  <div><p className="text-xs text-slate-400 uppercase tracking-wide">Extra</p><p className="font-medium text-ink-900 dark:text-white mt-0.5">{pl.operadorExtra}</p></div>
                </div>
                {pl.observacao && <p className="text-xs text-slate-400 mt-2">📝 {pl.observacao}</p>}
              </div>
              {dev && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => onEdit(pl)} className="p-1.5 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10"><Pencil size={14} /></button>
                  <button onClick={() => onDelete(pl.id)} className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function EscalaForm({ initial, onSave, onCancel }: { initial: Escala; onSave: (e: Escala) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Escala>({ ...initial })
  const set = <K extends keyof Escala>(k: K, v: Escala[K]) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <div><label className="block text-xs font-medium text-slate-500 mb-1">Colaborador</label><Input value={form.colaborador} onChange={(e) => set('colaborador', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Área</label>
          <Select value={form.area} onChange={(e) => set('area', e.target.value as any)} className="w-full">
            {['Monitoramento','Planejamento','Credenciamento','Técnico','Geral'].map((a) => <option key={a}>{a}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Turno</label>
          <Select value={form.turno} onChange={(e) => set('turno', e.target.value)} className="w-full">
            {TURNOS.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </div>
      </div>
      <div><label className="block text-xs font-medium text-slate-500 mb-1">Dias de trabalho</label><Input value={form.dias} onChange={(e) => set('dias', e.target.value)} placeholder="Ex: Segunda a Sexta" /></div>
      <div><label className="block text-xs font-medium text-slate-500 mb-1">Folga (dia da semana)</label><Input value={form.folga ?? ''} onChange={(e) => set('folga', e.target.value || undefined)} placeholder="Ex: Quarta" /></div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.fixoSabado} onChange={(e) => set('fixoSabado', e.target.checked)} className="rounded" />
        Fixo de Sábado (08h às 18h)
      </label>
      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)}>Salvar</Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}

function PlantaoForm({ initial, onSave, onCancel }: { initial: typeof PLANTAO_SEED[0]; onSave: (pl: typeof PLANTAO_SEED[0]) => void; onCancel: () => void }) {
  const colaboradores = SEED.filter((e) => e.fixoSabado || e.area === 'Monitoramento').map((e) => e.colaborador)
  const todos = ['Lucas Paixão','Diego Ribeiro','Mateus Accioly','Pedro Miguel','Felipe Silva','Lucas Dias']
  const [form, setForm] = useState({ ...initial })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <div><label className="block text-xs font-medium text-slate-500 mb-1">Data do plantão (Sábado)</label><Input type="date" value={form.data} onChange={(e) => set('data', e.target.value)} /></div>
      <div className="grid grid-cols-1 gap-4">
        {(['operadorFixo1','operadorFixo2','operadorExtra'] as const).map((campo) => (
          <div key={campo}>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {campo === 'operadorFixo1' ? 'Operador Fixo 1' : campo === 'operadorFixo2' ? 'Operador Fixo 2' : 'Operador Extra'}
            </label>
            <Select value={(form as any)[campo]} onChange={(e) => set(campo, e.target.value)} className="w-full">
              <option value="">— selecionar —</option>
              {todos.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </div>
        ))}
      </div>
      <div><label className="block text-xs font-medium text-slate-500 mb-1">Observação (opcional)</label><Input value={form.observacao ?? ''} onChange={(e) => set('observacao', e.target.value)} /></div>
      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)}>Salvar plantão</Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}
