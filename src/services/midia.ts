import { call } from './api'

export interface FotoResumo {
  id: string
  descricao: string | null
  ordem: number
  largura: number
  altura: number
  thumb: string | null      // data URL da miniatura
}

export interface FotoEnvio { dados: string; thumb: string; largura: number; altura: number; descricao?: string }

export const fetchFotosManual = (manual_id: string) => call<FotoResumo[]>('midia.manual.listar', { manual_id })
export const adicionarFotosManual = (manual_id: string, fotos: FotoEnvio[]) =>
  call<FotoResumo[]>('midia.manual.adicionar', { manual_id, fotos } as never)
export const atualizarFoto = (id: string, descricao: string) => call<{ id: string; descricao: string | null }>('midia.atualizar', { id, descricao })
export const removerFoto = (id: string) => call<{ ok: boolean }>('midia.remover', { id })
/** Foto inteira (ao ampliar). */
export const obterFoto = (id: string) => call<{ id: string; descricao: string | null; mime: string; base64: string }>('midia.obter', { id })
