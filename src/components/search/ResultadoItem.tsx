import {
  BookOpen, Boxes, CalendarDays, Car, FileText, FolderKanban, Image as ImageIcon, Megaphone, MessageSquare, Trophy, Users, Wrench, ChevronRight,
} from 'lucide-react'
import { Destaque } from '@/components/search/Destaque'
import type { ResultadoBusca } from '@/services/busca'

const ICONE: Record<string, typeof BookOpen> = {
  manual: BookOpen, conteudo: FileText, comentario: MessageSquare, foto: ImageIcon, homologacao: Car, sistema: Boxes,
  projeto: FolderKanban, tecnico: Wrench, colaborador: Users, comunicado: Megaphone, evento: CalendarDays, trilha: Trophy,
}
const ROTULO: Record<string, string> = {
  manual: 'Manual', conteudo: 'Conteúdo do manual', comentario: 'Comentário', foto: 'Foto', homologacao: 'Homologação', sistema: 'Sistema',
  projeto: 'Projeto', tecnico: 'Técnico', colaborador: 'Colaborador', comunicado: 'Comunicado', evento: 'Evento', trilha: 'Trilha do Quiz',
}

/** Uma linha de resultado: caminho (Biblioteca › Manual › Comentário) + título + trecho, com o termo em destaque. */
export function ResultadoItem({ r, termos, ativo, onClick, onHover }: {
  r: ResultadoBusca
  termos: string[]
  ativo?: boolean
  onClick: () => void
  onHover?: () => void
}) {
  const Icone = ICONE[r.tipo] ?? FileText
  const segmentos = r.titulo === r.caminho[r.caminho.length - 1] ? r.caminho : [...r.caminho, r.titulo]
  const trilha = segmentos.slice(0, -1)
  const principal = segmentos[segmentos.length - 1]

  return (
    <button onClick={onClick} onMouseEnter={onHover} role="option" aria-selected={!!ativo}
      className={`w-full text-left flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${ativo ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
      <span className="mt-0.5 h-8 w-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0" title={ROTULO[r.tipo]}>
        <Icone size={16} />
      </span>
      <span className="min-w-0 flex-1">
        {trilha.length > 0 && (
          <span className="flex flex-wrap items-center gap-x-0.5 text-[11px] text-slate-400 leading-tight">
            {trilha.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-0.5">
                {i > 0 && <ChevronRight size={10} />}<span className="truncate max-w-[220px]">{s}</span>
              </span>
            ))}
          </span>
        )}
        <span className="block text-sm font-medium text-ink-900 dark:text-white leading-snug line-clamp-2 break-words">
          <Destaque texto={principal} termos={termos} />
        </span>
        {r.trecho && (
          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 break-words">
            <Destaque texto={r.trecho} termos={termos} />
          </span>
        )}
      </span>
    </button>
  )
}
