import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, SearchX } from 'lucide-react'
import { PageHeader, Card } from '@/components/ui/primitives'
import { ResultadoItem } from '@/components/search/ResultadoItem'
import { termosDe } from '@/lib/busca'
import { buscar, GRUPOS_BUSCA } from '@/services/busca'

/** Página com todos os resultados da busca, com filtro por área do portal. */
export default function Busca() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = (params.get('q') ?? '').trim()
  const [grupo, setGrupo] = useState('Todos')
  const termos = useMemo(() => termosDe(q), [q])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['busca', q, 100],
    queryFn: () => buscar(q, 100),
    enabled: q.length >= 2,
    staleTime: 30_000,
    retry: 0,
  })

  const itens = (data?.itens ?? []).filter((i) => grupo === 'Todos' || i.grupo === grupo)
  const grupos = GRUPOS_BUSCA.filter((g) => data?.contagem[g])

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={q ? `Resultados para “${q}”` : 'Busca'}
        subtitle={data ? `${data.total} ${data.total === 1 ? 'resultado encontrado' : 'resultados encontrados'} em todo o portal.` : 'Pesquise manuais, comentários, sistemas, projetos, técnicos e mais.'}
      />

      {q.length < 2 ? (
        <p className="text-sm text-slate-400">Digite pelo menos 2 letras na barra de pesquisa do topo.</p>
      ) : isLoading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 size={20} className="animate-spin mr-2" /> Buscando…</div>
      ) : isError ? (
        <p className="text-sm text-red-500">{error instanceof Error ? error.message : 'Não foi possível buscar agora.'}</p>
      ) : !data || data.total === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <SearchX size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nada encontrado para “{q}”.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Todos', ...grupos].map((g) => (
              <button key={g} onClick={() => setGrupo(g)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  grupo === g ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-brand-400'}`}>
                {g} <span className="opacity-70">{g === 'Todos' ? data.total : data.contagem[g]}</span>
              </button>
            ))}
          </div>
          <Card className="p-2">
            <div role="listbox" className="divide-y divide-black/5 dark:divide-white/5">
              {itens.map((r) => <ResultadoItem key={r.rota + r.titulo} r={r} termos={termos} onClick={() => navigate(r.rota)} />)}
            </div>
          </Card>
          {data.total > data.itens.length && (
            <p className="text-xs text-slate-400 mt-3">Mostrando os {data.itens.length} mais relevantes. Use palavras mais específicas para refinar.</p>
          )}
        </>
      )}
    </div>
  )
}
