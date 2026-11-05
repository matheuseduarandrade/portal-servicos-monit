import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, FileText, Eye, Pencil, Wand2 } from 'lucide-react'
import { Button, Input } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { Markdown } from '@/components/markdown/Markdown'
import { useAuth } from '@/contexts/AuthContext'
import { CATS_MANUAIS } from '@/components/biblioteca/docs'
import { criarManual, atualizarManual, salvarConteudoManual } from '@/services/biblioteca'
import { fetchConteudoManual, type ManualForum } from '@/services/forum'
import { extractDriveId, linkDoManual } from '@/lib/drive'

const MAX = 300_000
const SELECT = 'w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm'

const MODELO = `# Título do manual

> Resumo rápido: para que serve este manual e a quem ele se destina.

## 1. Introdução
Explique o que é o sistema/equipamento e quando usar.

## 2. Acesso
1. Abra o endereço do sistema.
2. Entre com seu usuário e senha.
3. Escolha o módulo desejado.

## 3. Passo a passo
### 3.1 Primeira tarefa
Descreva o procedimento com detalhes. Use **negrito** para destacar botões e menus.

### 3.2 Segunda tarefa
- Item importante
- Outro item
  - Detalhe do item

## 4. Referência rápida
| Campo | O que significa |
|---|---|
| Status | Situação atual do equipamento |
| Última posição | Data e hora do último sinal |

## 5. Perguntas frequentes
**O equipamento não comunica. O que fazer?**
Verifique a alimentação e o sinal; se persistir, abra um chamado.

> ⚠️ **Atenção:** nunca remova o equipamento sem autorização.
`

interface Props {
  open: boolean
  /** null = novo manual */
  manual: ManualForum | null
  onClose: () => void
}

export function ManualEditorDialog({ open, manual, onClose }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const novo = !manual

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState(CATS_MANUAIS[0])
  const [autor, setAutor] = useState('')
  const [tags, setTags] = useState('')
  const [link, setLink] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [original, setOriginal] = useState<string | null>(null)
  const [aba, setAba] = useState<'escrever' | 'previa'>('escrever')
  const [erro, setErro] = useState<string | null>(null)

  // preenche o formulário a cada abertura
  useEffect(() => {
    if (!open) return
    setErro(null)
    setAba('escrever')
    if (manual) {
      setTitulo(manual.titulo); setDescricao(manual.descricao); setCategoria(manual.categoria)
      setAutor(manual.autor); setTags(manual.tags ?? ''); setLink(linkDoManual(manual) ?? '')
      setConteudo(''); setOriginal(null)
    } else {
      setTitulo(''); setDescricao(''); setCategoria(CATS_MANUAIS[0]); setAutor(user?.nome ?? '')
      setTags(''); setLink(''); setConteudo(''); setOriginal('')
    }
  }, [open, manual?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  // ao editar, carrega o texto atual do manual
  const { data: atual, isError: falhouConteudo } = useQuery({
    queryKey: ['forum-conteudo', manual?.id],
    queryFn: () => fetchConteudoManual(manual!.id),
    enabled: open && !!manual,
    gcTime: 0,
  })
  useEffect(() => {
    if (open && manual && atual && original === null) { setConteudo(atual.conteudo_md); setOriginal(atual.conteudo_md) }
  }, [atual, open, manual, original])

  const carregando = !novo && original === null && !falhouConteudo

  const mut = useMutation({
    mutationFn: async () => {
      const urlLimpa = link.trim()
      const meta = {
        titulo: titulo.trim(), descricao: descricao.trim(), categoria, autor: autor.trim(),
        tags: tags.trim() || null, arquivo_url: urlLimpa || null, drive_file_id: extractDriveId(urlLimpa),
      }
      let id = manual?.id
      if (novo) id = (await criarManual(meta as never)).id
      else await atualizarManual(manual!.id, meta as never)
      if (conteudo !== (original ?? '') || (novo && conteudo.trim())) await salvarConteudoManual(id!, conteudo)
      return id
    },
    onSuccess: () => {
      ;['forum', 'forum-manual', 'forum-conteudo', 'biblioteca-manuais-todos'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      onClose()
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : 'Erro ao salvar o manual.'),
  })

  const linkInvalido = !!link.trim() && !/^https?:\/\//i.test(link.trim())
  const grande = conteudo.length > MAX
  const pode = titulo.trim() && descricao.trim() && autor.trim() && !linkInvalido && !grande && !carregando && !mut.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !mut.isPending && onClose()} title={novo ? 'Publicar manual' : `Editar — ${manual?.titulo}`} size="lg">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Título</label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Manual do Trix" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Descrição curta (aparece no card)</label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Manual de utilização do sistema..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={SELECT}>
              {CATS_MANUAIS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Responsável</label>
            <Input value={autor} onChange={(e) => setAutor(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tags <span className="text-slate-300">(separe por vírgula)</span></label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Sistemas, Atendimentos" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Link do manual completo no Google Drive</label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/file/d/..." />
            {linkInvalido && <p className="text-[11px] text-red-500 mt-1">O link deve começar com https://</p>}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <FileText size={13} /> Conteúdo do manual (Markdown) <span className="text-slate-300">— é o que aparece na tela do Fórum</span>
            </label>
            <div className="flex items-center gap-1">
              {!conteudo.trim() && (
                <button onClick={() => setConteudo(MODELO)} className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1 mr-2">
                  <Wand2 size={12} /> Inserir modelo
                </button>
              )}
              {([['escrever', 'Escrever', Pencil], ['previa', 'Pré-visualizar', Eye]] as const).map(([id, rotulo, Icone]) => (
                <button key={id} onClick={() => setAba(id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
                    aba === id ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}>
                  <Icone size={12} /> {rotulo}
                </button>
              ))}
            </div>
          </div>

          {carregando ? (
            <div className="flex items-center justify-center h-64 text-slate-400 rounded-lg border border-slate-200 dark:border-white/10">
              <Loader2 size={18} className="animate-spin mr-2" /> Carregando o texto atual…
            </div>
          ) : aba === 'escrever' ? (
            <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} spellCheck={false} rows={16}
              placeholder={'Cole aqui o manual em Markdown.\n\n# Título\n## Capítulo\n- tópicos, **negrito**, tabelas, imagens...'}
              className={`${SELECT} font-mono text-[13px] leading-relaxed resize-y min-h-[260px]`} />
          ) : (
            <div className="h-[22rem] overflow-y-auto rounded-lg border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/5">
              {conteudo.trim() ? <Markdown source={conteudo} /> : <p className="text-sm text-slate-400">Nada para mostrar ainda.</p>}
            </div>
          )}
          <div className="flex justify-between text-[11px] mt-1">
            <span className="text-slate-400">Dica: títulos com #, ## e ### viram o índice lateral do manual.</span>
            <span className={grande ? 'text-red-500' : 'text-slate-400'}>{conteudo.length.toLocaleString('pt-BR')} / {MAX.toLocaleString('pt-BR')}</span>
          </div>
          {falhouConteudo && <p className="text-xs text-amber-600 mt-1">Não foi possível carregar o texto atual. Salvar agora não altera o conteúdo se você não digitar nada.</p>}
        </div>

        {erro && <p className="text-xs text-red-500">{erro}</p>}

        <div className="flex gap-3 pt-1">
          <Button onClick={() => mut.mutate()} disabled={!pode}>
            {mut.isPending && <Loader2 size={14} className="animate-spin" />} Salvar
          </Button>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Cancelar</Button>
        </div>
      </div>
    </Dialog>
  )
}
