import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { prepararImagem, type FotoPreparada } from '@/lib/imagem'

/** Botão "Anexar foto" + miniaturas das fotos escolhidas (com remover). O estado fica no componente pai. */
export function AnexarFotos({ fotos, onChange, max = 4, disabled }: {
  fotos: FotoPreparada[]
  onChange: (f: FotoPreparada[]) => void
  max?: number
  disabled?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function escolher(files: FileList | null) {
    if (!files || !files.length) return
    setErro(null)
    const lista = Array.from(files).slice(0, max - fotos.length)
    if (files.length > lista.length) setErro(`Máximo de ${max} fotos por comentário.`)
    setOcupado(true)
    const novas: FotoPreparada[] = []
    for (const f of lista) {
      try { novas.push(await prepararImagem(f)) } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao ler a imagem.') }
    }
    setOcupado(false)
    if (novas.length) onChange([...fotos, ...novas])
    if (input.current) input.current.value = ''
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {fotos.map((f, i) => (
          <div key={i} className="relative">
            <img src={f.preview} alt="" className="h-14 w-14 rounded-lg object-cover border border-slate-200 dark:border-white/10" />
            <button onClick={() => onChange(fotos.filter((_, k) => k !== i))} disabled={disabled} aria-label="Remover foto"
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-red-600"><X size={11} /></button>
          </div>
        ))}
        {fotos.length < max && (
          <button type="button" onClick={() => input.current?.click()} disabled={disabled || ocupado}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 dark:border-white/20 px-3 py-2 text-xs text-slate-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50">
            {ocupado ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {ocupado ? 'Preparando…' : 'Anexar foto'}
          </button>
        )}
        <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => escolher(e.target.files)} />
      </div>
      {erro && <p className="text-xs text-red-500 mt-1.5">{erro}</p>}
    </div>
  )
}
