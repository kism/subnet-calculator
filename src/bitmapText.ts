// Draws all text from the Solaris Lucida bitmaps (PNG atlases from scripts/pcf2atlas.py) on a canvas over the page,
// so no browser smoothing or sub-pixel placement can soften it. The real text stays in the DOM in the matching WOFF
// fonts, made invisible with -webkit-text-fill-color, so selection, copy, find, screen readers and the caret still
// work; each character is drawn where the browser laid out that invisible character.
interface Metrics {
  ascent: number
  descent: number
  // [atlas x, width, height, left, ascent, advance] in font pixels
  glyphs: Record<string, number[]>
}

interface Atlas {
  metrics: Metrics
  image: HTMLImageElement
  size: number
  tinted: Record<string, HTMLCanvasElement>
}

// Every atlas in src/fonts, keyed by name (LucidaSans12, LucidaSans-Bold12, Terminus12...)
const metricFiles = import.meta.glob<Metrics>('./fonts/*.json', { eager: true, import: 'default' })
const imageFiles = import.meta.glob<string>('./fonts/*.png', { eager: true, query: '?url', import: 'default' })
const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.'))

const canvas = document.createElement('canvas')
canvas.id = 'bitmap-text'
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
const atlases: Record<string, Atlas> = {}

// The atlas matching the invisible text's "<font> <zoom level>" family (fonts.css) and weight: the largest original
// bitmap size that divides the level (20 is 10x2, 36 is 18x2...)
function atlasFor(style: CSSStyleDeclaration): Atlas {
  const [, family = 'Lucida Sans', size = '12'] = /([A-Za-z ]+) (\d+)/.exec(style.fontFamily) || []
  const bold = Number(style.fontWeight) >= 600 || style.fontWeight === 'bold'
  const name = family.replace(/ /g, '') + (bold ? '-Bold' : '')
  const level = Number(size)
  for (let base = level; base > 0; base--) if (level % base === 0 && atlases[name + base]) return atlases[name + base]
  return atlases.LucidaSans12
}

// The atlas in one colour (white glyphs recoloured with source-in), cached per colour
function tinted(atlas: Atlas, colour: string): HTMLCanvasElement {
  let tint = atlas.tinted[colour]
  if (!tint) {
    tint = document.createElement('canvas')
    tint.width = atlas.image.width
    tint.height = atlas.image.height
    const t = tint.getContext('2d') as CanvasRenderingContext2D
    t.drawImage(atlas.image, 0, 0)
    t.globalCompositeOperation = 'source-in'
    t.fillStyle = colour
    t.fillRect(0, 0, tint.width, tint.height)
    atlas.tinted[colour] = tint
  }
  return tint
}

// One glyph with its pen position and the top of its line box in CSS pixels. Its origin is snapped to a whole device
// pixel and it's scaled without smoothing, so it's always hard-edged; at 1x/2x every font pixel is a whole block,
// while fractional screen scaling (1.25x...) makes some pixels a device pixel wider rather than letting it blur
function glyph(atlas: Atlas, tint: HTMLCanvasElement, char: string, x: number, top: number, scale: number): number {
  const g = atlas.metrics.glyphs[char.charCodeAt(0)]
  if (!g) return 0
  const [ax, w, h, left, ascent, advance] = g
  const px = scale * devicePixelRatio
  const dpr = devicePixelRatio
  const baseline = Math.round(top * dpr + atlas.metrics.ascent * px)
  const gx = Math.round(x * dpr + left * px)
  const gy = Math.round(baseline - ascent * px)
  if (w && h) ctx.drawImage(tint, ax, 0, w, h, gx, gy, Math.round(w * px), Math.round(h * px))
  return advance * scale
}

// The real text is see-through, so ::selection's colour never reaches the glyphs: selected characters are tinted
// here instead, with the same --title-bar-active-fg style.css gives ::selection
function selectionColour(el: Element): string {
  return getComputedStyle(el).getPropertyValue('--title-bar-active-fg').trim() || 'HighlightText'
}

// Page selection as ranges (Firefox can have several), empty when nothing is selected
function selectedRanges(): Range[] {
  const sel = getSelection()
  const ranges: Range[] = []
  if (sel && !sel.isCollapsed) for (let i = 0; i < sel.rangeCount; i++) ranges.push(sel.getRangeAt(i))
  return ranges
}

