import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const AREA_COLOR_VAR: Record<string, string> = {
  Monitoramento: 'border-area-monitoramento text-area-monitoramento',
  Planejamento: 'border-area-planejamento text-area-planejamento',
  Credenciamento: 'border-area-credenciamento text-area-credenciamento',
  Técnico: 'border-area-tecnico text-area-tecnico',
  Geral: 'border-slate-400 text-slate-500',
}

export function areaAccent(area: string) {
  return AREA_COLOR_VAR[area] ?? AREA_COLOR_VAR.Geral
}

/** "agora", "há 5 min", "há 2 h", "há 3 dias", ou a data para mais de 30 dias. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  if (s < 86400 * 30) { const d = Math.floor(s / 86400); return `há ${d} ${d === 1 ? 'dia' : 'dias'}` }
  return formatDate(iso)
}

export function initials(nome: string | null | undefined): string {
  return (nome ?? '').split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}
