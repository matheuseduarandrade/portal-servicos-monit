import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Images, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Card, Button, Input } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { Lightbox } from '@/components/fotos/Lightbox'
import { prepararImagem, type FotoPreparada } from '@/lib/imagem'
import { fetchFotosManual, adicionarFotosManual, atualizarFoto, removerFoto, type FotoResumo } from '@/services/midia'

/** Galeria do manual (ao lado do conteúdo): miniaturas com descrição, clique para ampliar. Admin gerencia. */
export function FotosManual({ manualId, admin, abrirId }: { manualId: string; admin: boolean; abrirId?: string | null }) {
  const qc = useQueryClient()
  const [indice, setIndice] = useState<number | null>(null)
  const [adicionando, setAdicionando] = useState(false)
  const [editando, setEditando] = useState<FotoResumo | null>(null)
  const [removendo, setRemovendo] = useState<FotoResumo | null>(null)

  const { data: fotos = [], isLoading } = useQuery({ queryKey: ['midia-manual', manualId], queryFn: () => fetchFotosManual(manualId) })
  const refresh = () => qc.invalidateQueries({ queryKey: ['midia-manual', manualId] })

  // vindo da busca: abre a foto indicada uma única vez
  const jaAbriu = useRef<string | null>(null)
  useEffect(() => {
    if (abrirId && jaAbriu.current !== abrirId && fotos.length) {
      const i = fotos.findIndex((f) => f.id === abrirId)
      if (i >= 0) { jaAbriu.current = abrirId; setIndice(i) }
    }
  }, [abrirId, fotos])

  const mutRemover = useMutation({ mutationFn: removerFoto, onSuccess: () => { refresh(); setRemovendo(null) } })

  if (!isLoading && fotos.length === 0 && !admin) return null

  return (
    <Card className="xl:sticky xl:top-24">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <Images size={15} className="text-brand-600" /> Fotos do manual {fotos.length > 0 && <span className="text-slate-400 font-normal">({fotos.length})</span>}
        </h3>
        {admin && <Button size="sm" variant="outline" onClick={() => setAdicionando(true)}><ImagePlus size={14} /> Adicionar</Button>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : fotos.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">Nenhuma foto ainda. Use "Adicionar" para incluir fotos com descrição.</p>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-1 gap-4 xl:max-h-[calc(100vh-11rem)] overflow-y-auto pr-1">
          {fotos.map((f, i) => (
            <figure key={f.id} className="group relative">
              <button onClick={() => setIndice(i)} className="block w-full overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                {f.thumb && <img src={f.thumb} alt={f.descricao ?? `Foto ${i + 1}`} loading="lazy" className="w-full aspect-[4/3] object-cover transition-transform group-hover:scale-[1.03]" />}
              </button>
              {f.descricao && <figcaption className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-snug">{f.descricao}</figcaption>}
              {admin && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditando(f)} title="Editar descrição" className="p-1.5 rounded-lg bg-white/95 text-slate-600 hover:text-brand-600 shadow"><Pencil size={13} /></button>
                  <button onClick={() => setRemovendo(f)} title="Remover" className="p-1.5 rounded-lg bg-white/95 text-slate-600 hover:text-red-500 shadow"><Trash2 size={13} /></button>
                </div>
              )}
            </figure>
          ))}
        </div>
      )}

      {indice !== null && <Lightbox fotos={fotos} indice={indice} onMudar={setIndice} onFechar={() => setIndice(null)} />}

      {admin && <AdicionarDialog open={adicionando} manualId={manualId} onClose={() => setAdicionando(false)} onSaved={refresh} />}
      {admin && <EditarDescricao foto={editando} onClose={() => setEditando(null)} onSaved={refresh} />}

      <Dialog open={!!removendo} onOpenChange={(o) => !o && setRemovendo(null)} title="Remover foto" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">Tem certeza que deseja remover esta foto do manual?</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setRemovendo(null)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={mutRemover.isPending} onClick={() => removendo && mutRemover.mutate(removendo.id)}>
            {mutRemover.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Remover
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}

