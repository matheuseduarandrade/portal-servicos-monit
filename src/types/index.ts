export type Role = 'admin' | 'supervisor' | 'colaborador'

export type Area = 'Monitoramento' | 'Planejamento' | 'Credenciamento' | 'Técnico' | 'Geral'

export interface User {
  id: string
  nome: string
  email: string
  cargo: string
  area: Area
  perfil: Role
  status: 'ativo' | 'inativo'
  foto?: string | null
}

export interface SistemaInterno {
  id: string
  nome: string
  descricao: string
  finalidade: string
  area?: Area
  link?: string
  /** id do manual do Fórum vinculado ('' quando não há) */
  manual: string
  /** o sistema tem manual/fórum cadastrado? */
  tem_manual?: boolean
  drive_file_id?: string
}

export interface Manual {
  id: string
  titulo: string
  descricao: string
  categoria: 'Manuais Sistemas' | 'Manuais Gerais' | 'Homologações' | 'Configurações' | 'Comandos'
  atualizadoEm: string
  autor: string
}

export interface Plantao {
  id: string
  data: string
  operadorFixo1: string
  operadorFixo2: string
  operadorExtra: string
  observacao?: string
}

export interface Homologacao {
  id: string
  titulo: string
  marca: string
  modelo: string
  ano: number
  categoria: 'Caminhões' | 'Ônibus' | 'Máquinas' | 'Veículos Leves' | 'Equipamentos Especiais'
  atualizadoEm: string
}

export interface Projeto {
  id: string
  nome: string
  responsavel: string
  responsavelMonitoramento?: string
  area: Area
  dataInicio: string
  dataFim: string
  status: 'Planejado' | 'Em andamento' | 'Concluído' | 'Atrasado'
  percentual: number
}

export interface Tecnico {
  id: string
  nome: string
  empresa: string
  estado: string
  regiao: string
  ativo: boolean
}

export type Prioridade = 'Informativo' | 'Importante' | 'Urgente'

export interface Comunicado {
  id: string
  titulo: string
  descricao: string
  categoria: string
  autor: string
  data: string
  prioridade: Prioridade
}

export interface Escala {
  id: string
  colaborador: string
  area: Area
  dias: string
  turno: string
  folga?: string
  fixoSabado?: boolean
}

export interface EventoCalendario {
  id: string
  title: string
  start: string
  end?: string
  tipo: 'Reunião' | 'Entrega' | 'Treinamento' | 'Feriado' | 'Escala' | 'Plantão'
  area?: Area
}

export interface PlantaoRegistro {
  id: string
  data: string
  operadorFixo1: string
  operadorFixo2: string
  operadorExtra: string
  observacao?: string
}
