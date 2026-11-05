import { call } from './api'

export interface DocBiblioteca {
  id: string
  titulo: string
  descricao: string
  categoria: string
  autor: string
  arquivo_url?: string | null
  drive_file_id?: string | null
  atualizado_em: string
  // Homologações
  marca?: string
  modelo?: string
  ano?: number
  // Sistema vinculado (só manuais de sistemas)
  sistema_nome?: string
  // Fórum
  tags?: string | null
}

type Params = Record<string, string>

// Manuais (inclui Manuais Sistemas, Gerais, Configurações, Comandos)
export const fetchManuais    = (params?: Params) => call<DocBiblioteca[]>('biblioteca.manuais.listar', params ?? {})
export const criarManual     = (body: Omit<DocBiblioteca, 'id'>) => call<DocBiblioteca>('biblioteca.manuais.criar', body as never)
export const atualizarManual = (id: string, body: Partial<DocBiblioteca>) => call<DocBiblioteca>('biblioteca.manuais.atualizar', { id, ...body })
export const excluirManual   = (id: string) => call<void>('biblioteca.manuais.remover', { id })
/** Cola/atualiza o texto do manual em Markdown (vazio apaga). */
export const salvarConteudoManual = (manual_id: string, conteudo_md: string) =>
  call<{ ok: boolean; caracteres: number }>('biblioteca.manuais.salvarConteudo', { manual_id, conteudo_md })

// Homologações
export const fetchHomologacoes    = (params?: Params) => call<DocBiblioteca[]>('biblioteca.homologacoes.listar', params ?? {})
export const criarHomologacao     = (body: Omit<DocBiblioteca, 'id'>) => call<DocBiblioteca>('biblioteca.homologacoes.criar', body as never)
export const atualizarHomologacao = (id: string, body: Partial<DocBiblioteca>) => call<DocBiblioteca>('biblioteca.homologacoes.atualizar', { id, ...body })
export const excluirHomologacao   = (id: string) => call<void>('biblioteca.homologacoes.remover', { id })
