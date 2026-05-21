/**
 * Generates public/icon-192.png and public/icon-512.png — solid brand-colour
 * squares required by the PWA manifest. No external dependencies; uses only
 * Node.js built-ins (zlib, fs).
 *
 * Run once: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '..', 'public')

// Brand primary: #4F7EFA
const R = 0x4f
const G = 0x7e
const B = 0xfa

// Pre-compute CRC-32 table (standard PNG requirement)
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
  CRC_TABLE[i] = c
}

function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.allocUnsafe(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBuf, data])
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makeSolidPng(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR: width, height, bit-depth=8, color-type=2 (RGB), compression=0, filter=0, interlace=0
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // Raw scanlines: filter-byte=0 + RGB per pixel per row
  const stride = 1 + size * 3
  const raw = Buffer.allocUnsafe(size * stride)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const off = y * stride + 1 + x * 3
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
    }
  }

  const idat = deflateSync(raw)

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync(join(PUBLIC, 'icon-192.png'), makeSolidPng(192, R, G, B))
writeFileSync(join(PUBLIC, 'icon-512.png'), makeSolidPng(512, R, G, B))
// Also create the badge icon referenced by the service worker
writeFileSync(join(PUBLIC, 'icon-badge.png'), makeSolidPng(96, R, G, B))

console.log('Generated public/icon-192.png, public/icon-512.png, public/icon-badge.png')
