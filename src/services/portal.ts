/**
 * Serviços das telas que antes chamavam fetch() direto:
 * Login, Home, Comunicados, Calendário, Usuários e Controle de Acesso.
 */
import type { User } from '@/types'
import { call, setToken, clearToken } from './api'

// ── Autenticação ────────────────────────────────────────────────────────────
export interface LoginResult {
  authorized: boolean
  status?: 'pending' | 'domain' | 'denied'
  email?: string
  message?: string
  token?: string
  user?: User
}

/** idToken = credential devolvido pelo Google Identity Services. */
export async function loginComGoogle(idToken: string): Promise<LoginResult> {
  const r = await call<LoginResult>('auth.login', { idToken })
  if (r.authorized && r.token) setToken(r.token)
  return r
}
export const logoutApi = () => clearToken()
export const solicitacaoManual = (nome: string, email: string) =>
  call<{ ok: boolean }>('auth.solicitacaoManual', { nome, email })

// ── Comunicados ─────────────────────────────────────────────────────────────
export const fetchComunicados   = () => call<any[]>('comunicados.listar')
export const criarComunicado    = (body: object) => call<any>('comunicados.criar', body as never)
export const removerComunicado  = (id: string) => call<void>('comunicados.remover', { id })

// ── Calendário ──────────────────────────────────────────────────────────────
export const fetchEventos      = () => call<any[]>('calendario.listar')
export const criarEvento       = (body: object) => call<any>('calendario.criar', body as never)
export const atualizarEvento   = (id: string, body: object) => call<any>('calendario.atualizar', { id, ...body })
export const removerEvento     = (id: string) => call<void>('calendario.remover', { id })

// ── Usuários e controle de acesso (admin) ───────────────────────────────────
export const fetchUsuarios        = () => call<User[]>('usuarios.listar')
export const atualizarUsuario     = (id: string, body: object) => call<User>('usuarios.atualizar', { id, ...body })
export const alternarStatusUsuario = (id: string) => call<User>('usuarios.alternarStatus', { id })
export const removerUsuario       = (id: string) => call<void>('usuarios.remover', { id })

export const fetchSolicitacoes    = () => call<any[]>('acesso.listarSolicitacoes')
export const aprovarSolicitacao   = (id: string, body: object) => call<User>('acesso.aprovar', { id, ...body })
export const rejeitarSolicitacao  = (id: string, motivo = '') => call<{ ok: boolean }>('acesso.rejeitar', { id, motivo })
