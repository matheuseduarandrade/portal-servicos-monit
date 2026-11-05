import { call } from './api'

export interface Colaborador {
  id: string
  email: string
  nome: string
  foto_url?: string | null
  aprovado: boolean
  aprovado_em?: string | null
  nivel?: string | null
  area?: string | null
  setor?: string | null
  cargo?: string | null
  gestor_direto_id?: string | null
  gestor_area_id?: string | null
  gestor_direto_nome?: string | null
  gestor_area_nome?: string | null
  nome_completo?: string | null
  data_nascimento?: string | null
  endereco?: string | null
  telefone?: string | null
  telefone_emergencia?: string | null
  contato_emergencia_nome?: string | null
  email_contato?: string | null
  email_emergencia?: string | null
  criado_em?: string | null
}

export const fetchColaboradores = (aprovado?: boolean) =>
  call<Colaborador[]>('colaboradores.listar', aprovado !== undefined ? { aprovado } : {})

export const fetchConfig = () =>
  call<{ areas: string[]; setores: string[]; niveis: string[]; setores_por_area: Record<string, string[]> }>('colaboradores.config')

/** Usuários que já acessaram o portal e ainda não são colaboradores. */
export interface CandidatoColaborador {
  id: string; nome: string; email: string
  cargo?: string | null; area?: string | null; foto_url?: string | null
}
export const fetchCandidatos = () => call<CandidatoColaborador[]>('colaboradores.candidatos')

export const cadastrarColaborador = (body: {
  usuario_id: string; nivel: string; area?: string; setor?: string; cargo?: string
  gestor_direto_id?: string | null; gestor_area_id?: string | null
}) => call<Colaborador>('colaboradores.cadastrar', body as never)

export const aprovarColaborador = (id: string, body: object) =>
  call<Colaborador>('colaboradores.aprovar', { id, ...body })

export const atualizarFicha = (id: string, body: object) =>
  call<Colaborador>('colaboradores.atualizarFicha', { id, ...body })

export const removerColaborador = (id: string) =>
  call<void>('colaboradores.remover', { id })
