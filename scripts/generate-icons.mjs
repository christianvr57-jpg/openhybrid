// Draws the PWA icons as PNG files using only Node. Run: node scripts/generate-icons.mjs
// The artwork matches public/favicon.svg, but fills the whole square because iOS and
// Android apply their own rounded mask. It stays inside the 80 % maskable safe zone.
import { writeFileSync } from 'node:fs'
import { crc32, deflateSync } from 'node:zlib'

const BACKGROUND = [0x14, 0x34, 0x2b]
const RING = [0xf6, 0xf7, 0xf4]
const DOT = [0xf2, 0xc1, 0x4e]

// Artwork coordinates, in a 512-unit square.
const CENTER = 256
const RING_RADIUS = 130.6
const RING_HALF_WIDTH = 22
const DOT_RADIUS = 30
const GAP_START = (-75 * Math.PI) / 180
const GAP_END = (-15 * Math.PI) / 180
const GAP_MIDDLE = (GAP_START + GAP_END) / 2

function pointOnRing(angle) {
  return [CENTER + RING_RADIUS * Math.cos(angle), CENTER + RING_RADIUS * Math.sin(angle)]
}

const [DOT_X, DOT_Y] = pointOnRing(GAP_MIDDLE)

function colorAt(x, y) {
  if (Math.hypot(x - DOT_X, y - DOT_Y) <= DOT_RADIUS) return DOT

  const radius = Math.hypot(x - CENTER, y - CENTER)
  const angle = Math.atan2(y - CENTER, x - CENTER)
  const inGap = angle > GAP_START && angle < GAP_END
  if (!inGap && Math.abs(radius - RING_RADIUS) <= RING_HALF_WIDTH) return RING

  // Rounded ring ends.
  for (const [endX, endY] of [pointOnRing(GAP_START), pointOnRing(GAP_END)]) {
    if (Math.hypot(x - endX, y - endY) <= RING_HALF_WIDTH) return RING
  }
  return BACKGROUND
}

function chunk(type, data) {
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, checksum])
}

function renderPng(size) {
  const SAMPLES = 4 // Per axis, for smooth edges.
  const rowLength = 1 + size * 3
  const pixels = Buffer.alloc(rowLength * size)

  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const sum = [0, 0, 0]
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = ((column + (sx + 0.5) / SAMPLES) / size) * 512
          const y = ((row + (sy + 0.5) / SAMPLES) / size) * 512
          const color = colorAt(x, y)
          for (let channel = 0; channel < 3; channel++) sum[channel] += color[channel]
        }
      }
      for (let channel = 0; channel < 3; channel++) {
        pixels[row * rowLength + 1 + column * 3 + channel] = Math.round(sum[channel] / SAMPLES ** 2)
      }
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // Bit depth.
  header[9] = 2 // RGB, no transparency (required for iOS icons).

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(new URL(`../public/${name}`, import.meta.url), renderPng(size))
}
