import { useState, useRef } from 'react'
import { Moon, Sun, Mail, Briefcase, Shield, Camera, Building2, Check } from 'lucide-react'
import { PageHeader, Card, Button } from '@/components/ui/primitives'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

const PERFIL_LABEL: Record<string, string> = {
  admin:       'Administrador',
  supervisor:  'Gestor',
  colaborador: 'Colaborador',
}

export default function Configuracoes() {
  const { theme, toggleTheme } = useTheme()
  const { user, updateFoto } = useAuth()
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fotoAtual = fotoPreview || user?.foto || null
  const initials = (user?.nome || user?.email || 'U')
    .split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setFotoPreview(reader.result as string)
      setSalvo(false)
    }
    reader.readAsDataURL(file)
  }

  function salvarFoto() {
    if (!fotoPreview) return
    setSalvando(true)
    // Salva no AuthContext (localStorage) → propaga para Topbar, Colaboradores, etc.
    updateFoto(fotoPreview)
    setTimeout(() => {
      setSalvando(false)
      setSalvo(true)
      setFotoPreview(null)
    }, 600)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Configurações" subtitle="Preferências da sua conta no Portal de Serviços." />

      {/* Perfil */}
      <Card>
        <h3 className="font-display font-semibold text-sm mb-5">Perfil</h3>

        {/* Foto */}
        <div className="flex items-center gap-5 mb-6 pb-5 border-b border-black/5 dark:border-white/10">
          <div className="relative">
            {fotoAtual ? (
              <img src={fotoAtual} alt="Foto de perfil"
                className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xl shadow">
                {initials}
              </div>
            )}
            <button onClick={() => inputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors shadow"
              title="Alterar foto">
              <Camera size={12} />
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
          </div>
          <div>
            <p className="font-semibold text-ink-900 dark:text-white">{user?.nome || '—'}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {fotoPreview ? 'Nova foto selecionada — clique em Salvar' : 'Clique no ícone da câmera para alterar'}
            </p>
            {fotoPreview && (
              <div className="flex gap-2 mt-2">
                <Button onClick={salvarFoto} disabled={salvando} className="text-xs py-1 px-3 h-auto">
                  {salvando ? 'Salvando...' : salvo ? <><Check size={12} /> Salvo!</> : 'Salvar foto'}
                </Button>
                <Button variant="outline" onClick={() => setFotoPreview(null)} className="text-xs py-1 px-3 h-auto">
                  Cancelar
                </Button>
              </div>
            )}
            {salvo && !fotoPreview && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check size={11} /> Foto atualizada!</p>
            )}
          </div>
        </div>

        {/* Dados — somente leitura */}
        <div className="space-y-4">
          <InfoRow icon={Mail}      label="E-mail de acesso"  value={user?.email} />
          <InfoRow icon={Briefcase} label="Cargo"             value={user?.cargo} />
          <InfoRow icon={Building2} label="Área"              value={user?.area} />
          <InfoRow icon={Shield}    label="Perfil de acesso"
            value={PERFIL_LABEL[user?.perfil ?? ''] ?? user?.perfil ?? '—'} badge />
        </div>
      </Card>

      {/* Aparência */}
      <Card>
        <h3 className="font-display font-semibold text-sm mb-4">Aparência</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink-900 dark:text-white">
              Tema {theme === 'dark' ? 'escuro' : 'claro'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Alterne entre os modos claro e escuro do portal.</p>
          </div>
          <button onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors text-sm font-medium">
            {theme === 'dark' ? <><Sun size={15} /> Claro</> : <><Moon size={15} /> Escuro</>}
          </button>
        </div>
      </Card>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, badge }: {
  icon: any; label: string; value?: string | null; badge?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        {badge ? (
          <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10">
            {value || '—'}
          </span>
        ) : (
          <p className="text-sm font-medium text-ink-900 dark:text-white">{value || '—'}</p>
        )}
      </div>
    </div>
  )
}
