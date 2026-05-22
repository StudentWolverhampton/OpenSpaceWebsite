const { writeFileSync, mkdirSync, existsSync } = require('fs')
const { join } = require('path')
const { deflateSync } = require('zlib')

const SIZE = 256
const BG = [10, 10, 10, 255]
const ACCENT = [0, 212, 255, 255]
const ACCENT_DIM = [0, 180, 220, 200]
const FG = [224, 224, 224, 255]

function drawIcon(pixels) {
  const cx = SIZE / 2
  const cy = SIZE / 2

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const idx = (y * SIZE + x) * 4

      // Background
      pixels[idx + 0] = BG[0]
      pixels[idx + 1] = BG[1]
      pixels[idx + 2] = BG[2]
      pixels[idx + 3] = 0

      // Outer glow circle
      if (dist < 110 && dist > 85) {
        const alpha = Math.max(0, 1 - Math.abs(dist - 98) / 15) * 0.3
        pixels[idx + 0] = ACCENT[0]
        pixels[idx + 1] = ACCENT[1]
        pixels[idx + 2] = ACCENT[2]
        pixels[idx + 3] = Math.floor(alpha * 255)
        continue
      }

      // Diamond shape (terminal-like)
      if (dist < 75) {
        const diamond = Math.abs(dx) + Math.abs(dy)
        if (diamond < 60 && diamond > 8) {
          // Terminal prompt ">_"
          if (dy > -20 && dy < 20) {
            const rightArm = dx > 10 && dx < 45
            const leftArm = dx < -10 && dx > -45
            const prompt = dx > -8 && dx < 8 && dy > -20 && dy < 20

            if (prompt || rightArm || leftArm) {
              pixels[idx + 0] = ACCENT[0]
              pixels[idx + 1] = ACCENT[1]
              pixels[idx + 2] = ACCENT[2]
              pixels[idx + 3] = 255
              continue
            }
          }

          // Underscore cursor
          if (dy > 15 && dy < 25 && dx > -30 && dx < 30) {
            pixels[idx + 0] = ACCENT[0]
            pixels[idx + 1] = ACCENT[1]
            pixels[idx + 2] = ACCENT[2]
            pixels[idx + 3] = 200
            continue
          }

          // Soft glow fill
          const alpha = Math.max(0, 1 - diamond / 60) * 0.08
          pixels[idx + 0] = ACCENT[0]
          pixels[idx + 1] = ACCENT[1]
          pixels[idx + 2] = ACCENT[2]
          pixels[idx + 3] = Math.floor(alpha * 255)
        }
      }
    }
  }
}

function createPNG(pixels, width, height) {
  const rawData = Buffer.alloc(width * height * 4 + height)
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0 // filter byte - none
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      const dstIdx = y * (width * 4 + 1) + 1 + x * 4
      rawData[dstIdx + 0] = pixels[srcIdx + 0]
      rawData[dstIdx + 1] = pixels[srcIdx + 1]
      rawData[dstIdx + 2] = pixels[srcIdx + 2]
      rawData[dstIdx + 3] = pixels[srcIdx + 3]
    }
  }

  const compressed = deflateSync(rawData)

  const chunks = []

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  chunks.push(createChunk('IHDR', ihdr))

  // IDAT
  chunks.push(createChunk('IDAT', compressed))

  // IEND
  chunks.push(createChunk('IEND', Buffer.alloc(0)))

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([signature, ...chunks])
}

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = crc32(crcData)
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc, 0)
  return Buffer.concat([length, typeBuffer, data, crcBuffer])
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function createICO(pngData) {
  const count = 1
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)     // reserved
  header.writeUInt16LE(1, 2)     // ICO type
  header.writeUInt16LE(count, 4) // count

  // Directory entry
  const entry = Buffer.alloc(16)
  entry[0] = 0      // width (0 means 256)
  entry[1] = 0      // height (0 means 256)
  entry[2] = 0      // colors
  entry[3] = 0      // reserved
  entry.writeUInt16LE(1, 4)  // planes
  entry.writeUInt16LE(32, 6) // bpp
  entry.writeUInt32LE(pngData.length, 8)  // size
  entry.writeUInt32LE(22, 12) // offset (header + entry)

  return Buffer.concat([header, entry, pngData])
}

function createICNS(pngData) {
  // ICNS container with ic08 (256x256) entry
  const iconType = Buffer.from('ic08', 'ascii')
  const iconSize = Buffer.alloc(4)
  iconSize.writeUInt32BE(pngData.length + 8, 0)
  const iconEntry = Buffer.concat([iconType, iconSize, pngData])

  const header = Buffer.alloc(8)
  header.write('icns', 0, 4, 'ascii')
  header.writeUInt32BE(iconEntry.length + 8, 4)

  return Buffer.concat([header, iconEntry])
}

// Generate
const pixels = new Uint8Array(SIZE * SIZE * 4)
drawIcon(pixels)

const pngData = createPNG(pixels, SIZE, SIZE)

const resDir = join(__dirname, '..', 'resources')
if (!existsSync(resDir)) mkdirSync(resDir, { recursive: true })

writeFileSync(join(resDir, 'icon.png'), pngData)
console.log('✓ Created icon.png')

writeFileSync(join(resDir, 'icon.ico'), createICO(pngData))
console.log('✓ Created icon.ico')

writeFileSync(join(resDir, 'icon.icns'), createICNS(pngData))
console.log('✓ Created icon.icns')
