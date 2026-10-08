import { expect, it } from 'vitest'

// tests/solaris/ holds 1x QEMU screenshots of Solaris 2.6 CDE (solaris_xsmall.png, solaris_small.png) and snippets
// cut from them. xsmall's text is Lucida Sans 12, small's is 14. Each snippet's text must match, pixel for pixel, the
// same string drawn from the glyph atlases the page draws with (src/fonts/*.png and .json, see src/bitmapText.ts).
const CASES = [
  ['solaris_xsmall_path', 'LucidaSans12', '/opt/dir/crimson-4'],
  ['solaris_xsmall_title', 'LucidaSans12', 'File Manager - crimson-4'],
  ['solaris_small_path', 'LucidaSans14', '/opt/dir/crimson-4'],
  ['solaris_small_title', 'LucidaSans14', 'File Manager - crimson-4'],
]

const shots = import.meta.glob<string>('./solaris/*.png', { eager: true, query: '?inline', import: 'default' })
const metrics = import.meta.glob<{ glyphs: Record<string, number[]> }>('../src/fonts/*.json', {
  eager: true,
  import: 'default',
})
const atlases = import.meta.glob<string>('../src/fonts/*.png', { eager: true, query: '?inline', import: 'default' })

type Pixels = [number, number][]

// Rows of # and . cropped to the ink, so a failure shows both renderings
function art(pixels: Pixels): string {
  const xs = pixels.map(([x]) => x)
  const ys = pixels.map(([, y]) => y)
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)]
  const rows = Array.from({ length: Math.max(...ys) - y0 + 1 }, () =>
    Array.from({ length: Math.max(...xs) - x0 + 1 }, () => '.'),
  )
  for (const [x, y] of pixels) rows[y - y0][x - x0] = '#'
  return rows.map((row) => row.join('')).join('\n')
}

// Decodes an 8-bit RGBA, non-interlaced PNG (both the screenshots and the atlases are) from a data: URL
async function png(dataUrl: string) {
  const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0))
  const view = new DataView(bytes.buffer)
  const [width, height] = [view.getUint32(16), view.getUint32(20)]
  expect([bytes[24], bytes[25], bytes[28]], 'bit depth, colour type, interlace').toEqual([8, 6, 0])
  const idat: Uint8Array<ArrayBuffer>[] = []
  for (let p = 8; p < bytes.length; p += 12 + view.getUint32(p)) {
    if (String.fromCharCode(...bytes.subarray(p + 4, p + 8)) === 'IDAT')
      idat.push(bytes.subarray(p + 8, p + 8 + view.getUint32(p)))
  }
  const raw = new Uint8Array(
    await new Response(new Blob(idat).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer(),
  )
  // Undo each row's filter (None, Sub, Up, Average, Paeth), working on 4-byte pixels
  const stride = width * 4
  const out = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? out[y * stride + i - 4] : 0
      const b = y ? out[(y - 1) * stride + i] : 0
      const c = y && i >= 4 ? out[(y - 1) * stride + i - 4] : 0
      const p = a + b - c
      const paeth =
        Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c)
          ? a
          : Math.abs(p - b) <= Math.abs(p - c)
            ? b
            : c
      const predict = [0, a, b, (a + b) >> 1, paeth][filter]
      out[y * stride + i] = raw[y * (stride + 1) + 1 + i] + predict
    }
  }
  return { width, height, rgba: (x: number, y: number) => out.subarray((y * width + x) * 4, (y * width + x) * 4 + 4) }
}

// A snippet's ink: pixels well away from its background colour (taken from the top-left corner)
async function screenshot(dataUrl: string): Promise<Pixels> {
  const { width, height, rgba } = await png(dataUrl)
  const sum = (x: number, y: number) => rgba(x, y)[0] + rgba(x, y)[1] + rgba(x, y)[2]
  const pixels: Pixels = []
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) if (Math.abs(sum(x, y) - sum(0, 0)) > 150) pixels.push([x, y])
  return pixels
}

// The string drawn the way bitmapText.ts does: each glyph's atlas cell at pen + left, baseline - ascent
async function render(font: string, text: string): Promise<Pixels> {
  const { glyphs } = metrics[`../src/fonts/${font}.json`]
  const { rgba } = await png(atlases[`../src/fonts/${font}.png`])
  const pixels: Pixels = []
  let pen = 0
  for (const char of text) {
    const [ax, w, h, left, ascent, advance] = glyphs[char.charCodeAt(0)]
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) if (rgba(ax + x, y)[3]) pixels.push([pen + left + x, y - ascent])
    pen += advance
  }
  return pixels
}

for (const [shot, font, text] of CASES) {
  it(`draws "${text}" like Solaris (${shot}.png)`, async () => {
    expect(art(await render(font, text))).toBe(art(await screenshot(shots[`./solaris/${shot}.png`])))
  })
}
