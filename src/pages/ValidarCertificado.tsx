import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Award, CheckCircle2, Loader2, Search, XCircle } from 'lucide-react'
import { Button, Input } from '@/components/ui/primitives'
import { validarCertificado } from '@/services/quiz'
import { formatDate } from '@/lib/utils'

type Resp = Awaited<ReturnType<typeof validarCertificado>>

/** Página pública: confere a autenticidade de um certificado pelo código. */
export default function ValidarCertificado() {
  const { codigo: codigoUrl = '' } = useParams()
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState(codigoUrl)
  const [resp, setResp] = useState<Resp | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function validar(c: string) {
    if (!c.trim()) return
    setCarregando(true); setErro(null); setResp(null)
    try { setResp(await validarCertificado(c.trim())) } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao validar.') }
    setCarregando(false)
  }
  useEffect(() => { if (codigoUrl) validar(codigoUrl) }, [codigoUrl])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-surface-darkCard rounded-2xl shadow-popover p-8">
        <div className="text-center">
          <Award size={36} className="mx-auto text-brand-600" />
          <h1 className="text-xl font-semibold mt-2 text-ink-900 dark:text-white">Validar certificado</h1>
          <p className="text-sm text-slate-500 mt-1">Digite o código que aparece no certificado.</p>
        </div>

        <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); navigate(`/validar/${encodeURIComponent(codigo.trim())}`); if (codigo.trim() === codigoUrl) validar(codigo) }}>
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="QNT-2026-XXXXXX" />
          <Button type="submit" disabled={carregando || !codigo.trim()}>
            {carregando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          </Button>
        </form>

        {erro && <p className="text-sm text-red-500 mt-4 text-center">{erro}</p>}

        {resp && resp.valido && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
            <p className="font-semibold text-emerald-700 mt-1">Certificado válido</p>
            <p className="text-sm text-slate-700 mt-3"><b>{resp.nome}</b></p>
            <p className="text-sm text-slate-600">concluiu a trilha <b>{resp.titulo}</b></p>
            <p className="text-xs text-slate-500 mt-1">{resp.pontos} pontos • {resp.data_conclusao ? formatDate(resp.data_conclusao) : ''}</p>
            <p className="text-[11px] text-slate-400 mt-2">Código {resp.codigo}</p>
          </div>
        )}
        {resp && !resp.valido && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <XCircle size={28} className="mx-auto text-red-500" />
            <p className="font-semibold text-red-600 mt-1">Código não encontrado</p>
            <p className="text-xs text-slate-500 mt-1">Confira se o código foi digitado corretamente.</p>
          </div>
        )}
      </div>
    </div>
  )
}
