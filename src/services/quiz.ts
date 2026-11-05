import { call } from './api'

export const NIVEIS_QUIZ = ['Fácil', 'Médio', 'Difícil'] as const
export type NivelQuiz = (typeof NIVEIS_QUIZ)[number]
export const CATEGORIAS_QUIZ = ['Sistemas', 'Processos', 'Ferramentas', 'Geral'] as const

export interface NivelTrilha {
  nivel: NivelQuiz
  questoes: number
  disponivel: boolean
  tentativas: number
  melhor_pontos: number
  melhor_percentual: number
  aprovado: boolean
}

export interface Trilha {
  id: string
  manual_id: string
  titulo: string
  descricao: string | null
  categoria: string
  nota_minima: number
  tempo_min: number
  carga_horaria: string | null
  ativo: boolean
  manual_titulo: string | null
  niveis: NivelTrilha[]
  questoes_por_nivel: number
  pontos_max: number
  certificado: { id: string; codigo: string } | null
}

export interface QuestaoPublica { id: string; tipo: 'multipla' | 'vf'; enunciado: string; opcoes: string[] }
export interface QuestaoAdmin extends QuestaoPublica {
  trilha_id: string; nivel: NivelQuiz; correta: number; explicacao: string | null; ativo: boolean
}
export interface QuestaoInput {
  trilha_id: string; nivel: NivelQuiz; tipo: 'multipla' | 'vf'; enunciado: string
  opcoes: string[]; correta: number; explicacao?: string
}

export interface TentativaIniciada {
  tentativa_id: string
  numero: number
  trilha: { id: string; titulo: string; nota_minima: number }
  nivel: NivelQuiz
  tempo_min: number
  iniciado_em: string
  restante_seg: number | null
  questoes: QuestaoPublica[]
}

export interface CertificadoNovo {
  id: string; codigo: string; titulo: string; pontos: number; percentual: number
  email: string; email_enviado: boolean; erro: string | null
}

export interface ResultadoQuiz {
  expirada: boolean
  tentativa: {
    id: string; nivel: NivelQuiz; numero: number; total: number; acertos: number; erros: number
    percentual: number; pontos: number; aprovado: boolean; nota_minima: number; data: string; hora: string
  }
  revisao: Array<{
    id: string; enunciado: string; tipo: string; opcoes: string[]; correta: number
    resposta: number | null; acertou: boolean; explicacao: string | null
  }>
  certificado: CertificadoNovo | null
}

export type Periodo = 'dia' | 'semana' | 'mes' | 'geral'
export interface RankingItem {
  posicao: number; usuario_id: string; nome: string; foto_url: string | null
  pontos: number; tentativas: number; aproveitamento: number; certificados: number; sou_eu: boolean
}
export interface Ranking {
  periodo: Periodo; inicio: string; fim: string; total: number
  itens: RankingItem[]; eu: Omit<RankingItem, 'sou_eu'> | null
}

export interface Resumo {
  pontos_totais: number; niveis_concluidos: number; tentativas: number; certificados: number
  posicao_mes: number | null; pontos_mes: number
  nivel: { numero: number; nome: string; minimo: number; proximo_minimo: number | null; pontos: number }
}

export interface Certificado {
  id: string; codigo: string; titulo: string; nome: string; pontos: number; percentual: number
  carga_horaria: string | null; data_conclusao: string
  email_enviado: boolean; email_enviado_em: string | null; email_erro: string | null
  usuario?: { id: string; nome: string; email: string }
}

export interface TentativaResumo {
  id: string; trilha_id: string; trilha_titulo: string; nivel: NivelQuiz; numero: number
  status: string; total: number; acertos: number; erros: number; percentual: number; pontos: number
  aprovado: boolean; data: string; hora: string
  usuario?: { id: string; nome: string; foto_url: string | null; excluido: boolean }
}

// ── Colaborador ─────────────────────────────────────────────────────────────
export const fetchTrilhas = (params?: { categoria?: string; incluirArquivadas?: boolean }) =>
  call<Trilha[]>('quiz.trilhas.listar', params ?? {})
export const iniciarQuiz = (trilha_id: string, nivel: NivelQuiz) =>
  call<TentativaIniciada>('quiz.iniciar', { trilha_id, nivel })
export const finalizarQuiz = (tentativa_id: string, respostas: Record<string, number>) =>
  call<ResultadoQuiz>('quiz.finalizar', { tentativa_id, respostas })
export const fetchRanking = (periodo: Periodo, categoria?: string) =>
  call<Ranking>('quiz.ranking', { periodo, categoria, limite: 10 })
export const fetchResumo = () => call<Resumo>('quiz.resumo')
export const fetchMinhasTentativas = () => call<TentativaResumo[]>('quiz.minhasTentativas')
export const fetchMeusCertificados = () => call<Certificado[]>('quiz.certificados.meus')
export const reenviarCertificado = (id: string) =>
  call<{ email: string; email_enviado: boolean; erro: string | null }>('quiz.certificados.reenviar', { id })
export const validarCertificado = (codigo: string) =>
  call<{ valido: boolean; codigo?: string; nome?: string; titulo?: string; pontos?: number; data_conclusao?: string }>(
    'quiz.certificados.validar', { codigo })

/** Baixa o PDF do certificado (o Apps Script devolve em base64). */
export async function baixarCertificado(id: string): Promise<void> {
  const { nome_arquivo, base64 } = await call<{ nome_arquivo: string; base64: string }>('quiz.certificados.pdf', { id })
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome_arquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// ── Administração ───────────────────────────────────────────────────────────
export interface TrilhaInput {
  manual_id?: string; titulo?: string; descricao?: string; categoria?: string
  nota_minima?: number; tempo_min?: number; carga_horaria?: string | null; ativo?: boolean
}
export const criarTrilha = (body: TrilhaInput) => call<Trilha>('quiz.trilhas.criar', body as never)
export const atualizarTrilha = (id: string, body: TrilhaInput) => call<Trilha>('quiz.trilhas.atualizar', { id, ...body } as never)
export const fetchQuestoes = (trilha_id: string, nivel?: NivelQuiz) =>
  call<QuestaoAdmin[]>('quiz.questoes.listar', { trilha_id, nivel })
export const criarQuestao = (body: QuestaoInput) => call<QuestaoAdmin>('quiz.questoes.criar', body as never)
export const atualizarQuestao = (id: string, body: Partial<QuestaoInput>) => call<QuestaoAdmin>('quiz.questoes.atualizar', { id, ...body } as never)
export const removerQuestao = (id: string) => call<{ ok: boolean }>('quiz.questoes.remover', { id })
export const fetchTodasTentativas = (params?: { q?: string; trilha_id?: string; nivel?: string }) =>
  call<TentativaResumo[]>('quiz.tentativas', params ?? {})
export const fetchTodosCertificados = () => call<Certificado[]>('quiz.certificados.todos')
