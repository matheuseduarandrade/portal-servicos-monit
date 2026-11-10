/** Utilitários da busca: comparação sem acento/maiúscula e destaque do que foi digitado. */

/** Minúsculas e sem acento, MANTENDO o tamanho do texto (mesma regra do servidor). */
export const fold = (s: string) =>
  s.replace(/[^\x00-\x7f]/g, (ch) => ch.normalize('NFD').charAt(0)).toLowerCase()

export function termosDe(q: string): string[] {
  const vistos = new Set<string>()
  return fold(q).split(/\s+/).filter((t) => {
    if (!t || vistos.has(t)) return false
    vistos.add(t)
    return true
  }).slice(0, 6)
}

/** Divide o texto em trechos "com destaque" / "sem destaque" conforme as palavras buscadas. */
export function partes(texto: string, termos: string[]): { t: string; hit: boolean }[] {
  if (!texto || !termos.length) return [{ t: texto ?? '', hit: false }]
  const f = fold(texto)
  if (f.length !== texto.length) return [{ t: texto, hit: false }]
  const marca = new Uint8Array(texto.length)
  for (const t of termos) {
    if (!t) continue
    let i = f.indexOf(t)
    while (i !== -1) {
      for (let k = i; k < i + t.length; k++) marca[k] = 1
      i = f.indexOf(t, i + t.length)
    }
  }
  const out: { t: string; hit: boolean }[] = []
  let ini = 0
  for (let i = 1; i <= texto.length; i++) {
    if (i === texto.length || marca[i] !== marca[ini]) {
      out.push({ t: texto.slice(ini, i), hit: marca[ini] === 1 })
      ini = i
    }
  }
  return out
}
