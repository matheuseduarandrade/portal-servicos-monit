import type { SistemaInterno } from '@/types'
import { call } from './api'

function adapt(raw: Record<string, unknown>): SistemaInterno {
  return {
    id: raw.id as string,
    nome: raw.nome as string,
    descricao: raw.descricao as string,
    finalidade: raw.finalidade as string,
    area: (raw.area ?? undefined) as SistemaInterno['area'],
    link: (raw.link ?? undefined) as string | undefined,
    manual: (raw.manual_id ?? '') as string,
    tem_manual: raw.tem_manual === true,
    drive_file_id: (raw.drive_file_id ?? '') as string,
  }
}

/** Cadastro: nome, descrição rápida, finalidade e "tem manual/fórum" (+ manual vinculado). */
const toApi = (p: Omit<SistemaInterno, 'id'>) => ({
  nome: p.nome,
  descricao: p.descricao,
  finalidade: p.finalidade,
  tem_manual: !!p.tem_manual,
  manual_id: p.tem_manual ? (p.manual || null) : null,
})

export async function fetchSistemas(): Promise<SistemaInterno[]> {
  return (await call<Record<string, unknown>[]>('sistemas.listar')).map(adapt)
}
export async function criarSistema(payload: Omit<SistemaInterno, 'id'>): Promise<SistemaInterno> {
  return adapt(await call<Record<string, unknown>>('sistemas.criar', toApi(payload)))
}
export async function atualizarSistema(id: string, payload: Omit<SistemaInterno, 'id'>): Promise<SistemaInterno> {
  return adapt(await call<Record<string, unknown>>('sistemas.atualizar', { id, ...toApi(payload) }))
}
export async function removerSistema(id: string): Promise<void> {
  await call('sistemas.remover', { id })
}
