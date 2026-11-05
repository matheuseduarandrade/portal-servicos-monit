import type { Tecnico } from '@/types'
import { call } from './api'

export const fetchTecnicos = (params?: { q?: string; estado?: string }) =>
  call<Tecnico[]>('tecnicos.listar', { q: params?.q, estado: params?.estado })

export const fetchKpis = () =>
  call<{ total_ativos: number; total_empresas: number; total_estados: number; por_estado: Record<string, number> }>('tecnicos.kpis')

export const criarTecnico = (payload: Omit<Tecnico, 'id'>) => call<Tecnico>('tecnicos.criar', payload as never)

export const atualizarTecnico = (id: string, payload: Partial<Omit<Tecnico, 'id'>>) =>
  call<Tecnico>('tecnicos.atualizar', { id, ...payload })

export const excluirTecnico = (id: string) => call<void>('tecnicos.remover', { id })
