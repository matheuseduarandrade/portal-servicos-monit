/**
 * Parser de Markdown (subconjunto GFM) que gera uma árvore de nós — sem HTML.
 * Quem renderiza (components/markdown/Markdown.tsx) cria elementos React, então nada do texto
 * vira HTML e não há risco de XSS. HTML cru dentro do markdown aparece como texto.
 *
 * Suporta: títulos (# e ===/---), parágrafos, **negrito**, *itálico*, ~~riscado~~, `código`,
 * blocos de código ```, listas (com aninhamento, numeradas e tarefas [ ]/[x]), citações >,
 * tabelas, links, imagens, linhas horizontais e quebras de linha.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'del'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: Inline[] }
  | { t: 'image'; src: string; alt: string }
  | { t: 'br' }

export type Block =
  | { t: 'heading'; level: number; id: string; c: Inline[]; text: string }
  | { t: 'paragraph'; c: Inline[] }
  | { t: 'code'; lang: string; v: string }
  | { t: 'quote'; c: Block[] }
  | { t: 'list'; ordered: boolean; start: number; items: { checked: boolean | null; c: Block[] }[] }
  | { t: 'table'; align: ('left' | 'center' | 'right' | null)[]; head: Inline[][]; rows: Inline[][][] }
  | { t: 'hr' }

export interface TocItem { id: string; level: number; text: string }

// ── URLs seguras ────────────────────────────────────────────────────────────
export function safeUrl(url: string, allowMail = true): string | null {
  const u = url.trim()
  if (!u) return null
  if (/^(https?:)?\/\//i.test(u)) return u
  if (u.startsWith('#') || u.startsWith('/')) return u
  if (allowMail && /^(mailto|tel):/i.test(u)) return u
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null      // javascript:, data:, vbscript:, file: ...
  return u                                              // caminho relativo
}

// ── Inline ──────────────────────────────────────────────────────────────────
const ESCAPAVEIS = '\\`*_{}[]()#+-.!|~<>'

export function parseInline(src: string): Inline[] {
  const out: Inline[] = []
  let buf = ''
  const flush = () => { if (buf) { out.push({ t: 'text', v: buf }); buf = '' } }
  let i = 0

  while (i < src.length) {
    const ch = src[i]

    // escape
    if (ch === '\\' && i + 1 < src.length) {
      if (src[i + 1] === '\n') { flush(); out.push({ t: 'br' }); i += 2; continue }
      if (ESCAPAVEIS.includes(src[i + 1])) { buf += src[i + 1]; i += 2; continue }
    }

    // quebra de linha (2+ espaços antes do \n) ou \n simples = espaço
    if (ch === '\n') {
      if (/ {2,}$/.test(buf)) { buf = buf.replace(/ +$/, ''); flush(); out.push({ t: 'br' }) } else buf = buf.replace(/ +$/, '') + ' '
      i++; continue
    }

    // código inline `...` (suporta ``a`b``)
    if (ch === '`') {
      const m = /^(`+)/.exec(src.slice(i))!
      const tick = m[1]
      const end = src.indexOf(tick, i + tick.length)
      if (end !== -1) {
        flush()
        out.push({ t: 'code', v: src.slice(i + tick.length, end).replace(/^ (.*) $/s, '$1') })
        i = end + tick.length; continue
      }
      buf += tick; i += tick.length; continue
    }

    // imagem ![alt](src "título")
    if (ch === '!' && src[i + 1] === '[') {
      const r = lerLink(src, i + 1)
      if (r) {
        flush()
        const s = safeUrl(r.href, false)
        if (s) out.push({ t: 'image', src: s, alt: r.texto })
        else buf += r.texto
        i = r.fim; continue
      }
    }

    // link [texto](url)
    if (ch === '[') {
      const r = lerLink(src, i)
      if (r) {
        flush()
        const s = safeUrl(r.href)
        out.push(s ? { t: 'link', href: s, c: parseInline(r.texto) } : { t: 'text', v: r.texto })
        i = r.fim; continue
      }
    }

    // autolink <https://...>
    if (ch === '<') {
      const m = /^<((?:https?:\/\/|mailto:)[^\s<>]+)>/i.exec(src.slice(i))
      if (m) { flush(); out.push({ t: 'link', href: m[1], c: [{ t: 'text', v: m[1] }] }); i += m[0].length; continue }
    }

    // URL solta
    if ((ch === 'h' || ch === 'H') && /^https?:\/\//i.test(src.slice(i, i + 8)) && !/[\w]$/.test(buf)) {
      const m = /^https?:\/\/[^\s<>]+/i.exec(src.slice(i))!
      const url = m[0].replace(/[.,;:!?)\]]+$/, '')
      flush(); out.push({ t: 'link', href: url, c: [{ t: 'text', v: url }] }); i += url.length; continue
    }

    // ênfase: **negrito**, __negrito__, *itálico*, _itálico_, ~~riscado~~
    if (ch === '*' || ch === '_' || ch === '~') {
      const run = /^([*_~]+)/.exec(src.slice(i))![1]
      const pega = (marca: string, t: 'strong' | 'em' | 'del') => {
        const inicio = i + marca.length
        if (inicio >= src.length || /\s/.test(src[inicio])) return false
        // _ dentro de palavra (snake_case) não é ênfase
        if (marca[0] === '_' && /\w$/.test(buf)) return false
        let fim = inicio
        while (true) {
          fim = src.indexOf(marca, fim)
          if (fim === -1) return false
          const antes = src[fim - 1]
          const depois = src[fim + marca.length]
          const fecha = fim > inicio && !/\s/.test(antes) && !(marca[0] === '_' && depois && /\w/.test(depois))
          // não fecha no meio de uma sequência maior (ex.: ** dentro de ***)
          if (fecha && src[fim + marca.length] !== marca[0]) break
          if (fecha) break
          fim += 1
        }
        flush()
        out.push({ t, c: parseInline(src.slice(inicio, fim)) })
        i = fim + marca.length
        return true
      }
      if (ch === '~') {
        if (run.length >= 2 && pega('~~', 'del')) continue
      } else {
        if (run.length >= 3 && pega(ch + ch + ch, 'strong')) { /* ***x*** = negrito+itálico */
          const last = out[out.length - 1] as Extract<Inline, { t: 'strong' }>
          out[out.length - 1] = { t: 'strong', c: [{ t: 'em', c: last.c }] }
          continue
        }
        if (run.length >= 2 && pega(ch + ch, 'strong')) continue
        if (pega(ch, 'em')) continue
      }
      buf += run; i += run.length; continue
    }

    buf += ch; i++
  }
  flush()
  return out
}

