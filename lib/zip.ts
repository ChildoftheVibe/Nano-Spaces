/**
 * Minimal uncompressed (stored) ZIP builder — pure Node.js, no dependencies.
 * Suitable for small data exports where compression savings don't justify complexity.
 */

// Pre-computed CRC-32 lookup table
const CRC_TABLE: readonly number[] = (() => {
  const t: number[] = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t.push(c)
  }
  return t
})()

function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (const b of data) {
    // Index is always in [0,255] by construction
    crc = (crc >>> 8) ^ (CRC_TABLE[(crc ^ b) & 0xff] ?? 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosTime(d: Date): number {
  return (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
}

function dosDate(d: Date): number {
  return ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
}

export interface ZipEntry {
  name: string
  data: Buffer
}

export function createZipBuffer(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0
  const now = new Date()
  const modTime = dosTime(now)
  const modDate = dosDate(now)

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, 'utf8')
    const crc = crc32(entry.data)
    const size = entry.data.length

    // Local file header (30 bytes + filename)
    const local = Buffer.alloc(30 + nameBytes.length)
    local.writeUInt32LE(0x04034b50, 0) // signature
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0, 6) // flags
    local.writeUInt16LE(0, 8) // compression: stored
    local.writeUInt16LE(modTime, 10)
    local.writeUInt16LE(modDate, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(size, 18) // compressed size
    local.writeUInt32LE(size, 22) // uncompressed size
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28) // extra field length
    nameBytes.copy(local, 30)

    localParts.push(local, entry.data)

    // Central directory entry (46 bytes + filename)
    const central = Buffer.alloc(46 + nameBytes.length)
    central.writeUInt32LE(0x02014b50, 0) // signature
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6) // version needed
    central.writeUInt16LE(0, 8) // flags
    central.writeUInt16LE(0, 10) // compression: stored
    central.writeUInt16LE(modTime, 12)
    central.writeUInt16LE(modDate, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(size, 20) // compressed size
    central.writeUInt32LE(size, 24) // uncompressed size
    central.writeUInt16LE(nameBytes.length, 28)
    central.writeUInt16LE(0, 30) // extra
    central.writeUInt16LE(0, 32) // comment length
    central.writeUInt16LE(0, 34) // disk start
    central.writeUInt16LE(0, 36) // internal attrs
    central.writeUInt32LE(0, 38) // external attrs
    central.writeUInt32LE(offset, 42) // local header offset
    nameBytes.copy(central, 46)

    centralParts.push(central)
    offset += local.length + size
  }

  const centralDir = Buffer.concat(centralParts)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // EOCD signature
  eocd.writeUInt16LE(0, 4) // disk number
  eocd.writeUInt16LE(0, 6) // start disk
  eocd.writeUInt16LE(entries.length, 8) // entries this disk
  eocd.writeUInt16LE(entries.length, 10) // total entries
  eocd.writeUInt32LE(centralDir.length, 12) // central dir size
  eocd.writeUInt32LE(offset, 16) // central dir offset
  eocd.writeUInt16LE(0, 20) // comment length

  return Buffer.concat([...localParts, centralDir, eocd])
}
