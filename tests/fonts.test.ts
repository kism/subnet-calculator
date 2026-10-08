import { expect, it } from 'vitest'
import { FONTS, OUTLINE } from '../src/fonts'
import css from '../src/fonts.css?raw'

// Every font file as a data: URL. The binaries are Git LFS files, so a checkout without LFS (or a deploy that skips
// it) gets small text pointers in their place, which browsers silently fail to load as fonts or images
const files = {
  ...import.meta.glob<string>('../src/fonts/*.{woff2,woff,png}', { eager: true, query: '?inline', import: 'default' }),
  ...import.meta.glob<string>('../public/fonts/**/*.ttf', { eager: true, query: '?inline', import: 'default' }),
}
const atlases = import.meta.glob('../src/fonts/*.json', { eager: true, import: 'default' })

const MAGIC: Record<string, number[]> = {
  woff2: [0x77, 0x4f, 0x46, 0x32], // wOF2
  woff: [0x77, 0x4f, 0x46, 0x46], // wOFF
  png: [0x89, 0x50, 0x4e, 0x47], // \x89PNG
  ttf: [0x00, 0x01, 0x00, 0x00], // TrueType sfnt version 1.0
}

const bytes = (dataUrl: string) => Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0))

// fonts.css url("./fonts/X") is src/fonts/X; url("/fonts/X") is public/fonts/X
const faces = [...css.matchAll(/font-family: "([^"]+)";\s*font-weight: (\d+);\s*src:([^;]+);/g)].map(
  ([, family, weight, src]) => ({
    family,
    weight,
    urls: [...src.matchAll(/url\("([^"]+)"\)/g)].map(([, url]) =>
      url.startsWith('/') ? `../public${url}` : `../src/${url.slice(2)}`,
    ),
  }),
)

for (const path of Object.keys(files)) {
  it(`${path.slice(3)} is a real font file, not an LFS pointer`, () => {
    const data = bytes(files[path])
    expect(new TextDecoder().decode(data.subarray(0, 40)), 'Git LFS pointer').not.toMatch(/^version https:\/\/git-lfs/)
    expect([...data.subarray(0, 4)], 'magic number').toEqual(MAGIC[path.slice(path.lastIndexOf('.') + 1)])
  })
}

it('every url() in fonts.css is a shipped file', () => {
  const missing = faces.flatMap((face) => face.urls).filter((url) => !(url in files))
  expect(missing).toEqual([])
})

it('every font has a regular and bold family for each zoom level, plus 12 and 18', () => {
  const missing: string[] = []
  for (const font of Object.keys(FONTS))
    for (const size of [...FONTS[font], 12, 18])
      for (const weight of ['400', '700']) {
        const family = OUTLINE.includes(font) ? font : `${font} ${size}`
        if (!faces.some((face) => face.family === family && face.weight === weight)) missing.push(`${family} ${weight}`)
      }
  expect(missing).toEqual([])
})

// bitmapText.ts loads <name>.png for every <name>.json, and only hides the real text once all of them load
it('every atlas has its PNG', () => {
  const missing = Object.keys(atlases)
    .map((path) => path.replace(/json$/, 'png'))
    .filter((png) => !(png in files))
  expect(missing).toEqual([])
})