/** Lê [texto](destino "título") a partir de src[i] === '['. */
function lerLink(src: string, i: number): { texto: string; href: string; fim: number } | null {
  let prof = 0, j = i
  for (; j < src.length; j++) {
    if (src[j] === '\\') { j++; continue }
    if (src[j] === '[') prof++
    else if (src[j] === ']') { prof--; if (prof === 0) break }
  }
  if (j >= src.length || src[j + 1] !== '(') return null
  const texto = src.slice(i + 1, j)
  let k = j + 2, p = 1
  for (; k < src.length; k++) {
    if (src[k] === '\\') { k++; continue }
    if (src[k] === '(') p++
    else if (src[k] === ')') { p--; if (p === 0) break }
  }
  if (k >= src.length) return null
  let destino = src.slice(j + 2, k).trim()
  const m = /^(<[^>]*>|\S+)(?:\s+(?:"[^"]*"|'[^']*'))?$/.exec(destino)
  if (!m) return null
  destino = m[1].replace(/^<|>$/g, '')
  return { texto, href: destino, fim: k + 1 }
}

export function inlineToText(c: Inline[]): string {
  return c.map((n) => {
    switch (n.t) {
      case 'text': case 'code': return n.v
      case 'image': return n.alt
      case 'br': return ' '
      default: return inlineToText(n.c)
    }
  }).join('')
}

// ── Blocos ──────────────────────────────────────────────────────────────────
const RE_HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/
const RE_FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)/
const RE_HR = /^ {0,3}([-*_])([ \t]*\1){2,}[ \t]*$/
const RE_QUOTE = /^ {0,3}>/
const RE_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])([ \t]+|$)(.*)$/
const RE_TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

