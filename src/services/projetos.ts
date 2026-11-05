import { call } from './api'

export const STATUS_PROJETO = ['Planejado', 'Em andamento', 'Concluído', 'Atrasado'] as const
export type StatusProjeto = (typeof STATUS_PROJETO)[number]

export interface Projeto {
  id: string
  nome: string
  responsavel_planejamento: string | null
  responsavel_monitoramento: string | null
  status: StatusProjeto
  percentual: number
}

export type ProjetoInput = Omit<Projeto, 'id'>

export const fetchProjetos   = () => call<Projeto[]>('projetos.listar')
export const criarProjeto    = (body: ProjetoInput) => call<Projeto>('projetos.criar', body as never)
export const atualizarProjeto = (id: string, body: Partial<ProjetoInput>) => call<Projeto>('projetos.atualizar', { id, ...body })
export const removerProjeto  = (id: string) => call<void>('projetos.remover', { id })
