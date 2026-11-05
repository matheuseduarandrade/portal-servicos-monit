import { initials } from '@/lib/utils'

export function UserAvatar({ nome, fotoUrl, size = 36 }: { nome?: string | null; fotoUrl?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }
  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={nome ?? ''}
        referrerPolicy="no-referrer"
        style={style}
        className="rounded-full object-cover shrink-0 border border-black/5 dark:border-white/10"
      />
    )
  }
  return (
    <div
      style={style}
      className="rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 flex items-center justify-center font-semibold shrink-0"
    >
      {initials(nome) || '?'}
    </div>
  )
}
