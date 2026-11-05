import { call } from './api'

export interface AutorForum { id: string; nome: string; foto_url: string | null }

export interface ManualForum {
  id: string
  titulo: string
  descricao: string
  categoria: string
  autor: string
  tags: string | null
  drive_file_id: string | null
  arquivo_url: string | null
  atualizado_em: string
  tem_conteudo: boolean
  trilha_id: string | null
  quiz_disponivel: boolean
  topicos: number
  respostas: number
  ultima_atividade: string
  ultimo_comentario: { autor: AutorForum; texto: string; criado_em: string } | null
}

export interface ComentarioForum {
  id: string
  manual_id: string
  parent_id: string | null
  texto: string
  criado_em: string
  autor: AutorForum
  curtidas: number
  curtido_por_mim: boolean
  pode_excluir: boolean
  respostas?: ComentarioForum[]
}

export interface Contribuidor { id: string; nome: string; foto_url: string | null; total: number }

export type OrdemComentarios = 'recentes' | 'curtidos'

export const fetchForum = (params?: { categoria?: string; q?: string }) =>
  call<ManualForum[]>('forum.listar', params ?? {})

export const fetchManualForum = (id: string) => call<ManualForum>('forum.manual', { id })

export const fetchConteudoManual = (manual_id: string) =>
  call<{ manual_id: string; conteudo_md: string }>('forum.conteudo', { manual_id })

export const fetchContribuidores = () => call<Contribuidor[]>('forum.contribuidores')

export const fetchComentarios = (manual_id: string, ordem: OrdemComentarios) =>
  call<ComentarioForum[]>('forum.comentarios', { manual_id, ordem })

export const comentar = (manual_id: string, texto: string, parent_id?: string) =>
  call<ComentarioForum>('forum.comentar', { manual_id, texto, parent_id })

export const curtir = (comentario_id: string) =>
  call<{ curtido: boolean; curtidas: number }>('forum.curtir', { comentario_id })

export const excluirComentario = (id: string) => call<{ ok: boolean }>('forum.excluir', { id })