const indentOf = (s: string) => s.replace(/\t/g, '    ').match(/^ */)![0].length
const isBlank = (s: string) => s.trim() === ''

function slug(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'secao'
}

function splitRow(linha: string): string[] {
  let l = linha.trim()
  if (l.startsWith('|')) l = l.slice(1)
  if (l.endsWith('|') && !l.endsWith('\\|')) l = l.slice(0, -1)
  const cels: string[] = []
  let atual = ''
  for (let i = 0; i < l.length; i++) {
    if (l[i] === '\\' && l[i + 1] === '|') { atual += '|'; i++ }
    else if (l[i] === '|') { cels.push(atual.trim()); atual = '' }
    else atual += l[i]
  }
  cels.push(atual.trim())
  return cels
}

function iniciaBloco(linha: string, proxima?: string): boolean {
  if (RE_HEADING.test(linha) || RE_FENCE.test(linha) || RE_HR.test(linha) || RE_QUOTE.test(linha)) return true
  const m = RE_ITEM.exec(linha)
  if (m && m[4].trim() !== '' && (!/^\d/.test(m[2]) || /^1[.)]$/.test(m[2]))) return true
  if (proxima !== undefined && linha.includes('|') && RE_TABLE_SEP.test(proxima) && proxima.includes('-')) return true
  return false
}

