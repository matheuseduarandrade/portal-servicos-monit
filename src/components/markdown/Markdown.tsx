import { Fragment, useMemo, type ReactNode } from 'react'
import { parseMarkdown, type Block, type Inline } from '@/lib/markdown'

function scrollParaId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function inline(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text': return <Fragment key={i}>{n.v}</Fragment>
      case 'strong': return <strong key={i} className="font-semibold text-ink-900 dark:text-white">{inline(n.c)}</strong>
      case 'em': return <em key={i}>{inline(n.c)}</em>
      case 'del': return <del key={i} className="opacity-70">{inline(n.c)}</del>
      case 'br': return <br key={i} />
      case 'code':
        return <code key={i} className="rounded bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[0.85em] font-mono text-pink-600 dark:text-pink-300">{n.v}</code>
      case 'image':
        return <img key={i} src={n.src} alt={n.alt} loading="lazy" referrerPolicy="no-referrer"
          className="max-w-full h-auto rounded-lg border border-slate-200 dark:border-white/10 my-2" />
      case 'link': {
        const interno = n.href.startsWith('#')
        return (
          <a key={i} href={n.href}
            {...(interno ? { onClick: (e: React.MouseEvent) => { e.preventDefault(); scrollParaId(decodeURIComponent(n.href.slice(1))) } }
              : { target: '_blank', rel: 'noopener noreferrer' })}
            className="text-brand-600 dark:text-brand-300 underline underline-offset-2 hover:text-brand-700 break-words">
            {inline(n.c)}
          </a>
        )
      }
    }
  })
}

const TITULO: Record<number, string> = {
  1: 'text-2xl font-bold mt-8 mb-3 pb-2 border-b border-slate-200 dark:border-white/10',
  2: 'text-xl font-semibold mt-7 mb-2.5',
  3: 'text-lg font-semibold mt-6 mb-2',
  4: 'text-base font-semibold mt-5 mb-1.5',
  5: 'text-sm font-semibold mt-4 mb-1 uppercase tracking-wide',
  6: 'text-sm font-semibold mt-4 mb-1 text-slate-500',
}

function blocos(bs: Block[], tight = false): ReactNode[] {
  return bs.map((b, i) => {
    switch (b.t) {
      case 'heading': {
        const Tag = `h${b.level}` as 'h1'
        return <Tag key={i} id={b.id} className={`scroll-mt-24 text-ink-900 dark:text-white ${TITULO[b.level]}`}>{inline(b.c)}</Tag>
      }
      case 'paragraph':
        return <p key={i} className={tight ? 'leading-relaxed' : 'my-3 leading-relaxed'}>{inline(b.c)}</p>
      case 'code':
        return (
          <pre key={i} className="my-4 rounded-xl bg-slate-900 text-slate-100 p-4 text-sm overflow-x-auto">
            {b.lang && <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-2">{b.lang}</span>}
            <code className="font-mono whitespace-pre">{b.v}</code>
          </pre>
        )
      case 'quote':
        return (
          <blockquote key={i} className="my-4 border-l-4 border-brand-300 bg-brand-50/60 dark:bg-brand-500/10 dark:border-brand-500/40 rounded-r-lg px-4 py-2 text-slate-700 dark:text-slate-200">
            {blocos(b.c, true)}
          </blockquote>
        )
      case 'hr':
        return <hr key={i} className="my-6 border-slate-200 dark:border-white/10" />
      case 'list': {
        const Tag = b.ordered ? 'ol' : 'ul'
        return (
          <Tag key={i} start={b.ordered ? b.start : undefined}
            className={`my-3 space-y-1.5 pl-6 ${b.ordered ? 'list-decimal' : 'list-disc'} marker:text-slate-400`}>
            {b.items.map((it, k) => (
              <li key={k} className={it.checked !== null ? 'list-none -ml-6 flex items-start gap-2' : ''}>
                {it.checked !== null && <input type="checkbox" checked={it.checked} readOnly className="mt-1.5 accent-brand-600" />}
                <div className="min-w-0 flex-1">{blocos(it.c, true)}</div>
              </li>
            ))}
          </Tag>
        )
      }
      case 'table':
        return (
          <div key={i} className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr>
                  {b.head.map((h, k) => (
                    <th key={k} style={{ textAlign: b.align[k] ?? 'left' }} className="px-3 py-2 font-semibold border-b border-slate-200 dark:border-white/10">{inline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, ri) => (
                  <tr key={ri} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                    {r.map((c, k) => <td key={k} style={{ textAlign: b.align[k] ?? 'left' }} className="px-3 py-2 align-top">{inline(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
    }
  })
}

/** Mostra Markdown na tela. Nada do texto vira HTML: é seguro para conteúdo escrito por administradores. */
export function Markdown({ source, blocks }: { source?: string; blocks?: Block[] }) {
  const arvore = useMemo(() => blocks ?? parseMarkdown(source ?? ''), [blocks, source])
  return <div className="text-[15px] text-slate-700 dark:text-slate-200 break-words">{blocos(arvore)}</div>
}

export { scrollParaId }
