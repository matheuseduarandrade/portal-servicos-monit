import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Loader2, Search, X } from 'lucide-react'
import { ResultadoItem } from '@/components/search/ResultadoItem'
import { termosDe } from '@/lib/busca'
import { buscar, type ResultadoBusca } from '@/services/busca'

function useDebounced<T>(valor: T, ms: number): T {
  const [v, setV] = useState(valor)
  useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t) }, [valor, ms])
  return v
}

/** Barra de pesquisa do topo: busca no portal inteiro e leva direto ao resultado escolhido. */
export function GlobalSearch() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(-1)
  const caixa = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  // na página de resultados, a barra mostra o que foi buscado
  useEffect(() => { if (location.pathname === '/busca') setQ(params.get('q') ?? '') }, [location.pathname, params])

  const deb = useDebounced(q.trim(), 350)
  const termos = useMemo(() => termosDe(deb), [deb])
  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['busca', deb, 24],
    queryFn: () => buscar(deb, 24),
    enabled: deb.length >= 2,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: 0,
  })

  // grupos na ordem do melhor resultado de cada um; até 4 por grupo no menu
  const grupos = useMemo(() => {
    const mapa = new Map<string, ResultadoBusca[]>()
    ;(data?.itens ?? []).forEach((i) => { if (!mapa.has(i.grupo)) mapa.set(i.grupo, []); mapa.get(i.grupo)!.push(i) })
    return [...mapa.entries()].map(([grupo, itens]) => ({ grupo, itens: itens.slice(0, 4), total: data?.contagem[grupo] ?? itens.length }))
  }, [data])
  const planos = useMemo(() => grupos.flatMap((g) => g.itens), [grupos])
  useEffect(() => setAtivo(-1), [data, deb])

  // fecha ao clicar fora; "/" foca a busca
  useEffect(() => {
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false) }
    const atalho = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName) && !alvo.isContentEditable) { e.preventDefault(); input.current?.focus() }
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', atalho)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', atalho) }
  }, [])

  const ir = (rota: string) => { setAberto(false); input.current?.blur(); navigate(rota) }
  const verTodos = () => { if (q.trim().length >= 2) ir(`/busca?q=${encodeURIComponent(q.trim())}`) }

  function teclado(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setAberto(false); input.current?.blur() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setAberto(true); setAtivo((a) => Math.min(a + 1, planos.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, -1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (ativo >= 0 && planos[ativo]) ir(planos[ativo].rota); else verTodos() }
  }

  const mostrar = aberto && q.trim().length > 0
  const esperando = q.trim().length >= 2 && (q.trim() !== deb || (isFetching && !data))

  return (
    <div ref={caixa} className="relative flex-1 max-w-md">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        ref={input}
        value={q}
        onChange={(e) => { setQ(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
        onKeyDown={teclado}
        role="combobox" aria-expanded={mostrar} aria-controls="resultados-busca" autoComplete="off"
        placeholder="Buscar manuais, comentários, sistemas, técnicos...  ( / )"
        className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 pl-9 pr-9 py-2 text-sm text-ink-900 dark:text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
      {(esperando || isFetching) ? (
        <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
      ) : q ? (
        <button onClick={() => { setQ(''); input.current?.focus() }} aria-label="Limpar" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15} /></button>
      ) : null}

      {mostrar && (
        <div id="resultados-busca" role="listbox"
          className="absolute left-0 top-full mt-2 w-[min(680px,92vw)] max-h-[72vh] overflow-y-auto rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-surface-darkCard shadow-popover z-50">
          {q.trim().length < 2 ? (
            <p className="px-4 py-5 text-sm text-slate-400">Digite pelo menos 2 letras. Ex.: o modelo de um equipamento, o nome de um sistema ou de uma pessoa.</p>
          ) : isError ? (
            <p className="px-4 py-5 text-sm text-red-500">{error instanceof Error ? error.message : 'Não foi possível buscar agora.'}</p>
          ) : !data || (esperando && !data.itens.length) ? (
            <p className="px-4 py-5 text-sm text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Buscando…</p>
          ) : data.itens.length === 0 ? (
            <p className="px-4 py-5 text-sm text-slate-500">Nada encontrado para <strong>“{data.q}”</strong>. Tente outras palavras ou menos letras.</p>
          ) : (
            <>
              <div className="px-4 pt-3 pb-1 text-[11px] text-slate-400">{data.total} {data.total === 1 ? 'resultado' : 'resultados'} para “{data.q}”</div>
              <div className="p-2 space-y-2">
                {grupos.map((g) => (
                  <div key={g.grupo}>
                    <p className="px-3 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {g.grupo} <span className="font-normal normal-case">· {g.total}</span>
                    </p>
                    {g.itens.map((r) => {
                      const idx = planos.indexOf(r)
                      return <ResultadoItem key={r.rota + r.titulo} r={r} termos={termos} ativo={idx === ativo} onHover={() => setAtivo(idx)} onClick={() => ir(r.rota)} />
                    })}
                  </div>
                ))}
              </div>
              <button onClick={verTodos} className="w-full border-t border-black/5 dark:border-white/10 px-4 py-3 text-sm text-brand-600 hover:bg-slate-50 dark:hover:bg-white/5 text-left">
                Ver todos os {data.total} resultados →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
