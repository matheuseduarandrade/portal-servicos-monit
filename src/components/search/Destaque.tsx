import { partes } from '@/lib/busca'

/** Mostra o texto com as palavras buscadas destacadas (sem diferenciar acentos/maiúsculas). */
export function Destaque({ texto, termos }: { texto: string; termos: string[] }) {
  return (
    <>
      {partes(texto, termos).map((p, i) =>
        p.hit
          ? <mark key={i} className="rounded bg-yellow-200 dark:bg-yellow-500/40 text-inherit px-0.5">{p.t}</mark>
          : <span key={i}>{p.t}</span>)}
    </>
  )
}