// Until its WOFF arrives the invisible text is laid out in the fallback font, so glyphs would land in the wrong
// places; leave it blank instead, as browsers do with text whose web font is still loading
function fontLoaded(style: CSSStyleDeclaration): boolean {
  return document.fonts.check(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`)
}

function drawTextNodes(): void {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  const selected = selectedRanges()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    const parent = node.parentElement
    if (!text.trim() || !parent || parent.closest('script, style')) continue
    const style = getComputedStyle(parent)
    if (style.visibility !== 'visible' || !fontLoaded(style)) continue
    const atlas = atlasFor(style)
    const scale = parseFloat(style.fontSize) / atlas.size
    const tint = tinted(atlas, style.color)
    const selectedTint = selected.length ? tinted(atlas, selectionColour(parent)) : tint
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ' || text[i] === '\n') continue
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const rect = range.getClientRects()[0]
      // A character is selected when both its edges are inside a selection range
      const isSelected = selected.some((s) => s.comparePoint(node, i) === 0 && s.comparePoint(node, i + 1) === 0)
      if (rect) glyph(atlas, isSelected ? selectedTint : tint, text[i], rect.left, rect.top, scale)
    }
  }
}

// Input values aren't text nodes: lay them out from the content box, vertically centred like the browser does
function drawInputs(): void {
  for (const input of Array.prototype.slice.call(document.querySelectorAll('input:not([type=range])'))) {
    const el = input as HTMLInputElement
    const placeholder = !el.value
    const text = el.value || el.placeholder
    const r = el.getBoundingClientRect()
    if (!text || !r.width) continue
    const style = getComputedStyle(el)
    if (!fontLoaded(style)) continue
    const atlas = atlasFor(style)
    const scale = parseFloat(style.fontSize) / atlas.size
    const colour = placeholder ? getComputedStyle(el, '::placeholder').color : style.color
    const n = (s: string) => parseFloat(s) || 0
    const left = r.left + n(style.borderLeftWidth) + n(style.paddingLeft)
    const top = r.top + n(style.borderTopWidth) + n(style.paddingTop)
    const width = r.right - n(style.borderRightWidth) - n(style.paddingRight) - left
    const height = r.bottom - n(style.borderBottomWidth) - n(style.paddingBottom) - top
    const dpr = devicePixelRatio
    ctx.save()
    ctx.beginPath()
    ctx.rect(left * dpr, top * dpr, width * dpr, height * dpr)
    ctx.clip()
    let x = left - el.scrollLeft
    const lineTop = top + (height - (atlas.metrics.ascent + atlas.metrics.descent) * scale) / 2
    const tint = tinted(atlas, colour)
    // Text selected inside the focused input (selectionStart/End, in UTF-16 units like the loop index)
    const focused = !placeholder && document.activeElement === el
    const start = focused ? (el.selectionStart ?? 0) : 0
    const end = focused ? (el.selectionEnd ?? 0) : 0
    const selectedTint = start < end ? tinted(atlas, selectionColour(el)) : tint
    for (let i = 0; i < text.length; i++)
      x += glyph(atlas, i >= start && i < end ? selectedTint : tint, text[i], x, lineTop, scale)
    ctx.restore()
  }
}

function draw(): void {
  const dpr = devicePixelRatio
  const width = Math.round(innerWidth * dpr)
  const height = Math.round(innerHeight * dpr)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
    // Shown at exactly its device-pixel size: at a fractional ratio (browser zoom) innerWidth px would be a hair off
    // the rounded backing size, and the browser would resample, smearing every glyph. Also px, not vw/vh: a phone's
    // 100vh isn't its visible height
    canvas.style.width = `${width / dpr}px`
    canvas.style.height = `${height / dpr}px`
  }
  ctx.clearRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = false
  drawTextNodes()
  drawInputs()
}

let pending = false
function schedule(): void {
  if (pending) return
  pending = true
  requestAnimationFrame(() => {
    pending = false
    draw()
  })
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

// Only hide the real text once every atlas has loaded, so a failure leaves the WOFF text showing
const paths = Object.keys(metricFiles)
Promise.all(paths.map((path) => load(imageFiles[path.replace(/json$/, 'png')]))).then((images) => {
  paths.forEach((path, i) => {
    const name = baseName(path)
    atlases[name] = { metrics: metricFiles[path], image: images[i], size: Number(name.replace(/\D/g, '')), tinted: {} }
  })
  document.body.appendChild(canvas)
  document.documentElement.classList.add('bitmap-text')
  new MutationObserver((mutations) => {
    if (mutations.some((m) => m.target !== canvas)) schedule()
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true })
  for (const type of ['input', 'keydown', 'keyup', 'mouseup', 'focusin', 'focusout', 'scroll', 'resize', 'select'])
    addEventListener(type, schedule, true)
  document.addEventListener('selectionchange', schedule)
  // A zoom level's WOFF may still be downloading (e.g. after a hard refresh): the invisible text is laid out in the
  // fallback font until it arrives, then moves, so redraw whenever a font finishes loading
  document.fonts.addEventListener('loadingdone', schedule)
  document.fonts.ready.then(schedule)
  schedule()
})