function parseBlocks(lines: string[], ids: Set<string>): Block[] {
  const out: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (isBlank(line)) { i++; continue }

    // bloco de código cercado
    let m = RE_FENCE.exec(line)
    if (m) {
      const cerca = m[1], lang = m[2]
      const recuo = indentOf(line)
      const corpo: string[] = []
      i++
      while (i < lines.length && !(new RegExp('^ {0,3}' + cerca[0] + '{' + cerca.length + ',}\\s*$')).test(lines[i])) {
        corpo.push(lines[i].replace(new RegExp('^ {0,' + recuo + '}'), ''))
        i++
      }
      i++ // fecha
      out.push({ t: 'code', lang, v: corpo.join('\n') })
      continue
    }

    // código indentado (4 espaços) só se não for continuação de lista — tratado dentro da lista; aqui é raro, ignoramos

    // título ATX
    m = RE_HEADING.exec(line)
    if (m) {
      const c = parseInline(m[2])
      const texto = inlineToText(c)
      let id = slug(texto), n = 2
      while (ids.has(id)) id = `${slug(texto)}-${n++}`
      ids.add(id)
      out.push({ t: 'heading', level: m[1].length, id, c, text: texto })
      i++; continue
    }

    // linha horizontal
    if (RE_HR.test(line)) { out.push({ t: 'hr' }); i++; continue }

    // citação
    if (RE_QUOTE.test(line)) {
      const interno: string[] = []
      while (i < lines.length && (RE_QUOTE.test(lines[i]) || (!isBlank(lines[i]) && interno.length && !iniciaBloco(lines[i])))) {
        interno.push(lines[i].replace(/^ {0,3}> ?/, ''))
        i++
      }
      out.push({ t: 'quote', c: parseBlocks(interno, ids) })
      continue
    }

    // tabela
    if (line.includes('|') && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const cab = splitRow(line)
      const sep = splitRow(lines[i + 1])
      if (cab.length === sep.length && sep.every((s) => /^:?-+:?$/.test(s))) {
        const align = sep.map((s) => (s.startsWith(':') && s.endsWith(':') ? 'center' : s.endsWith(':') ? 'right' : s.startsWith(':') ? 'left' : null)) as ('left' | 'center' | 'right' | null)[]
        i += 2
        const rows: Inline[][][] = []
        while (i < lines.length && !isBlank(lines[i]) && lines[i].includes('|')) {
          const cels = splitRow(lines[i])
          while (cels.length < cab.length) cels.push('')
          rows.push(cels.slice(0, cab.length).map((c) => parseInline(c)))
          i++
        }
        out.push({ t: 'table', align, head: cab.map((c) => parseInline(c)), rows })
        continue
      }
    }

    // lista
    m = RE_ITEM.exec(line)
    if (m && m[4].trim() !== '') {
      const ordenada = /^\d/.test(m[2])
      const recuoLista = indentOf(line)
      const inicio = ordenada ? parseInt(m[2], 10) : 1
      const items: { checked: boolean | null; c: Block[] }[] = []
      const mesmoTipo = (mm: RegExpExecArray) => /^\d/.test(mm[2]) === ordenada

      while (i < lines.length) {
        const im = RE_ITEM.exec(lines[i])
        if (!im || !mesmoTipo(im) || indentOf(lines[i]) > recuoLista + 3 || indentOf(lines[i]) < recuoLista - 3 || im[4].trim() === '' && im[3] === '') break
        const recuoMarca = indentOf(lines[i])
        const largura = recuoMarca + im[2].length + Math.max(1, Math.min(4, im[3].replace(/\t/g, '    ').length))
        const corpo: string[] = [im[4]]
        i++
        while (i < lines.length) {
          const l = lines[i]
          if (isBlank(l)) {
            // linha em branco: continua o item só se a próxima linha não vazia estiver recuada
            let j = i
            while (j < lines.length && isBlank(lines[j])) j++
            if (j < lines.length && indentOf(lines[j]) >= largura) { for (; i < j; i++) corpo.push(''); continue }
            break
          }
          if (indentOf(l) >= largura) { corpo.push(l.replace(/\t/g, '    ').slice(largura)); i++; continue }
          // continuação "preguiçosa" de parágrafo
          const prev = corpo[corpo.length - 1]
          if (prev !== undefined && !isBlank(prev) && !iniciaBloco(l) && !RE_ITEM.test(l)) { corpo.push(l.trim()); i++; continue }
          break
        }
        let checked: boolean | null = null
        const tm = /^\[([ xX])\][ \t]+(.*)$/.exec(corpo[0])
        if (tm) { checked = tm[1] !== ' '; corpo[0] = tm[2] }
        items.push({ checked, c: parseBlocks(corpo, ids) })
        while (i < lines.length && isBlank(lines[i])) {
          // blanks entre itens: segue a lista se o próximo for item do mesmo tipo
          let j = i
          while (j < lines.length && isBlank(lines[j])) j++
          const nx = j < lines.length ? RE_ITEM.exec(lines[j]) : null
          if (nx && mesmoTipo(nx) && indentOf(lines[j]) <= recuoLista + 3 && indentOf(lines[j]) >= recuoLista - 3) i = j
          else break
        }
      }
      out.push({ t: 'list', ordered: ordenada, start: inicio, items })
      continue
    }

    // parágrafo (com títulos setext)
    const par: string[] = [line]
    i++
    while (i < lines.length && !isBlank(lines[i])) {
      if (/^ {0,3}=+[ \t]*$/.test(lines[i]) || /^ {0,3}-+[ \t]*$/.test(lines[i])) break
      if (iniciaBloco(lines[i], lines[i + 1])) break
      par.push(lines[i]); i++
    }
    if (i < lines.length && /^ {0,3}(=+|-+)[ \t]*$/.test(lines[i])) {
      const nivel = lines[i].trim().startsWith('=') ? 1 : 2
      i++
      const c = parseInline(par.map((s) => s.trim()).join('\n'))
      const texto = inlineToText(c)
      let id = slug(texto), n = 2
      while (ids.has(id)) id = `${slug(texto)}-${n++}`
      ids.add(id)
      out.push({ t: 'heading', level: nivel, id, c, text: texto })
      continue
    }
    out.push({ t: 'paragraph', c: parseInline(par.map((s) => s.replace(/^\s+/, '')).join('\n')) })
  }
  return out
}

export function parseMarkdown(src: string): Block[] {
  const linhas = src.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')
  return parseBlocks(linhas, new Set())
}

/** Índice (títulos H1–H3) para o sumário lateral. */
export function extractToc(blocks: Block[], maxLevel = 3): TocItem[] {
  const toc: TocItem[] = []
  const walk = (bs: Block[]) => bs.forEach((b) => {
    if (b.t === 'heading' && b.level <= maxLevel) toc.push({ id: b.id, level: b.level, text: b.text })
    else if (b.t === 'quote') walk(b.c)
  })
  walk(blocks)
  return toc
}
