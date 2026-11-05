/** Integração com o ProjectView (via Apps Script) + responsáveis por projeto. */
import { call } from './api'

export interface ProjetoProjectView {
  id: string
  nome: string
  status: string
  percentual: number
}

export type Responsaveis = Record<string, { planejamento: string; monitoramento: string }>

export const fetchProjetosProjectView = () => call<ProjetoProjectView[]>('projectview.projetos')

/** Substitui o localStorage 'projetos_responsaveis' — agora compartilhado por todos. */
export const fetchResponsaveis = () => call<Responsaveis>('projetos.responsaveis.listar')

export const salvarResponsavel = (projectview_id: string, planejamento: string, monitoramento: string) =>
  call<{ ok: boolean }>('projetos.responsaveis.salvar', { projectview_id, planejamento, monitoramento })
