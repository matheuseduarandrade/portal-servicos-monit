import { safeUrl } from '@/lib/markdown'

/** Extrai o ID de um link do Google Drive (arquivo ou "open?id="). */
export function extractDriveId(url: string): string | null {
  const m = /\/d\/([a-zA-Z0-9_-]{10,})/.exec(url) ?? /[?&]id=([a-zA-Z0-9_-]{10,})/.exec(url)
  return m ? m[1] : null
}

/** Link para "Ver manual completo": o link informado ou, nos manuais antigos, o arquivo do Drive. */
export function linkDoManual(m: { arquivo_url?: string | null; drive_file_id?: string | null }): string | null {
  const direto = m.arquivo_url ? safeUrl(m.arquivo_url, false) : null
  if (direto && /^https?:\/\//i.test(direto)) return direto
  if (m.drive_file_id) return `https://drive.google.com/file/d/${encodeURIComponent(m.drive_file_id)}/view`
  return null
}
