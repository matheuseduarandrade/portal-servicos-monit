/**
 * Cliente único da API (Google Apps Script).
 *
 * Por que é assim:
 *  - O Web App do Apps Script não permite configurar CORS nem responde ao preflight (OPTIONS).
 *    Por isso toda chamada é um POST "simples" (Content-Type: text/plain) com o JSON no corpo.
 *  - O Google responde com um redirecionamento (302) para script.googleusercontent.com;
 *    o fetch segue sozinho e essa resposta final já vem com CORS liberado.
 *  - Não enviamos cookies: a autenticação é o token de sessão devolvido por auth.login.
 */

const GAS_URL = import.meta.env.VITE_GAS_URL as string | undefined
const TOKEN_KEY = 'portal-servicos:token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

type Json = Record<string, unknown>

export async function call<T = unknown>(action: string, payload: Json = {}): Promise<T> {
  if (!GAS_URL) throw new ApiError('CONFIG', 'VITE_GAS_URL não configurada.')

  let res: Response
  try {
    res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: getToken(), payload }),
      redirect: 'follow',
    })
  } catch {
    throw new ApiError('NETWORK', 'Erro ao conectar ao servidor.')
  }

  let body: { ok: boolean; data?: T; error?: { code: string; message: string } }
  try {
    body = await res.json()
  } catch {
    throw new ApiError('BAD_RESPONSE', 'Resposta inválida do servidor.')
  }

  if (!body.ok) {
    const err = body.error ?? { code: 'INTERNAL', message: 'Erro desconhecido.' }
    if (err.code === 'UNAUTHENTICATED') {
      clearToken()
      localStorage.removeItem('portal-servicos:session')
      window.dispatchEvent(new Event('portal:unauthenticated'))
    }
    if (err.code === 'NOT_FOUND' && /^Ação desconhecida/.test(err.message)) {
      throw new ApiError(
        'OUTDATED_BACKEND',
        `O Apps Script está desatualizado (${err.message}). Cole os arquivos novos, rode setup() e publique uma NOVA VERSÃO da implantação.`,
      )
    }
    throw new ApiError(err.code, err.message)
  }
  return body.data as T
}