function EditarDescricao({ foto, onClose, onSaved }: { foto: FotoResumo | null; onClose: () => void; onSaved: () => void }) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { setTexto(foto?.descricao ?? ''); setErro(null) }, [foto?.id])  // eslint-disable-line react-hooks/exhaustive-deps
  const mut = useMutation({
    mutationFn: () => atualizarFoto(foto!.id, texto),
    onSuccess: () => { onSaved(); onClose() },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : 'Erro ao salvar.'),
  })
  return (
    <Dialog open={!!foto} onOpenChange={(o) => !o && onClose()} title="Descrição da foto" size="sm">
      {foto?.thumb && <img src={foto.thumb} alt="" className="w-full max-h-48 object-cover rounded-lg mb-3" />}
      <Input value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 200))} placeholder="Ex: Conexão da TX09 no barramento OBD II" />
      {erro && <p className="text-xs text-red-500 mt-2">{erro}</p>}
      <div className="flex gap-3 mt-4">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending && <Loader2 size={14} className="animate-spin" />} Salvar</Button>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </Dialog>
  )
}

interface Item { foto: FotoPreparada; descricao: string }

function AdicionarDialog({ open, manualId, onClose, onSaved }: { open: boolean; manualId: string; onClose: () => void; onSaved: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [itens, setItens] = useState<Item[]>([])
  const [preparando, setPreparando] = useState(false)
  const [progresso, setProgresso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => { if (open) { setItens([]); setErro(null); setProgresso(null) } }, [open])

  async function escolher(files: FileList | null) {
    if (!files?.length) return
    setErro(null); setPreparando(true)
    const novos: Item[] = []
    for (const f of Array.from(files).slice(0, 10 - itens.length)) {
      try { novos.push({ foto: await prepararImagem(f), descricao: '' }) } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao ler a imagem.') }
    }
    setPreparando(false)
    setItens((a) => [...a, ...novos])
    if (input.current) input.current.value = ''
  }

  const enviando = progresso !== null
  async function enviar() {
    setErro(null)
    try {
      const lote = 2                       // poucas fotos por requisição: cada uma já vai reduzida (~300 KB)
      for (let i = 0; i < itens.length; i += lote) {
        setProgresso(`Enviando ${Math.min(i + lote, itens.length)} de ${itens.length}…`)
        await adicionarFotosManual(manualId, itens.slice(i, i + lote).map(({ foto, descricao }) => ({
          dados: foto.dados, thumb: foto.thumb, largura: foto.largura, altura: foto.altura, descricao: descricao.trim(),
        })))
      }
      onSaved(); onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar as fotos.')
      onSaved()
    }
    setProgresso(null)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !enviando && onClose()} title="Adicionar fotos ao manual" description="As fotos são reduzidas automaticamente antes do envio." size="lg">
      <div className="space-y-4">
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {itens.map((it, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-white/10 p-2.5">
              <img src={it.foto.preview} alt="" className="h-20 w-28 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-slate-500 mb-1">Descrição da foto</label>
                <Input value={it.descricao} onChange={(e) => setItens((a) => a.map((x, k) => (k === i ? { ...x, descricao: e.target.value.slice(0, 200) } : x)))}
                  placeholder="Ex: Conexão da TX09 no barramento OBD II" disabled={enviando} />
              </div>
              <button onClick={() => setItens((a) => a.filter((_, k) => k !== i))} disabled={enviando} className="p-1.5 text-slate-400 hover:text-red-500" title="Tirar da lista"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>

        {itens.length < 10 && (
          <button onClick={() => input.current?.click()} disabled={preparando || enviando}
            className="w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 py-6 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50">
            {preparando ? <><Loader2 size={16} className="inline animate-spin mr-1.5" /> Preparando as fotos…</> : <><ImagePlus size={16} className="inline mr-1.5" /> Escolher fotos (até 10 por vez)</>}
          </button>
        )}
        <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => escolher(e.target.files)} />

        {erro && <p className="text-xs text-red-500">{erro}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={enviar} disabled={!itens.length || enviando || preparando}>
            {enviando ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} Enviar {itens.length ? `${itens.length} ${itens.length === 1 ? 'foto' : 'fotos'}` : ''}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={enviando}>Cancelar</Button>
          {progresso && <span className="text-xs text-slate-500">{progresso}</span>}
        </div>
      </div>
    </Dialog>
  )
}
