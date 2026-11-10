import { LogOut } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { GlobalSearch } from '@/components/search/GlobalSearch'

export function Topbar() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  const initials = (user?.nome ?? '')
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((n) => n[0])
  .join('')
  .toUpperCase();

  return (
    <header className="h-16 sticky top-0 z-30 flex items-center gap-4 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-surface-darkCard/80 backdrop-blur px-6">
      <GlobalSearch />

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          aria-label="Alternar tema"
        >
        { /* {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} = MODO DARKMODE DESABILITADO*/ }
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg pl-1.5 pr-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10">
              {user?.foto
                ? <img src={user.foto} alt={user.nome} className="h-8 w-8 rounded-full object-cover" />
                : <span className="h-8 w-8 rounded-full bg-brand-600 text-white text-xs font-semibold flex items-center justify-center">{initials}</span>
              }
              <span className="text-left hidden sm:block">
                <span className="block text-sm font-medium text-ink-900 dark:text-white leading-tight">{user?.nome}</span>
                <span className="block text-[11px] text-slate-400 leading-tight">{user?.cargo}</span>
              </span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="w-56 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-surface-darkCard p-1.5 shadow-popover z-50"
            >
              <div className="px-3 py-2 text-xs text-slate-400">{user?.email}</div>
              <DropdownMenu.Item
                onSelect={logout}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer outline-none"
              >
                <LogOut size={15} /> Sair
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
