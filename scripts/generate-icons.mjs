/**
 * Genera los iconos de la PWA (mancuerna azul sobre fondo oscuro) sin dependencias:
 * dibuja los pixeles a mano, con suavizado por supermuestreo, y los codifica en PNG
 * usando solo modulos que ya trae Node.
 *
 * Uso: npm run icons
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG = [0x1b, 0x1f, 0x25] // superficie elevada
const FG = [0x4c, 0x8d, 0xff] // acento azul
const SS = 4 // supermuestreo: se dibuja 4x mas grande y se promedia

// ---------------------------------------------------------------- PNG

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // profundidad de bits
  ihdr[9] = 6 // RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filtro "none"
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------- dibujo

function createCanvas(size) {
  return { size, px: new Uint8Array(size * size * 4) }
}

function inRoundRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px >= x + w || py >= y + h) return false
  const radius = Math.min(r, w / 2, h / 2)
  const dx = px < x + radius ? x + radius - px : px > x + w - radius ? px - (x + w - radius) : 0
  const dy = py < y + radius ? y + radius - py : py > y + h - radius ? py - (y + h - radius) : 0
  return dx * dx + dy * dy <= radius * radius
}

function fillRoundRect(canvas, x, y, w, h, r, color) {
  const { size, px } = canvas
  const x0 = Math.max(0, Math.floor(x))
  const y0 = Math.max(0, Math.floor(y))
  const x1 = Math.min(size, Math.ceil(x + w))
  const y1 = Math.min(size, Math.ceil(y + h))
  for (let py = y0; py < y1; py++) {
    for (let pxi = x0; pxi < x1; pxi++) {
      if (!inRoundRect(pxi + 0.5, py + 0.5, x, y, w, h, r)) continue
      const i = (py * size + pxi) * 4
      px[i] = color[0]
      px[i + 1] = color[1]
      px[i + 2] = color[2]
      px[i + 3] = 255
    }
  }
}

/** Promedia bloques de SSxSS para obtener bordes suaves. */
function downsample(canvas, factor) {
  const size = canvas.size / factor
  const out = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < factor; sy++) {
        for (let sx = 0; sx < factor; sx++) {
          const i = ((y * factor + sy) * canvas.size + (x * factor + sx)) * 4
          const alpha = canvas.px[i + 3]
          r += canvas.px[i] * alpha
          g += canvas.px[i + 1] * alpha
          b += canvas.px[i + 2] * alpha
          a += alpha
        }
      }
      const i = (y * size + x) * 4
      out[i] = a ? Math.round(r / a) : 0
      out[i + 1] = a ? Math.round(g / a) : 0
      out[i + 2] = a ? Math.round(b / a) : 0
      out[i + 3] = Math.round(a / (factor * factor))
    }
  }
  return { size, px: out }
}

/** Dibuja la mancuerna centrada, ocupando `scale` del ancho total. */
function drawDumbbell(canvas, scale) {
  const S = canvas.size
  const W = S * scale
  const cx = S / 2
  const cy = S / 2

  const barW = W * 0.42
  const barH = W * 0.15
  fillRoundRect(canvas, cx - barW / 2, cy - barH / 2, barW, barH, barH / 2, FG)

  const innerW = W * 0.14
  const innerH = W * 0.62
  fillRoundRect(canvas, cx - W * 0.31, cy - innerH / 2, innerW, innerH, innerW * 0.38, FG)
  fillRoundRect(canvas, cx + W * 0.31 - innerW, cy - innerH / 2, innerW, innerH, innerW * 0.38, FG)

  const outerW = W * 0.11
  const outerH = W * 0.38
  fillRoundRect(canvas, cx - W * 0.46, cy - outerH / 2, outerW, outerH, outerW * 0.4, FG)
  fillRoundRect(canvas, cx + W * 0.46 - outerW, cy - outerH / 2, outerW, outerH, outerW * 0.4, FG)
}

/**
 * @param {number} size tamano final en pixeles
 * @param {boolean} maskable true = fondo cuadrado completo y contenido en la zona segura
 */
function makeIcon(size, maskable) {
  const canvas = createCanvas(size * SS)
  const big = size * SS
  if (maskable) {
    fillRoundRect(canvas, 0, 0, big, big, 0, BG)
    drawDumbbell(canvas, 0.52)
  } else {
    fillRoundRect(canvas, 0, 0, big, big, big * 0.22, BG)
    drawDumbbell(canvas, 0.66)
  }
  const small = downsample(canvas, SS)
  return encodePng(small.size, small.size, small.px)
}

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1B1F25"/>
  <g fill="#4C8DFF">
    <rect x="23" y="29.8" width="18" height="4.4" rx="2.2"/>
    <rect x="18.6" y="22.4" width="6" height="19.2" rx="2.3"/>
    <rect x="39.4" y="22.4" width="6" height="19.2" rx="2.3"/>
    <rect x="13.9" y="26.1" width="4.6" height="11.8" rx="1.9"/>
    <rect x="45.5" y="26.1" width="4.6" height="11.8" rx="1.9"/>
  </g>
</svg>
`

mkdirSync(OUT_DIR, { recursive: true })

const files = [
  ['icon-192.png', makeIcon(192, false)],
  ['icon-512.png', makeIcon(512, false)],
  ['icon-maskable-192.png', makeIcon(192, true)],
  ['icon-maskable-512.png', makeIcon(512, true)],
  ['apple-touch-icon.png', makeIcon(180, true)],
  ['favicon.svg', Buffer.from(FAVICON_SVG, 'utf8')],
]

for (const [name, data] of files) {
  writeFileSync(join(OUT_DIR, name), data)
  console.log(`  ${name.padEnd(26)} ${(data.length / 1024).toFixed(1)} KB`)
}
console.log('Iconos generados en public/')
