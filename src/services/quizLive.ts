import { call } from './api'
import type { Trilha } from './quiz'

export type QuizLiveStatus = 'WAITING' | 'QUESTION_ACTIVE' | 'ANSWER_REVEALED' | 'FINISHED' | 'CLOSED'
export type QuizLiveFonte = 'existente' | 'exclusiva' | 'mista'

export interface QuizLiveQuestionInput {
  tipo: 'multipla' | 'vf'
  enunciado: string
  opcoes: string[]
  correta: number
  explicacao?: string
}
export interface QuizLiveBancoQuestion extends QuizLiveQuestionInput { id: string }
export interface QuizLiveRoomList {
  id: string; codigo: string; titulo: string; status: QuizLiveStatus; total_questoes: number; participantes: number; criado_em: string
}
export interface QuizLiveParticipant {
  id: string; nome: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED'; pontos: number; acertos: number; erros: number
}
export interface QuizLiveQuestion {
  id: string; ordem: number; tipo: 'multipla' | 'vf'; enunciado: string; opcoes: string[]; correta?: number; explicacao?: string
}
export interface QuizLiveHostPanel {
  sala: { id: string; codigo: string; titulo: string; status: QuizLiveStatus; fonte: string; total_questoes: number; questao_atual: number; limite_participantes: number; criado_em: string; iniciado_em: string | null; finalizado_em: string | null }
  participantes: QuizLiveParticipant[]; aprovados: number; pendentes: number; pergunta: QuizLiveQuestion | null
  respostas: Array<{ participante_id: string; nome: string; alternativa: number; respondido_em: string; acertou: boolean | null }>
  distribuicao: Array<{ alternativa: number; label: string; total: number }>; total_respostas: number
  ranking: Array<{ posicao: number; nome: string; pontos: number; acertos: number; erros: number }>
}
export interface QuizLiveParticipantState {
  sala: { titulo: string; status: QuizLiveStatus; total_questoes: number; questao_atual: number }
  participante: { nome: string; status: string; pontos: number; acertos: number; erros: number }
  pergunta: QuizLiveQuestion | null
  minha_resposta: { alternativa: number; acertou: boolean | null } | null
  ranking: Array<{ posicao: number; nome: string; pontos: number; acertos: number; erros: number }>
}

export const listarSalasLive = () => call<QuizLiveRoomList[]>('quizlive.salas.listar')
export const listarBancoLive = () => call<QuizLiveBancoQuestion[]>('quizlive.banco.listar')
export const criarPerguntaLive = (body: QuizLiveQuestionInput) => call<QuizLiveBancoQuestion>('quizlive.banco.criar', body as never)
export const arquivarPerguntaLive = (id: string) => call<{ ok: boolean }>('quizlive.banco.arquivar', { id })
export const criarSalaLive = (body: { titulo: string; fonte: QuizLiveFonte; total_questoes: number; trilha_ids: string[]; questao_custom_ids: string[] }) =>
  call<{ id: string; codigo: string; titulo: string; status: QuizLiveStatus; total_questoes: number }>('quizlive.sala.criar', body as never)
export const painelSalaLive = (id: string) => call<QuizLiveHostPanel>('quizlive.sala.painel', { id })
export const acaoSalaLive = (id: string, acao: string, participante_id?: string) =>
  call<QuizLiveHostPanel>('quizlive.sala.acao', { id, acao, participante_id })
export const entrarSalaLive = (codigo: string, nome: string) =>
  call<{ token: string; participante_id: string; nome: string; status: string }>('quizlive.publico.entrar', { codigo, nome })
export const estadoParticipanteLive = (codigo: string, token: string) =>
  call<QuizLiveParticipantState>('quizlive.publico.estado', { codigo, token })
export const responderSalaLive = (codigo: string, token: string, pergunta_id: string, alternativa: number) =>
  call<{ ok: boolean }>('quizlive.publico.responder', { codigo, token, pergunta_id, alternativa })

export type { Trilha }
