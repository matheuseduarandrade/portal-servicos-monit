/**
 * Prepara a foto no próprio navegador ANTES de enviar: corrige a rotação, reduz para no máximo 1600 px,
 * converte para JPEG e gera a miniatura. Assim o envio é rápido e cabe nos limites do servidor.
 */

export interface FotoPreparada {
  dados: string      // JPEG em base64 (sem o prefixo data:)
  thumb: string      // miniatura JPEG em base64
  largura: number
  altura: number
  preview: string    // data URL da miniatura, para mostrar na tela antes de enviar
}

const MAX_ORIGINAL = 25 * 1024 * 1024
const FULL_LADO = 1600
const FULL_B64_MAX = 3_300_000
const THUMB_LADO = 360
const THUMB_B64_MAX = 30_000

async function carregar(file: File): Promise<{ img: CanvasImageSource; w: number; h: number; fechar: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const b = await createImageBitmap(file)           // já respeita a orientação EXIF
      return { img: b, w: b.width, h: b.height, fechar: () => b.close() }
    } catch { /* tenta pelo <img> */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => erro(new Error('Não foi possível ler esta imagem. Use JPG ou PNG.'))
      i.src = url
    })
    return { img, w: img.naturalWidth, h: img.naturalHeight, fechar: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

function desenhar(img: CanvasImageSource, w: number, h: number, lado: number, qualidade: number, maxB64: number) {
  let escala = Math.min(1, lado / Math.max(w, h))
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const cw = Math.max(1, Math.round(w * escala)), ch = Math.max(1, Math.round(h * escala))
    const canvas = document.createElement('canvas')
    canvas.width = cw; canvas.height = ch
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'                                  // PNG transparente vira fundo branco
    ctx.fillRect(0, 0, cw, ch)
    ctx.drawImage(img, 0, 0, cw, ch)
    let q = qualidade
    let url = canvas.toDataURL('image/jpeg', q)
    while (url.length - 23 > maxB64 && q > 0.4) { q -= 0.08; url = canvas.toDataURL('image/jpeg', q) }
    if (url.length - 23 <= maxB64) return { b64: url.split(',')[1], url, w: cw, h: ch }
    escala *= 0.8
  }
  throw new Error('Não foi possível reduzir esta imagem. Tente outra.')
}

export async function prepararImagem(file: File): Promise<FotoPreparada> {
  if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" não é uma imagem.`)
  if (file.size > MAX_ORIGINAL) throw new Error(`"${file.name}" é muito grande (máximo de 25 MB).`)
  const { img, w, h, fechar } = await carregar(file)
  try {
    const full = desenhar(img, w, h, FULL_LADO, 0.82, FULL_B64_MAX)
    const thumb = desenhar(img, w, h, THUMB_LADO, 0.72, THUMB_B64_MAX)
    return { dados: full.b64, thumb: thumb.b64, largura: full.w, altura: full.h, preview: thumb.url }
  } finally {
    fechar()
  }
}
