import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, FolderKanban, Wrench, BookOpen, UsersRound,
  CalendarDays, Megaphone, Users, Settings, ChevronsLeft, ChevronsRight, ShieldCheck, Trophy, Radio,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useAuth, canManage } from '@/contexts/AuthContext'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/sistemas', label: 'Sistemas', icon: Boxes },
  { to: '/projetos', label: 'Projetos', icon: FolderKanban },
  { to: '/tecnicos', label: 'Técnicos', icon: Wrench },
  { to: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
  { to: '/colaboradores', label: 'Colaboradores', icon: UsersRound },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/comunicados', label: 'Comunicados', icon: Megaphone },
  { to: '/quiz', label: 'Quiz', icon: Trophy },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()
  const admin = canManage(user)

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col border-r border-black/5 dark:border-white/5 bg-white dark:bg-surface-darkCard transition-all duration-200 z-20',
        collapsed ? 'w-[72px]' : 'w-60'
      )}
    >
      {/* ── Logo do sistema ── */}
      <div className={cn(
        'flex items-center h-16 border-b border-black/5 dark:border-white/5 shrink-0',
        collapsed ? 'justify-center px-2' : 'gap-3 px-4'
      )}>
        {/* Logo oficial da Intranet */}
        <img
          src="/PortalService.png"
          alt="Portal de Serviços"
          style={{
            height: collapsed ? '28px' : '40px',
            width: 'auto',
            objectFit: 'contain',
            flexShrink: 0,
          }}
          draggable={false}
        />
        {!collapsed && (
          <div className="leading-tight min-w-0">
            <p className="text-[14px] font-display font-bold text-sm text-[#1C3F8C] dark:text-brand-300 truncate">
              Portal de Serviços
            </p>
            <p className="text-[12px] tracking-widest text-slate-400 uppercase truncate">
              Queonetics
            </p>
          </div>
        )}
      </div>

      {/* ── Navegação ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              )
            }
          >
            <item.icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}

        {/* Seção admin */}
        {/* Seção admin */}
        {admin && (
          <>
            <div
              className={cn(
                'mt-4 mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400',
                collapsed && 'hidden'
              )}
            >
              Administração
            </div>

            {/* Quiz Live */}
            <NavLink
              to="/quiz-live"
              title={collapsed ? 'Quiz Live' : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                )
              }
            >
              <Radio size={18} className="shrink-0" />
              {!collapsed && <span>Quiz Live</span>}
            </NavLink>

            {/* Usuários */}
            <NavLink
              to="/usuarios"
              title={collapsed ? 'Usuários' : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                )
              }
            >
              <Users size={18} className="shrink-0" />
              {!collapsed && <span>Usuários</span>}
            </NavLink>

            {/* Controle de Acesso */}
            <NavLink
              to="/controle-acesso"
              title={collapsed ? 'Controle de Acesso' : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                )
              }
            >
              <ShieldCheck size={18} className="shrink-0" />
              {!collapsed && <span>Controle de Acesso</span>}
            </NavLink>
          </>
        )}

        <NavLink
          to="/configuracoes"
          title={collapsed ? 'Configurações' : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
            )
          }
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span>Configurações</span>}
        </NavLink>
      </nav>

      {/* ── Rodapé recolher ── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 m-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 shrink-0"
      >
        {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        {!collapsed && 'Recolher'}
      </button>
    </aside>
  )
}
