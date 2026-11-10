import { call } from './api'

export interface ResultadoBusca {
  tipo: 'manual' | 'conteudo' | 'comentario' | 'foto' | 'homologacao' | 'sistema' | 'projeto' | 'tecnico' | 'colaborador' | 'comunicado' | 'evento' | 'trilha'
  grupo: string
  score: number
  titulo: string
  caminho: string[]
  trecho: string
  rota: string
}

export interface RespostaBusca {
  q: string
  termos: string[]
  total: number
  contagem: Record<string, number>
  itens: ResultadoBusca[]
}

export const GRUPOS_BUSCA = ['Biblioteca', 'Sistemas', 'Projetos', 'Técnicos', 'Colaboradores', 'Comunicados', 'Calendário', 'Quiz']

export const buscar = (q: string, limite = 30) => call<RespostaBusca>('busca.global', { q, limite })
