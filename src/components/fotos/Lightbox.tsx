import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { obterFoto } from '@/services/midia'

export interface FotoRef { id: string; descricao: string | null; thumb: string | null }

/** Foto ampliada (tela cheia): carrega a imagem inteira ao abrir; setas/teclado para navegar, Esc para fechar. */
export function Lightbox({ fotos, indice, onMudar, onFechar }: {
  fotos: FotoRef[]
  indice: number
  onMudar: (i: number) => void
  onFechar: () => void
}) {
  const qc = useQueryClient()
  const foto = fotos[indice]
  const { data, isError } = useQuery({
    queryKey: ['midia-full', foto?.id],
    queryFn: () => obterFoto(foto.id),
    enabled: !!foto,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: 1,
  })

  // pré-carrega a próxima foto enquanto você olha esta
  useEffect(() => {
    const prox = fotos[indice + 1]
    if (prox) qc.prefetchQuery({ queryKey: ['midia-full', prox.id], queryFn: () => obterFoto(prox.id), staleTime: Infinity })
  }, [indice, fotos, qc])

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
      else if (e.key === 'ArrowRight' && indice < fotos.length - 1) onMudar(indice + 1)
      else if (e.key === 'ArrowLeft' && indice > 0) onMudar(indice - 1)
    }
    window.addEventListener('keydown', tecla)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = overflow }
  }, [indice, fotos.length, onMudar, onFechar])

  if (!foto) return null
  const src = data ? `data:${data.mime};base64,${data.base64}` : null

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col" onClick={onFechar} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-4 py-3 text-white/80 text-sm" onClick={(e) => e.stopPropagation()}>
        <span>{indice + 1} / {fotos.length}</span>
        <button onClick={onFechar} className="p-2 rounded-lg hover:bg-white/10" aria-label="Fechar"><X size={20} /></button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-12">
        {indice > 0 && (
          <button onClick={(e) => { e.stopPropagation(); onMudar(indice - 1) }} aria-label="Anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"><ChevronLeft size={26} /></button>
        )}
        <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
          {src ? (
            <img src={src} alt={foto.descricao ?? ''} className="max-w-full max-h-[78vh] object-contain rounded-lg" />
          ) : foto.thumb ? (
            <div className="relative">
              <img src={foto.thumb} alt="" className="max-w-full max-h-[78vh] object-contain rounded-lg blur-[2px] opacity-70" style={{ minWidth: 280 }} />
              {!isError && <Loader2 size={30} className="absolute inset-0 m-auto animate-spin text-white" />}
            </div>
          ) : (
            <Loader2 size={30} className="animate-spin text-white" />
          )}
          {isError && <p className="text-center text-sm text-red-300 mt-3">Não foi possível carregar a foto.</p>}
        </div>
        {indice < fotos.length - 1 && (
          <button onClick={(e) => { e.stopPropagation(); onMudar(indice + 1) }} aria-label="Próxima"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"><ChevronRight size={26} /></button>
        )}
      </div>

      <div className="px-6 py-4 text-center min-h-[64px]" onClick={(e) => e.stopPropagation()}>
        {foto.descricao && <p className="text-white text-sm max-w-3xl mx-auto">{foto.descricao}</p>}
      </div>
    </div>
  )
}
